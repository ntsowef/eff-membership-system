import { Router, Request, Response } from 'express';
import os from 'os';
import { performanceMonitor } from '../services/performanceMonitoring';

const router = Router();

/**
 * Prometheus-compatible metrics endpoint
 * Returns metrics in Prometheus text format
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Use collectMetrics (async) to get current performance data
    const metrics = await performanceMonitor.collectMetrics();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    const loadAvg = os.loadavg();

    // Build Prometheus text format
    const lines: string[] = [
      '# HELP nodejs_process_uptime_seconds Process uptime in seconds',
      '# TYPE nodejs_process_uptime_seconds gauge',
      `nodejs_process_uptime_seconds ${uptime}`,
      '',
      '# HELP nodejs_memory_heap_used_bytes Process heap memory used',
      '# TYPE nodejs_memory_heap_used_bytes gauge',
      `nodejs_memory_heap_used_bytes ${memoryUsage.heapUsed}`,
      '',
      '# HELP nodejs_memory_heap_total_bytes Process heap memory total',
      '# TYPE nodejs_memory_heap_total_bytes gauge',
      `nodejs_memory_heap_total_bytes ${memoryUsage.heapTotal}`,
      '',
      '# HELP nodejs_memory_external_bytes Process external memory',
      '# TYPE nodejs_memory_external_bytes gauge',
      `nodejs_memory_external_bytes ${memoryUsage.external}`,
      '',
      '# HELP nodejs_memory_rss_bytes Process resident set size',
      '# TYPE nodejs_memory_rss_bytes gauge',
      `nodejs_memory_rss_bytes ${memoryUsage.rss}`,
      '',
      '# HELP nodejs_cpu_user_microseconds CPU user time',
      '# TYPE nodejs_cpu_user_microseconds counter',
      `nodejs_cpu_user_microseconds ${cpuUsage.user}`,
      '',
      '# HELP nodejs_cpu_system_microseconds CPU system time',
      '# TYPE nodejs_cpu_system_microseconds counter',
      `nodejs_cpu_system_microseconds ${cpuUsage.system}`,
      '',
      '# HELP system_load_average System load average',
      '# TYPE system_load_average gauge',
      `system_load_average{period="1m"} ${loadAvg[0]}`,
      `system_load_average{period="5m"} ${loadAvg[1]}`,
      `system_load_average{period="15m"} ${loadAvg[2]}`,
      '',
      '# HELP system_memory_total_bytes Total system memory',
      '# TYPE system_memory_total_bytes gauge',
      `system_memory_total_bytes ${os.totalmem()}`,
      '',
      '# HELP system_memory_free_bytes Free system memory',
      '# TYPE system_memory_free_bytes gauge',
      `system_memory_free_bytes ${os.freemem()}`,
      '',
      '# HELP db_connections_active Active database connections',
      '# TYPE db_connections_active gauge',
      `db_connections_active ${metrics.database?.connections?.active || 0}`,
      '',
      '# HELP db_connections_max Maximum database connections',
      '# TYPE db_connections_max gauge',
      `db_connections_max ${metrics.database?.connections?.max || 100}`,
      '',
      '# HELP db_connections_utilization_percent Database connection utilization',
      '# TYPE db_connections_utilization_percent gauge',
      `db_connections_utilization_percent ${metrics.database?.connections?.utilization || 0}`,
      '',
      '# HELP db_query_avg_response_time_seconds Average query response time',
      '# TYPE db_query_avg_response_time_seconds gauge',
      `db_query_avg_response_time_seconds ${(metrics.database?.queryPerformance?.avgResponseTime || 0) / 1000}`,
      '',
      '# HELP db_slow_queries_total Total slow queries',
      '# TYPE db_slow_queries_total counter',
      `db_slow_queries_total ${metrics.database?.queryPerformance?.slowQueries || 0}`,
      '',
      '# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=open, 0.5=half-open)',
      '# TYPE circuit_breaker_state gauge',
      `circuit_breaker_state ${metrics.database?.circuitBreaker?.state === 'closed' ? 0 : metrics.database?.circuitBreaker?.state === 'open' ? 1 : 0.5}`,
      '',
      '# HELP circuit_breaker_failures Circuit breaker failure count',
      '# TYPE circuit_breaker_failures counter',
      `circuit_breaker_failures ${metrics.database?.circuitBreaker?.failures || 0}`,
      '',
      '# HELP cache_hit_rate Cache hit rate',
      '# TYPE cache_hit_rate gauge',
      `cache_hit_rate ${metrics.cache?.hitRate || 0}`,
      '',
      '# HELP cache_memory_usage_bytes Cache memory usage',
      '# TYPE cache_memory_usage_bytes gauge',
      `cache_memory_usage_bytes ${metrics.cache?.memoryUsage || 0}`,
      '',
      '# HELP cache_keys_total Total cache keys',
      '# TYPE cache_keys_total gauge',
      `cache_keys_total ${metrics.cache?.totalKeys || 0}`,
      '',
      '# HELP cache_operations_total Cache operations total',
      '# TYPE cache_operations_total counter',
      `cache_operations_total{operation="hits"} ${metrics.cache?.operations?.hits || 0}`,
      `cache_operations_total{operation="misses"} ${metrics.cache?.operations?.misses || 0}`,
      '',
      '# HELP request_queue_length Request queue length',
      '# TYPE request_queue_length gauge',
      `request_queue_length ${metrics.requestQueue?.queueLength || 0}`,
      '',
      '# HELP request_queue_processing Requests currently processing',
      '# TYPE request_queue_processing gauge',
      `request_queue_processing ${metrics.requestQueue?.currentProcessing || 0}`,
    ];

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(lines.join('\n'));
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

export default router;

