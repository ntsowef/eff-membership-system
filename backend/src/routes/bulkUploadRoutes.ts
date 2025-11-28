import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, requirePermission } from '../middleware/auth';
import { asyncHandler, sendSuccess, sendError } from '../middleware/responseHandler';
import { ValidationError } from '../middleware/errorHandler';
import { BulkUploadController } from '../controllers/bulkUploadController';

const router = Router();

// =====================================================================================
// MULTER CONFIGURATION
// =====================================================================================

// Use repository root _upload_file_directory for bulk uploads
const repoRoot = path.join(__dirname, '..', '..', '..');
const uploadDir = path.join(repoRoot, process.env.UPLOAD_DIR || '_upload_file_directory');

console.log('📂 [Bulk Upload Routes] Upload directory:', uploadDir);

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created upload directory:', uploadDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    const filename = `bulk-upload-${timestamp}-${random}${ext}`;
    cb(null, filename);
  }
});

// File filter for Excel files only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Invalid file type. Only Excel files (.xlsx, .xls) are allowed'));
  }
};

// Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// =====================================================================================
// ROUTES
// =====================================================================================

/**
 * POST /api/v1/bulk-upload/process
 * Upload and process bulk member upload file
 * 
 * @requires authentication
 * @requires permission: members.create
 * @body file - Excel file (.xlsx, .xls)
 * @body ward_number - Optional ward number for filtering
 * @returns Processing job details with job_id
 */
router.post('/process',
  authenticate,
  requirePermission('members.create'),
  upload.single('file'),
  asyncHandler(BulkUploadController.processUpload)
);

/**
 * GET /api/v1/bulk-upload/status/:jobId
 * Get processing status for a bulk upload job
 * 
 * @requires authentication
 * @requires permission: members.read
 * @param jobId - Job ID returned from /process endpoint
 * @returns Job status, progress, and results
 */
router.get('/status/:jobId',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getJobStatus)
);

/**
 * GET /api/v1/bulk-upload/report/:jobId
 * Download Excel report for a completed bulk upload job
 * 
 * @requires authentication
 * @requires permission: members.read
 * @param jobId - Job ID returned from /process endpoint
 * @returns Excel file download
 */
router.get('/report/:jobId',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.downloadReport)
);

/**
 * POST /api/v1/bulk-upload/cancel/:jobId
 * Cancel a running bulk upload job
 * 
 * @requires authentication
 * @requires permission: members.create
 * @param jobId - Job ID to cancel
 * @returns Cancellation confirmation
 */
router.post('/cancel/:jobId',
  authenticate,
  requirePermission('members.create'),
  asyncHandler(BulkUploadController.cancelJob)
);

/**
 * GET /api/v1/bulk-upload/history
 * Get bulk upload history for the authenticated user
 * 
 * @requires authentication
 * @requires permission: members.read
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @returns Paginated list of bulk upload jobs
 */
router.get('/history',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getUploadHistory)
);

/**
 * GET /api/v1/bulk-upload/stats
 * Get bulk upload statistics
 *
 * @requires authentication
 * @requires permission: members.read
 * @returns Upload statistics (total uploads, success rate, etc.)
 */
router.get('/stats',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getUploadStats)
);

/**
 * GET /api/v1/bulk-upload/queue/stats
 * Get queue statistics (waiting, active, completed, failed jobs)
 *
 * @requires authentication
 * @requires permission: members.read
 * @returns Queue statistics
 */
router.get('/queue/stats',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getQueueStats)
);

/**
 * GET /api/v1/bulk-upload/rate-limit-status
 * Get IEC API rate limit status
 *
 * Frontend should call this before allowing uploads to check if uploads are blocked.
 *
 * @requires authentication
 * @requires permission: members.read
 * @returns Rate limit status (is_limited, uploads_allowed, reset_time, etc.)
 */
router.get('/rate-limit-status',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getRateLimitStatus)
);

/**
 * GET /api/v1/bulk-upload/can-upload
 * Quick check if uploads are currently allowed
 *
 * Lightweight endpoint for frontend to poll before showing upload UI.
 *
 * @requires authentication
 * @requires permission: members.read
 * @returns { can_upload: boolean, reason: string | null, reset_time: number | null }
 */
router.get('/can-upload',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.canUpload)
);

/**
 * GET /api/v1/bulk-upload/queue/jobs
 * Get recent jobs from the queue
 *
 * @requires authentication
 * @requires permission: members.read
 * @query limit - Number of jobs to return (default: 20)
 * @returns List of recent jobs
 */
router.get('/queue/jobs',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getQueueJobs)
);

