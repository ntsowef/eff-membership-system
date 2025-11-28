/**
 * Bulk Upload Logger Service
 * 
 * Comprehensive logging and audit trail for bulk upload operations:
 * - User action logging (upload, cancel, retry, download)
 * - Processing stage logging
 * - Error tracking and reporting
 * - Performance metrics logging
 * - Integration with existing audit infrastructure
 */

import { Request } from 'express';
import { logAudit, logSystemAction } from '../../middleware/auditLogger';
import { getPool } from '../../config/database-hybrid';
import { logger } from '../../utils/logger';

// Bulk upload action types
export enum BulkUploadAction {
  FILE_UPLOADED = 'bulk_upload.file_uploaded',
  FILE_DETECTED = 'bulk_upload.file_detected',
  PROCESSING_STARTED = 'bulk_upload.processing_started',
  PROCESSING_STAGE = 'bulk_upload.processing_stage',
  PROCESSING_COMPLETED = 'bulk_upload.processing_completed',
  PROCESSING_FAILED = 'bulk_upload.processing_failed',
  JOB_CANCELLED = 'bulk_upload.job_cancelled',
  JOB_RETRIED = 'bulk_upload.job_retried',
  REPORT_DOWNLOADED = 'bulk_upload.report_downloaded',
  QUEUE_CLEANED = 'bulk_upload.queue_cleaned',
  MONITOR_STARTED = 'bulk_upload.monitor_started',
  MONITOR_STOPPED = 'bulk_upload.monitor_stopped',
  FILE_VALIDATION_FAILED = 'bulk_upload.file_validation_failed',
  DUPLICATE_DETECTED = 'bulk_upload.duplicate_detected'
}

// Log entry interface
export interface BulkUploadLogEntry {
  job_id: string;
  action: BulkUploadAction;
  user_id?: string;
  user_email?: string;
  file_name?: string;
  file_size?: number;
  stage?: string;
  progress?: number;
  status?: string;
  error_message?: string;
  validation_stats?: any;
  database_stats?: any;
  processing_duration_ms?: number;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
}

// Performance metrics interface
export interface BulkUploadPerformanceMetrics {
  job_id: string;
  file_size_bytes: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  processing_duration_ms: number;
  file_reading_ms?: number;
  validation_ms?: number;
  iec_verification_ms?: number;
  database_operations_ms?: number;
  report_generation_ms?: number;
  throughput_rows_per_second?: number;
}

export class BulkUploadLogger {
  /**
   * Log file upload action
   */
  static async logFileUpload(
    jobId: string,
    fileName: string,
    fileSize: number,
    uploadedBy: string,
    userId: string,
    req?: Request
  ): Promise<void> {
    try {
      // Log to audit trail
      await logAudit(
        parseInt(userId) || undefined,
        BulkUploadAction.FILE_UPLOADED,
        'bulk_upload_job',
        undefined,
        undefined,
        { job_id: jobId, file_name: fileName, file_size: fileSize },
        req
      );

      // Log to bulk upload logs table
      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.FILE_UPLOADED,
        user_id: userId,
        user_email: uploadedBy,
        file_name: fileName,
        file_size: fileSize,
        status: 'pending',
        ip_address: req ? this.getClientIP(req) : undefined,
        user_agent: req?.headers['user-agent']
      });

