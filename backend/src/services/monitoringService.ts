import { executeQuery, executeQuerySingle } from '../config/database';
import { cacheService } from './cacheService';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  components: ComponentHealth[];
  metrics: SystemMetrics;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time?: number;
  error?: string;
  details?: any;
}

export interface SystemMetrics {
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  disk: DiskMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  api: ApiMetrics;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  usage_percentage: number;
}

export interface CpuMetrics {
  load_average: number[];
  usage_percentage: number;
  cores: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usage_percentage: number;
}

export interface DatabaseMetrics {
  connections: number;
  max_connections: number;
  slow_queries: number;
  uptime: number;
  query_cache_hit_rate: number;
}

export interface CacheMetrics {
  connected: boolean;
  memory_usage: number;
  hit_rate: number;
  keys_count: number;
  uptime: number;
}

export interface ApiMetrics {
  requests_per_minute: number;
  average_response_time: number;
  error_rate: number;
  active_sessions: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'memory' | 'cpu' | 'disk' | 'database' | 'cache' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  current_value: number;
  created_at: Date;
}

export class MonitoringService {
  private static readonly MEMORY_WARNING_THRESHOLD = 80; // 80%
  private static readonly MEMORY_CRITICAL_THRESHOLD = 90; // 90%
  private static readonly CPU_WARNING_THRESHOLD = 70; // 70%
  private static readonly CPU_CRITICAL_THRESHOLD = 85; // 85%
  private static readonly DISK_WARNING_THRESHOLD = 80; // 80%
  private static readonly DISK_CRITICAL_THRESHOLD = 90; // 90%
  private static readonly RESPONSE_TIME_WARNING = 2000; // 2 seconds
  private static readonly RESPONSE_TIME_CRITICAL = 5000; // 5 seconds

  // Main health check
  static async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    const components: ComponentHealth[] = [];
    
    // Check database
    const dbHealth = await this.checkDatabaseHealth();
    components.push(dbHealth);
    
    // Check cache
    const cacheHealth = await this.checkCacheHealth();
    components.push(cacheHealth);
    
    // Check file system
    const fsHealth = await this.checkFileSystemHealth();
    components.push(fsHealth);
    
    // Check external services
    const externalHealth = await this.checkExternalServices();
    components.push(...externalHealth);
    
    // Determine overall status
    const overallStatus = this.determineOverallStatus(components);
    
