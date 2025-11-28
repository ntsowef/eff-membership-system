import { Router, Request, Response } from 'express';
import os from 'os';
import { performanceMonitor } from '../services/performanceMonitoring';

const router = Router();

/**
 * Prometheus-compatible metrics endpoint
 * GET /metrics
 * 
 * Outputs metrics in Prometheus text format for scraping
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const metrics = await performanceMonitor.collectMetrics();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Build Prometheus-compatible output
    const lines: string[] = [];
    
    // Help and type declarations for each metric
    
    // Node.js process metrics
    lines.push('# HELP nodejs_process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE nodejs_process_uptime_seconds gauge');
    lines.push(`nodejs_process_uptime_seconds ${process.uptime()}`);
    
    lines.push('# HELP nodejs_memory_heap_used_bytes Process heap memory used');
    lines.push('# TYPE nodejs_memory_heap_used_bytes gauge');
    lines.push(`nodejs_memory_heap_used_bytes ${memUsage.heapUsed}`);
    
    lines.push('# HELP nodejs_memory_heap_total_bytes Process heap memory total');
    lines.push('# TYPE nodejs_memory_heap_total_bytes gauge');
    lines.push(`nodejs_memory_heap_total_bytes ${memUsage.heapTotal}`);
    
    lines.push('# HELP nodejs_memory_external_bytes Process external memory');
    lines.push('# TYPE nodejs_memory_external_bytes gauge');
    lines.push(`nodejs_memory_external_bytes ${memUsage.external}`);
    
    lines.push('# HELP nodejs_memory_rss_bytes Process resident set size');
    lines.push('# TYPE nodejs_memory_rss_bytes gauge');
    lines.push(`nodejs_memory_rss_bytes ${memUsage.rss}`);
    
    lines.push('# HELP nodejs_cpu_user_microseconds CPU time spent in user mode');
    lines.push('# TYPE nodejs_cpu_user_microseconds counter');
    lines.push(`nodejs_cpu_user_microseconds ${cpuUsage.user}`);
    
    lines.push('# HELP nodejs_cpu_system_microseconds CPU time spent in system mode');
    lines.push('# TYPE nodejs_cpu_system_microseconds counter');
    lines.push(`nodejs_cpu_system_microseconds ${cpuUsage.system}`);
    
    // System metrics
    lines.push('# HELP system_load_average System load average');
    lines.push('# TYPE system_load_average gauge');
    const loadAvg = os.loadavg();
    lines.push(`system_load_average{period="1m"} ${loadAvg[0]}`);
    lines.push(`system_load_average{period="5m"} ${loadAvg[1]}`);
    lines.push(`system_load_average{period="15m"} ${loadAvg[2]}`);
    
    lines.push('# HELP system_memory_total_bytes Total system memory');
    lines.push('# TYPE system_memory_total_bytes gauge');
    lines.push(`system_memory_total_bytes ${os.totalmem()}`);
    
    lines.push('# HELP system_memory_free_bytes Free system memory');
    lines.push('# TYPE system_memory_free_bytes gauge');
    lines.push(`system_memory_free_bytes ${os.freemem()}`);
    
    // Database metrics
    lines.push('# HELP db_connections_active Active database connections');
    lines.push('# TYPE db_connections_active gauge');
    lines.push(`db_connections_active ${metrics.database.connections.active}`);
    
    lines.push('# HELP db_connections_max Maximum database connections');
    lines.push('# TYPE db_connections_max gauge');
    lines.push(`db_connections_max ${metrics.database.connections.max}`);
    
    lines.push('# HELP db_connections_utilization_percent Database connection utilization');
    lines.push('# TYPE db_connections_utilization_percent gauge');
    lines.push(`db_connections_utilization_percent ${metrics.database.connections.utilization}`);
    
    lines.push('# HELP db_query_avg_response_time_seconds Average database query response time');
    lines.push('# TYPE db_query_avg_response_time_seconds gauge');
    lines.push(`db_query_avg_response_time_seconds ${metrics.database.queryPerformance.avgResponseTime}`);
    
    lines.push('# HELP db_slow_queries_total Total slow database queries');
    lines.push('# TYPE db_slow_queries_total counter');
    lines.push(`db_slow_queries_total ${metrics.database.queryPerformance.slowQueries}`);
    
    // Circuit breaker metrics
    lines.push('# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half-open)');
    lines.push('# TYPE circuit_breaker_state gauge');
    const cbState = metrics.database.circuitBreaker.state === 'closed' ? 0 : 
                    metrics.database.circuitBreaker.state === 'open' ? 1 : 2;
    lines.push(`circuit_breaker_state ${cbState}`);
    
    lines.push('# HELP circuit_breaker_failures Circuit breaker failure count');
    lines.push('# TYPE circuit_breaker_failures gauge');
    lines.push(`circuit_breaker_failures ${metrics.database.circuitBreaker.failures}`);
    
    // Cache metrics
    lines.push('# HELP cache_hit_rate Cache hit rate percentage');
    lines.push('# TYPE cache_hit_rate gauge');
    lines.push(`cache_hit_rate ${metrics.cache.hitRate}`);
    
    lines.push('# HELP cache_memory_usage_bytes Cache memory usage');
    lines.push('# TYPE cache_memory_usage_bytes gauge');
    lines.push(`cache_memory_usage_bytes ${metrics.cache.memoryUsage}`);
    
    lines.push('# HELP cache_keys_total Total cache keys');
    lines.push('# TYPE cache_keys_total gauge');
    lines.push(`cache_keys_total ${metrics.cache.totalKeys}`);
    
    lines.push('# HELP cache_operations_total Cache operations by type');
    lines.push('# TYPE cache_operations_total counter');
    lines.push(`cache_operations_total{operation="hit"} ${metrics.cache.operations.hits}`);
    lines.push(`cache_operations_total{operation="miss"} ${metrics.cache.operations.misses}`);
    lines.push(`cache_operations_total{operation="set"} ${metrics.cache.operations.sets}`);
    lines.push(`cache_operations_total{operation="delete"} ${metrics.cache.operations.deletes}`);
    
    // Request queue metrics
    lines.push('# HELP request_queue_length Current request queue length');
    lines.push('# TYPE request_queue_length gauge');
    lines.push(`request_queue_length ${metrics.requestQueue.queueLength}`);
    
    lines.push('# HELP request_queue_processing Current requests being processed');
    lines.push('# TYPE request_queue_processing gauge');
    lines.push(`request_queue_processing ${metrics.requestQueue.currentProcessing}`);
    
    // Set content type for Prometheus
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(lines.join('\n') + '\n');
    
  } catch (error) {
    console.error('Error collecting metrics:', error);
    res.status(500).send('# Error collecting metrics\n');
  }
});

export default router;

