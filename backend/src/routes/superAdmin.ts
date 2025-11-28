import express, { Request, Response, NextFunction } from 'express';
import { authenticate, requireSuperAdminOnly } from '../middleware/auth';
import { SuperAdminService } from '../services/superAdminService';
import { LookupDataService } from '../services/lookupDataService';
import { asyncHandler, sendSuccess, sendError } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication and super admin authorization to all routes
router.use(authenticate);
router.use(requireSuperAdminOnly());

/**
 * @route   GET /api/v1/super-admin/dashboard
 * @desc    Get aggregated dashboard data
 * @access  Super Admin Only
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const dashboardData = await SuperAdminService.getDashboardData();
  sendSuccess(res, dashboardData, 'Dashboard data retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/system/health
 * @desc    Get system health status
 * @access  Super Admin Only
 */
router.get('/system/health', asyncHandler(async (req: Request, res: Response) => {
  const health = await SuperAdminService.getDashboardData();
  sendSuccess(res, health.system_health, 'System health retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/redis/status
 * @desc    Get detailed Redis metrics
 * @access  Super Admin Only
 */
router.get('/redis/status', asyncHandler(async (req: Request, res: Response) => {
  const redisMetrics = await SuperAdminService.getRedisMetrics();
  sendSuccess(res, redisMetrics, 'Redis metrics retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/database/connections
 * @desc    Get database connection statistics
 * @access  Super Admin Only
 */
router.get('/database/connections', asyncHandler(async (req: Request, res: Response) => {
  const connectionStats = await SuperAdminService.getDatabaseConnectionStats();
  sendSuccess(res, connectionStats, 'Database connection stats retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/queue/jobs
 * @desc    Get all queue jobs with filtering
 * @access  Super Admin Only
 */
router.get('/queue/jobs', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    queueType: req.query.queueType as 'upload' | 'renewal' | 'all',
    status: req.query.status as any,
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0
  };

  const jobs = await SuperAdminService.getAllQueueJobs(filters);
  sendSuccess(res, jobs, 'Queue jobs retrieved successfully');
}));

/**
 * @route   POST /api/v1/super-admin/queue/retry/:jobId
 * @desc    Retry a failed job
 * @access  Super Admin Only
 */
router.post('/queue/retry/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { queueType } = req.body;

  if (!queueType || !['upload', 'renewal'].includes(queueType)) {
    return sendError(res, new Error('Invalid queue type. Must be "upload" or "renewal"'), undefined, 400);
  }

  const result = await SuperAdminService.retryJob(jobId, queueType);
  sendSuccess(res, result, 'Job retry initiated successfully');
}));

/**
 * @route   POST /api/v1/super-admin/queue/cancel/:jobId
 * @desc    Cancel a job
 * @access  Super Admin Only
 */
router.post('/queue/cancel/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { queueType } = req.body;

  if (!queueType || !['upload', 'renewal'].includes(queueType)) {
    return sendError(res, new Error('Invalid queue type. Must be "upload" or "renewal"'), undefined, 400);
  }

  const result = await SuperAdminService.cancelJob(jobId, queueType);
  sendSuccess(res, result, 'Job cancelled successfully');
}));

/**
 * @route   POST /api/v1/super-admin/queue/pause
 * @desc    Pause queue processing
 * @access  Super Admin Only
 */
router.post('/queue/pause', asyncHandler(async (req: Request, res: Response) => {
  const { queueType } = req.body;

  if (!queueType || !['upload', 'renewal'].includes(queueType)) {
    return sendError(res, new Error('Invalid queue type. Must be "upload" or "renewal"'), undefined, 400);
  }

  const result = await SuperAdminService.pauseQueue(queueType);
  sendSuccess(res, result, 'Queue paused successfully');
}));

/**
 * @route   POST /api/v1/super-admin/queue/resume
 * @desc    Resume queue processing
 * @access  Super Admin Only
 */
router.post('/queue/resume', asyncHandler(async (req: Request, res: Response) => {
  const { queueType } = req.body;

  if (!queueType || !['upload', 'renewal'].includes(queueType)) {
    return sendError(res, new Error('Invalid queue type. Must be "upload" or "renewal"'), undefined, 400);
  }

  const result = await SuperAdminService.resumeQueue(queueType);
  sendSuccess(res, result, 'Queue resumed successfully');
}));

/**
 * @route   GET /api/v1/super-admin/uploads/all
 * @desc    Get all uploads across the system
 * @access  Super Admin Only
 */
router.get('/uploads/all', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    status: req.query.status as string,
    uploadType: req.query.uploadType as 'member_application' | 'renewal',
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0
  };

  const uploads = await SuperAdminService.getAllUploads(filters);
  sendSuccess(res, uploads, 'Uploads retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/uploads/statistics
 * @desc    Get upload statistics
 * @access  Super Admin Only
 */
router.get('/uploads/statistics', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string
  };

  const statistics = await SuperAdminService.getUploadStatistics(filters);
  sendSuccess(res, statistics, 'Upload statistics retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/sessions/active
 * @desc    Get all active user sessions
 * @access  Super Admin Only
 */
router.get('/sessions/active', asyncHandler(async (req: Request, res: Response) => {
  const sessions = await SuperAdminService.getActiveSessions();
  sendSuccess(res, sessions, 'Active sessions retrieved successfully');
}));

/**
 * @route   POST /api/v1/super-admin/sessions/terminate/:sessionId
 * @desc    Terminate a user session
 * @access  Super Admin Only
 */
router.post('/sessions/terminate/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await SuperAdminService.terminateSession(sessionId);
  sendSuccess(res, result, 'Session terminated successfully');
}));

/**
 * @route   GET /api/v1/super-admin/config
 * @desc    Get system configuration
 * @access  Super Admin Only
 */
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const config = await SuperAdminService.getSystemConfiguration();
  sendSuccess(res, config, 'System configuration retrieved successfully');
}));

/**
 * @route   PUT /api/v1/super-admin/config/rate-limits
 * @desc    Update rate limit configuration
 * @access  Super Admin Only
 */
router.put('/config/rate-limits', asyncHandler(async (req: Request, res: Response) => {
  const config = req.body;
  const result = await SuperAdminService.updateRateLimitConfig(config);
  sendSuccess(res, result, 'Rate limit configuration updated successfully');
}));

/**
 * @route   PUT /api/v1/super-admin/config/queue
 * @desc    Update queue configuration
 * @access  Super Admin Only
 */
router.put('/config/queue', asyncHandler(async (req: Request, res: Response) => {
  const config = req.body;
  const result = await SuperAdminService.updateQueueConfig(config);
  sendSuccess(res, result, 'Queue configuration updated successfully');
}));

/**
 * @route   GET /api/v1/super-admin/rate-limits/statistics
 * @desc    Get rate limiting statistics
 * @access  Super Admin Only
 */
router.get('/rate-limits/statistics', asyncHandler(async (req: Request, res: Response) => {
  const statistics = await SuperAdminService.getRateLimitStatistics();
  sendSuccess(res, statistics, 'Rate limit statistics retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/lookups/tables
 * @desc    Get list of all lookup tables
 * @access  Super Admin Only
 */
router.get('/lookups/tables', asyncHandler(async (req: Request, res: Response) => {
  const tables = LookupDataService.getLookupTables();
  sendSuccess(res, tables, 'Lookup tables retrieved successfully');
}));

/**
 * @route   GET /api/v1/super-admin/lookups/:tableName
 * @desc    Get entries for a specific lookup table
 * @access  Super Admin Only
 */
router.get('/lookups/:tableName', asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const filters = {
    search: req.query.search as string,
    limit: parseInt(req.query.limit as string) || 100,
    offset: parseInt(req.query.offset as string) || 0
  };

  const entries = await LookupDataService.getLookupEntries(tableName, filters);
  sendSuccess(res, entries, 'Lookup entries retrieved successfully');
}));

/**
 * @route   POST /api/v1/super-admin/lookups/:tableName
 * @desc    Add new lookup entry
 * @access  Super Admin Only
 */
router.post('/lookups/:tableName', asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const data = req.body;

  const result = await LookupDataService.addLookupEntry(tableName, data);
  sendSuccess(res, result, 'Lookup entry added successfully');
}));

/**
 * @route   PUT /api/v1/super-admin/lookups/:tableName/:id
 * @desc    Update lookup entry
 * @access  Super Admin Only
 */
router.put('/lookups/:tableName/:id', asyncHandler(async (req: Request, res: Response) => {
  const { tableName, id } = req.params;
  const data = req.body;

  const result = await LookupDataService.updateLookupEntry(tableName, parseInt(id), data);
  sendSuccess(res, result, 'Lookup entry updated successfully');
}));

/**
 * @route   DELETE /api/v1/super-admin/lookups/:tableName/:id
 * @desc    Delete/deactivate lookup entry
 * @access  Super Admin Only
 */
router.delete('/lookups/:tableName/:id', asyncHandler(async (req: Request, res: Response) => {
  const { tableName, id } = req.params;

  const result = await LookupDataService.deleteLookupEntry(tableName, parseInt(id));
  sendSuccess(res, result, 'Lookup entry deleted successfully');
}));

/**
 * @route   POST /api/v1/super-admin/lookups/:tableName/bulk-import
 * @desc    Bulk import lookup data
 * @access  Super Admin Only
 */
router.post('/lookups/:tableName/bulk-import', asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const { entries } = req.body;

  if (!entries || !Array.isArray(entries)) {
    return sendError(res, new Error('Invalid request. "entries" array is required'), undefined, 400);
  }

  const result = await LookupDataService.bulkImportLookupData(tableName, entries);
  sendSuccess(res, result, 'Bulk import completed');
}));

/**
 * @route   GET /api/v1/super-admin/lookups/:tableName/export
 * @desc    Export lookup data
 * @access  Super Admin Only
 */
router.get('/lookups/:tableName/export', asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;

  const data = await LookupDataService.exportLookupData(tableName);
  sendSuccess(res, data, 'Lookup data exported successfully');
}));

export default router;

