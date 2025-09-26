import { Router, Request, Response, NextFunction } from 'express';
import { MaintenanceModeService } from '../services/maintenanceModeService';
import { authenticate, requirePermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { executeQuery, executeQuerySingle } from '../config/database';
import Joi from 'joi';

const router = Router();

// Validation schemas
const toggleMaintenanceSchema = Joi.object({
  enabled: Joi.boolean().required(),
  message: Joi.string().max(1000).optional(),
  level: Joi.string().valid('full_system', 'api_only', 'frontend_only', 'specific_modules').default('full_system'),
  affected_modules: Joi.array().items(Joi.string()).optional(),
  scheduled_end: Joi.date().optional()
});

const scheduleMaintenanceSchema = Joi.object({
  scheduled_start: Joi.date().required(),
  scheduled_end: Joi.date().required(),
  message: Joi.string().max(1000).optional(),
  level: Joi.string().valid('full_system', 'api_only', 'frontend_only', 'specific_modules').default('full_system'),
  affected_modules: Joi.array().items(Joi.string()).optional()
});

const updateBypassSettingsSchema = Joi.object({
  bypass_admin_users: Joi.boolean().optional(),
  bypass_roles: Joi.array().items(Joi.string()).optional(),
  bypass_ip_addresses: Joi.array().items(Joi.string().ip()).optional(),
  bypass_user_ids: Joi.array().items(Joi.number().integer().positive()).optional()
});

/**
 * Get current maintenance mode status
 * Public endpoint - no authentication required
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await MaintenanceModeService.getCurrentStatus();

    if (!status) {
      res.json({
        success: true,
        data: {
          is_enabled: false,
          status: 'inactive',
          maintenance_message: null,
          maintenance_level: 'full_system'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Toggle maintenance mode on/off
 * Admin only endpoint
 */
router.post('/toggle', 
  authenticate,
  requirePermission('system.maintenance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = toggleMaintenanceSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const { enabled, message, level, affected_modules, scheduled_end } = value;
      const userId = req.user!.id;

      let success = false;
      let action = '';

      if (enabled) {
        success = await MaintenanceModeService.enableMaintenanceMode(
          userId,
          message,
          level,
          scheduled_end,
          affected_modules
        );
        action = 'enabled';
      } else {
        success = await MaintenanceModeService.disableMaintenanceMode(userId);
        action = 'disabled';
      }

      if (!success) {
        throw new Error(`Failed to ${action} maintenance mode`);
      }

      // Get updated status
      const updatedStatus = await MaintenanceModeService.getCurrentStatus();

      res.json({
        success: true,
        message: `Maintenance mode ${action} successfully`,
        data: updatedStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Schedule maintenance mode
 * Admin only endpoint
 */
router.post('/schedule',
  authenticate,
  requirePermission('system.maintenance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = scheduleMaintenanceSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const { scheduled_start, scheduled_end, message, level, affected_modules } = value;
      const userId = req.user!.id;

      // Validate dates
      if (new Date(scheduled_start) <= new Date()) {
        throw new ValidationError('Scheduled start time must be in the future');
      }

      if (new Date(scheduled_end) <= new Date(scheduled_start)) {
        throw new ValidationError('Scheduled end time must be after start time');
      }

      const success = await MaintenanceModeService.scheduleMaintenanceMode(
        userId,
        new Date(scheduled_start),
        new Date(scheduled_end),
        message,
        level,
        affected_modules
      );

      if (!success) {
        throw new Error('Failed to schedule maintenance mode');
      }

      // Get updated status
      const updatedStatus = await MaintenanceModeService.getCurrentStatus();

      res.json({
        success: true,
        message: 'Maintenance mode scheduled successfully',
        data: updatedStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update bypass settings
 * Admin only endpoint
 */
router.put('/bypass-settings',
  authenticate,
  requirePermission('system.maintenance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = updateBypassSettingsSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const { bypass_admin_users, bypass_roles, bypass_ip_addresses, bypass_user_ids } = value;

      await executeQuery(`
        UPDATE maintenance_mode 
        SET 
          bypass_admin_users = COALESCE(?, bypass_admin_users),
          bypass_roles = COALESCE(?, bypass_roles),
          bypass_ip_addresses = COALESCE(?, bypass_ip_addresses),
          bypass_user_ids = COALESCE(?, bypass_user_ids),
          updated_at = NOW()
        ORDER BY id DESC 
        LIMIT 1
      `, [
        bypass_admin_users,
        bypass_roles ? JSON.stringify(bypass_roles) : null,
        bypass_ip_addresses ? JSON.stringify(bypass_ip_addresses) : null,
        bypass_user_ids ? JSON.stringify(bypass_user_ids) : null
      ]);

      // Clear cache
      await MaintenanceModeService.getCurrentStatus();

      res.json({
        success: true,
        message: 'Bypass settings updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get maintenance mode logs
 * Admin only endpoint
 */
router.get('/logs',
  authenticate,
  requirePermission('system.maintenance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const [logs, totalCount] = await Promise.all([
        executeQuery(`
          SELECT 
            ml.*,
            u.name as user_name
          FROM maintenance_mode_logs ml
          LEFT JOIN users u ON ml.user_id = u.id
          ORDER BY ml.created_at DESC
          LIMIT ? OFFSET ?
        `, [limit, offset]),
        executeQuerySingle(`
          SELECT COUNT(*) as total FROM maintenance_mode_logs
        `)
      ]);

      const totalPages = Math.ceil(totalCount.total / limit);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total: totalCount.total,
          totalPages
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get current maintenance configuration
 * Admin only endpoint
 */
router.get('/config',
  authenticate,
  requirePermission('system.maintenance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await executeQuerySingle(`
        SELECT * FROM maintenance_mode ORDER BY id DESC LIMIT 1
      `);

      if (!config) {
        throw new NotFoundError('Maintenance configuration not found');
      }

      // Parse JSON fields
      const parsedConfig = {
        ...config,
        affected_modules: config.affected_modules ? JSON.parse(config.affected_modules) : null,
        bypass_roles: config.bypass_roles ? JSON.parse(config.bypass_roles) : null,
        bypass_ip_addresses: config.bypass_ip_addresses ? JSON.parse(config.bypass_ip_addresses) : null,
        bypass_user_ids: config.bypass_user_ids ? JSON.parse(config.bypass_user_ids) : null
      };

      res.json({
        success: true,
        data: parsedConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Test bypass permissions for current user
 * Authenticated endpoint
 */
router.get('/bypass-check',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                      req.connection?.remoteAddress ||
                      req.socket?.remoteAddress ||
                      'unknown';

      const bypassCheck = await MaintenanceModeService.canUserBypass(
        user.id,
        user.role_name,
        user.admin_level || null,
        clientIP
      );

      res.json({
        success: true,
        data: {
          can_bypass: bypassCheck.canBypass,
          reason: bypassCheck.reason,
          user_info: {
            id: user.id,
            email: user.email,
            role: user.role_name,
            admin_level: user.admin_level,
            ip_address: clientIP
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Cancel scheduled maintenance
 * Admin only endpoint
 */
router.delete('/schedule',
  authenticate,
  requirePermission('system.maintenance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await executeQuery(`
        UPDATE maintenance_mode 
        SET 
          scheduled_start = NULL,
          scheduled_end = NULL,
          auto_enable = FALSE,
          auto_disable = FALSE,
          updated_at = NOW()
        ORDER BY id DESC 
        LIMIT 1
      `);

      // Clear cache
      await MaintenanceModeService.getCurrentStatus();

      res.json({
        success: true,
        message: 'Scheduled maintenance cancelled successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
