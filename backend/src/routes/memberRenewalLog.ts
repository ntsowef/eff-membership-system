import { Router, Request, Response } from 'express';
import { authenticate, requireNationalAdminOnly } from '../middleware/auth';
import { asyncHandler, sendSuccess, ValidationError } from '../middleware/errorHandler';
import { logAudit, AuditAction, EntityType } from '../middleware/auditLogger';
import { MemberRenewalLogService } from '../services/memberRenewalLogService';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /renewal-logs
 * Get renewal logs with filtering and pagination
 * Accessible by national admins
 */
router.get('/', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    member_id: req.query.member_id ? parseInt(req.query.member_id as string, 10) : undefined,
    province_code: req.query.province_code as string | undefined,
    renewal_year: req.query.renewal_year ? parseInt(req.query.renewal_year as string, 10) : undefined,
    renewal_type: req.query.renewal_type as string | undefined,
    source: req.query.source as string | undefined,
    processed_by: req.query.processed_by ? parseInt(req.query.processed_by as string, 10) : undefined,
    date_from: req.query.date_from as string | undefined,
    date_to: req.query.date_to as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };

  const result = await MemberRenewalLogService.getRenewalLogs(filters);
  sendSuccess(res, result, 'Renewal logs retrieved successfully');
}));

/**
 * GET /renewal-logs/member/:memberId
 * Get renewal history for a specific member
 */
router.get('/member/:memberId', asyncHandler(async (req: Request, res: Response) => {
  const memberId = parseInt(req.params.memberId, 10);
  if (isNaN(memberId)) {
    throw new ValidationError('Invalid member ID');
  }

  const logs = await MemberRenewalLogService.getRenewalLogsByMember(memberId);
  sendSuccess(res, logs, 'Member renewal logs retrieved successfully');
}));

/**
 * GET /renewal-logs/growth-metrics
 * Get renewal growth metrics grouped by period
 * National admin only
 */
router.get('/growth-metrics', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    province_code: req.query.province_code as string | undefined,
    date_from: req.query.date_from as string | undefined,
    date_to: req.query.date_to as string | undefined,
    group_by: (req.query.group_by as 'day' | 'week' | 'month' | 'year') || 'month',
  };

  const metrics = await MemberRenewalLogService.getRenewalGrowthMetrics(filters);
  sendSuccess(res, metrics, 'Renewal growth metrics retrieved successfully');
}));

/**
 * GET /renewal-logs/by-province
 * Get renewals breakdown by province
 * National admin only
 */
router.get('/by-province', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    renewal_year: req.query.renewal_year ? parseInt(req.query.renewal_year as string, 10) : undefined,
    date_from: req.query.date_from as string | undefined,
    date_to: req.query.date_to as string | undefined,
  };

  const data = await MemberRenewalLogService.getRenewalsByProvince(filters);
  sendSuccess(res, data, 'Renewals by province retrieved successfully');
}));

/**
 * GET /renewal-logs/trends
 * Get renewal trends (today, this week, this month, this year)
 * National admin only
 */
router.get('/trends', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const trends = await MemberRenewalLogService.getRenewalTrends();
  sendSuccess(res, trends, 'Renewal trends retrieved successfully');
}));

/**
 * POST /renewal-logs
 * Manually log a renewal event
 * National admin only
 */
router.post('/', requireNationalAdminOnly(), asyncHandler(async (req: Request, res: Response) => {
  const {
    member_id, renewal_year, renewal_type, previous_expiry_date, new_expiry_date,
    amount_paid, payment_method, payment_reference, payment_status,
    province_code, province_name, district_code, municipality_code, ward_code,
    source, source_reference, notes, metadata
  } = req.body;

  if (!member_id || !new_expiry_date) {
    throw new ValidationError('member_id and new_expiry_date are required');
  }

  const result = await MemberRenewalLogService.logRenewal({
    member_id,
    renewal_year: renewal_year || new Date().getFullYear(),
    renewal_type,
    previous_expiry_date,
    new_expiry_date,
    amount_paid,
    payment_method,
    payment_reference,
    payment_status,
    processed_by: req.user?.id,
    province_code,
    province_name,
    district_code,
    municipality_code,
    ward_code,
    source: source || 'manual',
    source_reference,
    notes,
    metadata
  });

  await logAudit(
    req.user?.id,
    AuditAction.CREATE,
    EntityType.MEMBER,
    member_id,
    null,
    { log_id: result.log_id, renewal_type, new_expiry_date },
    req
  );

  sendSuccess(res, result, 'Renewal logged successfully', 201);
}));

export default router;

