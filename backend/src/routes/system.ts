import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { dbOptimizationService } from '../services/databaseOptimization';
import { MonitoringService } from '../services/monitoringService';
import { authenticate, requireAdminLevel } from '../middleware/auth';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';

const router = Router();

// Get system health status
router.get('/health', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [cacheStats, dbStats, dbSize] = await Promise.all([
      cacheService.getStats(),
      dbOptimizationService.getQueryStats(),
      dbOptimizationService.getDatabaseSize()
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'connected',
          size: dbSize,
          performance: dbStats
        },
        cache: {
          status: cacheStats.connected ? 'connected' : 'disconnected',
          stats: cacheStats
        }
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    res.json({
      success: true,
      message: 'System health retrieved successfully',
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get cache statistics
router.get('/cache/stats', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: {
        cache_stats: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Clear cache
router.post('/cache/clear', authenticate, requireAdminLevel(3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pattern } = req.body;

    let clearedCount = 0;
    if (pattern) {
      clearedCount = await cacheService.delByPattern(pattern);
    } else {
      const success = await cacheService.flushAll();
      clearedCount = success ? -1 : 0; // -1 indicates full flush
    }

    // Log cache clear action
    await logAudit(
      req.user!.id,
      AuditAction.DELETE,
      EntityType.SYSTEM,
      undefined,
      undefined,
      {
        action: 'clear_cache',
        pattern: pattern || 'all',
        cleared_count: clearedCount
      },
      req
    );

    res.json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
      data: {
        cleared_count: clearedCount,
        pattern: pattern || 'all'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get database performance analysis
router.get('/database/performance', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await dbOptimizationService.analyzeDatabasePerformance();

    res.json({
      success: true,
      message: 'Database performance analysis retrieved successfully',
      data: {
        performance_analysis: analysis
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get slow queries
router.get('/database/slow-queries', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const slowQueries = dbOptimizationService.getSlowQueries(limit);

    res.json({
      success: true,
      message: 'Slow queries retrieved successfully',
      data: {
        slow_queries: slowQueries,
        count: slowQueries.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Optimize database tables
router.post('/database/optimize', authenticate, requireAdminLevel(3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await dbOptimizationService.optimizeTables();

    // Log database optimization
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      undefined,
      undefined,
      {
        action: 'optimize_database_tables',
        tables_processed: results.length,
        successful: results.filter((r: any) => r.status === 'optimized').length,
        failed: results.filter((r: any) => r.status === 'error').length
      },
      req
    );

    res.json({
      success: true,
      message: 'Database optimization completed',
      data: {
        optimization_results: results,
        summary: {
          total_tables: results.length,
          successful: results.filter((r: any) => r.status === 'optimized').length,
          failed: results.filter((r: any) => r.status === 'error').length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Analyze database indexes
router.get('/database/indexes', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const indexAnalysis = await dbOptimizationService.analyzeIndexes();

    res.json({
      success: true,
      message: 'Database index analysis retrieved successfully',
      data: {
        index_analysis: indexAnalysis
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get connection pool statistics
router.get('/database/connections', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connectionStats = await dbOptimizationService.getConnectionPoolStats();

    res.json({
      success: true,
      message: 'Database connection statistics retrieved successfully',
      data: {
        connection_stats: connectionStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Clear query performance log
router.post('/database/clear-query-log', authenticate, requireAdminLevel(3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    dbOptimizationService.clearQueryLog();

    // Log query log clear action
    await logAudit(
      req.user!.id,
      AuditAction.DELETE,
      EntityType.SYSTEM,
      undefined,
      undefined,
      {
        action: 'clear_query_performance_log'
      },
      req
    );

    res.json({
      success: true,
      message: 'Query performance log cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get system metrics
router.get('/metrics', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      cacheStats,
      queryStats,
      dbSize,
      connectionStats
    ] = await Promise.all([
      cacheService.getStats(),
      dbOptimizationService.getQueryStats(),
      dbOptimizationService.getDatabaseSize(),
      dbOptimizationService.getConnectionPoolStats()
    ]);

    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: {
        size: dbSize,
        query_performance: queryStats,
        connections: connectionStats
      },
      cache: {
        status: cacheStats.connected ? 'connected' : 'disconnected',
        stats: cacheStats
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'System metrics retrieved successfully',
      data: {
        metrics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Test cache functionality
router.post('/cache/test', authenticate, requireAdminLevel(3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testKey = 'system:cache:test';
    const testValue = {
      message: 'Cache test successful',
      timestamp: new Date().toISOString(),
      random: Math.random()
    };

    // Test set
    const setResult = await cacheService.set(testKey, testValue, 60);
    
    // Test get
    const getValue = await cacheService.get(testKey);
    
    // Test delete
    const delResult = await cacheService.del(testKey);

    const testResults = {
      set_success: setResult,
      get_success: getValue !== null,
      get_value_matches: JSON.stringify(getValue) === JSON.stringify(testValue),
      delete_success: delResult,
      cache_available: cacheService.isAvailable()
    };

    res.json({
      success: true,
      message: 'Cache test completed',
      data: {
        test_results: testResults,
        all_tests_passed: Object.values(testResults).every(result => result === true)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get system configuration
router.get('/config', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = {
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        database: process.env.DB_NAME || 'membership_new',
        // Don't expose sensitive information
        connection_limit: process.env.DB_CONNECTION_LIMIT || '10'
      },
      cache: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
        db: process.env.REDIS_DB || '0',
        key_prefix: process.env.REDIS_KEY_PREFIX || 'membership:',
        default_ttl: process.env.REDIS_DEFAULT_TTL || '1800'
      },
      application: {
        port: process.env.PORT || '5000',
        node_env: process.env.NODE_ENV || 'development',
        api_prefix: process.env.API_PREFIX || '/api/v1',
        cors_origin: process.env.CORS_ORIGIN || '*'
      }
    };

    res.json({
      success: true,
      message: 'System configuration retrieved successfully',
      data: {
        configuration: config
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Comprehensive system health check
router.get('/health/comprehensive', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await MonitoringService.getSystemHealth();

    res.json({
      success: true,
      message: 'Comprehensive system health retrieved successfully',
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get system metrics
router.get('/metrics', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await MonitoringService.getSystemMetrics();

    res.json({
      success: true,
      message: 'System metrics retrieved successfully',
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get performance alerts
router.get('/alerts', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await MonitoringService.checkPerformanceAlerts();

    res.json({
      success: true,
      message: 'Performance alerts retrieved successfully',
      data: {
        alerts,
        count: alerts.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get performance history
router.get('/performance/history', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const history = await MonitoringService.getPerformanceHistory(hours);

    res.json({
      success: true,
      message: 'Performance history retrieved successfully',
      data: {
        history,
        period_hours: hours
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Log current performance metrics
router.post('/metrics/log', authenticate, requireAdminLevel(3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await MonitoringService.logPerformanceMetrics();

    // Log admin action
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      0,
      undefined,
      { action: 'log_performance_metrics' },
      req
    );

    res.json({
      success: true,
      message: 'Performance metrics logged successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
