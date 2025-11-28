import * as fs from 'fs/promises';
import * as path from 'path';
import checkDiskSpace from 'check-disk-space';
import { executeQuery } from '../config/database';

/**
 * File Storage Management Service
 * 
 * Provides:
 * - Disk space monitoring
 * - Automatic cleanup of old processed files
 * - File size validation
 * - Storage health checks
 */

export class FileStorageService {
  private static readonly MIN_FREE_SPACE_GB = 5; // Minimum 5GB free space
  private static readonly RETENTION_DAYS = 30; // Keep files for 30 days
  private static readonly UPLOAD_DIRS = [
    'uploads/bulk-applications',
    'uploads/renewal-uploads',
    'uploads/excel-processing',
    '_upload_file_directory'
  ];

  /**
   * Check if there's enough disk space for uploads
   */
  static async checkDiskSpace(): Promise<{ hasSpace: boolean; freeGB: number; totalGB: number }> {
    try {
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      const diskSpace = await checkDiskSpace(uploadDir);

      const freeGB = diskSpace.free / (1024 * 1024 * 1024);
      const totalGB = diskSpace.size / (1024 * 1024 * 1024);
      const hasSpace = freeGB >= this.MIN_FREE_SPACE_GB;

      console.log(`💾 Disk space: ${freeGB.toFixed(2)}GB free / ${totalGB.toFixed(2)}GB total`);

      return {
        hasSpace,
        freeGB: parseFloat(freeGB.toFixed(2)),
        totalGB: parseFloat(totalGB.toFixed(2))
      };
    } catch (error) {
      console.error('❌ Error checking disk space:', error);
      // Return true to allow uploads if check fails (fail-open)
      return { hasSpace: true, freeGB: 0, totalGB: 0 };
    }
  }

  /**
   * Validate file size before upload
   */
  static validateFileSize(fileSize: number): { valid: boolean; error?: string } {
    const maxSizeMB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (fileSize > maxSizeBytes) {
      return {
        valid: false,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
      };
    }

    return { valid: true };
  }

  /**
   * Clean up old processed files
   */
  static async cleanupOldFiles(): Promise<{ deletedCount: number; freedSpaceMB: number }> {
    console.log('🧹 Starting file cleanup...');
    
    let deletedCount = 0;
    let freedSpaceBytes = 0;

    try {
      // Get old upload records from database
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      // Clean member application uploads
      const memberUploads = await this.getOldUploads('member_application_bulk_uploads', cutoffDate);
      for (const upload of memberUploads) {
        const deleted = await this.deleteFile(upload.file_path);
        if (deleted.success) {
          deletedCount++;
          freedSpaceBytes += deleted.size;
        }
      }

      // Clean renewal uploads
      const renewalUploads = await this.getOldUploads('renewal_bulk_uploads', cutoffDate);
      for (const upload of renewalUploads) {
        const deleted = await this.deleteFile(upload.file_path);
        if (deleted.success) {
          deletedCount++;
          freedSpaceBytes += deleted.size;
        }
      }

      // Clean orphaned files (files not in database)
      for (const dir of this.UPLOAD_DIRS) {
        const orphaned = await this.findOrphanedFiles(dir, cutoffDate);
        for (const filePath of orphaned) {
          const deleted = await this.deleteFile(filePath);
          if (deleted.success) {
            deletedCount++;
            freedSpaceBytes += deleted.size;
          }
        }
      }

      const freedSpaceMB = parseFloat((freedSpaceBytes / 1024 / 1024).toFixed(2));
      console.log(`✅ Cleanup complete: Deleted ${deletedCount} files, freed ${freedSpaceMB}MB`);

      return { deletedCount, freedSpaceMB };
    } catch (error) {
      console.error('❌ Error during file cleanup:', error);
      return { deletedCount, freedSpaceMB: 0 };
    }
  }

