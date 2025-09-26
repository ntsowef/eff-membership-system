import { executeQuery, executeQuerySingle } from '../config/database';

// Query performance monitoring
interface QueryPerformance {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
  error?: string;
  rowsAffected?: number;
  rowsReturned?: number;
}

// Database optimization service
class DatabaseOptimizationService {
  private queryLog: QueryPerformance[] = [];
  private slowQueryThreshold: number = 1000; // 1 second
  private maxLogSize: number = 1000;

  // Log query performance
  logQuery(performance: QueryPerformance): void {
    this.queryLog.push(performance);
    
    // Keep log size manageable
    if (this.queryLog.length > this.maxLogSize) {
      this.queryLog = this.queryLog.slice(-this.maxLogSize);
    }

    // Log slow queries
    if (performance.duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected (${performance.duration}ms):`, {
        query: performance.query.substring(0, 200),
        duration: performance.duration,
        timestamp: performance.timestamp
      });
    }
  }

  // Get query performance statistics
  getQueryStats(): any {
    if (this.queryLog.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        errorRate: 0
      };
    }

    const totalQueries = this.queryLog.length;
    const totalDuration = this.queryLog.reduce((sum, q) => sum + q.duration, 0);
    const averageDuration = totalDuration / totalQueries;
    const slowQueries = this.queryLog.filter(q => q.duration > this.slowQueryThreshold).length;
    const errorQueries = this.queryLog.filter(q => q.error).length;
    const errorRate = (errorQueries / totalQueries) * 100;

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries,
      slowQueryRate: Math.round((slowQueries / totalQueries) * 100 * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      recentQueries: this.queryLog.slice(-10)
    };
  }

  // Get slow queries
  getSlowQueries(limit: number = 20): QueryPerformance[] {
    return this.queryLog
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Clear query log
  clearQueryLog(): void {
    this.queryLog = [];
  }

  // Analyze database performance
  async analyzeDatabasePerformance(): Promise<any> {
    try {
      const [
        processlist,
        status,
        variables,
        innodbStatus,
        tableStats
      ] = await Promise.all([
        this.getProcessList(),
        this.getDatabaseStatus(),
        this.getDatabaseVariables(),
        this.getInnoDBStatus(),
        this.getTableStatistics()
      ]);

      return {
        processlist,
        status,
        variables,
        innodbStatus,
        tableStats,
        queryStats: this.getQueryStats(),
        recommendations: this.generateRecommendations(status, variables)
      };
    } catch (error) {
      console.error('Error analyzing database performance:', error);
      throw error;
    }
  }

  // Get current process list
  private async getProcessList(): Promise<any[]> {
    try {
      const processes = await executeQuery('SHOW PROCESSLIST');
      return processes;
    } catch (error) {
      console.error('Error getting process list:', error);
      return [];
    }
  }

  // Get database status
  private async getDatabaseStatus(): Promise<any> {
    try {
      const statusRows = await executeQuery('SHOW GLOBAL STATUS');
      const status: any = {};
      
      statusRows.forEach((row: any) => {
        status[row.Variable_name] = row.Value;
      });

      return {
        connections: {
          current: parseInt(status.Threads_connected || '0'),
          max: parseInt(status.Max_used_connections || '0'),
          total: parseInt(status.Connections || '0')
        },
        queries: {
          total: parseInt(status.Queries || '0'),
          slow: parseInt(status.Slow_queries || '0'),
          qps: this.calculateQPS(status)
        },
        innodb: {
          bufferPoolHitRate: this.calculateBufferPoolHitRate(status),
          bufferPoolSize: parseInt(status.Innodb_buffer_pool_pages_total || '0'),
          bufferPoolFree: parseInt(status.Innodb_buffer_pool_pages_free || '0')
        },
        cache: {
          queryCache: {
            hitRate: this.calculateQueryCacheHitRate(status),
            size: parseInt(status.Qcache_total_blocks || '0')
          }
        }
      };
    } catch (error) {
      console.error('Error getting database status:', error);
      return {};
    }
  }

  // Get database variables
  private async getDatabaseVariables(): Promise<any> {
    try {
      const variableRows = await executeQuery('SHOW GLOBAL VARIABLES');
      const variables: any = {};
      
      variableRows.forEach((row: any) => {
        variables[row.Variable_name] = row.Value;
      });

      return {
        maxConnections: parseInt(variables.max_connections || '0'),
        innodbBufferPoolSize: variables.innodb_buffer_pool_size,
        queryCacheSize: variables.query_cache_size,
        tmpTableSize: variables.tmp_table_size,
        maxHeapTableSize: variables.max_heap_table_size
      };
    } catch (error) {
      console.error('Error getting database variables:', error);
      return {};
    }
  }

  // Get InnoDB status
  private async getInnoDBStatus(): Promise<any> {
    try {
      const result = await executeQuerySingle('SHOW ENGINE INNODB STATUS');
      return result?.Status || '';
    } catch (error) {
      console.error('Error getting InnoDB status:', error);
      return '';
    }
  }

  // Get table statistics
  private async getTableStatistics(): Promise<any[]> {
    try {
      const tables = await executeQuery(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          data_free,
          auto_increment,
          create_time,
          update_time
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY data_length DESC
        LIMIT 20
      `);

      return tables.map((table: any) => ({
        name: table.table_name,
        rows: parseInt(table.table_rows || '0'),
        dataSize: parseInt(table.data_length || '0'),
        indexSize: parseInt(table.index_length || '0'),
        freeSpace: parseInt(table.data_free || '0'),
        autoIncrement: table.auto_increment,
        created: table.create_time,
        updated: table.update_time
      }));
    } catch (error) {
      console.error('Error getting table statistics:', error);
      return [];
    }
  }

  // Calculate queries per second
  private calculateQPS(status: any): number {
    const uptime = parseInt(status.Uptime || '1');
    const queries = parseInt(status.Queries || '0');
    return Math.round((queries / uptime) * 100) / 100;
  }

  // Calculate buffer pool hit rate
  private calculateBufferPoolHitRate(status: any): number {
    const reads = parseInt(status.Innodb_buffer_pool_reads || '0');
    const readRequests = parseInt(status.Innodb_buffer_pool_read_requests || '0');
    
    if (readRequests === 0) return 100;
    
    const hitRate = ((readRequests - reads) / readRequests) * 100;
    return Math.round(hitRate * 100) / 100;
  }

  // Calculate query cache hit rate
  private calculateQueryCacheHitRate(status: any): number {
    const hits = parseInt(status.Qcache_hits || '0');
    const inserts = parseInt(status.Qcache_inserts || '0');
    
    if (hits + inserts === 0) return 0;
    
    const hitRate = (hits / (hits + inserts)) * 100;
    return Math.round(hitRate * 100) / 100;
  }

  // Generate performance recommendations
  private generateRecommendations(status: any, variables: any): string[] {
    const recommendations: string[] = [];

    // Connection recommendations
    if (status.connections?.current > variables.maxConnections * 0.8) {
      recommendations.push('Consider increasing max_connections - current usage is high');
    }

    // Buffer pool recommendations
    if (status.innodb?.bufferPoolHitRate < 95) {
      recommendations.push('Consider increasing innodb_buffer_pool_size - hit rate is low');
    }

    // Query cache recommendations
    if (status.cache?.queryCache?.hitRate < 80 && status.cache?.queryCache?.hitRate > 0) {
      recommendations.push('Consider optimizing query cache configuration');
    }

    // Slow query recommendations
    const queryStats = this.getQueryStats();
    if (queryStats.slowQueryRate > 5) {
      recommendations.push('High percentage of slow queries detected - review and optimize queries');
    }

    // Table recommendations
    if (status.queries?.slow > 100) {
      recommendations.push('Enable slow query log and analyze slow queries');
    }

    return recommendations;
  }

  // Optimize database tables
  async optimizeTables(): Promise<any> {
    try {
      const tables = await executeQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND engine = 'InnoDB'
      `);

      const results: any[] = [];

      for (const table of tables) {
        try {
          const result = await executeQuery(`OPTIMIZE TABLE ${table.table_name}`);
          results.push({
            table: table.table_name,
            status: 'optimized',
            result: result
          });
        } catch (error) {
          results.push({
            table: table.table_name,
            status: 'error',
            error: (error as Error).message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error optimizing tables:', error);
      throw error;
    }
  }

  // Analyze table indexes
  async analyzeIndexes(): Promise<any> {
    try {
      const indexAnalysis = await executeQuery(`
        SELECT 
          s.table_name,
          s.index_name,
          s.column_name,
          s.cardinality,
          s.nullable,
          t.table_rows
        FROM information_schema.statistics s
        JOIN information_schema.tables t ON s.table_name = t.table_name
        WHERE s.table_schema = DATABASE()
        AND t.table_schema = DATABASE()
        ORDER BY s.table_name, s.index_name, s.seq_in_index
      `);

      // Group by table and analyze
      const tableIndexes: any = {};
      
      indexAnalysis.forEach((row: any) => {
        if (!tableIndexes[row.table_name]) {
          tableIndexes[row.table_name] = {
            tableName: row.table_name,
            tableRows: row.table_rows,
            indexes: {}
          };
        }
        
        if (!tableIndexes[row.table_name].indexes[row.index_name]) {
          tableIndexes[row.table_name].indexes[row.index_name] = {
            indexName: row.index_name,
            columns: [],
            cardinality: 0
          };
        }
        
        tableIndexes[row.table_name].indexes[row.index_name].columns.push({
          column: row.column_name,
          cardinality: row.cardinality,
          nullable: row.nullable
        });
      });

      return Object.values(tableIndexes);
    } catch (error) {
      console.error('Error analyzing indexes:', error);
      throw error;
    }
  }

  // Get database size information
  async getDatabaseSize(): Promise<any> {
    try {
      const sizeInfo = await executeQuerySingle(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_size_mb,
          ROUND(SUM(data_length) / 1024 / 1024, 2) AS data_size_mb,
          ROUND(SUM(index_length) / 1024 / 1024, 2) AS index_size_mb,
          ROUND(SUM(data_free) / 1024 / 1024, 2) AS free_size_mb,
          COUNT(*) AS table_count
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);

      return sizeInfo;
    } catch (error) {
      console.error('Error getting database size:', error);
      throw error;
    }
  }

  // Monitor connection pool
  async getConnectionPoolStats(): Promise<any> {
    try {
      const connections = await executeQuery(`
        SELECT 
          SUBSTRING_INDEX(host, ':', 1) as client_host,
          user,
          db,
          command,
          time,
          state,
          info
        FROM information_schema.processlist 
        WHERE command != 'Sleep'
        ORDER BY time DESC
      `);

      const stats = {
        activeConnections: connections.length,
        connectionsByHost: {} as any,
        connectionsByUser: {} as any,
        longRunningQueries: connections.filter((c: any) => c.time > 30)
      };

      connections.forEach((conn: any) => {
        // Count by host
        stats.connectionsByHost[conn.client_host] = 
          (stats.connectionsByHost[conn.client_host] || 0) + 1;
        
        // Count by user
        stats.connectionsByUser[conn.user] = 
          (stats.connectionsByUser[conn.user] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting connection pool stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const dbOptimizationService = new DatabaseOptimizationService();

// Query monitoring middleware
export function monitorQuery(originalQuery: Function) {
  return async function (query: string, params?: any[]): Promise<any> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      const result = await originalQuery(query, params);
      const duration = Date.now() - startTime;
      
      // Log performance
      dbOptimizationService.logQuery({
        query,
        duration,
        timestamp,
        parameters: params,
        rowsAffected: result.affectedRows,
        rowsReturned: Array.isArray(result) ? result.length : 1
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      dbOptimizationService.logQuery({
        query,
        duration,
        timestamp,
        parameters: params,
        error: (error as Error).message
      });
      
      throw error;
    }
  };
}

export default dbOptimizationService;
