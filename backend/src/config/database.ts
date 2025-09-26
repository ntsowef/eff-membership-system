import mysql from 'mysql2/promise';
import { config } from './config';

// Database connection pool
let pool: mysql.Pool | null = null;

// Database configuration interface
interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  charset: string;
}

// Get optimized database configuration for high concurrency
const getDatabaseConfig = (): DatabaseConfig => ({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port,
  // Optimized for 20,000+ concurrent users
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '200', 10), // Increased from 10
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10), // 30 seconds
  timeout: parseInt(process.env.DB_TIMEOUT || '30000', 10), // 30 seconds
  reconnect: true,
  charset: 'utf8mb4',
  // Additional performance optimizations
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '500', 10), // Queue up to 500 requests
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000', 10), // 5 minutes
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // MySQL-specific optimizations
  multipleStatements: false, // Security best practice
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  // Connection pool optimization
  removeNodeErrorCount: 5,
  restoreNodeTimeout: 0,
  defaultSelector: 'RR' // Round-robin
} as any);

// Initialize database connection pool
export const initializeDatabase = async (): Promise<void> => {
  try {
    const dbConfig = getDatabaseConfig();
    
    pool = mysql.createPool(dbConfig);
    
    // Test the connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    console.log('✅ Database connection pool initialized successfully');
    console.log(`📊 Connected to MySQL database: ${dbConfig.database}`);
  } catch (error) {
    console.error('❌ Failed to initialize database connection pool:', error);
    throw error;
  }
};

// Get database connection from pool
export const getConnection = async (): Promise<mysql.PoolConnection> => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('❌ Failed to get database connection:', error);
    throw error;
  }
};

// Execute query with automatic connection management
export const executeQuery = async <T = any>(
  query: string,
  params?: any[]
): Promise<T[] | any> => {
  const connection = await getConnection();

  try {
    const [rows, fields] = await connection.execute(query, params);

    // For INSERT/UPDATE/DELETE operations, return the result metadata
    if (query.trim().toUpperCase().startsWith('INSERT') ||
        query.trim().toUpperCase().startsWith('UPDATE') ||
        query.trim().toUpperCase().startsWith('DELETE')) {
      return rows as any; // This includes insertId, affectedRows, etc.
    }

    // For SELECT operations, return the rows
    return rows as T[];
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  } finally {
    connection.release();
  }
};

// Execute query and return first result
export const executeQuerySingle = async <T = any>(
  query: string,
  params?: any[]
): Promise<T | null> => {
  const results = await executeQuery<T>(query, params);
  return results.length > 0 ? results[0] : null;
};

// Execute transaction
export const executeTransaction = async <T = any>(
  queries: Array<{ query: string; params?: any[] }>
): Promise<T[]> => {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results: T[] = [];
    
    for (const { query, params } of queries) {
      const [rows] = await connection.execute(query, params);
      results.push(rows as T);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error('❌ Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Check database health
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  try {
    const connection = await getConnection();
    
    // Test basic connectivity
    await connection.ping();
    
    // Get database status
    const [statusRows] = await connection.execute('SHOW STATUS LIKE "Threads_connected"');
    const [variableRows] = await connection.execute('SHOW VARIABLES LIKE "max_connections"');
    
    connection.release();
    
    return {
      status: 'healthy',
      details: {
        connected: true,
        activeConnections: statusRows,
        maxConnections: variableRows,
        poolStatus: pool ? {
          totalConnections: (pool as any).pool?.config?.connectionLimit || 'unknown',
          activeConnections: 'unknown',
          freeConnections: 'unknown'
        } : null
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

// Close database connection pool
export const closeDatabasePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 Database connection pool closed');
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing database connections...');
  await closeDatabasePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connections...');
  await closeDatabasePool();
  process.exit(0);
});