  /**
   * Get old upload records from database
   */
  private static async getOldUploads(tableName: string, cutoffDate: Date): Promise<any[]> {
    try {
      const query = `
        SELECT file_path, file_size 
        FROM ${tableName}
        WHERE status IN ('Completed', 'Failed')
        AND created_at < $1
      `;
      return await executeQuery(query, [cutoffDate.toISOString()]);
    } catch (error) {
      console.error(`Error getting old uploads from ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Delete a file and return size freed
   */
  private static async deleteFile(filePath: string): Promise<{ success: boolean; size: number }> {
    try {
      const fullPath = path.resolve(process.cwd(), filePath);
      const stats = await fs.stat(fullPath);
      await fs.unlink(fullPath);
      console.log(`🗑️  Deleted: ${filePath} (${(stats.size / 1024).toFixed(2)}KB)`);
      return { success: true, size: stats.size };
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Error deleting ${filePath}:`, error);
      }
      return { success: false, size: 0 };
    }
  }

  /**
   * Find orphaned files (not in database)
   */
  private static async findOrphanedFiles(dirPath: string, cutoffDate: Date): Promise<string[]> {
    const orphaned: string[] = [];

    try {
      const fullDirPath = path.resolve(process.cwd(), dirPath);

      // Check if directory exists
      try {
        await fs.access(fullDirPath);
      } catch {
        return orphaned; // Directory doesn't exist
      }

      const files = await fs.readdir(fullDirPath);

      for (const file of files) {
        const filePath = path.join(fullDirPath, file);
        const stats = await fs.stat(filePath);

        // Skip directories
        if (stats.isDirectory()) continue;

        // Check if file is older than cutoff date
        if (stats.mtime < cutoffDate) {
          // Check if file exists in database
          const relativePath = path.relative(process.cwd(), filePath);
          const inDatabase = await this.isFileInDatabase(relativePath);

          if (!inDatabase) {
            orphaned.push(relativePath);
          }
        }
      }
    } catch (error) {
      console.error(`Error finding orphaned files in ${dirPath}:`, error);
    }

    return orphaned;
  }

  /**
   * Check if file exists in database
   */
  private static async isFileInDatabase(filePath: string): Promise<boolean> {
    try {
      const query = `
        SELECT 1 FROM (
          SELECT file_path FROM member_application_bulk_uploads WHERE file_path = $1
          UNION
          SELECT file_path FROM renewal_bulk_uploads WHERE file_path = $1
        ) AS combined
        LIMIT 1
      `;
      const result = await executeQuery(query, [filePath]);
      return result.length > 0;
    } catch (error) {
      console.error('Error checking file in database:', error);
      return true; // Assume it's in database to avoid accidental deletion
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<any> {
    const diskSpace = await this.checkDiskSpace();

    const stats: any = {
      diskSpace,
      directories: {}
    };

    for (const dir of this.UPLOAD_DIRS) {
      try {
        const dirPath = path.resolve(process.cwd(), dir);
        const dirStats = await this.getDirectoryStats(dirPath);
        stats.directories[dir] = dirStats;
      } catch (error) {
        stats.directories[dir] = { error: 'Unable to read directory' };
      }
    }

    return stats;
  }

  /**
   * Get directory statistics
   */
  private static async getDirectoryStats(dirPath: string): Promise<any> {
    try {
      await fs.access(dirPath);
      const files = await fs.readdir(dirPath);

      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          totalSize += stats.size;
          fileCount++;
        }
      }

      return {
        fileCount,
        totalSizeMB: parseFloat((totalSize / 1024 / 1024).toFixed(2))
      };
    } catch (error) {
      return { fileCount: 0, totalSizeMB: 0 };
    }
  }

  /**
   * Ensure upload directories exist
   */
  static async ensureUploadDirectories(): Promise<void> {
    for (const dir of this.UPLOAD_DIRS) {
      const dirPath = path.resolve(process.cwd(), dir);
      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`✅ Ensured directory exists: ${dir}`);
      } catch (error) {
        console.error(`❌ Error creating directory ${dir}:`, error);
      }
    }
  }
}

