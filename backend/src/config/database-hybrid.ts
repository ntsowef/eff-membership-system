import { PrismaClient } from '../generated/prisma';
import { Pool, PoolClient } from 'pg';
import { config } from './config';

// =====================================================================================
// HYBRID DATABASE SERVICE - Combines Prisma ORM with Raw SQL capabilities
// =====================================================================================

// Prisma client instance
let prisma: PrismaClient | null = null;

// PostgreSQL connection pool for raw SQL queries
let pool: Pool | null = null;

// Database configuration interface
interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  max: number; // connection pool size
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Get database configuration for PostgreSQL
const getDatabaseConfig = (): DatabaseConfig => ({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port,
  max: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '300000', 10), // 5 minutes
  connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT || '30000', 10), // 30 seconds
});

// Initialize hybrid database system
export const initializeDatabase = async (): Promise<void> => {
  try {
    const dbConfig = getDatabaseConfig();

    // Initialize Prisma Client with error handling
    try {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
          }
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
      });

      // Test Prisma connection
      await prisma.$connect();
      console.log('✅ Prisma ORM connected successfully');
    } catch (prismaError: any) {
      console.warn('⚠️  Prisma client initialization failed, continuing with raw SQL only:', prismaError.message);
      prisma = null;
    }
    
    // Initialize PostgreSQL pool for raw SQL
    pool = new Pool(dbConfig);
    
    // Test raw SQL connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ PostgreSQL raw SQL pool initialized successfully');
    console.log(`📊 Connected to PostgreSQL database: ${dbConfig.database}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize hybrid database system:', error);
    throw error;
  }
};

// Get Prisma client instance
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Prisma client not available. System running in raw SQL mode only.');
  }
  return prisma;
};

// Check if Prisma is available
export const isPrismaAvailable = (): boolean => {
  return prisma !== null;
};

// Get the raw PostgreSQL pool instance (for direct pool operations)
export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

// Get PostgreSQL connection from pool for raw SQL
export const getConnection = async (): Promise<PoolClient> => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  
  try {
    return await pool.connect();
  } catch (error) {
    console.error('❌ Failed to get database connection:', error);
    throw error;
  }
};

// Execute raw SQL query with automatic connection management
export const executeQuery = async <T = any>(
  query: string,
  params?: any[]
): Promise<T[]> => {
  const client = await getConnection();
  
  try {
    // Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
    const pgQuery = convertPlaceholders(query);
    const result = await client.query(pgQuery, params);
    
    return result.rows as T[];
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  } finally {
    client.release();
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

// Execute transaction with raw SQL
export const executeTransaction = async <T = any>(
  queries: Array<{ query: string; params?: any[] }>
): Promise<T[]> => {
  const client = await getConnection();
  
  try {
    await client.query('BEGIN');
    
    const results: T[] = [];
    
    for (const { query, params } of queries) {
      const pgQuery = convertPlaceholders(query);
      const result = await client.query(pgQuery, params);
      results.push(result.rows as T);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Execute transaction with Prisma
export const executePrismaTransaction = async <T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  const client = getPrismaClient();
  return await client.$transaction(async (tx) => {
    return await callback(tx as PrismaClient);
  });
};

// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(query: string): string {
  let paramIndex = 1;
  return query.replace(/\?/g, () => `$${paramIndex++}`);
}

// Convert MySQL-specific SQL functions to PostgreSQL equivalents
export const convertMySQLToPostgreSQL = (query: string): string => {
  return query
    // String functions
    .replace(/CONCAT\(/g, 'CONCAT(')
    .replace(/SUBSTRING_INDEX\(/g, 'SPLIT_PART(')
    .replace(/LOCATE\(/g, 'POSITION(')
    .replace(/LPAD\(/g, 'LPAD(')
    
    // Date functions
    .replace(/CURDATE\(\)/g, 'CURRENT_DATE')
    .replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP')
    .replace(/DATE_ADD\(/g, 'DATE_ADD(')
    .replace(/YEAR\(/g, 'EXTRACT(YEAR FROM ')
    .replace(/MONTH\(/g, 'EXTRACT(MONTH FROM ')
    .replace(/DAY\(/g, 'EXTRACT(DAY FROM ')
    
    // Conditional functions
    .replace(/IF\(/g, 'CASE WHEN ')
    .replace(/IFNULL\(/g, 'COALESCE(')
    
    // Limit syntax
    .replace(/LIMIT (\d+) OFFSET (\d+)/g, 'OFFSET $2 LIMIT $1')
    
    // Show commands (convert to PostgreSQL equivalents)
    .replace(/SHOW TABLES/g, "SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    .replace(/SHOW STATUS LIKE "([^"]+)"/g, "SELECT name, setting FROM pg_settings WHERE name LIKE '$1'")
    .replace(/SHOW VARIABLES LIKE "([^"]+)"/g, "SELECT name, setting FROM pg_settings WHERE name LIKE '$1'");
};

// Check database health
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  try {
    let prismaStatus = 'unavailable';

    // Test Prisma connection if available
    if (isPrismaAvailable()) {
      try {
        const prismaClient = getPrismaClient();
        await prismaClient.$queryRaw`SELECT 1`;
        prismaStatus = 'healthy';
      } catch (error) {
        prismaStatus = 'error';
      }
    }

    // Test raw SQL connection
    const client = await getConnection();
    const result = await client.query('SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE state = $1', ['active']);
    client.release();
    
    return {
      status: 'healthy',
      details: {
        prisma: prismaStatus,
        rawSql: 'connected',
        activeConnections: result.rows[0]?.active_connections || 0,
        poolStatus: pool ? {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        } : null
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

// Close database connections
export const closeDatabaseConnections = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      console.log('🔒 Prisma client disconnected');
    }
    
    if (pool) {
      await pool.end();
      pool = null;
      console.log('🔒 PostgreSQL connection pool closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});

// Export types for use in other modules
export type { PrismaClient } from '../generated/prisma';
export type { PoolClient } from 'pg';