/**
 * POST /api/v1/bulk-upload/queue/retry/:jobId
 * Retry a failed job
 *
 * @requires authentication
 * @requires permission: members.create
 * @param jobId - Job ID to retry
 * @returns Retry confirmation
 */
router.post('/queue/retry/:jobId',
  authenticate,
  requirePermission('members.create'),
  asyncHandler(BulkUploadController.retryJob)
);

/**
 * POST /api/v1/bulk-upload/queue/clean
 * Clean old completed and failed jobs from queue
 *
 * @requires authentication
 * @requires permission: members.delete
 * @body gracePeriodHours - Hours to keep jobs (default: 24)
 * @returns Cleanup statistics
 */
router.post('/queue/clean',
  authenticate,
  requirePermission('members.delete'),
  asyncHandler(BulkUploadController.cleanQueue)
);

/**
 * GET /api/v1/bulk-upload/monitor/status
 * Get file monitor status
 *
 * @requires authentication
 * @requires permission: members.read
 * @returns Monitor status (isRunning, watchDir, enabled)
 */
router.get('/monitor/status',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getMonitorStatus)
);

/**
 * POST /api/v1/bulk-upload/monitor/start
 * Start file monitor
 *
 * @requires authentication
 * @requires permission: members.create
 * @returns Start confirmation
 */
router.post('/monitor/start',
  authenticate,
  requirePermission('members.create'),
  asyncHandler(BulkUploadController.startMonitor)
);

/**
 * POST /api/v1/bulk-upload/monitor/stop
 * Stop file monitor
 *
 * @requires authentication
 * @requires permission: members.create
 * @returns Stop confirmation
 */
router.post('/monitor/stop',
  authenticate,
  requirePermission('members.create'),
  asyncHandler(BulkUploadController.stopMonitor)
);

/**
 * POST /api/v1/bulk-upload/monitor/process
 * Manually trigger processing of a file in watch directory
 *
 * @requires authentication
 * @requires permission: members.create
 * @body fileName - Name of file in watch directory
 * @returns Job ID
 */
router.post('/monitor/process',
  authenticate,
  requirePermission('members.create'),
  asyncHandler(BulkUploadController.processMonitoredFile)
);

/**
 * GET /api/v1/bulk-upload/reports/stats
 * Get report storage statistics
 *
 * @requires authentication
 * @requires permission: members.read
 * @returns Storage statistics (total reports, size, etc.)
 */
router.get('/reports/stats',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getReportStorageStats)
);

/**
 * GET /api/v1/bulk-upload/reports/metadata
 * Get all report metadata
 *
 * @requires authentication
 * @requires permission: members.read
 * @query limit - Number of reports to return (default: 100)
 * @returns List of report metadata
 */
router.get('/reports/metadata',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getAllReportMetadata)
);

/**
 * GET /api/v1/bulk-upload/reports/:jobId/metadata
 * Get report metadata for specific job
 *
 * @requires authentication
 * @requires permission: members.read
 * @param jobId - Job ID
 * @returns Report metadata
 */
router.get('/reports/:jobId/metadata',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getReportMetadata)
);

/**
 * DELETE /api/v1/bulk-upload/reports/:jobId
 * Delete report file
 *
 * @requires authentication
 * @requires permission: members.delete
 * @param jobId - Job ID
 * @returns Deletion confirmation
 */
router.delete('/reports/:jobId',
  authenticate,
  requirePermission('members.delete'),
  asyncHandler(BulkUploadController.deleteReport)
);

/**
 * POST /api/v1/bulk-upload/reports/cleanup
 * Clean up old reports based on retention policy
 *
 * @requires authentication
 * @requires permission: members.delete
 * @body retention_days - Days to retain reports (default: 90, minimum: 7)
 * @returns Cleanup statistics
 */
router.post('/reports/cleanup',
  authenticate,
  requirePermission('members.delete'),
  asyncHandler(BulkUploadController.cleanupOldReports)
);

/**
 * POST /api/v1/bulk-upload/reports/cleanup-orphaned
 * Clean up orphaned report files (files not in database)
 *
 * @requires authentication
 * @requires permission: members.delete
 * @body reports_dir - Reports directory path (optional)
 * @returns Cleanup statistics
 */
router.post('/reports/cleanup-orphaned',
  authenticate,
  requirePermission('members.delete'),
  asyncHandler(BulkUploadController.cleanupOrphanedReports)
);

/**
 * GET /api/v1/bulk-upload/reports/date-range
 * Get reports by date range
 *
 * @requires authentication
 * @requires permission: members.read
 * @query start_date - Start date (ISO 8601 format)
 * @query end_date - End date (ISO 8601 format)
 * @returns List of reports in date range
 */
router.get('/reports/date-range',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(BulkUploadController.getReportsByDateRange)
);

export default router;

