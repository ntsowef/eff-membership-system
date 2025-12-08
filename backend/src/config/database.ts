// DEPRECATED: This file is being replaced by database-hybrid.ts
// Keeping for backward compatibility during migration
import {
  initializeDatabase as initHybridDatabase,
  executeQuery as hybridExecuteQuery,
  executeQuerySingle as hybridExecuteQuerySingle,
  executeUpdate as hybridExecuteUpdate,
  executeTransaction as hybridExecuteTransaction,
  checkDatabaseHealth as hybridCheckHealth,
  closeDatabaseConnections
} from './database-hybrid';
import { SQLMigrationService } from '../services/sqlMigrationService';

// =====================================================================================
// BACKWARD COMPATIBILITY LAYER
// This provides the same interface as the old MySQL-based database.ts
// but uses the new hybrid PostgreSQL system under the hood
// =====================================================================================

// Initialize database (now uses hybrid system)
export const initializeDatabase = async (): Promise<void> => {
  console.log('🔄 Initializing hybrid database system (Prisma + Raw SQL)...');
  await initHybridDatabase();
};

// Execute query (now uses hybrid system with automatic MySQL->PostgreSQL conversion)
export const executeQuery = async <T = any>(
  query: string,
  params?: any[]
): Promise<T[] | any> => {
  try {
    // Use the migration service to convert and execute MySQL queries
    return await SQLMigrationService.executeConvertedQuery<T>(query, params);
  } catch (error) {
    console.error('❌ Database query error (hybrid system):', error);
    console.error('Original Query:', query);
    console.error('Params:', params);
    throw error;
  }
};

// Execute query and return first result (now uses hybrid system)
export const executeQuerySingle = async <T = any>(
  query: string,
  params?: any[]
): Promise<T | null> => {
  try {
    return await SQLMigrationService.executeConvertedQuerySingle<T>(query, params);
  } catch (error) {
    console.error('❌ Database single query error (hybrid system):', error);
    throw error;
  }
};

// Execute UPDATE/DELETE query and return affected row count (now uses hybrid system)
export const executeUpdate = async (
  query: string,
  params?: any[]
): Promise<{ affectedRows: number }> => {
  try {
    return await hybridExecuteUpdate(query, params);
  } catch (error) {
    console.error('❌ Database update error (hybrid system):', error);
    throw error;
  }
};

// Execute transaction (now uses hybrid system)
export const executeTransaction = async <T = any>(
  queries: Array<{ query: string; params?: any[] }>
): Promise<T[]> => {
  try {
    return await hybridExecuteTransaction(queries);
  } catch (error) {
    console.error('❌ Transaction error (hybrid system):', error);
    throw error;
  }
};

// Check database health (now uses hybrid system)
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  return await hybridCheckHealth();
};

// Close database connection pool (now uses hybrid system)
export const closeDatabasePool = async (): Promise<void> => {
  await closeDatabaseConnections();
};

// Backward compatibility exports
export { getPrismaClient } from './database-hybrid';
export type { PrismaClient } from './database-hybrid';
