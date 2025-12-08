import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { dbOptimizationService } from '../services/databaseOptimization';
import { MonitoringService } from '../services/monitoringService';
import { BackupService } from '../services/backupService';
import { authenticate, requireAdminLevel } from '../middleware/auth';
import { executeQuery, executeQuerySingle } from '../config/database';
import { config } from '../config/config';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import { AuditLogModel } from '../models/auditLogs';
import fs from 'fs';
import path from 'path';

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

// Get system logs (real data from database)
router.get('/logs', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      level,
      category,
      limit = '50',
      offset = '0',
      startDate,
      endDate
    } = req.query;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (level) {
      conditions.push(`level = $${paramIndex++}`);
      params.push(level);
    }

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch logs from multiple sources and combine them
    const [auditLogs, systemLogs, activityLogs] = await Promise.all([
      // Audit logs
      executeQuery(`
        SELECT
          al.audit_id as id,
          'audit' as source,
          CASE
            WHEN al.action IN ('login', 'logout', 'login_failed') THEN 'info'
            WHEN al.action IN ('delete', 'permission_revoked') THEN 'warning'
            ELSE 'info'
          END as level,
          CASE
            WHEN al.entity_type = 'user' THEN 'Authentication'
            WHEN al.entity_type = 'system' THEN 'System'
            WHEN al.entity_type = 'member' THEN 'Members'
            ELSE 'General'
          END as category,
          CONCAT(COALESCE(u.name, 'System'), ' performed ', al.action, ' on ', al.entity_type) as message,
          jsonb_build_object(
            'action', al.action,
            'entity_type', al.entity_type,
            'entity_id', al.entity_id,
            'user', COALESCE(u.name, 'System'),
            'ip_address', al.ip_address
          ) as details,
          al.created_at as timestamp
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        ORDER BY al.created_at DESC
        LIMIT 20
      `, []),

      // System logs (if table exists)
      executeQuery(`
        SELECT
          sl.id,
          'system' as source,
          sl.level,
          sl.category,
          sl.message,
          sl.details,
          sl.created_at as timestamp
        FROM system_logs sl
        ORDER BY sl.created_at DESC
        LIMIT 20
      `, []).catch(() => []),

      // User activity logs
      executeQuery(`
        SELECT
          ual.log_id as id,
          'activity' as source,
          CASE
            WHEN ual.response_status >= 500 THEN 'error'
            WHEN ual.response_status >= 400 THEN 'warning'
            ELSE 'info'
          END as level,
          COALESCE(ual.resource_type, 'General') as category,
          CONCAT(COALESCE(u.name, 'User'), ' - ', ual.action_type, ' ', COALESCE(ual.resource_type, '')) as message,
          jsonb_build_object(
            'action_type', ual.action_type,
            'resource_type', ual.resource_type,
            'resource_id', ual.resource_id,
            'request_method', ual.request_method,
            'request_url', ual.request_url,
            'response_status', ual.response_status,
            'response_time_ms', ual.response_time_ms,
            'ip_address', ual.ip_address::text,
            'user', COALESCE(u.name, 'User')
          ) as details,
          ual.created_at as timestamp
        FROM user_activity_logs ual
        LEFT JOIN users u ON ual.user_id = u.user_id
        ORDER BY ual.created_at DESC
        LIMIT 20
      `, []).catch(() => [])
    ]);

    // Combine and sort all logs
    const allLogs = [...auditLogs, ...systemLogs, ...activityLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, parseInt(limit as string));

    res.json({
      success: true,
      message: 'System logs retrieved successfully',
      data: {
        logs: allLogs,
        total: allLogs.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    next(error);
  }
});

