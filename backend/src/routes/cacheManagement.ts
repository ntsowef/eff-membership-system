import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { cacheInvalidationService, CacheInvalidationPatterns, ScheduledCacheInvalidation } from '../services/cacheInvalidationService';
import { getCacheHealthStatus, getCachePerformanceMetrics, getCacheAlerts, exportCacheMetrics, cacheMetricsCollector } from '../middleware/cacheMetrics';
import { cacheWarmupService } from '../scripts/cacheWarmup';
import { authenticate, requireAdminLevel } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();

// All cache management routes require admin access
router.use(authenticate);
router.use(requireAdminLevel(2)); // Level 2 admin required

// Get cache health status
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthStatus = await getCacheHealthStatus();
    
    res.json({
      success: true,
      message: 'Cache health status retrieved successfully',
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get cache metrics and performance data
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeRange } = req.query;
    let timeRangeFilter;
    
    if (timeRange) {
      const range = timeRange as string;
      const now = new Date();
      
      switch (range) {
        case '1h':
          timeRangeFilter = { start: new Date(now.getTime() - 60 * 60 * 1000), end: now };
          break;
        case '24h':
          timeRangeFilter = { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
          break;
        case '7d':
          timeRangeFilter = { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
          break;
        default:
          timeRangeFilter = undefined;
      }
    }
    
    const performanceMetrics = getCachePerformanceMetrics(timeRangeFilter);
    const alerts = getCacheAlerts();
    
    res.json({
      success: true,
      message: 'Cache metrics retrieved successfully',
      data: {
        performance: performanceMetrics,
        alerts,
        timeRange: timeRange || 'all'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Export cache metrics in different formats
router.get('/metrics/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format = 'json' } = req.query;
    
    if (!['json', 'prometheus'].includes(format as string)) {
      throw new ValidationError('Format must be either "json" or "prometheus"');
    }
    
    const metrics = exportCacheMetrics(format as 'json' | 'prometheus');
    
    if (format === 'prometheus') {
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } else {
      res.json({
        success: true,
        message: 'Cache metrics exported successfully',
        data: metrics,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get cache statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await cacheService.getStats();
    const metrics = cacheService.getMetrics();
    
    res.json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: {
        stats,
        metrics,
        isAvailable: cacheService.isAvailable()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Clear cache by pattern
router.delete('/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = Joi.object({
      pattern: Joi.string().optional(),
      type: Joi.string().valid('all', 'analytics', 'statistics', 'members', 'lookups').optional()
    }).validate(req.body);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    const { pattern, type } = value;
    let clearedCount = 0;
    
    if (pattern) {
      // Clear by specific pattern
      clearedCount = await cacheService.delByPattern(pattern);
    } else if (type) {
      // Clear by predefined type
      switch (type) {
        case 'all':
          await cacheInvalidationService.invalidateAllCaches();
          clearedCount = -1; // Indicates full flush
          break;
        case 'analytics':
          await cacheInvalidationService.invalidateAnalyticsCaches();
          break;
        case 'statistics':
          await cacheInvalidationService.invalidateStatisticsCaches();
          break;
        case 'members':
          await cacheInvalidationService.invalidateMemberCaches();
          break;
        case 'lookups':
          await cacheInvalidationService.invalidateLookupCaches();
          break;
      }
    } else {
      throw new ValidationError('Either pattern or type must be specified');
    }
    
    res.json({
      success: true,
      message: clearedCount === -1 ? 'All cache cleared' : `Cache cleared: ${clearedCount} keys`,
      data: {
        clearedCount,
        pattern: pattern || `type:${type}`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Warm up cache
router.post('/warmup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = Joi.object({
      priority: Joi.string().valid('high', 'medium', 'low', 'all').default('all'),
      baseUrl: Joi.string().uri().optional()
    }).validate(req.body);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    const { priority, baseUrl } = value;
    
    let result;
    switch (priority) {
      case 'high':
        result = await cacheWarmupService.warmupCritical();
        break;
      case 'medium':
      case 'low':
        result = await cacheWarmupService.warmupByPriority(priority);
        break;
      default:
        result = await cacheWarmupService.warmupAll();
    }
    
    res.json({
      success: true,
      message: `Cache warm-up completed for ${priority} priority endpoints`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get cache invalidation patterns
router.get('/invalidation/patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await cacheInvalidationService.getInvalidationStats();
    
    res.json({
      success: true,
      message: 'Cache invalidation patterns retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Manual cache invalidation
router.post('/invalidation/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = Joi.object({
      type: Joi.string().valid('member', 'analytics', 'statistics', 'geographic', 'lookup', 'all').required(),
      memberId: Joi.number().integer().positive().optional(),
      operation: Joi.string().valid('create', 'update', 'delete').optional()
    }).validate(req.body);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    const { type, memberId, operation = 'update' } = value;
    
    switch (type) {
      case 'member':
        await cacheInvalidationService.invalidateMemberCaches(memberId);
        break;
      case 'analytics':
        await cacheInvalidationService.invalidateAnalyticsCaches();
        break;
      case 'statistics':
        await cacheInvalidationService.invalidateStatisticsCaches();
        break;
      case 'geographic':
        await cacheInvalidationService.invalidateGeographicCaches();
        break;
      case 'lookup':
        await cacheInvalidationService.invalidateLookupCaches();
        break;
      case 'all':
        await cacheInvalidationService.invalidateAllCaches();
        break;
    }
    
    res.json({
      success: true,
      message: `Cache invalidation triggered for ${type}${memberId ? ` (member ${memberId})` : ''}`,
      data: {
        type,
        memberId,
        operation,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Run scheduled cache maintenance
router.post('/maintenance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = Joi.object({
      type: Joi.string().valid('daily', 'weekly', 'warmup').required()
    }).validate(req.body);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    const { type } = value;
    
    switch (type) {
      case 'daily':
        await ScheduledCacheInvalidation.daily();
        break;
      case 'weekly':
        await ScheduledCacheInvalidation.weekly();
        break;
      case 'warmup':
        await ScheduledCacheInvalidation.warmUp();
        break;
    }
    
    res.json({
      success: true,
      message: `${type} cache maintenance completed`,
      data: {
        type,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Reset cache metrics
router.post('/metrics/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    cacheService.resetMetrics();
    cacheMetricsCollector.clearMetrics();
    
    res.json({
      success: true,
      message: 'Cache metrics reset successfully',
      data: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
