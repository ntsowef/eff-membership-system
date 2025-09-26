import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';

// Cache metrics interface
interface CacheMetricsData {
  endpoint: string;
  method: string;
  cacheHit: boolean;
  responseTime: number;
  timestamp: Date;
  cacheKey?: string;
  statusCode: number;
}

// In-memory metrics storage (in production, use Redis or external metrics service)
class CacheMetricsCollector {
  private metrics: CacheMetricsData[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k metrics

  // Add a metric entry
  addMetric(metric: CacheMetricsData): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Get metrics summary
  getMetricsSummary(timeRange?: { start: Date; end: Date }) {
    let filteredMetrics = this.metrics;
    
    if (timeRange) {
      filteredMetrics = this.metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    const totalRequests = filteredMetrics.length;
    const cacheHits = filteredMetrics.filter(m => m.cacheHit).length;
    const cacheMisses = totalRequests - cacheHits;
    const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    const avgResponseTime = totalRequests > 0 
      ? filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests 
      : 0;

    // Group by endpoint
    const endpointStats = filteredMetrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = {
          requests: 0,
          hits: 0,
          misses: 0,
          avgResponseTime: 0,
          totalResponseTime: 0
        };
      }
      
      acc[key].requests++;
      acc[key].totalResponseTime += metric.responseTime;
      acc[key].avgResponseTime = acc[key].totalResponseTime / acc[key].requests;
      
      if (metric.cacheHit) {
        acc[key].hits++;
      } else {
        acc[key].misses++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return {
      summary: {
        totalRequests,
        cacheHits,
        cacheMisses,
        hitRate: Math.round(hitRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100
      },
      endpointStats,
      timeRange: timeRange || { start: new Date(0), end: new Date() }
    };
  }

  // Get recent metrics
  getRecentMetrics(limit: number = 100): CacheMetricsData[] {
    return this.metrics.slice(-limit);
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Get metrics count
  getMetricsCount(): number {
    return this.metrics.length;
  }
}

// Create singleton instance
export const cacheMetricsCollector = new CacheMetricsCollector();

// Cache metrics middleware
export const cacheMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const endpoint = req.route?.path || req.path;
  const method = req.method;

  // Store original end function
  const originalEnd = res.end.bind(res);
  
  res.end = function(...args: any[]) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const cacheHit = res.get('X-Cache') === 'HIT';
    const cacheKey = res.get('X-Cache-Key');
    
    // Collect metrics
    const metric: CacheMetricsData = {
      endpoint,
      method,
      cacheHit,
      responseTime,
      timestamp: new Date(),
      cacheKey,
      statusCode: res.statusCode
    };
    
    cacheMetricsCollector.addMetric(metric);
    
    return originalEnd(...args);
  };
  
  next();
};

// Cache health check function
export const getCacheHealthStatus = async () => {
  try {
    const isAvailable = cacheService.isAvailable();
    const metrics = cacheService.getMetrics();
    const stats = await cacheService.getStats();
    
    return {
      status: isAvailable ? 'healthy' : 'unhealthy',
      connected: isAvailable,
      redis: {
        status: stats?.status || 'unknown',
        connected: stats?.connected || false
      },
      metrics: {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: metrics.hitRate,
        errors: metrics.errors,
        totalOperations: metrics.totalOperations
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

// Performance monitoring function
export const getCachePerformanceMetrics = (timeRange?: { start: Date; end: Date }) => {
  const requestMetrics = cacheMetricsCollector.getMetricsSummary(timeRange);
  const cacheMetrics = cacheService.getMetrics();
  
  return {
    cache: {
      hits: cacheMetrics.hits,
      misses: cacheMetrics.misses,
      hitRate: cacheMetrics.hitRate,
      sets: cacheMetrics.sets,
      deletes: cacheMetrics.deletes,
      errors: cacheMetrics.errors,
      totalOperations: cacheMetrics.totalOperations
    },
    requests: requestMetrics,
    performance: {
      avgHitResponseTime: requestMetrics.endpointStats ? 
        Object.values(requestMetrics.endpointStats)
          .filter((stat: any) => stat.hits > 0)
          .reduce((sum: number, stat: any) => sum + stat.avgResponseTime, 0) / 
        Object.values(requestMetrics.endpointStats).filter((stat: any) => stat.hits > 0).length || 0 : 0,
      avgMissResponseTime: requestMetrics.endpointStats ?
        Object.values(requestMetrics.endpointStats)
          .filter((stat: any) => stat.misses > 0)
          .reduce((sum: number, stat: any) => sum + stat.avgResponseTime, 0) / 
        Object.values(requestMetrics.endpointStats).filter((stat: any) => stat.misses > 0).length || 0 : 0
    },
    timestamp: new Date().toISOString()
  };
};

// Cache alert interface
interface CacheAlert {
  type: 'warning' | 'error';
  message: string;
  threshold: number;
  current: number;
}

// Cache alerts function
export const getCacheAlerts = () => {
  const metrics = cacheService.getMetrics();
  const alerts: CacheAlert[] = [];

  // Low hit rate alert
  if (metrics.totalOperations > 100 && metrics.hitRate < 50) {
    alerts.push({
      type: 'warning',
      message: `Low cache hit rate: ${metrics.hitRate.toFixed(2)}%`,
      threshold: 50,
      current: metrics.hitRate
    });
  }

  // High error rate alert
  const errorRate = metrics.totalOperations > 0 ? (metrics.errors / metrics.totalOperations) * 100 : 0;
  if (errorRate > 5) {
    alerts.push({
      type: 'error',
      message: `High cache error rate: ${errorRate.toFixed(2)}%`,
      threshold: 5,
      current: errorRate
    });
  }

  // No cache activity alert
  if (metrics.totalOperations === 0) {
    alerts.push({
      type: 'warning',
      message: 'No cache activity detected',
      threshold: 1,
      current: 0
    });
  }

  return {
    alerts,
    alertCount: alerts.length,
    severity: alerts.some(a => a.type === 'error') ? 'error' :
              alerts.some(a => a.type === 'warning') ? 'warning' : 'ok',
    timestamp: new Date().toISOString()
  };
};

// Export metrics data for external monitoring systems
export const exportCacheMetrics = (format: 'json' | 'prometheus' = 'json'): string | object => {
  const metrics = cacheService.getMetrics();
  const requestMetrics = cacheMetricsCollector.getMetricsSummary();
  
  if (format === 'prometheus') {
    // Prometheus format
    return `
# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total ${metrics.hits}

# HELP cache_misses_total Total number of cache misses
# TYPE cache_misses_total counter
cache_misses_total ${metrics.misses}

# HELP cache_hit_rate Cache hit rate percentage
# TYPE cache_hit_rate gauge
cache_hit_rate ${metrics.hitRate}

# HELP cache_errors_total Total number of cache errors
# TYPE cache_errors_total counter
cache_errors_total ${metrics.errors}

# HELP cache_operations_total Total number of cache operations
# TYPE cache_operations_total counter
cache_operations_total ${metrics.totalOperations}
    `.trim();
  }
  
  // JSON format (default)
  return {
    cache: metrics,
    requests: requestMetrics,
    timestamp: new Date().toISOString()
  };
};
