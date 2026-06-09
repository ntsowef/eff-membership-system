import { Router, Request, Response } from 'express';
import { authenticate, requireNationalAdminOnly } from '../middleware/auth';
import { asyncHandler, sendSuccess, ValidationError } from '../middleware/errorHandler';
import { logAudit, AuditAction, EntityType } from '../middleware/auditLogger';
import { ProvincialAdminPerformanceService } from '../services/provincialAdminPerformanceService';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /admin-performance/leaderboard
 * Get the provincial admin performance leaderboard
 * National admin only
 */
router.get('/leaderboard', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    province_code: req.query.province_code as string | undefined,
    date_from: req.query.date_from as string | undefined,
    date_to: req.query.date_to as string | undefined,
    metric_period: (req.query.metric_period as 'daily' | 'weekly' | 'monthly') || undefined,
    sort_by: (req.query.sort_by as string) || 'score',
    sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };

  const leaderboard = await ProvincialAdminPerformanceService.getLeaderboard(filters);
  sendSuccess(res, leaderboard, 'Leaderboard retrieved successfully');
}));

/**
 * GET /admin-performance/admin/:userId
 * Get performance details for a specific admin
 * National admin only
 */
router.get('/admin/:userId', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  const dateFrom = req.query.date_from as string | undefined;
  const dateTo = req.query.date_to as string | undefined;
  const period = req.query.period as string | undefined;

  const performance = await ProvincialAdminPerformanceService.getAdminPerformance(userId, dateFrom, dateTo, period);
  if (!performance) {
    throw new ValidationError('Admin user not found');
  }

  sendSuccess(res, performance, 'Admin performance retrieved successfully');
}));

/**
 * POST /admin-performance/aggregate
 * Trigger daily metrics aggregation
 * National admin only
 */
router.post('/aggregate', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const targetDate = req.body.target_date as string | undefined;

  const result = await ProvincialAdminPerformanceService.aggregateDailyMetrics(targetDate);

  await logAudit(
    req.user?.id,
    AuditAction.CREATE,
    EntityType.SYSTEM,
    0,
    null,
    { action: 'aggregate_admin_metrics', target_date: targetDate, aggregated: result.aggregated },
    req
  );

  sendSuccess(res, result, `Aggregated metrics for ${result.aggregated} admins`);
}));

/**
 * GET /admin-performance/historical
 * Get historical performance metrics from the cached table
 * National admin only
 */
router.get('/historical', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    user_id: req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined,
    province_code: req.query.province_code as string | undefined,
    metric_period: req.query.metric_period as string | undefined,
    date_from: req.query.date_from as string | undefined,
    date_to: req.query.date_to as string | undefined,
  };

  const metrics = await ProvincialAdminPerformanceService.getHistoricalMetrics(filters);
  sendSuccess(res, metrics, 'Historical metrics retrieved successfully');
}));

export default router;

