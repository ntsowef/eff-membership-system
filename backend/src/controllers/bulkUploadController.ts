import { Request, Response } from 'express';
import fs from 'fs';
import { BulkUploadOrchestrator } from '../services/bulk-upload/bulkUploadOrchestrator';
import { sendSuccess, sendError, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { getPool } from '../config/database-hybrid';
import {
  addBulkUploadJob,
  getBulkUploadJobStatus,
  cancelBulkUploadJob,
  retryBulkUploadJob,
  getBulkUploadQueueStats,
  getRecentBulkUploadJobs,
  cleanOldBulkUploadJobs
} from '../services/bulk-upload/bulkUploadQueueService';
import { BulkUploadFileMonitor } from '../services/bulk-upload/bulkUploadFileMonitor';
import { BulkUploadLogger } from '../services/bulk-upload/bulkUploadLogger';
import { BulkUploadReportStorage } from '../services/bulk-upload/bulkUploadReportStorage';
import { IECRateLimitService } from '../services/iecRateLimitService';
import { IECVerificationService } from '../services/bulk-upload/iecVerificationService';

/**
 * Bulk Upload Controller
 * Handles HTTP requests for bulk member uploads
 */
export class BulkUploadController {
  /**
   * Process bulk upload file
   * POST /api/v1/bulk-upload/process
   */
  static async processUpload(req: Request, res: Response): Promise<void> {
    try {
      // Validate file upload
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const uploadedBy = req.user?.email || 'unknown';

      console.log(`📤 Processing bulk upload: ${originalName} by ${uploadedBy}`);

      // Validate file exists and is readable
      const fileValidation = BulkUploadOrchestrator.validateFile(filePath);
      if (!fileValidation.valid) {
        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw new ValidationError(fileValidation.error || 'Invalid file');
      }

      // Generate job ID
      const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const userId = req.user?.id?.toString() || 'unknown';
      const userRole = req.user?.role_name;

      // Get file stats for logging
      const fileStats = fs.statSync(filePath);

      // Log file upload
      await BulkUploadLogger.logFileUpload(
        jobId,
        originalName,
        fileStats.size,
        uploadedBy,
        userId,
        req
      );

      // Add job to queue for async processing
      await addBulkUploadJob({
        jobId,
        filePath,
        fileName: originalName,
        uploadedBy,
        userId,
        userRole,
        userEmail: req.user?.email
      });

      // Create initial database record
      const pool = getPool();
      await pool.query(
        `INSERT INTO bulk_upload_jobs (
          job_id, file_name, uploaded_by, status, uploaded_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [jobId, originalName, uploadedBy, 'pending']
      );

      console.log(`✅ Bulk upload job queued: ${jobId}`);

      // Return immediately with job ID (processing happens async)
      sendSuccess(res, {
        job_id: jobId,
        status: 'pending',
        file_name: originalName,
        message: 'File uploaded successfully. Processing will begin shortly.',
        queue_position: 'Job added to queue'
      }, 'Bulk upload queued successfully');

    } catch (error: any) {
      console.error('❌ Error processing bulk upload:', error);
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      sendError(res, error, error.message || 'Failed to process bulk upload', 500);
    }
  }

  /**
   * Get job status
   * GET /api/v1/bulk-upload/status/:jobId
   */
  static async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const pool = getPool();

      const result = await pool.query(
        `SELECT * FROM bulk_upload_jobs WHERE job_id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Job not found');
      }

      const job = result.rows[0];

      sendSuccess(res, {
        job_id: job.job_id,
        status: job.status,
        file_name: job.file_name,
        uploaded_by: job.uploaded_by,
        uploaded_at: job.uploaded_at,
        processing_start: job.processing_start,
        processing_end: job.processing_end,
        processing_duration_ms: job.processing_duration_ms,
        validation_stats: job.validation_stats,
        database_stats: job.database_stats,
        report_filename: job.report_filename,
        error_message: job.error_message
      }, 'Job status retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting job status:', error);
      sendError(res, error, error.message || 'Failed to get job status', 500);
    }
  }

  /**
   * Download report
   * GET /api/v1/bulk-upload/report/:jobId
   */
  static async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const pool = getPool();

      const result = await pool.query(
        `SELECT report_path, report_filename FROM bulk_upload_jobs WHERE job_id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Job not found');
      }

      const job = result.rows[0];

      if (!job.report_path || !fs.existsSync(job.report_path)) {
        throw new NotFoundError('Report file not found');
      }

      // Log report download
      const userId = req.user?.id?.toString() || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      await BulkUploadLogger.logReportDownloaded(
        jobId,
        userId,
        userEmail,
        job.report_path,
        req
      );

      res.download(job.report_path, job.report_filename);

    } catch (error: any) {
      console.error('❌ Error downloading report:', error);
      sendError(res, error, error.message || 'Failed to download report', 500);
    }
  }

  /**
   * Cancel job
   * POST /api/v1/bulk-upload/cancel/:jobId
   */
  static async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const pool = getPool();

      // Check if job exists
      const result = await pool.query(
        `SELECT status FROM bulk_upload_jobs WHERE job_id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Job not found');
      }

      const job = result.rows[0];

      if (job.status === 'completed' || job.status === 'failed') {
        throw new ValidationError('Cannot cancel completed or failed job');
      }

      // Update job status to cancelled
      await pool.query(
        `UPDATE bulk_upload_jobs SET status = 'cancelled', processing_end = NOW() WHERE job_id = $1`,
        [jobId]
      );

      sendSuccess(res, { job_id: jobId, status: 'cancelled' }, 'Job cancelled successfully');

    } catch (error: any) {
      console.error('❌ Error cancelling job:', error);
      sendError(res, error, error.message || 'Failed to cancel job', 500);
    }
  }

  /**
   * Get upload history
   * GET /api/v1/bulk-upload/history
   */
  static async getUploadHistory(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const uploadedBy = req.user?.email;
      const pool = getPool();

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM bulk_upload_jobs WHERE uploaded_by = $1`,
        [uploadedBy]
      );
      const totalCount = parseInt(countResult.rows[0].count);

      // Get paginated results
      const result = await pool.query(
        `SELECT job_id, file_name, status, uploaded_at, processing_duration_ms,
                validation_stats, database_stats, report_filename, error_message
         FROM bulk_upload_jobs
         WHERE uploaded_by = $1
         ORDER BY uploaded_at DESC
         LIMIT $2 OFFSET $3`,
        [uploadedBy, limit, offset]
      );

      sendSuccess(res, {
        jobs: result.rows,
        pagination: {
          page,
          limit,
          total_count: totalCount,
          total_pages: Math.ceil(totalCount / limit)
        }
      }, 'Upload history retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting upload history:', error);
      sendError(res, error, error.message || 'Failed to get upload history', 500);
    }
  }

  /**
   * Get upload statistics
   * GET /api/v1/bulk-upload/stats
   */
  static async getUploadStats(req: Request, res: Response): Promise<void> {
    try {
      const uploadedBy = req.user?.email;
      const pool = getPool();

      const result = await pool.query(
        `SELECT
          COUNT(*) as total_uploads,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_uploads,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_uploads,
          AVG(processing_duration_ms) FILTER (WHERE status = 'completed') as avg_processing_time_ms,
          SUM((validation_stats->>'total_records')::int) as total_records_processed,
          SUM((database_stats->>'inserts')::int) as total_inserts,
          SUM((database_stats->>'updates')::int) as total_updates
         FROM bulk_upload_jobs
         WHERE uploaded_by = $1`,
        [uploadedBy]
      );

      const stats = result.rows[0];

      sendSuccess(res, {
        total_uploads: parseInt(stats.total_uploads) || 0,
        successful_uploads: parseInt(stats.successful_uploads) || 0,
        failed_uploads: parseInt(stats.failed_uploads) || 0,
        success_rate: stats.total_uploads > 0
          ? ((stats.successful_uploads / stats.total_uploads) * 100).toFixed(2) + '%'
          : '0%',
        avg_processing_time_ms: parseFloat(stats.avg_processing_time_ms) || 0,
        total_records_processed: parseInt(stats.total_records_processed) || 0,
        total_inserts: parseInt(stats.total_inserts) || 0,
        total_updates: parseInt(stats.total_updates) || 0
      }, 'Upload statistics retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting upload stats:', error);
      sendError(res, error, error.message || 'Failed to get upload stats', 500);
    }
  }

  /**
   * Get queue statistics
   * GET /api/v1/bulk-upload/queue/stats
   */
  static async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await getBulkUploadQueueStats();

      sendSuccess(res, stats, 'Queue statistics retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting queue stats:', error);
      sendError(res, error, error.message || 'Failed to get queue stats', 500);
    }
  }

  /**
   * Check IEC API rate limit status
   * GET /api/v1/bulk-upload/rate-limit-status
   *
   * Returns the current IEC API rate limit status.
   * Frontend should call this before allowing uploads to check if uploads are blocked.
   */
  static async getRateLimitStatus(req: Request, res: Response): Promise<void> {
    try {
      const rateLimitStatus = await IECVerificationService.checkRateLimitBeforeUpload();

      sendSuccess(res, {
        is_limited: rateLimitStatus.isLimited,
        uploads_allowed: !rateLimitStatus.isLimited,
        current_count: rateLimitStatus.currentCount,
        max_limit: rateLimitStatus.maxLimit,
        remaining: rateLimitStatus.remaining,
        reset_time: rateLimitStatus.resetTime,
        reset_time_formatted: new Date(rateLimitStatus.resetTime).toISOString(),
        message: rateLimitStatus.message
      }, rateLimitStatus.isLimited
        ? 'Uploads are currently blocked due to IEC API rate limit'
        : 'Uploads are allowed');

    } catch (error: any) {
      console.error('❌ Error checking rate limit status:', error);
      sendError(res, error, error.message || 'Failed to check rate limit status', 500);
    }
  }

  /**
   * Check if uploads are allowed (quick boolean check)
   * GET /api/v1/bulk-upload/can-upload
   *
   * Returns a simple boolean indicating if uploads are currently allowed.
   * This is a lightweight endpoint for frontend to poll before showing upload UI.
   */
  static async canUpload(req: Request, res: Response): Promise<void> {
    try {
      const rateLimitStatus = await IECVerificationService.checkRateLimitBeforeUpload();

      sendSuccess(res, {
        can_upload: !rateLimitStatus.isLimited,
        reason: rateLimitStatus.isLimited
          ? 'IEC API rate limit exceeded'
          : null,
        reset_time: rateLimitStatus.isLimited ? rateLimitStatus.resetTime : null
      }, rateLimitStatus.isLimited ? 'Uploads blocked' : 'Uploads allowed');

    } catch (error: any) {
      console.error('❌ Error checking if uploads allowed:', error);
      // On error, allow uploads (fail open for this check)
      sendSuccess(res, {
        can_upload: true,
        reason: null,
        reset_time: null
      }, 'Uploads allowed (rate limit check failed)');
    }
  }

  /**
   * Get recent queue jobs
   * GET /api/v1/bulk-upload/queue/jobs
   */
  static async getQueueJobs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const jobs = await getRecentBulkUploadJobs(limit);

      sendSuccess(res, { jobs, count: jobs.length }, 'Queue jobs retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting queue jobs:', error);
      sendError(res, error, error.message || 'Failed to get queue jobs', 500);
    }
  }

  /**
   * Retry a failed job
   * POST /api/v1/bulk-upload/queue/retry/:jobId
   */
  static async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const success = await retryBulkUploadJob(jobId);

      if (!success) {
        throw new NotFoundError('Job not found or cannot be retried');
      }

      sendSuccess(res, { job_id: jobId }, 'Job retry initiated successfully');

    } catch (error: any) {
      console.error('❌ Error retrying job:', error);
      sendError(res, error, error.message || 'Failed to retry job', 500);
    }
  }

  /**
   * Clean old jobs from queue
   * POST /api/v1/bulk-upload/queue/clean
   */
  static async cleanQueue(req: Request, res: Response): Promise<void> {
    try {
      const gracePeriodHours = parseInt(req.body.gracePeriodHours) || 24;
      const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;

      const result = await cleanOldBulkUploadJobs(gracePeriodMs);

      sendSuccess(res, result, 'Queue cleaned successfully');

    } catch (error: any) {
      console.error('❌ Error cleaning queue:', error);
      sendError(res, error, error.message || 'Failed to clean queue', 500);
    }
  }

  /**
   * Get file monitor status
   * GET /api/v1/bulk-upload/monitor/status
   */
  static async getMonitorStatus(req: Request, res: Response): Promise<void> {
    try {
      const monitor = BulkUploadFileMonitor.getInstance();
      const status = monitor.getStatus();

      sendSuccess(res, status, 'Monitor status retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting monitor status:', error);
      sendError(res, error, error.message || 'Failed to get monitor status', 500);
    }
  }

  /**
   * Start file monitor
   * POST /api/v1/bulk-upload/monitor/start
   */
  static async startMonitor(req: Request, res: Response): Promise<void> {
    try {
      const monitor = BulkUploadFileMonitor.getInstance();
      await monitor.start();

      // Log monitor started
      const userId = req.user?.id?.toString() || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      const watchDir = monitor.getWatchDirectory();
      await BulkUploadLogger.logMonitorStarted(userId, userEmail, watchDir, req);

      sendSuccess(res, { isRunning: true }, 'File monitor started successfully');

    } catch (error: any) {
      console.error('❌ Error starting monitor:', error);
      sendError(res, error, error.message || 'Failed to start monitor', 500);
    }
  }

  /**
   * Stop file monitor
   * POST /api/v1/bulk-upload/monitor/stop
   */
  static async stopMonitor(req: Request, res: Response): Promise<void> {
    try {
      const monitor = BulkUploadFileMonitor.getInstance();
      await monitor.stop();

      // Log monitor stopped
      const userId = req.user?.id?.toString() || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      await BulkUploadLogger.logMonitorStopped(userId, userEmail, req);

      sendSuccess(res, { isRunning: false }, 'File monitor stopped successfully');

    } catch (error: any) {
      console.error('❌ Error stopping monitor:', error);
      sendError(res, error, error.message || 'Failed to stop monitor', 500);
    }
  }

  /**
   * Manually trigger file processing from watch directory
   * POST /api/v1/bulk-upload/monitor/process
   */
  static async processMonitoredFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileName } = req.body;

      if (!fileName) {
        throw new ValidationError('fileName is required');
      }

      const monitor = BulkUploadFileMonitor.getInstance();
      const watchDir = monitor.getWatchDirectory();
      const filePath = `${watchDir}/${fileName}`;

      // Check file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundError(`File not found: ${fileName}`);
      }

      const uploadedBy = req.user?.email || 'unknown';
      const userId = req.user?.id?.toString() || 'unknown';

      const jobId = await monitor.processFile(filePath, uploadedBy, userId);

      sendSuccess(res, { job_id: jobId, file_name: fileName }, 'File queued for processing');

    } catch (error: any) {
      console.error('❌ Error processing monitored file:', error);
      sendError(res, error, error.message || 'Failed to process file', 500);
    }
  }

  /**
   * Store job result in database
   * @private
   */
  private static async storeJobResult(
    result: any,
    fileName: string,
    uploadedBy: string,
    jobId?: string
  ): Promise<string> {
    const finalJobId = jobId || `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const pool = getPool();

    await pool.query(
      `INSERT INTO bulk_upload_jobs (
        job_id, file_name, uploaded_by, status,
        processing_start, processing_end, processing_duration_ms,
        validation_stats, database_stats,
        report_path, report_filename, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        finalJobId,
        fileName,
        uploadedBy,
        result.status,
        result.processing_start,
        result.processing_end,
        result.processing_duration_ms,
        JSON.stringify(result.validation.validation_stats),
        JSON.stringify(result.database_operations.operation_stats),
        result.report_path,
        result.report_filename,
        result.error_message || null
      ]
    );

    return finalJobId;
  }

  /**
   * Get report storage statistics
   * GET /api/v1/bulk-upload/reports/stats
   */
  static async getReportStorageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await BulkUploadReportStorage.getStorageStats();
      sendSuccess(res, stats, 'Report storage statistics retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting report storage stats:', error);
      sendError(res, error, error.message || 'Failed to get report storage stats', 500);
    }
  }

  /**
   * Get report metadata
   * GET /api/v1/bulk-upload/reports/:jobId/metadata
   */
  static async getReportMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const metadata = await BulkUploadReportStorage.getReportMetadata(jobId);

      if (!metadata) {
        throw new NotFoundError('Report not found');
      }

      sendSuccess(res, metadata, 'Report metadata retrieved successfully');

    } catch (error: any) {
      console.error('❌ Error getting report metadata:', error);
      sendError(res, error, error.message || 'Failed to get report metadata', 500);
    }
  }

  /**
   * Get all report metadata
   * GET /api/v1/bulk-upload/reports/metadata
   */
  static async getAllReportMetadata(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const metadata = await BulkUploadReportStorage.getAllReportMetadata(limit);

      sendSuccess(res, { reports: metadata, count: metadata.length }, 'Report metadata retrieved successfully');

    } catch (error: any) {
      console.error(' Error getting all report metadata:', error);
      sendError(res, error, error.message || 'Failed to get report metadata', 500);
    }
  }

  /**
   * Delete report
   * DELETE /api/v1/bulk-upload/reports/:jobId
   */
  static async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const deleted = await BulkUploadReportStorage.deleteReport(jobId);

      if (!deleted) {
        throw new NotFoundError('Report not found');
      }

      sendSuccess(res, { job_id: jobId }, 'Report deleted successfully');

    } catch (error: any) {
      console.error(' Error deleting report:', error);
      sendError(res, error, error.message || 'Failed to delete report', 500);
    }
  }

  /**
   * Clean up old reports
   * POST /api/v1/bulk-upload/reports/cleanup
   */
  static async cleanupOldReports(req: Request, res: Response): Promise<void> {
    try {
      const retentionDays = parseInt(req.body.retention_days) || 90;

      if (retentionDays < 7) {
        throw new ValidationError('Retention period must be at least 7 days');
      }

      const result = await BulkUploadReportStorage.cleanupOldReports(retentionDays);

      sendSuccess(res, result, `Cleaned up ${result.deleted_count} old reports`);

    } catch (error: any) {
      console.error('Error cleaning up old reports:', error);
      sendError(res, error, error.message || 'Failed to cleanup old reports', 500);
    }
  }

  /**
   * Clean up orphaned reports
   * POST /api/v1/bulk-upload/reports/cleanup-orphaned
   */
  static async cleanupOrphanedReports(req: Request, res: Response): Promise<void> {
    try {
      const reportsDir = req.body.reports_dir || process.env.REPORTS_DIR || 'reports';
      const result = await BulkUploadReportStorage.cleanupOrphanedReports(reportsDir);

      sendSuccess(res, result, `Cleaned up ${result.deleted_count} orphaned reports`);

    } catch (error: any) {
      console.error('Error cleaning up orphaned reports:', error);
      sendError(res, error, error.message || 'Failed to cleanup orphaned reports', 500);
    }
  }

  /**
   * Get reports by date range
   * GET /api/v1/bulk-upload/reports/date-range
   */
  static async getReportsByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const startDate = new Date(req.query.start_date as string);
      const endDate = new Date(req.query.end_date as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
      }

      const reports = await BulkUploadReportStorage.getReportsByDateRange(startDate, endDate);

      sendSuccess(res, { reports, count: reports.length }, 'Reports retrieved successfully');

    } catch (error: any) {
      console.error(' Error getting reports by date range:', error);
      sendError(res, error, error.message || 'Failed to get reports', 500);
    }
  }
}