    // Get system metrics
    const metrics = await this.getSystemMetrics();
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      components,
      metrics
    };
  }

  // Database health check
  static async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      await executeQuerySingle('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime < this.RESPONSE_TIME_WARNING ? 'healthy' : 'degraded',
        response_time: responseTime
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        response_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Cache health check
  static async checkCacheHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      await cacheService.set('health_check', 'ok', 10);
      const result = await cacheService.get('health_check');
      const responseTime = Date.now() - startTime;
      
      if (result === 'ok') {
        return {
          name: 'cache',
          status: responseTime < this.RESPONSE_TIME_WARNING ? 'healthy' : 'degraded',
          response_time: responseTime
        };
      } else {
        return {
          name: 'cache',
          status: 'unhealthy',
          response_time: responseTime,
          error: 'Cache read/write test failed'
        };
      }
    } catch (error) {
      return {
        name: 'cache',
        status: 'unhealthy',
        response_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // File system health check
  static async checkFileSystemHealth(): Promise<ComponentHealth> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const exportsDir = path.join(process.cwd(), 'exports');
      
      // Check if directories exist and are writable
      const checks = [
        { path: uploadsDir, name: 'uploads' },
        { path: exportsDir, name: 'exports' }
      ];
      
      for (const check of checks) {
        if (!fs.existsSync(check.path)) {
          fs.mkdirSync(check.path, { recursive: true });
        }
        
        // Test write access
        const testFile = path.join(check.path, '.health_check');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      }
      
      return {
        name: 'filesystem',
        status: 'healthy'
      };
    } catch (error) {
      return {
        name: 'filesystem',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // External services health check
  static async checkExternalServices(): Promise<ComponentHealth[]> {
    const services: ComponentHealth[] = [];
    
    // Add checks for external services like email, SMS, etc.
    // For now, we'll just return empty array
    
    return services;
  }

  // Get comprehensive system metrics
  static async getSystemMetrics(): Promise<SystemMetrics> {
    const [memory, cpu, disk, database, cache, api] = await Promise.all([
      this.getMemoryMetrics(),
      this.getCpuMetrics(),
      this.getDiskMetrics(),
      this.getDatabaseMetrics(),
      this.getCacheMetrics(),
      this.getApiMetrics()
    ]);
    
    return {
      memory,
      cpu,
      disk,
      database,
      cache,
      api
    };
  }

  // Memory metrics
  static async getMemoryMetrics(): Promise<MemoryMetrics> {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usage_percentage: (usedMem / totalMem) * 100
    };
  }

  // CPU metrics
  static async getCpuMetrics(): Promise<CpuMetrics> {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate CPU usage (simplified)
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return {
      load_average: loadAvg,
      usage_percentage: usage,
      cores: cpus.length
    };
  }

  // Disk metrics
  static async getDiskMetrics(): Promise<DiskMetrics> {
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified version - in production, you'd use a proper disk usage library
      return {
        total: 1000000000, // 1GB placeholder
        used: 500000000,   // 500MB placeholder
        free: 500000000,   // 500MB placeholder
        usage_percentage: 50
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usage_percentage: 0
      };
    }
  }

  // Database metrics
  static async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const [connections, maxConnections, slowQueries, uptime, cacheHitRate] = await Promise.all([
        executeQuerySingle("SHOW STATUS LIKE 'Threads_connected'"),
        executeQuerySingle("SHOW VARIABLES LIKE 'max_connections'"),
        executeQuerySingle("SHOW STATUS LIKE 'Slow_queries'"),
        executeQuerySingle("SHOW STATUS LIKE 'Uptime'"),
        executeQuerySingle("SHOW STATUS LIKE 'Qcache_hit_rate'")
      ]);
      
      return {
        connections: parseInt(connections?.Value || '0'),
        max_connections: parseInt(maxConnections?.Value || '0'),
        slow_queries: parseInt(slowQueries?.Value || '0'),
        uptime: parseInt(uptime?.Value || '0'),
        query_cache_hit_rate: parseFloat(cacheHitRate?.Value || '0')
      };
    } catch (error) {
      return {
        connections: 0,
        max_connections: 0,
        slow_queries: 0,
        uptime: 0,
        query_cache_hit_rate: 0
      };
    }
  }

  // Cache metrics
  static async getCacheMetrics(): Promise<CacheMetrics> {
    try {
      // This would need to be implemented based on your Redis client
      return {
        connected: true,
        memory_usage: 0,
        hit_rate: 0,
        keys_count: 0,
        uptime: 0
      };
    } catch (error) {
      return {
        connected: false,
        memory_usage: 0,
        hit_rate: 0,
        keys_count: 0,
        uptime: 0
      };
    }
  }

  // API metrics
  static async getApiMetrics(): Promise<ApiMetrics> {
    try {
      // Get active sessions count
      const activeSessions = await executeQuerySingle(
        'SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW() AND is_active = TRUE'
      );
      
      // Get recent API metrics (this would typically come from a metrics store)
      return {
        requests_per_minute: 0, // Would be calculated from request logs
        average_response_time: 0, // Would be calculated from request logs
        error_rate: 0, // Would be calculated from error logs
        active_sessions: activeSessions?.count || 0
      };
    } catch (error) {
      return {
        requests_per_minute: 0,
        average_response_time: 0,
        error_rate: 0,
        active_sessions: 0
      };
    }
  }

  // Performance monitoring and alerting
  static async checkPerformanceAlerts(): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const metrics = await this.getSystemMetrics();
    
    // Memory alerts
    if (metrics.memory.usage_percentage > this.MEMORY_CRITICAL_THRESHOLD) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        severity: 'critical',
        message: 'Memory usage is critically high',
        threshold: this.MEMORY_CRITICAL_THRESHOLD,
        current_value: metrics.memory.usage_percentage,
        created_at: new Date()
      });
    } else if (metrics.memory.usage_percentage > this.MEMORY_WARNING_THRESHOLD) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        severity: 'medium',
        message: 'Memory usage is high',
        threshold: this.MEMORY_WARNING_THRESHOLD,
        current_value: metrics.memory.usage_percentage,
        created_at: new Date()
      });
    }
    
    // CPU alerts
    if (metrics.cpu.usage_percentage > this.CPU_CRITICAL_THRESHOLD) {
      alerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu',
        severity: 'critical',
        message: 'CPU usage is critically high',
        threshold: this.CPU_CRITICAL_THRESHOLD,
        current_value: metrics.cpu.usage_percentage,
        created_at: new Date()
      });
    } else if (metrics.cpu.usage_percentage > this.CPU_WARNING_THRESHOLD) {
      alerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu',
        severity: 'medium',
        message: 'CPU usage is high',
        threshold: this.CPU_WARNING_THRESHOLD,
        current_value: metrics.cpu.usage_percentage,
        created_at: new Date()
      });
    }
    
    // Disk alerts
    if (metrics.disk.usage_percentage > this.DISK_CRITICAL_THRESHOLD) {
      alerts.push({
        id: `disk-${Date.now()}`,
        type: 'disk',
        severity: 'critical',
        message: 'Disk usage is critically high',
        threshold: this.DISK_CRITICAL_THRESHOLD,
        current_value: metrics.disk.usage_percentage,
        created_at: new Date()
      });
    } else if (metrics.disk.usage_percentage > this.DISK_WARNING_THRESHOLD) {
      alerts.push({
        id: `disk-${Date.now()}`,
        type: 'disk',
        severity: 'medium',
        message: 'Disk usage is high',
        threshold: this.DISK_WARNING_THRESHOLD,
        current_value: metrics.disk.usage_percentage,
        created_at: new Date()
      });
    }
    
    return alerts;
  }

  // Determine overall system status
  private static determineOverallStatus(components: ComponentHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  // Log performance metrics
  static async logPerformanceMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      
      await executeQuery(`
        INSERT INTO performance_metrics (
          memory_usage, cpu_usage, disk_usage, database_connections,
          cache_connected, api_active_sessions, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        metrics.memory.usage_percentage,
        metrics.cpu.usage_percentage,
        metrics.disk.usage_percentage,
        metrics.database.connections,
        metrics.cache.connected ? 1 : 0,
        metrics.api.active_sessions
      ]);
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }

  // Get historical performance data
  static async getPerformanceHistory(hours: number = 24): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT 
          memory_usage,
          cpu_usage,
          disk_usage,
          database_connections,
          cache_connected,
          api_active_sessions,
          recorded_at
        FROM performance_metrics
        WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        ORDER BY recorded_at ASC
      `, [hours]);
    } catch (error) {
      console.error('Failed to get performance history:', error);
      return [];
    }
  }
}
