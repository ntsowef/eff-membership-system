import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { EmergencyAccessService } from '../services/emergencyAccessService';
import { executeQuery } from '../config/database';

const router = Router();

// Helper to get client IP
const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
};

// ============================================
// PRE-AUTH: Emergency Access Request (for users stuck at OTP)
// ============================================

/**
 * @route POST /api/v1/emergency-access/request-preauth
 * @desc Create an emergency access request for users stuck at OTP verification
 * @note This endpoint does NOT require full authentication - only user_id validation
 */
router.post('/request-preauth',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        user_id,
        reason,
        urgency_level = 'normal',
        contact_phone,
        contact_email,
        duration_hours = 24
      } = req.body;

      if (!user_id || !reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'user_id and reason are required' }
        });
      }

      // Verify user exists and has a pending OTP (to prevent abuse)
      const userCheck = await executeQuery(`
        SELECT u.user_id, u.email, u.name, u.admin_level,
               (SELECT COUNT(*) FROM user_otp_codes o
                WHERE o.user_id = u.user_id
                AND o.is_validated = false
                AND o.expires_at > CURRENT_TIMESTAMP
                AND o.invalidated_at IS NULL) as pending_otp_count
        FROM users u
        WHERE u.user_id = $1 AND u.is_active = true
      `, [user_id]);

      if (userCheck.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found or inactive' }
        });
      }

      const user = userCheck[0];

      // User must have a pending OTP to request emergency access
      if (parseInt(user.pending_otp_count) === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_PENDING_OTP', message: 'No pending OTP verification found. Please login first.' }
        });
      }

      // Create the emergency access request
      const request = await EmergencyAccessService.createEmergencyRequest(
        user_id,
        reason,
        urgency_level,
        contact_phone || user.email,
        contact_email || user.email,
        duration_hours,
        getClientIP(req),
        req.headers['user-agent'] as string
      );

      return res.json({
        success: true,
        message: 'Emergency access request submitted. A National Administrator will review your request shortly.',
        data: {
          request_id: request.request_id,
          status: request.status,
          urgency_level: request.urgency_level
        }
      });
    } catch (error: any) {
      // Handle duplicate request error
      if (error.message?.includes('already have a pending')) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_REQUEST', message: error.message }
        });
      }
      next(error);
    }
  }
);

// ============================================
// OPTION A: Bypass Permissions (National Admin)
// ============================================

/**
 * @route POST /api/v1/emergency-access/bypass/grant
 * @desc Grant MFA bypass permission to a user (National Admin only)
 */
router.post('/bypass/grant', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'), 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, reason, duration_hours = 24 } = req.body;

      if (!user_id || !reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'user_id and reason are required' }
        });
      }

      const bypass = await EmergencyAccessService.grantBypassPermission(
        user_id,
        req.user!.id,
        reason,
        duration_hours,
        getClientIP(req),
        req.headers['user-agent'] as string
      );

      return res.json({
        success: true,
        message: `MFA bypass granted for ${duration_hours} hours`,
        data: bypass
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/emergency-access/bypass/revoke/:bypassId
 * @desc Revoke an MFA bypass permission (National Admin only)
 */
router.post('/bypass/revoke/:bypassId', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bypassId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'reason is required' }
        });
      }

      const success = await EmergencyAccessService.revokeBypassPermission(
        parseInt(bypassId),
        req.user!.id,
        reason,
        getClientIP(req),
        req.headers['user-agent'] as string
      );

      return res.json({
        success,
        message: success ? 'Bypass permission revoked' : 'Bypass permission not found or already revoked'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/emergency-access/bypass/active
 * @desc List all active bypass permissions (National Admin only)
 */
router.get('/bypass/active', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bypasses = await EmergencyAccessService.listActiveBypassPermissions();
      return res.json({
        success: true,
        data: bypasses,
        count: bypasses.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/emergency-access/bypass/check/:userId
 * @desc Check if a user has active bypass (National Admin only)
 */
router.get('/bypass/check/:userId', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bypass = await EmergencyAccessService.getActiveBypass(parseInt(req.params.userId));
      return res.json({
        success: true,
        data: {
          has_active_bypass: !!bypass,
          bypass_details: bypass
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// OPTION B: Emergency Access Requests (Provincial Admin)
// ============================================

/**
 * @route POST /api/v1/emergency-access/request
 * @desc Create an emergency access request (any authenticated user who requires MFA)
 */
router.post('/request', authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason, urgency_level = 'normal', contact_phone, contact_email, duration_hours = 24 } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'reason is required' }
        });
      }

      const request = await EmergencyAccessService.createEmergencyRequest(
        req.user!.id,
        reason,
        urgency_level,
        contact_phone || req.user!.email,
        contact_email || req.user!.email,
        duration_hours,
        getClientIP(req),
        req.headers['user-agent'] as string
      );

      return res.json({
        success: true,
        message: 'Emergency access request submitted. A National Admin will review your request.',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/emergency-access/requests/pending
 * @desc Get all pending emergency access requests (National Admin only)
 */
router.get('/requests/pending', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requests = await EmergencyAccessService.getPendingRequests();
      return res.json({
        success: true,
        data: requests,
        count: requests.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/emergency-access/requests/:requestId/approve
 * @desc Approve an emergency access request (National Admin only)
 */
router.post('/requests/:requestId/approve', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.params;
      const { review_notes, duration_hours } = req.body;

      const result = await EmergencyAccessService.approveRequest(
        parseInt(requestId),
        req.user!.id,
        review_notes,
        duration_hours,
        getClientIP(req),
        req.headers['user-agent'] as string
      );

      return res.json({
        success: true,
        message: 'Emergency access request approved. User can now login without MFA.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/emergency-access/requests/:requestId/deny
 * @desc Deny an emergency access request (National Admin only)
 */
router.post('/requests/:requestId/deny', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.params;
      const { review_notes } = req.body;

      if (!review_notes) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'review_notes is required when denying a request' }
        });
      }

      const request = await EmergencyAccessService.denyRequest(
        parseInt(requestId),
        req.user!.id,
        review_notes,
        getClientIP(req),
        req.headers['user-agent'] as string
      );

      return res.json({
        success: true,
        message: 'Emergency access request denied',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/emergency-access/my-requests
 * @desc Get current user's emergency access request history
 */
router.get('/my-requests', authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requests = await EmergencyAccessService.getUserRequestHistory(req.user!.id);
      return res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/emergency-access/my-bypass
 * @desc Check if current user has an active bypass permission
 */
router.get('/my-bypass', authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bypass = await EmergencyAccessService.getActiveBypass(req.user!.id);
      return res.json({
        success: true,
        data: {
          has_active_bypass: !!bypass,
          bypass_details: bypass
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/emergency-access/audit-log
 * @desc Get audit log for emergency access operations (National Admin only)
 */
router.get('/audit-log', authenticate, authorize('NATIONAL_ADMIN', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await EmergencyAccessService.getAuditLog(limit);
      return res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