// Get single log detail by ID and source
router.get('/logs/:source/:id', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source, id } = req.params;
    let logDetail: any = null;

    if (source === 'audit') {
      const result = await executeQuery(`
        SELECT
          al.audit_id as id,
          'audit' as source,
          al.action,
          al.entity_type,
          al.entity_id,
          al.old_values,
          al.new_values,
          al.ip_address,
          al.user_agent,
          al.session_id,
          al.created_at as timestamp,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        WHERE al.audit_id = $1
      `, [id]);
      logDetail = result[0] || null;
    } else if (source === 'system') {
      const result = await executeQuery(`
        SELECT
          sl.id,
          'system' as source,
          sl.level,
          sl.category,
          sl.message,
          sl.details,
          sl.user_id,
          sl.ip_address,
          sl.user_agent,
          sl.request_id,
          sl.created_at as timestamp,
          u.name as user_name,
          u.email as user_email
        FROM system_logs sl
        LEFT JOIN users u ON sl.user_id = u.user_id
        WHERE sl.id = $1
      `, [id]);
      logDetail = result[0] || null;
    } else if (source === 'activity') {
      const result = await executeQuery(`
        SELECT
          ual.log_id as id,
          'activity' as source,
          ual.action_type,
          ual.resource_type,
          ual.resource_id,
          ual.description,
          ual.ip_address,
          ual.user_agent,
          ual.request_method,
          ual.request_url,
          ual.response_status,
          ual.response_time_ms,
          ual.metadata,
          ual.created_at as timestamp,
          u.name as user_name,
          u.email as user_email
        FROM user_activity_logs ual
        LEFT JOIN users u ON ual.user_id = u.user_id
        WHERE ual.log_id = $1
      `, [id]);
      logDetail = result[0] || null;
    }

    if (!logDetail) {
      return res.status(404).json({
        success: false,
        message: 'Log not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Log detail retrieved successfully',
      data: logDetail,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching log detail:', error);
    next(error);
  }
});

