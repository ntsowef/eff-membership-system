import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { SessionManagementService } from '../services/sessionManagementService';
import { ValidationError } from '../middleware/errorHandler';
import { logAudit, AuditAction, EntityType } from '../middleware/auditLogger';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { executeQuery, executeQuerySingle } from '../config/database';

const router = express.Router();

// Validation schemas
const terminateSessionSchema = Joi.object({
  session_id: Joi.string().required(),
  reason: Joi.string().max(200).optional()
});

const bulkTerminateSchema = Joi.object({
  session_ids: Joi.array().items(Joi.string()).min(1).required(),
  reason: Joi.string().max(200).optional()
});

// Get current user's active sessions
router.get('/my-sessions',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const sessions = await SessionManagementService.getUserActiveSessions(userId);

      // Remove sensitive information and add current session indicator
      const sessionData = sessions.map(session => ({
        id: session.id,
        session_id: session.session_id,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        expires_at: session.expires_at,
        last_activity: session.last_activity,
        created_at: session.created_at,
        is_current: req.headers.authorization?.includes(session.session_id) || false
      }));

      sendSuccess(res, {
        sessions: sessionData,
        total_sessions: sessionData.length
      }, 'Active sessions retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
);

// Get session limits for current user
router.get('/limits',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limits = await SessionManagementService.getSessionLimits(userId);
      const sessionInfo = await SessionManagementService.getConcurrentSessionInfo(userId);

      sendSuccess(res, {
        limits,
        current_usage: sessionInfo
      }, 'Session limits retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
);

// Refresh current session
router.post('/refresh',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract session ID from authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ValidationError('No valid session token provided');
      }

      const sessionId = authHeader.substring(7); // Remove 'Bearer ' prefix
      const result = await SessionManagementService.refreshSession(sessionId);

      if (result.success) {
        // Log session refresh
        await logAudit(
          req.user!.id,
          AuditAction.UPDATE,
          EntityType.SYSTEM,
          req.user!.id,
          undefined,
          {
            action: 'session_refreshed',
            session_id: sessionId,
            new_expires_at: result.expires_at
          },
          req
        );

        sendSuccess(res, {
          expires_at: result.expires_at
        }, 'Session refreshed successfully.');
      } else {
        sendError(res, 'Failed to refresh session. Please log in again.', 401);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Terminate specific session
router.post('/terminate',
  authenticate,
  validate({ body: terminateSessionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { session_id, reason } = req.body;
      const userId = req.user!.id;

      // Verify the session belongs to the current user
      const sessions = await SessionManagementService.getUserActiveSessions(userId);
      const sessionExists = sessions.some(s => s.session_id === session_id);

      if (!sessionExists) {
        throw new ValidationError('Session not found or does not belong to current user');
      }

      const success = await SessionManagementService.terminateSession(session_id, reason);

      if (success) {
        // Log session termination
        await logAudit(
          userId,
          AuditAction.DELETE,
          EntityType.SYSTEM,
          userId,
          undefined,
          {
            action: 'session_terminated',
            terminated_session_id: session_id,
            reason: reason || 'User requested termination'
          },
          req
        );

        sendSuccess(res, { terminated: true }, 'Session terminated successfully.');
      } else {
        sendError(res, 'Failed to terminate session.', 500);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Terminate all other sessions (keep current)
router.post('/terminate-others',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const currentSessionId = req.headers.authorization?.substring(7); // Remove 'Bearer '

      // Get all sessions except current
      const allSessions = await SessionManagementService.getUserActiveSessions(userId);
      const otherSessions = allSessions.filter(s => s.session_id !== currentSessionId);

      let terminatedCount = 0;
      for (const session of otherSessions) {
        const success = await SessionManagementService.terminateSession(
          session.session_id, 
          'User terminated all other sessions'
        );
        if (success) terminatedCount++;
      }

      // Log bulk session termination
      await logAudit(
        userId,
        AuditAction.DELETE,
        EntityType.SYSTEM,
        userId,
        undefined,
        {
          action: 'bulk_session_termination',
          terminated_count: terminatedCount,
          kept_current_session: true
        },
        req
      );

      sendSuccess(res, {
        terminated_sessions: terminatedCount,
        remaining_sessions: 1 // Current session
      }, `${terminatedCount} other sessions terminated successfully.`);
    } catch (error) {
      next(error);
    }
  }
);

// Terminate all sessions (including current)
router.post('/terminate-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { reason } = req.body;

      const terminatedCount = await SessionManagementService.terminateAllUserSessions(
        userId, 
        reason || 'User terminated all sessions'
      );

      // Log complete session termination
      await logAudit(
        userId,
        AuditAction.DELETE,
        EntityType.SYSTEM,
        userId,
        undefined,
        {
          action: 'all_sessions_terminated',
          terminated_count: terminatedCount,
          reason: reason || 'User requested'
        },
        req
      );

      sendSuccess(res, {
        terminated_sessions: terminatedCount
      }, `All ${terminatedCount} sessions terminated successfully. Please log in again.`);
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Get all active sessions (with pagination)
router.get('/all',
  authenticate,
  requirePermission('users.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        page = '1', 
        limit = '50',
        user_id,
        ip_address 
      } = req.query;

      let whereConditions = ['expires_at > NOW()', 'is_active = TRUE'];
      let queryParams: any[] = [];

      if (user_id) {
        whereConditions.push('user_id = ?');
        queryParams.push(parseInt(user_id as string));
      }

      if (ip_address) {
        whereConditions.push('ip_address = ?');
        queryParams.push(ip_address);
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      queryParams.push(parseInt(limit as string), offset);

      const query = `
        SELECT 
          s.id, s.session_id, s.user_id, s.ip_address, s.user_agent,
          s.expires_at, s.last_activity, s.created_at,
          u.name as user_name, u.email as user_email, u.admin_level
        FROM user_sessions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY s.last_activity DESC
        LIMIT ? OFFSET ?
      `;

      const sessions = await executeQuery(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM user_sessions s
        WHERE ${whereConditions.slice(0, -2).join(' AND ')}
      `;

      const countResult = await executeQuerySingle(
        countQuery,
        queryParams.slice(0, -2)
      );
      const total = countResult?.total || 0;

      sendSuccess(res, {
        sessions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }, 'All active sessions retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Terminate user sessions
router.post('/admin/terminate-user-sessions',
  authenticate,
  requirePermission('users.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, reason } = req.body;

      if (!user_id) {
        throw new ValidationError('User ID is required');
      }

      const terminatedCount = await SessionManagementService.terminateAllUserSessions(
        user_id,
        reason || `Terminated by admin (${req.user!.email})`
      );

      // Log admin session termination
      await logAudit(
        req.user!.id,
        AuditAction.DELETE,
        EntityType.USER,
        user_id,
        undefined,
        {
          action: 'admin_terminate_user_sessions',
          target_user_id: user_id,
          terminated_count: terminatedCount,
          reason: reason || 'Admin action'
        },
        req
      );

      sendSuccess(res, {
        user_id,
        terminated_sessions: terminatedCount
      }, `Terminated ${terminatedCount} sessions for user.`);
    } catch (error) {
      next(error);
    }
  }
);

// Get session statistics
router.get('/statistics',
  authenticate,
  requirePermission('analytics.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await executeQuerySingle(`
        SELECT
          COUNT(*) as total_active_sessions,
          COUNT(DISTINCT user_id) as unique_active_users,
          AVG(TIMESTAMPDIFF(MINUTE, created_at, last_activity)) as avg_session_duration_minutes,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as sessions_created_last_hour,
          COUNT(CASE WHEN last_activity >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as sessions_active_last_hour
        FROM user_sessions
        WHERE expires_at > NOW() AND is_active = TRUE
      `);

      sendSuccess(res, stats, 'Session statistics retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
