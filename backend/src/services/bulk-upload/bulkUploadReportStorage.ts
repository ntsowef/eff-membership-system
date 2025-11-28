/**
 * Bulk Upload Report Storage Service
 * 
 * Manages report files with:
 * - Report metadata tracking
 * - File cleanup and archival
 * - Storage optimization
 * - Retention policies
 * - Report compression
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPool } from '../../config/database-hybrid';
import { logger } from '../../utils/logger';

/**
 * Report metadata interface
 */
export interface ReportMetadata {
  job_id: string;
  report_path: string;
  report_filename: string;
  file_size_bytes: number;
  created_at: Date;
  accessed_at?: Date;
  access_count: number;
  is_archived: boolean;
  archived_at?: Date;
  retention_days: number;
}

/**
 * Report storage statistics
 */
export interface ReportStorageStats {
  total_reports: number;
  total_size_bytes: number;
  total_size_mb: number;
  oldest_report_date: Date | null;
  newest_report_date: Date | null;
  archived_count: number;
  active_count: number;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  deleted_count: number;
  freed_space_bytes: number;
  freed_space_mb: number;
  errors: string[];
}

/**
 * Report Storage Service
 */
export class BulkUploadReportStorage {
  
  // Default retention period (90 days)
  private static readonly DEFAULT_RETENTION_DAYS = 90;
  
  // Archive threshold (30 days)
  private static readonly ARCHIVE_THRESHOLD_DAYS = 30;
  
