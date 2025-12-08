/**
 * Bulk Upload Queue Worker
 * 
 * Processes bulk upload jobs from the Bull queue with:
 * - Controlled concurrency (2 concurrent jobs)
 * - Progress tracking via WebSocket
 * - Automatic retry on failure
 * - Database result storage
 */

import { Job } from 'bull';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { getBulkUploadQueue, BulkUploadJobData } from '../services/bulk-upload/bulkUploadQueueService';
import { BulkUploadOrchestrator, ProgressCallback } from '../services/bulk-upload/bulkUploadOrchestrator';
import { WebSocketService } from '../services/websocketService';
import { getPool } from '../config/database-hybrid';
import { BulkUploadLogger } from '../services/bulk-upload/bulkUploadLogger';

// Concurrency: Process 2 jobs at a time (bulk uploads are resource-intensive)
const CONCURRENCY = 2;

/**
 * Store job result in database
 */
async function storeJobResult(
  pool: Pool,
  jobId: string,
  result: any,
  fileName: string,
  uploadedBy: string
): Promise<void> {
  await pool.query(
    `INSERT INTO bulk_upload_jobs (
      job_id, file_name, uploaded_by, status,
      processing_start, processing_end, processing_duration_ms,
      validation_stats, database_stats,
      report_path, report_filename, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (job_id) DO UPDATE SET
      status = EXCLUDED.status,
      processing_end = EXCLUDED.processing_end,
      processing_duration_ms = EXCLUDED.processing_duration_ms,
      validation_stats = EXCLUDED.validation_stats,
      database_stats = EXCLUDED.database_stats,
      report_path = EXCLUDED.report_path,
      report_filename = EXCLUDED.report_filename,
      error_message = EXCLUDED.error_message`,
    [
      jobId,
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
}

/**
 * Update uploaded_files table status (for self-data-management route compatibility)
 */
async function updateUploadedFilesStatus(
  pool: Pool,
  fileId: number,
  status: 'processing' | 'completed' | 'failed',
  result?: any,
  errorMessage?: string
): Promise<void> {
  if (status === 'completed' && result) {
    const totalRows = result.database_operations?.operation_stats?.total_records || 0;
    const successRows = (result.database_operations?.operation_stats?.inserts || 0) +
                        (result.database_operations?.operation_stats?.updates || 0);
    const failedRows = result.database_operations?.operation_stats?.failures || 0;

    await pool.query(
      `UPDATE uploaded_files SET
        status = $1,
        progress_percentage = 100,
        rows_processed = $2,
        rows_total = $2,
        rows_success = $3,
        rows_failed = $4,
        processing_completed_at = NOW(),
        report_file_path = $5,
        updated_at = NOW()
      WHERE file_id = $6`,
      [status, totalRows, successRows, failedRows, result.report_path || null, fileId]
    );
    console.log(`✅ Updated uploaded_files table: file_id=${fileId}, status=${status}`);
  } else if (status === 'failed') {
    await pool.query(
      `UPDATE uploaded_files SET
        status = $1,
        error_message = $2,
        processing_completed_at = NOW(),
        updated_at = NOW()
      WHERE file_id = $3`,
      [status, errorMessage || 'Unknown error', fileId]
    );
    console.log(`❌ Updated uploaded_files table: file_id=${fileId}, status=${status}`);
  } else if (status === 'processing') {
    await pool.query(
      `UPDATE uploaded_files SET
        status = $1,
        processing_started_at = NOW(),
        updated_at = NOW()
      WHERE file_id = $2`,
      [status, fileId]
    );
    console.log(`🔄 Updated uploaded_files table: file_id=${fileId}, status=${status}`);
  }
}

/**
 * Initialize the worker
 */
export function initializeBulkUploadWorker(): void {
  const queue = getBulkUploadQueue();
  const pool = getPool();

  console.log('🚀 Initializing bulk upload queue worker...');
  console.log(`   Concurrency: ${CONCURRENCY}`);

  // Process jobs
  queue.process(CONCURRENCY, async (job: Job<BulkUploadJobData>) => {
    const { jobId, filePath, fileName, uploadedBy, userId, fileId, userEmail } = job.data;

    console.log(`🔄 [Worker] Processing bulk upload job: ${jobId}`);
    console.log(`   File: ${fileName}`);
    console.log(`   User: ${uploadedBy}`);
    console.log(`   FileId: ${fileId || 'N/A'}`);
    console.log(`   Attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`);

    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get reports directory
      const repoRoot = path.join(__dirname, '..', '..', '..');
      const reportsDir = path.join(repoRoot, 'reports');

      // Ensure reports directory exists
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Update uploaded_files status to processing (if fileId provided)
      if (fileId) {
        await updateUploadedFilesStatus(pool, fileId, 'processing');
      }

      // Log processing started
      await BulkUploadLogger.logProcessingStarted(jobId, fileName, userId);

      // Create progress callback for WebSocket updates and logging
      const progressCallback: ProgressCallback = (stage: string, progress: number, message: string) => {
        // Update Bull job progress
        job.progress(progress);

        // Send WebSocket update - use fileId if available (for self-data-management route)
        // Otherwise use jobId (for bulk-upload route)
        const wsIdentifier = fileId || jobId;
        WebSocketService.sendBulkUploadProgress(wsIdentifier, {
          progress,
          rows_processed: 0,
          rows_total: 0,
          message: `${stage}: ${message}`,
          status: 'processing',
          stage // Include stage for frontend color coding
        });

        // Log processing stage
        BulkUploadLogger.logProcessingStage(jobId, stage, progress, message);
      };

      // Create orchestrator
      const orchestrator = new BulkUploadOrchestrator({
        dbPool: pool,
        reportsDir,
        iecVerificationEnabled: process.env.IEC_VERIFICATION_ENABLED !== 'false',
        progressCallback,
        userEmail,
        userName: uploadedBy
      });

      // Process upload
      const result = await orchestrator.processUpload(filePath, uploadedBy);

      // Store result in database
      await storeJobResult(pool, jobId, result, fileName, uploadedBy);

      // Update uploaded_files status to completed (if fileId provided)
      if (fileId) {
        await updateUploadedFilesStatus(pool, fileId, 'completed', result);
      }

      // Log processing completed
      await BulkUploadLogger.logProcessingCompleted(
        jobId,
        fileName,
        userId,
        result.validation.validation_stats,
        result.database_operations.operation_stats,
        result.processing_duration_ms
      );

      // Log performance metrics
      const totalRows = result.validation.validation_stats.total_records || 0;
      const validRows = result.validation.validation_stats.valid_ids || 0;
      const invalidRows = result.validation.validation_stats.invalid_ids || 0;

      await BulkUploadLogger.logPerformanceMetrics({
        job_id: jobId,
        file_size_bytes: fs.statSync(filePath).size,
        total_rows: totalRows,
        valid_rows: validRows,
        invalid_rows: invalidRows,
        processing_duration_ms: result.processing_duration_ms,
        throughput_rows_per_second: totalRows > 0 ? totalRows / (result.processing_duration_ms / 1000) : 0
      });

      // Send completion notification via WebSocket - use fileId if available
      const wsIdentifier = fileId || jobId;
      WebSocketService.sendBulkUploadComplete(wsIdentifier, {
        rows_success: result.database_operations.operation_stats.inserts + result.database_operations.operation_stats.updates,
        rows_failed: result.database_operations.operation_stats.failures,
        rows_total: result.database_operations.operation_stats.total_records,
        errors: result.database_operations.failed_operations
      });

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up uploaded file: ${filePath}`);
      }

      // Mark job as complete
      await job.progress(100);

      console.log(`✅ [Worker] Bulk upload job completed: ${jobId}`);
      console.log(`   Duration: ${result.processing_duration_ms}ms`);
      console.log(`   Inserts: ${result.database_operations.operation_stats.inserts}`);
      console.log(`   Updates: ${result.database_operations.operation_stats.updates}`);

      return {
        success: true,
        jobId,
        status: result.status,
        processing_duration_ms: result.processing_duration_ms,
        validation_stats: result.validation.validation_stats,
        database_stats: result.database_operations.operation_stats
      };

    } catch (error: any) {
      console.error(`❌ [Worker] Bulk upload job failed: ${jobId}`, error.message);

      // Update uploaded_files status to failed (if fileId provided)
      if (fileId) {
        await updateUploadedFilesStatus(pool, fileId, 'failed', undefined, error.message);
      }

      // Log processing failed
      await BulkUploadLogger.logProcessingFailed(
        jobId,
        fileName,
        userId,
        'processing',
        error.message
      );

      // Send failure notification via WebSocket
      WebSocketService.sendBulkUploadFailed(jobId, userId, {
        error: error.message || 'Processing failed',
        stage: 'processing'
      });

      // Also send error event for frontend compatibility (uses file_id for self-data-management route)
      if (fileId) {
        WebSocketService.sendBulkUploadError(fileId, error.message || 'Processing failed');
      }

      // Clean up uploaded file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Re-throw error for Bull to handle retry logic
      throw error;
    }
  });

  console.log('✅ Bulk upload queue worker initialized');
}