      // Console log
      logger.info(`📤 File uploaded: ${fileName} (${this.formatFileSize(fileSize)}) by ${uploadedBy} - Job ID: ${jobId}`);

    } catch (error: any) {
      logger.error('Failed to log file upload:', error.message);
    }
  }

  /**
   * Log file detection by monitor
   */
  static async logFileDetection(
    jobId: string,
    fileName: string,
    fileSize: number,
    watchDir: string
  ): Promise<void> {
    try {
      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.FILE_DETECTED,
        user_id: 'system',
        user_email: 'file-monitor',
        file_name: fileName,
        file_size: fileSize,
        status: 'pending',
        metadata: { watch_directory: watchDir }
      });

      logger.info(`📁 File detected: ${fileName} (${this.formatFileSize(fileSize)}) in ${watchDir} - Job ID: ${jobId}`);

    } catch (error: any) {
      logger.error('Failed to log file detection:', error.message);
    }
  }

  /**
   * Log processing started
   */
  static async logProcessingStarted(
    jobId: string,
    fileName: string,
    userId: string
  ): Promise<void> {
    try {
      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.PROCESSING_STARTED,
        user_id: userId,
        file_name: fileName,
        status: 'processing',
        stage: 'initialization'
      });

      logger.info(`🔄 Processing started: ${fileName} - Job ID: ${jobId}`);

    } catch (error: any) {
      logger.error('Failed to log processing started:', error.message);
    }
  }

  /**
   * Log processing stage
   */
  static async logProcessingStage(
    jobId: string,
    stage: string,
    progress: number,
    message: string
  ): Promise<void> {
    try {
      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.PROCESSING_STAGE,
        stage,
        progress,
        status: 'processing',
        metadata: { message }
      });

      logger.debug(`⏳ [${jobId}] ${stage}: ${progress}% - ${message}`);

    } catch (error: any) {
      logger.error('Failed to log processing stage:', error.message);
    }
  }

  /**
   * Log processing completed
   */
  static async logProcessingCompleted(
    jobId: string,
    fileName: string,
    userId: string,
    validationStats: any,
    databaseStats: any,
    processingDurationMs: number
  ): Promise<void> {
    try {
      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.PROCESSING_COMPLETED,
        user_id: userId,
        file_name: fileName,
        status: 'completed',
        validation_stats: validationStats,
        database_stats: databaseStats,
        processing_duration_ms: processingDurationMs
      });

      logger.info(`✅ Processing completed: ${fileName} - Job ID: ${jobId} - Duration: ${processingDurationMs}ms`);

    } catch (error: any) {
      logger.error('Failed to log processing completed:', error.message);
    }
  }

  /**
   * Log processing failed
   */
  static async logProcessingFailed(
    jobId: string,
    fileName: string,
    userId: string,
    stage: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.PROCESSING_FAILED,
        user_id: userId,
        file_name: fileName,
        status: 'failed',
        stage,
        error_message: errorMessage
      });

      logger.error(`❌ Processing failed: ${fileName} - Job ID: ${jobId} - Stage: ${stage} - Error: ${errorMessage}`);

    } catch (error: any) {
      logger.error('Failed to log processing failed:', error.message);
    }
  }

  /**
   * Log job cancelled
   */
  static async logJobCancelled(
    jobId: string,
    userId: string,
    userEmail: string,
    req?: Request
  ): Promise<void> {
    try {
      await logAudit(
        parseInt(userId) || undefined,
        BulkUploadAction.JOB_CANCELLED,
        'bulk_upload_job',
        undefined,
        undefined,
        { job_id: jobId },
        req
      );

      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.JOB_CANCELLED,
        user_id: userId,
        user_email: userEmail,
        status: 'cancelled',
        ip_address: req ? this.getClientIP(req) : undefined,
        user_agent: req?.headers['user-agent']
      });

      logger.info(`🚫 Job cancelled: ${jobId} by ${userEmail}`);

    } catch (error: any) {
      logger.error('Failed to log job cancelled:', error.message);
    }
  }

  /**
   * Log job retried
   */
  static async logJobRetried(
    jobId: string,
    userId: string,
    userEmail: string,
    req?: Request
  ): Promise<void> {
    try {
      await logAudit(
        parseInt(userId) || undefined,
        BulkUploadAction.JOB_RETRIED,
        'bulk_upload_job',
        undefined,
        undefined,
        { job_id: jobId },
        req
      );

      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.JOB_RETRIED,
        user_id: userId,
        user_email: userEmail,
        status: 'pending',
        ip_address: req ? this.getClientIP(req) : undefined,
        user_agent: req?.headers['user-agent']
      });

      logger.info(`🔄 Job retried: ${jobId} by ${userEmail}`);

    } catch (error: any) {
      logger.error('Failed to log job retried:', error.message);
    }
  }

  /**
   * Log report downloaded
   */
  static async logReportDownloaded(
    jobId: string,
    userId: string,
    userEmail: string,
    reportPath: string,
    req?: Request
  ): Promise<void> {
    try {
      await logAudit(
        parseInt(userId) || undefined,
        BulkUploadAction.REPORT_DOWNLOADED,
        'bulk_upload_job',
        undefined,
        undefined,
        { job_id: jobId, report_path: reportPath },
        req
      );

      await this.createLogEntry({
        job_id: jobId,
        action: BulkUploadAction.REPORT_DOWNLOADED,
        user_id: userId,
        user_email: userEmail,
        ip_address: req ? this.getClientIP(req) : undefined,
        user_agent: req?.headers['user-agent'],
        metadata: { report_path: reportPath }
      });

      logger.info(`📥 Report downloaded: ${jobId} by ${userEmail}`);

    } catch (error: any) {
      logger.error('Failed to log report downloaded:', error.message);
    }
  }

  /**
   * Log file validation failed
   */
  static async logFileValidationFailed(
    fileName: string,
    reason: string,
    userId?: string,
    userEmail?: string
  ): Promise<void> {
    try {
      await this.createLogEntry({
        job_id: `validation-failed-${Date.now()}`,
        action: BulkUploadAction.FILE_VALIDATION_FAILED,
        user_id: userId,
        user_email: userEmail,
        file_name: fileName,
        status: 'failed',
        error_message: reason
      });

      logger.warn(`⚠️ File validation failed: ${fileName} - Reason: ${reason}`);

    } catch (error: any) {
      logger.error('Failed to log file validation failed:', error.message);
    }
  }

  /**
   * Log duplicate file detected
   */
  static async logDuplicateDetected(
    fileName: string,
    existingJobId: string
  ): Promise<void> {
    try {
      await this.createLogEntry({
        job_id: `duplicate-${Date.now()}`,
        action: BulkUploadAction.DUPLICATE_DETECTED,
        file_name: fileName,
        status: 'rejected',
        metadata: { existing_job_id: existingJobId }
      });

      logger.warn(`⚠️ Duplicate file detected: ${fileName} - Existing job: ${existingJobId}`);

    } catch (error: any) {
      logger.error('Failed to log duplicate detected:', error.message);
    }
  }

  /**
   * Log monitor started
   */
  static async logMonitorStarted(
    userId: string,
    userEmail: string,
    watchDir: string,
    req?: Request
  ): Promise<void> {
    try {
      await logSystemAction(
        parseInt(userId) || undefined,
        BulkUploadAction.MONITOR_STARTED,
        { watch_directory: watchDir },
        req
      );

      logger.info(`▶️ File monitor started by ${userEmail} - Watch directory: ${watchDir}`);

    } catch (error: any) {
      logger.error('Failed to log monitor started:', error.message);
    }
  }

  /**
   * Log monitor stopped
   */
  static async logMonitorStopped(
    userId: string,
    userEmail: string,
    req?: Request
  ): Promise<void> {
    try {
      await logSystemAction(
        parseInt(userId) || undefined,
        BulkUploadAction.MONITOR_STOPPED,
        {},
        req
      );

      logger.info(`⏸️ File monitor stopped by ${userEmail}`);

    } catch (error: any) {
      logger.error('Failed to log monitor stopped:', error.message);
    }
  }

  /**
   * Log queue cleaned
   */
  static async logQueueCleaned(
    userId: string,
    userEmail: string,
    cleanedCount: number,
    req?: Request
  ): Promise<void> {
    try {
      await logSystemAction(
        parseInt(userId) || undefined,
        BulkUploadAction.QUEUE_CLEANED,
        { cleaned_count: cleanedCount },
        req
      );

      logger.info(`🧹 Queue cleaned by ${userEmail} - Removed ${cleanedCount} jobs`);

    } catch (error: any) {
      logger.error('Failed to log queue cleaned:', error.message);
    }
  }

  /**
   * Log performance metrics
   */
  static async logPerformanceMetrics(metrics: BulkUploadPerformanceMetrics): Promise<void> {
    try {
      const pool = getPool();

      await pool.query(
        `INSERT INTO bulk_upload_performance_metrics (
          job_id, file_size_bytes, total_rows, valid_rows, invalid_rows,
          processing_duration_ms, file_reading_ms, validation_ms,
          iec_verification_ms, database_operations_ms, report_generation_ms,
          throughput_rows_per_second, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          metrics.job_id,
          metrics.file_size_bytes,
          metrics.total_rows,
          metrics.valid_rows,
          metrics.invalid_rows,
          metrics.processing_duration_ms,
          metrics.file_reading_ms || null,
          metrics.validation_ms || null,
          metrics.iec_verification_ms || null,
          metrics.database_operations_ms || null,
          metrics.report_generation_ms || null,
          metrics.throughput_rows_per_second || null
        ]
      );

      logger.info(`📊 Performance metrics logged: ${metrics.job_id} - ${metrics.throughput_rows_per_second?.toFixed(2)} rows/sec`);

    } catch (error: any) {
      logger.error('Failed to log performance metrics:', error.message);
    }
  }

  /**
   * Create log entry in bulk_upload_logs table
   */
  private static async createLogEntry(entry: BulkUploadLogEntry): Promise<void> {
    try {
      const pool = getPool();

      await pool.query(
        `INSERT INTO bulk_upload_logs (
          job_id, action, user_id, user_email, file_name, file_size,
          stage, progress, status, error_message, validation_stats,
          database_stats, processing_duration_ms, ip_address, user_agent,
          metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
        [
          entry.job_id,
          entry.action,
          entry.user_id || null,
          entry.user_email || null,
          entry.file_name || null,
          entry.file_size || null,
          entry.stage || null,
          entry.progress || null,
          entry.status || null,
          entry.error_message || null,
          entry.validation_stats ? JSON.stringify(entry.validation_stats) : null,
          entry.database_stats ? JSON.stringify(entry.database_stats) : null,
          entry.processing_duration_ms || null,
          entry.ip_address || null,
          entry.user_agent || null,
          entry.metadata ? JSON.stringify(entry.metadata) : null
        ]
      );

    } catch (error: any) {
      // Don't throw errors for logging to prevent disrupting main operations
      logger.error('Failed to create log entry:', error.message);
    }
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(req: Request): string | undefined {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress
    );
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  /**
   * Get logs for a specific job
   */
  static async getJobLogs(jobId: string): Promise<BulkUploadLogEntry[]> {
    try {
      const pool = getPool();

      const result = await pool.query(
        `SELECT * FROM bulk_upload_logs
         WHERE job_id = $1
         ORDER BY created_at ASC`,
        [jobId]
      );

      return result.rows;

    } catch (error: any) {
      logger.error('Failed to get job logs:', error.message);
      return [];
    }
  }

  /**
   * Get recent logs
   */
  static async getRecentLogs(limit: number = 100): Promise<BulkUploadLogEntry[]> {
    try {
      const pool = getPool();

      const result = await pool.query(
        `SELECT * FROM bulk_upload_logs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;

    } catch (error: any) {
      logger.error('Failed to get recent logs:', error.message);
      return [];
    }
  }

  /**
   * Get logs by action
   */
  static async getLogsByAction(action: BulkUploadAction, limit: number = 100): Promise<BulkUploadLogEntry[]> {
    try {
      const pool = getPool();

      const result = await pool.query(
        `SELECT * FROM bulk_upload_logs
         WHERE action = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [action, limit]
      );

      return result.rows;

    } catch (error: any) {
      logger.error('Failed to get logs by action:', error.message);
      return [];
    }
  }

  /**
   * Get logs by user
   */
  static async getLogsByUser(userId: string, limit: number = 100): Promise<BulkUploadLogEntry[]> {
    try {
      const pool = getPool();

      const result = await pool.query(
        `SELECT * FROM bulk_upload_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;

    } catch (error: any) {
      logger.error('Failed to get logs by user:', error.message);
      return [];
    }
  }

  /**
   * Clean old logs
   */
  static async cleanOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const pool = getPool();

      const result = await pool.query(
        `DELETE FROM bulk_upload_logs
         WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`
      );

      const deletedCount = result.rowCount || 0;
      logger.info(`🧹 Cleaned ${deletedCount} old log entries (retention: ${retentionDays} days)`);

      return deletedCount;

    } catch (error: any) {
      logger.error('Failed to clean old logs:', error.message);
      return 0;
    }
  }
}

