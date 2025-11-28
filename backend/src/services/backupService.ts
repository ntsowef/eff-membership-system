import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

const execAsync = promisify(exec);

interface BackupInfo {
  backup_id?: number;
  filename: string;
  filepath: string;
  size: number;
  status: 'success' | 'failed' | 'in_progress';
  created_at: Date;
  completed_at?: Date;
  error_message?: string;
}

export class BackupService {
  private static BACKUP_DIR = path.join(process.cwd(), 'backups');
  private static MAX_BACKUPS = 10; // Keep last 10 backups

  /**
   * Initialize backup directory
   */
  static async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.BACKUP_DIR)) {
        fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
        console.log(`✅ Backup directory created: ${this.BACKUP_DIR}`);
      }
    } catch (error) {
      console.error('❌ Failed to create backup directory:', error);
      throw error;
    }
  }

  /**
   * Check if pg_dump is available
   */
  static async checkPgDumpAvailable(): Promise<boolean> {
    try {
      await execAsync('pg_dump --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a new database backup
   */
  static async createBackup(): Promise<BackupInfo> {
    try {
      await this.initialize();

      // Check if pg_dump is available
      const pgDumpAvailable = await this.checkPgDumpAvailable();
      if (!pgDumpAvailable) {
        throw new Error('pg_dump is not installed or not in PATH. Please install PostgreSQL client tools.');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `eff_membership_backup_${timestamp}.sql`;
      const filepath = path.join(this.BACKUP_DIR, filename);

      // Get database credentials from environment
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'eff_membership_db';
      const dbUser = process.env.DB_USER || 'eff_admin';
      const dbPassword = process.env.DB_PASSWORD || '';

      // Record backup start in database
      const backupRecord = await executeQuery(`
        INSERT INTO database_backups (filename, filepath, status, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING backup_id, filename, filepath, status, created_at
      `, [filename, filepath, 'in_progress']);

      const backupId = backupRecord[0].backup_id;

      try {
        // Create pg_dump command (Windows-compatible)
        // Use environment variable in the options instead of command line
        const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -v -f "${filepath}" ${dbName}`;

        console.log(`🔄 Starting database backup: ${filename}`);

        // Execute pg_dump with password in environment
        await execAsync(pgDumpCommand, {
          env: {
            ...process.env,
            PGPASSWORD: dbPassword
          }
        });

        // Get file size
        const stats = fs.statSync(filepath);
        const sizeInBytes = stats.size;

        // Update backup record with success
        await executeQuery(`
          UPDATE database_backups
          SET status = $1, size = $2, completed_at = CURRENT_TIMESTAMP
          WHERE backup_id = $3
        `, ['success', sizeInBytes, backupId]);

        console.log(`✅ Backup completed successfully: ${filename} (${this.formatBytes(sizeInBytes)})`);

        // Clean up old backups
        await this.cleanupOldBackups();

        return {
          backup_id: backupId,
          filename,
          filepath,
          size: sizeInBytes,
          status: 'success',
          created_at: new Date(),
          completed_at: new Date()
        };

      } catch (error: any) {
        // Update backup record with failure
        await executeQuery(`
          UPDATE database_backups
          SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
          WHERE backup_id = $3
        `, ['failed', error.message, backupId]);

        console.error(`❌ Backup failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      throw createDatabaseError('Failed to create backup', error);
    }
  }

  /**
   * List all backups
   */
  static async listBackups(): Promise<BackupInfo[]> {
    try {
      const backups = await executeQuery(`
        SELECT 
          backup_id,
          filename,
          filepath,
          size,
          status,
          created_at,
          completed_at,
          error_message
        FROM database_backups
        ORDER BY created_at DESC
        LIMIT 50
      `, []);

      return backups.map((backup: any) => ({
        backup_id: backup.backup_id,
        filename: backup.filename,
        filepath: backup.filepath,
        size: backup.size || 0,
        status: backup.status,
        created_at: backup.created_at,
        completed_at: backup.completed_at,
        error_message: backup.error_message
      }));

    } catch (error) {
      throw createDatabaseError('Failed to list backups', error);
    }
  }

  /**
   * Get latest backup info
   */
  static async getLatestBackup(): Promise<BackupInfo | null> {
    try {
      const result = await executeQuery(`
        SELECT 
          backup_id,
          filename,
          filepath,
          size,
          status,
          created_at,
          completed_at
        FROM database_backups
        WHERE status = 'success'
        ORDER BY created_at DESC
        LIMIT 1
      `, []);

      if (result.length === 0) return null;

      return {
        backup_id: result[0].backup_id,
        filename: result[0].filename,
        filepath: result[0].filepath,
        size: result[0].size || 0,
        status: result[0].status,
        created_at: result[0].created_at,
        completed_at: result[0].completed_at
      };

    } catch (error) {
      throw createDatabaseError('Failed to get latest backup', error);
    }
  }

  /**
   * Delete a backup
   */
  static async deleteBackup(backupId: number): Promise<void> {
    try {
      // Get backup info
      const result = await executeQuery(`
        SELECT filepath FROM database_backups WHERE backup_id = $1
      `, [backupId]);

      if (result.length === 0) {
        throw new Error('Backup not found');
      }

      const filepath = result[0].filepath;

      // Delete file if exists
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`🗑️ Deleted backup file: ${filepath}`);
      }

      // Delete database record
      await executeQuery(`
        DELETE FROM database_backups WHERE backup_id = $1
      `, [backupId]);

      console.log(`✅ Backup deleted: ${backupId}`);

    } catch (error) {
      throw createDatabaseError('Failed to delete backup', error);
    }
  }

  /**
   * Clean up old backups (keep only MAX_BACKUPS)
   */
  static async cleanupOldBackups(): Promise<void> {
    try {
      // Get backups to delete (older than MAX_BACKUPS)
      const oldBackups = await executeQuery(`
        SELECT backup_id, filepath
        FROM database_backups
        WHERE status = 'success'
        ORDER BY created_at DESC
        OFFSET $1
      `, [this.MAX_BACKUPS]);

      for (const backup of oldBackups) {
        await this.deleteBackup(backup.backup_id);
      }

      if (oldBackups.length > 0) {
        console.log(`🧹 Cleaned up ${oldBackups.length} old backup(s)`);
      }

    } catch (error) {
      console.error('❌ Failed to cleanup old backups:', error);
    }
  }

  /**
   * Download backup file
   */
  static async getBackupFile(backupId: number): Promise<{ filepath: string; filename: string }> {
    try {
      const result = await executeQuery(`
        SELECT filepath, filename FROM database_backups WHERE backup_id = $1
      `, [backupId]);

      if (result.length === 0) {
        throw new Error('Backup not found');
      }

      const filepath = result[0].filepath;
      const filename = result[0].filename;

      if (!fs.existsSync(filepath)) {
        throw new Error('Backup file not found on disk');
      }

      return { filepath, filename };

    } catch (error) {
      throw createDatabaseError('Failed to get backup file', error);
    }
  }

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get backup statistics
   */
  static async getBackupStats(): Promise<{
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSize: number;
    latestBackup: BackupInfo | null;
  }> {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_backups,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_backups,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
          COALESCE(SUM(CASE WHEN status = 'success' THEN size ELSE 0 END), 0) as total_size
        FROM database_backups
      `, []);

      const latestBackup = await this.getLatestBackup();

      return {
        totalBackups: parseInt(stats[0].total_backups),
        successfulBackups: parseInt(stats[0].successful_backups),
        failedBackups: parseInt(stats[0].failed_backups),
        totalSize: parseInt(stats[0].total_size),
        latestBackup
      };

    } catch (error) {
      throw createDatabaseError('Failed to get backup stats', error);
    }
  }
}

