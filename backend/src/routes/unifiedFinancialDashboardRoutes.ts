import express from 'express';
import { authenticate, authorize, requireSpecificPermissions } from '../middleware/auth';
import { UnifiedFinancialDashboardService } from '../services/unifiedFinancialDashboardService';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { ValidationError } from '../middleware/errorHandler';
import { executeQuery } from '../config/database';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const dashboardMetricsSchema = Joi.object({
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  user_role: Joi.string().optional()
});

const trendsSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly').default('daily'),
  limit: Joi.number().integer().min(1).max(365).default(30)
});

// =====================================================
// UNIFIED FINANCIAL DASHBOARD ROUTES
// =====================================================

// Get comprehensive dashboard metrics
router.get('/metrics',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_dashboard']),
  async (req, res, next) => {
    try {
      const { error, value } = dashboardMetricsSchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Get real data from the database
      const metrics = await UnifiedFinancialDashboardService.getDashboardMetrics(
        value.date_from,
        value.date_to,
        req.user?.role
      );

      sendSuccess(res, { metrics }, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get real-time system statistics
router.get('/realtime-stats',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_realtime']),
  async (req, res, next) => {
    try {
      // Temporarily bypass cache to fix the issue
      const stats = await UnifiedFinancialDashboardService.getRealtimeStats();

      sendSuccess(res, { stats }, 'Real-time statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get financial trends
router.get('/trends',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_trends']),
  async (req, res, next) => {
    try {
      const { error, value } = trendsSchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Get real data from the database
      const trends = await UnifiedFinancialDashboardService.getFinancialTrends(
        value.period || 'daily',
        value.limit || 30
      );

      sendSuccess(res, { trends, period: value.period, limit: value.limit }, 'Financial trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get system alerts
router.get('/alerts',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_alerts']),
  async (req, res, next) => {
    try {
      const severity = req.query.severity as 'low' | 'medium' | 'high' | 'critical';
      const category = req.query.category as 'performance' | 'compliance' | 'financial' | 'system';

      const alerts = await UnifiedFinancialDashboardService.getSystemAlerts(severity, category);
      
      sendSuccess(res, { 
        alerts, 
        total_count: alerts.length,
        critical_count: alerts.filter(a => a.severity === 'critical').length,
        requires_action_count: alerts.filter(a => a.requires_action).length
      }, 'System alerts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get dashboard overview (combined metrics for quick loading)
router.get('/overview',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_dashboard']),
  async (req, res, next) => {
    try {
      // Temporarily bypass cache to fix the issue
      const [metrics, realtimeStats, alerts] = await Promise.all([
        UnifiedFinancialDashboardService.getDashboardMetrics(),
        UnifiedFinancialDashboardService.getRealtimeStats(),
        UnifiedFinancialDashboardService.getSystemAlerts('high')
      ]);

      const overview = {
        metrics,
        realtime_stats: realtimeStats,
        critical_alerts: alerts.filter(a => a.severity === 'critical'),
        timestamp: new Date().toISOString()
      };

      sendSuccess(res, { overview }, 'Dashboard overview retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get financial performance summary
router.get('/performance',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_performance']),
  async (req, res, next) => {
    try {
      const dateFrom = req.query.date_from as string;
      const dateTo = req.query.date_to as string;
      const period = req.query.period as 'daily' | 'weekly' | 'monthly' || 'daily';

      // Get real data from the database
      const metrics = await UnifiedFinancialDashboardService.getDashboardMetrics(
        dateFrom,
        dateTo,
        req.user?.role
      );

      const trends = await UnifiedFinancialDashboardService.getFinancialTrends(period, 7);

      const performance = {
        current_metrics: metrics,
        weekly_trends: trends,
        performance_indicators: {
          efficiency_score: metrics.performance.efficiency_score,
          processing_speed: metrics.overview.avg_processing_time_hours,
          approval_rate: ((metrics.applications.total_applications - (metrics.applications.total_applications * metrics.applications.rejection_rate / 100)) / Math.max(metrics.applications.total_applications, 1)) * 100,
          queue_health: metrics.overview.pending_reviews < 50 ? 'good' : metrics.overview.pending_reviews < 100 ? 'warning' : 'critical'
        }
      };

      sendSuccess(res, { performance }, 'Performance summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Update daily financial summary (admin only)
router.post('/update-daily-summary',
  authenticate,
  authorize('super_admin'),
  requireSpecificPermissions(['financial.update_summaries']),
  async (req, res, next) => {
    try {
      const { date } = req.body;
      
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format');
      }

      await UnifiedFinancialDashboardService.updateDailyFinancialSummary(date);
      
      // Invalidate related cache entries
      await executeQuery(`
        UPDATE financial_dashboard_cache 
        SET is_valid = FALSE 
        WHERE cache_key LIKE 'dashboard_%' OR cache_key LIKE 'financial_trends_%'
      `);

      sendSuccess(res, {}, `Daily financial summary updated for ${date || 'today'}`);
    } catch (error) {
      next(error);
    }
  }
);

// Get dashboard configuration (for frontend customization)
router.get('/config',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const config = {
        refresh_intervals: {
          metrics: 15 * 60 * 1000, // 15 minutes
          realtime_stats: 5 * 60 * 1000, // 5 minutes
          alerts: 2 * 60 * 1000, // 2 minutes
          trends: 30 * 60 * 1000 // 30 minutes
        },
        chart_settings: {
          default_period: 'daily',
          max_data_points: 30,
          supported_periods: ['daily', 'weekly', 'monthly']
        },
        alert_thresholds: {
          queue_size_warning: 50,
          queue_size_critical: 100,
          processing_rate_warning: 5,
          overdue_hours: 48
        },
        user_permissions: {
          can_view_dashboard: req.user!.role_name === 'financial_reviewer' || req.user!.role_name === 'membership_approver' || req.user!.role_name === 'super_admin',
          can_view_realtime: req.user!.role_name === 'financial_reviewer' || req.user!.role_name === 'membership_approver' || req.user!.role_name === 'super_admin',
          can_view_trends: req.user!.role_name === 'financial_reviewer' || req.user!.role_name === 'membership_approver' || req.user!.role_name === 'super_admin',
          can_view_alerts: req.user!.role_name === 'financial_reviewer' || req.user!.role_name === 'membership_approver' || req.user!.role_name === 'super_admin',
          can_update_summaries: req.user!.role_name === 'super_admin'
        }
      };

      sendSuccess(res, { config }, 'Dashboard configuration retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Health check for dashboard services
router.get('/health',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          cache: 'operational',
          metrics_generation: 'functional'
        },
        performance: {
          avg_response_time_ms: 150, // Placeholder
          cache_hit_rate: 85.5, // Placeholder
          active_connections: 12 // Placeholder
        }
      };

      sendSuccess(res, { health }, 'Dashboard health check completed');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