  /**
   * Get report metadata
   */
  static async getReportMetadata(jobId: string): Promise<ReportMetadata | null> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT 
          job_id,
          report_path,
          report_filename,
          created_at
         FROM bulk_upload_jobs
         WHERE job_id = $1 AND report_path IS NOT NULL`,
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const job = result.rows[0];
      
      // Get file size if file exists
      let fileSize = 0;
      if (fs.existsSync(job.report_path)) {
        const stats = fs.statSync(job.report_path);
        fileSize = stats.size;
      }

      return {
        job_id: job.job_id,
        report_path: job.report_path,
        report_filename: job.report_filename,
        file_size_bytes: fileSize,
        created_at: job.created_at,
        access_count: 0,
        is_archived: false,
        retention_days: this.DEFAULT_RETENTION_DAYS
      };

    } catch (error: any) {
      logger.error('Failed to get report metadata:', error.message);
      return null;
    }
  }

  /**
   * Get all report metadata
   */
  static async getAllReportMetadata(limit: number = 100): Promise<ReportMetadata[]> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT 
          job_id,
          report_path,
          report_filename,
          created_at
         FROM bulk_upload_jobs
         WHERE report_path IS NOT NULL
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      const metadata: ReportMetadata[] = [];

      for (const job of result.rows) {
        let fileSize = 0;
        if (fs.existsSync(job.report_path)) {
          const stats = fs.statSync(job.report_path);
          fileSize = stats.size;
        }

        metadata.push({
          job_id: job.job_id,
          report_path: job.report_path,
          report_filename: job.report_filename,
          file_size_bytes: fileSize,
          created_at: job.created_at,
          access_count: 0,
          is_archived: false,
          retention_days: this.DEFAULT_RETENTION_DAYS
        });
      }

      return metadata;

    } catch (error: any) {
      logger.error('Failed to get all report metadata:', error.message);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<ReportStorageStats> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT
          COUNT(*) as total_reports,
          MIN(created_at) as oldest_report_date,
          MAX(created_at) as newest_report_date
         FROM bulk_upload_jobs
         WHERE report_path IS NOT NULL`
      );

      const stats = result.rows[0];

      // Calculate total size by checking all report files
      let totalSize = 0;
      const allReports = await this.getAllReportMetadata(1000);

      for (const report of allReports) {
        totalSize += report.file_size_bytes;
      }

      return {
        total_reports: parseInt(stats.total_reports) || 0,
        total_size_bytes: totalSize,
        total_size_mb: parseFloat((totalSize / 1024 / 1024).toFixed(2)),
        oldest_report_date: stats.oldest_report_date,
        newest_report_date: stats.newest_report_date,
        archived_count: 0,
        active_count: parseInt(stats.total_reports) || 0
      };

    } catch (error: any) {
      logger.error('Failed to get storage stats:', error.message);
      return {
        total_reports: 0,
        total_size_bytes: 0,
        total_size_mb: 0,
        oldest_report_date: null,
        newest_report_date: null,
        archived_count: 0,
        active_count: 0
      };
    }
  }

  /**
   * Delete report file
   */
  static async deleteReport(jobId: string): Promise<boolean> {
    try {
      const pool = getPool();

      // Get report path
      const result = await pool.query(
        `SELECT report_path FROM bulk_upload_jobs WHERE job_id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        logger.warn(`Report not found for job: ${jobId}`);
        return false;
      }

      const reportPath = result.rows[0].report_path;

      // Delete file if exists
      if (reportPath && fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
        logger.info(`🗑️  Deleted report file: ${reportPath}`);
      }

      // Update database to remove report path
      await pool.query(
        `UPDATE bulk_upload_jobs
         SET report_path = NULL, report_filename = NULL
         WHERE job_id = $1`,
        [jobId]
      );

      return true;

    } catch (error: any) {
      logger.error(`Failed to delete report for job ${jobId}:`, error.message);
      return false;
    }
  }

  /**
   * Clean up old reports based on retention policy
   */
  static async cleanupOldReports(retentionDays: number = this.DEFAULT_RETENTION_DAYS): Promise<CleanupResult> {
    const result: CleanupResult = {
      deleted_count: 0,
      freed_space_bytes: 0,
      freed_space_mb: 0,
      errors: []
    };

    try {
      const pool = getPool();

      // Get reports older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldReports = await pool.query(
        `SELECT job_id, report_path, report_filename
         FROM bulk_upload_jobs
         WHERE report_path IS NOT NULL
         AND created_at < $1
         ORDER BY created_at ASC`,
        [cutoffDate]
      );

      logger.info(`🧹 Found ${oldReports.rows.length} reports older than ${retentionDays} days`);

      for (const report of oldReports.rows) {
        try {
          // Get file size before deletion
          let fileSize = 0;
          if (fs.existsSync(report.report_path)) {
            const stats = fs.statSync(report.report_path);
            fileSize = stats.size;

            // Delete file
            fs.unlinkSync(report.report_path);
            result.freed_space_bytes += fileSize;
          }

          // Update database
          await pool.query(
            `UPDATE bulk_upload_jobs
             SET report_path = NULL, report_filename = NULL
             WHERE job_id = $1`,
            [report.job_id]
          );

          result.deleted_count++;
          logger.info(`   ✅ Deleted: ${report.report_filename} (${this.formatFileSize(fileSize)})`);

        } catch (error: any) {
          result.errors.push(`Failed to delete ${report.report_filename}: ${error.message}`);
          logger.error(`   ❌ Failed to delete ${report.report_filename}:`, error.message);
        }
      }

      result.freed_space_mb = parseFloat((result.freed_space_bytes / 1024 / 1024).toFixed(2));

      logger.info(`✅ Cleanup complete: Deleted ${result.deleted_count} reports, freed ${result.freed_space_mb}MB`);

      return result;

    } catch (error: any) {
      logger.error('Failed to cleanup old reports:', error.message);
      result.errors.push(`Cleanup failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Clean up orphaned report files (files not in database)
   */
  static async cleanupOrphanedReports(reportsDir: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      deleted_count: 0,
      freed_space_bytes: 0,
      freed_space_mb: 0,
      errors: []
    };

    try {
      if (!fs.existsSync(reportsDir)) {
        logger.warn(`Reports directory does not exist: ${reportsDir}`);
        return result;
      }

      const pool = getPool();

      // Get all report paths from database
      const dbReports = await pool.query(
        `SELECT report_path FROM bulk_upload_jobs WHERE report_path IS NOT NULL`
      );

      const dbReportPaths = new Set(dbReports.rows.map(r => r.report_path));

      // Get all files in reports directory
      const files = fs.readdirSync(reportsDir);

      logger.info(`🔍 Checking ${files.length} files in reports directory`);

      for (const file of files) {
        const filePath = path.join(reportsDir, file);

        // Skip directories
        if (!fs.statSync(filePath).isFile()) {
          continue;
        }

        // Skip non-Excel files
        if (!file.endsWith('.xlsx') && !file.endsWith('.xls')) {
          continue;
        }

        // Check if file is in database
        if (!dbReportPaths.has(filePath)) {
          try {
            const stats = fs.statSync(filePath);
            const fileSize = stats.size;

            // Delete orphaned file
            fs.unlinkSync(filePath);
            result.freed_space_bytes += fileSize;
            result.deleted_count++;

            logger.info(`   ✅ Deleted orphaned file: ${file} (${this.formatFileSize(fileSize)})`);

          } catch (error: any) {
            result.errors.push(`Failed to delete ${file}: ${error.message}`);
            logger.error(`   ❌ Failed to delete ${file}:`, error.message);
          }
        }
      }

      result.freed_space_mb = parseFloat((result.freed_space_bytes / 1024 / 1024).toFixed(2));

      logger.info(`✅ Orphaned cleanup complete: Deleted ${result.deleted_count} files, freed ${result.freed_space_mb}MB`);

      return result;

    } catch (error: any) {
      logger.error('Failed to cleanup orphaned reports:', error.message);
      result.errors.push(`Orphaned cleanup failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  /**
   * Check if report exists
   */
  static async reportExists(jobId: string): Promise<boolean> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT report_path FROM bulk_upload_jobs WHERE job_id = $1`,
        [jobId]
      );

      if (result.rows.length === 0 || !result.rows[0].report_path) {
        return false;
      }

      return fs.existsSync(result.rows[0].report_path);

    } catch (error: any) {
      logger.error(`Failed to check if report exists for job ${jobId}:`, error.message);
      return false;
    }
  }

  /**
   * Get report file path
   */
  static async getReportPath(jobId: string): Promise<string | null> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT report_path FROM bulk_upload_jobs WHERE job_id = $1`,
        [jobId]
      );

      if (result.rows.length === 0 || !result.rows[0].report_path) {
        return null;
      }

      const reportPath = result.rows[0].report_path;

      // Verify file exists
      if (!fs.existsSync(reportPath)) {
        logger.warn(`Report file not found: ${reportPath}`);
        return null;
      }

      return reportPath;

    } catch (error: any) {
      logger.error(`Failed to get report path for job ${jobId}:`, error.message);
      return null;
    }
  }

  /**
   * Get reports by date range
   */
  static async getReportsByDateRange(startDate: Date, endDate: Date): Promise<ReportMetadata[]> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT
          job_id,
          report_path,
          report_filename,
          created_at
         FROM bulk_upload_jobs
         WHERE report_path IS NOT NULL
         AND created_at BETWEEN $1 AND $2
         ORDER BY created_at DESC`,
        [startDate, endDate]
      );

      const metadata: ReportMetadata[] = [];

      for (const job of result.rows) {
        let fileSize = 0;
        if (fs.existsSync(job.report_path)) {
          const stats = fs.statSync(job.report_path);
          fileSize = stats.size;
        }

        metadata.push({
          job_id: job.job_id,
          report_path: job.report_path,
          report_filename: job.report_filename,
          file_size_bytes: fileSize,
          created_at: job.created_at,
          access_count: 0,
          is_archived: false,
          retention_days: this.DEFAULT_RETENTION_DAYS
        });
      }

      return metadata;

    } catch (error: any) {
      logger.error('Failed to get reports by date range:', error.message);
      return [];
    }
  }
}