// Export logs to CSV
router.get('/logs/export/csv', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      level,
      category,
      startDate,
      endDate
    } = req.query;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (level) {
      conditions.push(`level = $${paramIndex++}`);
      params.push(level);
    }

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    // Fetch logs from all sources (no limit for export)
    const [auditLogs, systemLogs, activityLogs] = await Promise.all([
      // Audit logs
      executeQuery(`
        SELECT
          al.audit_id as id,
          'audit' as source,
          CASE
            WHEN al.action IN ('login', 'logout', 'login_failed') THEN 'info'
            WHEN al.action IN ('delete', 'permission_revoked') THEN 'warning'
            ELSE 'info'
          END as level,
          CASE
            WHEN al.entity_type = 'user' THEN 'Authentication'
            WHEN al.entity_type = 'system' THEN 'System'
            WHEN al.entity_type = 'member' THEN 'Members'
            ELSE 'General'
          END as category,
          CONCAT(COALESCE(u.name, 'System'), ' performed ', al.action, ' on ', al.entity_type) as message,
          al.ip_address,
          COALESCE(u.name, 'System') as user_name,
          al.created_at as timestamp
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.user_id
        ORDER BY al.created_at DESC
      `, []),

      // System logs
      executeQuery(`
        SELECT
          sl.id,
          'system' as source,
          sl.level,
          sl.category,
          sl.message,
          sl.ip_address,
          COALESCE(u.name, 'System') as user_name,
          sl.created_at as timestamp
        FROM system_logs sl
        LEFT JOIN users u ON sl.user_id = u.user_id
        ORDER BY sl.created_at DESC
      `, []).catch(() => []),

      // Activity logs
      executeQuery(`
        SELECT
          ual.log_id as id,
          'activity' as source,
          'info' as level,
          'User Activity' as category,
          CONCAT(COALESCE(u.name, 'Unknown'), ' - ', ual.action_type, ' on ', COALESCE(ual.resource_type, 'resource')) as message,
          ual.ip_address,
          COALESCE(u.name, 'Unknown') as user_name,
          ual.created_at as timestamp
        FROM user_activity_logs ual
        LEFT JOIN users u ON ual.user_id = u.user_id
        ORDER BY ual.created_at DESC
      `, []).catch(() => [])
    ]);

    // Combine and sort all logs
    const allLogs = [...auditLogs, ...systemLogs, ...activityLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Generate CSV
    const csvHeader = 'ID,Source,Timestamp,Level,Category,Message,User,IP Address\n';
    const csvRows = allLogs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const message = (log.message || '').replace(/"/g, '""'); // Escape quotes
      return `${log.id},"${log.source}","${timestamp}","${log.level}","${log.category}","${message}","${log.user_name || 'N/A'}","${log.ip_address || 'N/A'}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    // Set headers for file download
    const filename = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting logs:', error);
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

// Get system overview with real data
router.get('/overview', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get real system statistics from database
    const [
      memberStats,
      userStats,
      sessionStats,
      auditStats,
      cacheStats,
      dbSize
    ] = await Promise.all([
      // Member statistics
      executeQuerySingle(`
        SELECT
          COUNT(*) as total_members,
          COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_members_30d,
          COUNT(CASE WHEN vs.status_name = 'Registered' THEN 1 END) as active_members
        FROM members_consolidated m
        LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
      `),
      // User statistics
      executeQuerySingle(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
          COUNT(CASE WHEN last_login_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_last_30_days
        FROM users
      `),
      // Session statistics
      executeQuerySingle(`
        SELECT
          COUNT(*) as active_sessions,
          COUNT(DISTINCT user_id) as unique_users
        FROM user_sessions
        WHERE expires_at > NOW() AND is_active = TRUE
      `),
      // Audit log statistics (for request tracking)
      executeQuerySingle(`
        SELECT
          COUNT(*) as total_requests_24h,
          COUNT(CASE WHEN action = 'LOGIN_FAILED' THEN 1 END) as failed_logins_24h
        FROM audit_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      `),
      // Cache stats
      cacheService.getStats(),
      // Database size
      dbOptimizationService.getDatabaseSize()
    ]);

    // Calculate system metrics
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const memoryUsagePercent = Math.round((memory.heapUsed / memory.heapTotal) * 100);

    // Calculate error rate (failed logins / total requests)
    const errorRate = auditStats?.total_requests_24h > 0
      ? ((auditStats.failed_logins_24h / auditStats.total_requests_24h) * 100).toFixed(2)
      : '0.00';

    // Format uptime
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const uptimeFormatted = `${days} days, ${hours} hours`;

    const overview = {
      system_info: {
        version: process.env.npm_package_version || '2.1.0',
        environment: process.env.NODE_ENV || 'production',
        uptime: uptimeFormatted,
        uptime_seconds: Math.floor(uptime),
        last_restart: new Date(Date.now() - uptime * 1000).toISOString(),
        status: 'healthy',
        node_version: process.version
      },
      system_metrics: {
        cpu: 0, // CPU usage requires OS-level monitoring
        memory: memoryUsagePercent,
        disk: 0, // Disk usage requires OS-level monitoring
        network: 0, // Network I/O requires OS-level monitoring
        active_users: sessionStats?.unique_users || 0,
        total_requests: auditStats?.total_requests_24h || 0,
        error_rate: parseFloat(errorRate),
        response_time: 0 // Would need request timing middleware
      },
      database_stats: {
        total_members: memberStats?.total_members || 0,
        new_members_30d: memberStats?.new_members_30d || 0,
        active_members: memberStats?.active_members || 0,
        total_users: userStats?.total_users || 0,
        active_users: userStats?.active_users || 0,
        active_sessions: sessionStats?.active_sessions || 0,
        database_size: dbSize
      },
      cache_stats: {
        connected: cacheStats.connected,
        hit_rate: cacheStats.hitRate || 0,
        memory_usage: cacheStats.memoryUsage || 0,
        total_keys: cacheStats.totalKeys || 0
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'System overview retrieved successfully',
      data: overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system overview:', error);
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
// TEMPORARILY DISABLED - TypeScript compilation issue with MonitoringService
// router.get('/performance/history', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const hours = parseInt(req.query.hours as string) || 24;
//     const history = await MonitoringService.getPerformanceHistory(hours);

//     res.json({
//       success: true,
//       message: 'Performance history retrieved successfully',
//       data: {
//         history,
//         period_hours: hours
//       },
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     next(error);
//   }
// });

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

// Get all system settings
router.get('/settings', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await executeQuery(`
      SELECT
        id,
        setting_key,
        setting_value,
        setting_type,
        description
      FROM system_settings
      ORDER BY setting_key
    `);

    // Handle both array and object with rows property
    const settings = Array.isArray(result) ? result : (result.rows || []);

    // Parse values based on type
    const parsedSettings = settings.map((setting: any) => {
      let value = setting.setting_value;

      switch (setting.setting_type) {
        case 'boolean':
          value = value === 'true' || value === '1' || value === 1 || value === true;
          break;
        case 'integer':
          value = parseInt(value, 10);
          break;
        case 'float':
          value = parseFloat(value);
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if JSON parse fails
          }
          break;
        default:
          // string - keep as is
          break;
      }

      return {
        id: setting.id,
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        setting_type: setting.setting_type,
        description: setting.description,
        value
      };
    });

    res.json({
      success: true,
      message: 'System settings retrieved successfully',
      data: {
        settings: parsedSettings
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    next(error);
  }
});

// Get a specific system setting
router.get('/settings/:key', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    const setting = await executeQuerySingle(`
      SELECT
        id,
        setting_key,
        setting_value,
        setting_type,
        description
      FROM system_settings
      WHERE setting_key = $1
    `, [key]);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found',
        timestamp: new Date().toISOString()
      });
    }

    // Parse value based on type
    let value = setting.setting_value;
    switch (setting.setting_type) {
      case 'boolean':
        value = value === 'true' || value === '1' || value === 1 || value === true;
        break;
      case 'integer':
        value = parseInt(value, 10);
        break;
      case 'float':
        value = parseFloat(value);
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if JSON parse fails
        }
        break;
    }

    res.json({
      success: true,
      message: 'System setting retrieved successfully',
      data: {
        setting: {
          id: setting.id,
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
          setting_type: setting.setting_type,
          description: setting.description,
          value
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system setting:', error);
    next(error);
  }
});

// Update a system setting
router.put('/settings/:key',
  authenticate,
  requireAdminLevel(1),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Value is required',
          timestamp: new Date().toISOString()
        });
      }

      // Check if setting exists
      const existingSetting = await executeQuerySingle(`
        SELECT id, setting_key, setting_value, setting_type FROM system_settings WHERE setting_key = $1
      `, [key]);

      if (!existingSetting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found',
          timestamp: new Date().toISOString()
        });
      }

      // Convert value to string for storage
      let stringValue: string;
      switch (existingSetting.setting_type) {
        case 'boolean':
          stringValue = value ? 'true' : 'false';
          break;
        case 'json':
          stringValue = JSON.stringify(value);
          break;
        default:
          stringValue = String(value);
          break;
      }

      // Get old value for audit log
      const oldValue = existingSetting.setting_type === 'boolean'
        ? (existingSetting.setting_value === 'true' || existingSetting.setting_value === '1')
        : existingSetting.setting_value;

      // Update the setting
      await executeQuery(`
        UPDATE system_settings
        SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
        WHERE setting_key = $2
      `, [stringValue, key]);

      // Log audit trail
      const userId = (req as any).user?.id;
      if (userId) {
        await logAudit(
          userId,
          AuditAction.UPDATE,
          EntityType.SYSTEM,
          undefined,
          { setting_key: key, old_value: oldValue },
          { setting_key: key, new_value: value },
          req
        );
      }

      // Special handling for SMS enable/disable
      if (key === 'enable_sms_notifications') {
        // Update .env.postgres file
        const envPath = path.resolve(__dirname, '../../.env.postgres');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          const smsEnabledValue = value ? 'true' : 'false';

          // Replace SMS_ENABLED value
          if (envContent.includes('SMS_ENABLED=')) {
            envContent = envContent.replace(/SMS_ENABLED=.*/g, `SMS_ENABLED=${smsEnabledValue}`);
          } else {
            // Add if not exists
            envContent += `\nSMS_ENABLED=${smsEnabledValue}\n`;
          }

          fs.writeFileSync(envPath, envContent, 'utf8');
        }

        // Update runtime config
        if (config.sms) {
          config.sms.enabled = value;
        }
      }

      res.json({
        success: true,
        message: 'System setting updated successfully',
        data: {
          setting_key: key,
          setting_value: value
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== BACKUP ROUTES ====================

// Create a new backup
router.post('/backups', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔄 Starting database backup...');

    const backup = await BackupService.createBackup();

    // Log audit
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      backup.backup_id,
      null,
      { filename: backup.filename, size: backup.size },
      req
    );

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: {
        ...backup,
        sizeFormatted: BackupService.formatBytes(backup.size)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    next(error);
  }
});

// List all backups
router.get('/backups', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backups = await BackupService.listBackups();

    // Format sizes
    const formattedBackups = backups.map(backup => ({
      ...backup,
      sizeFormatted: BackupService.formatBytes(backup.size)
    }));

    res.json({
      success: true,
      message: 'Backups retrieved successfully',
      data: { backups: formattedBackups, total: backups.length },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get backup statistics
router.get('/backups/stats', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await BackupService.getBackupStats();

    res.json({
      success: true,
      message: 'Backup statistics retrieved successfully',
      data: {
        ...stats,
        totalSizeFormatted: BackupService.formatBytes(stats.totalSize),
        latestBackup: stats.latestBackup ? {
          ...stats.latestBackup,
          sizeFormatted: BackupService.formatBytes(stats.latestBackup.size)
        } : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Download a backup
router.get('/backups/:id/download', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backupId = parseInt(req.params.id);
    const { filepath, filename } = await BackupService.getBackupFile(backupId);

    // Log audit
    await logAudit(
      req.user!.id,
      AuditAction.READ,
      EntityType.SYSTEM,
      backupId,
      null,
      { action: 'download_backup', filename },
      req
    );

    res.download(filepath, filename);
  } catch (error) {
    next(error);
  }
});

// Delete a backup
router.delete('/backups/:id', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backupId = parseInt(req.params.id);

    await BackupService.deleteBackup(backupId);

    // Log audit
    await logAudit(
      req.user!.id,
      AuditAction.DELETE,
      EntityType.SYSTEM,
      backupId,
      { backup_id: backupId },
      null,
      req
    );

    res.json({
      success: true,
      message: 'Backup deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
