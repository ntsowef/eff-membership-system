import { Router, Request, Response, NextFunction } from 'express';
import { SecurityService } from '../services/securityService';
import { authenticate, requireAdminLevel } from '../middleware/auth';
import { authRateLimit, strictRateLimit, requireMFA } from '../middleware/securityMiddleware';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import { executeQuery, executeQuerySingle } from '../config/database';
import Joi from 'joi';

const router = Router();

// Validation schemas
const mfaTokenSchema = Joi.object({
  token: Joi.string().length(6).pattern(/^\d+$/).required()
});

const passwordChangeSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).max(128).required(),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
});

// Setup MFA
router.post('/mfa/setup', authenticate, authRateLimit, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;

    // Check if MFA is already enabled
    const isEnabled = await SecurityService.isMFAEnabled(userId);
    if (isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is already enabled for this account',
        error: { code: 'MFA_ALREADY_ENABLED' },
        timestamp: new Date().toISOString()
      });
    }

    const mfaSetup = await SecurityService.setupMFA(userId, 'GEOMAPS Membership');

    // Log MFA setup initiation
    await logAudit(
      userId,
      AuditAction.UPDATE,
      EntityType.USER,
      userId,
      undefined,
      { action: 'mfa_setup_initiated' },
      req
    );

    res.json({
      success: true,
      message: 'MFA setup initiated successfully',
      data: {
        secret: mfaSetup.secret,
        qr_code_url: mfaSetup.qrCodeUrl,
        backup_codes: mfaSetup.backupCodes
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Enable MFA
router.post('/mfa/enable', authenticate, authRateLimit, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { error, value } = mfaTokenSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const { token } = value;

    const success = await SecurityService.enableMFA(userId, token);
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MFA token',
        error: { code: 'INVALID_MFA_TOKEN' },
        timestamp: new Date().toISOString()
      });
    }

    // Log MFA enablement
    await logAudit(
      userId,
      AuditAction.UPDATE,
      EntityType.USER,
      userId,
      undefined,
      { action: 'mfa_enabled' },
      req
    );

    res.json({
      success: true,
      message: 'MFA enabled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Disable MFA
router.post('/mfa/disable', authenticate, requireMFA, authRateLimit, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;

    const success = await SecurityService.disableMFA(userId);
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to disable MFA',
        error: { code: 'MFA_DISABLE_FAILED' },
        timestamp: new Date().toISOString()
      });
    }

    // Log MFA disablement
    await logAudit(
      userId,
      AuditAction.UPDATE,
      EntityType.USER,
      userId,
      undefined,
      { action: 'mfa_disabled' },
      req
    );

    res.json({
      success: true,
      message: 'MFA disabled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Verify MFA token
router.post('/mfa/verify', authenticate, authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = mfaTokenSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const { token } = value;

    const isValid = await SecurityService.verifyMFA(userId, token);

    res.json({
      success: true,
      message: 'MFA token verified',
      data: {
        valid: isValid
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get MFA status
router.get('/mfa/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const isEnabled = await SecurityService.isMFAEnabled(userId);

    res.json({
      success: true,
      message: 'MFA status retrieved successfully',
      data: {
        mfa_enabled: isEnabled
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/password/change', authenticate, authRateLimit, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { error, value } = passwordChangeSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const { current_password, new_password } = value;

    // Get current user
    const user = await executeQuerySingle('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(current_password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        error: { code: 'INVALID_CURRENT_PASSWORD' },
        timestamp: new Date().toISOString()
      });
    }

    // Check password history
    const passwordHistory = await executeQuery(
      'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    );

    for (const historyEntry of passwordHistory) {
      const isReused = await bcrypt.compare(new_password, historyEntry.password_hash);
      if (isReused) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reuse a recent password',
          error: { code: 'PASSWORD_REUSED' },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password
    await executeQuery(
      'UPDATE users SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    // Log password change
    await logAudit(
      userId,
      AuditAction.UPDATE,
      EntityType.USER,
      userId,
      undefined,
      { action: 'password_changed' },
      req
    );

    await SecurityService.logSecurityEvent(
      userId,
      'password_change',
      req.ip || '',
      req.get('User-Agent') || '',
      { initiated_by_user: true }
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get security settings
router.get('/settings', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const settings = await SecurityService.getUserSecuritySettings(userId);

    res.json({
      success: true,
      message: 'Security settings retrieved successfully',
      data: {
        settings
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get security events (user's own events)
router.get('/events', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const events = await executeQuery(`
      SELECT event_type, ip_address, details, created_at
      FROM security_events 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const totalCount = await executeQuerySingle(
      'SELECT COUNT(*) as count FROM security_events WHERE user_id = ?',
      [userId]
    );

    const totalPages = Math.ceil((totalCount?.count || 0) / limit);

    res.json({
      success: true,
      message: 'Security events retrieved successfully',
      data: {
        events,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount?.count || 0,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get active sessions
router.get('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const sessions = await executeQuery(`
      SELECT session_id, ip_address, user_agent, last_activity, created_at
      FROM user_sessions 
      WHERE user_id = ? AND expires_at > NOW() AND is_active = TRUE
      ORDER BY last_activity DESC
    `, [userId]);

    res.json({
      success: true,
      message: 'Active sessions retrieved successfully',
      data: {
        sessions
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Revoke session
router.delete('/sessions/:sessionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await executeQuerySingle(
      'SELECT user_id FROM user_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (!session || session.user_id !== userId) {
      throw new NotFoundError('Session not found');
    }

    await SecurityService.invalidateSession(sessionId);

    // Log session revocation
    await logAudit(
      userId,
      AuditAction.DELETE,
      EntityType.USER,
      userId,
      undefined,
      { action: 'session_revoked', session_id: sessionId },
      req
    );

    res.json({
      success: true,
      message: 'Session revoked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get security dashboard
router.get('/admin/dashboard', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await executeQuerySingle(`
      SELECT 
        (SELECT COUNT(*) FROM security_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as events_24h,
        (SELECT COUNT(*) FROM security_events WHERE event_type = 'suspicious_activity' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as suspicious_24h,
        (SELECT COUNT(*) FROM users WHERE account_locked = TRUE) as locked_accounts,
        (SELECT COUNT(*) FROM login_attempts WHERE success = FALSE AND attempted_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as failed_logins_1h,
        (SELECT COUNT(DISTINCT user_id) FROM user_mfa_settings WHERE is_enabled = TRUE) as mfa_enabled_users,
        (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW() AND is_active = TRUE) as active_sessions
    `);

    const recentEvents = await executeQuery(`
      SELECT se.*, CONCAT(u.firstname, ' ', u.surname) as user_name
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      ORDER BY se.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      message: 'Security dashboard retrieved successfully',
      data: {
        dashboard,
        recent_events: recentEvents
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get failed login analysis
router.get('/admin/failed-logins', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await executeQuery(`
      SELECT * FROM vw_failed_login_analysis
      ORDER BY failed_attempts DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      message: 'Failed login analysis retrieved successfully',
      data: {
        analysis
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Unlock user account
router.post('/admin/unlock/:userId', authenticate, requireAdminLevel(3), strictRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.id;

    await SecurityService.clearAccountLockout(parseInt(userId));

    // Log admin action
    await logAudit(
      adminId,
      AuditAction.UPDATE,
      EntityType.USER,
      parseInt(userId),
      undefined,
      { action: 'account_unlocked_by_admin' },
      req
    );

    res.json({
      success: true,
      message: 'User account unlocked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
