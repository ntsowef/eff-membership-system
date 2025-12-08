import { Router, Request, Response, NextFunction } from 'express';
import { AuditLogModel, AuditLogFilters } from '../models/auditLogs';
import { authenticate, requirePermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();

// Validation schemas
const auditLogFiltersSchema = Joi.object({
  user_id: Joi.number().integer().positive().optional(),
  action: Joi.string().max(100).optional(),
  entity_type: Joi.string().max(50).optional(),
  entity_id: Joi.number().integer().positive().optional(),
  ip_address: Joi.string().ip().optional(),
  created_after: Joi.date().iso().optional(),
  created_before: Joi.date().iso().optional(),
  search: Joi.string().max(255).optional(),
  page: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().positive().max(200).optional()
});

// Get all audit logs (admin only)
router.get('/', authenticate, requirePermission('system.audit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    // Validate filters
    const { error, value } = auditLogFiltersSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: AuditLogFilters = value;

    const [auditLogs, totalCount] = await Promise.all([
      AuditLogModel.getAuditLogs(limit, offset, filters),
      AuditLogModel.getAuditLogCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: {
        audit_logs: auditLogs,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
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

// Get audit log by ID
router.get('/:id', authenticate, requirePermission('system.audit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auditLogId = parseInt(req.params.id);
    if (isNaN(auditLogId)) {
      throw new ValidationError('Invalid audit log ID');
    }

    const auditLog = await AuditLogModel.getAuditLogById(auditLogId);
    if (!auditLog) {
      throw new NotFoundError('Audit log not found');
    }

    res.json({
      success: true,
      message: 'Audit log retrieved successfully',
      data: {
        audit_log: auditLog
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get audit logs for specific entity
router.get('/entity/:entityType/:entityId', authenticate, requirePermission('system.audit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId } = req.params;
    const parsedEntityId = parseInt(entityId);

    if (isNaN(parsedEntityId)) {
      throw new ValidationError('Invalid entity ID');
    }

    const auditLogs = await AuditLogModel.getEntityAuditLogs(entityType, parsedEntityId);

    res.json({
      success: true,
      message: 'Entity audit logs retrieved successfully',
      data: {
        entity_type: entityType,
        entity_id: parsedEntityId,
        audit_logs: auditLogs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get user activity logs
router.get('/user/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      throw new ValidationError('Invalid user ID');
    }

    // Users can only view their own activity logs unless they're admin
    const isAdmin = req.user?.role_name?.includes('admin') || false;
    if (!isAdmin && req.user!.id !== userId) {
      throw new ValidationError('Cannot view other users\' activity logs');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const auditLogs = await AuditLogModel.getUserActivityLogs(userId, limit);

    res.json({
      success: true,
      message: 'User activity logs retrieved successfully',
      data: {
        user_id: userId,
        audit_logs: auditLogs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get recent activity (last 24 hours)
router.get('/recent/activity', authenticate, requirePermission('system.audit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const auditLogs = await AuditLogModel.getRecentActivity(limit);

    res.json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: {
        audit_logs: auditLogs,
        period: 'Last 24 hours'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get audit statistics
router.get('/stats/overview', authenticate, requirePermission('system.audit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    
    if (req.query.created_after) {
      filters.created_after = req.query.created_after as string;
    }
    
    if (req.query.created_before) {
      filters.created_before = req.query.created_before as string;
    }

    // Default to last 30 days if no filters provided
    if (!filters.created_after && !filters.created_before) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filters.created_after = thirtyDaysAgo.toISOString();
    }

    const statistics = await AuditLogModel.getAuditStatistics(filters);

    res.json({
      success: true,
      message: 'Audit statistics retrieved successfully',
      data: {
        statistics,
        filters
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get my activity logs (current user)
router.get('/my/activity', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const auditLogs = await AuditLogModel.getUserActivityLogs(req.user!.id, limit);

    res.json({
      success: true,
      message: 'Your activity logs retrieved successfully',
      data: {
        audit_logs: auditLogs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Export audit logs (admin only)
router.get('/export/csv', authenticate, requirePermission('system.audit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate filters
    const { error, value } = auditLogFiltersSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: AuditLogFilters = value;
    const limit = Math.min(parseInt(req.query.limit as string) || 1000, 10000);

    const auditLogs = await AuditLogModel.getAuditLogs(limit, 0, filters);

    // Generate CSV content
    const csvHeaders = [
      'ID',
      'User ID',
      'User Name',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'User Agent',
      'Created At'
    ];

    const csvRows = auditLogs.map(log => [
      log.id,
      log.user_id || '',
      log.user_name || '',
      log.action,
      log.entity_type,
      log.entity_id || '',
      log.ip_address || '',
      log.user_agent || '',
      log.created_at
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);

    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// Clean up old audit logs (admin only)
router.post('/cleanup', authenticate, requirePermission('system.configure'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const daysToKeep = parseInt(req.body.days_to_keep) || 365;
    
    if (daysToKeep < 30) {
      throw new ValidationError('Cannot delete audit logs newer than 30 days');
    }

    const deletedCount = await AuditLogModel.cleanupOldLogs(daysToKeep);

    res.json({
      success: true,
      message: 'Audit log cleanup completed',
      data: {
        deleted_count: deletedCount,
        days_kept: daysToKeep
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get audit log summary for dashboard
router.get('/dashboard/summary', authenticate, requirePermission('system.audit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [todayStats, weekStats, recentActivity] = await Promise.all([
      AuditLogModel.getAuditStatistics({ created_after: yesterday.toISOString() }),
      AuditLogModel.getAuditStatistics({ created_after: lastWeek.toISOString() }),
      AuditLogModel.getRecentActivity(10)
    ]);

    res.json({
      success: true,
      message: 'Audit dashboard summary retrieved successfully',
      data: {
        today: todayStats,
        last_week: weekStats,
        recent_activity: recentActivity
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
