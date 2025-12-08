import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service - Centralized Prisma Client Management
 *
 * This service provides a singleton Prisma client instance and handles
 * connection lifecycle management.
 */

let prisma: PrismaClient | null = null;

/**
 * Get the Prisma client instance
 * Creates a new instance if one doesn't exist
 */
export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
      errorFormat: 'pretty',
    });

    // Handle process termination
    process.on('beforeExit', async () => {
      await closePrisma();
    });
  }
  return prisma;
};

/**
 * Close the Prisma client connection
 * Should be called when shutting down the application
 */
export const closePrisma = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('✅ Prisma client disconnected');
  }
};

/**
 * Check if Prisma client is connected
 */
export const isPrismaConnected = (): boolean => {
  return prisma !== null;
};

/**
 * Test Prisma connection
 */
export const testPrismaConnection = async (): Promise<boolean> => {
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    console.log('✅ Prisma connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Prisma connection test failed:', error);
    return false;
  }
};

/**
 * Execute raw SQL query (for complex queries not supported by Prisma)
 * Use this sparingly - prefer Prisma's query builder when possible
 */
export const executeRawQuery = async <T = any>(
  query: string,
  ...params: any[]
): Promise<T[]> => {
  const client = getPrisma();
  return await client.$queryRawUnsafe(query, ...params) as T[];
};

/**
 * Execute raw SQL query and return single result
 */
export const executeRawQuerySingle = async <T = any>(
  query: string,
  ...params: any[]
): Promise<T | null> => {
  const results = await executeRawQuery<T>(query, ...params);
  return results.length > 0 ? results[0] : null;
};

/**
 * Execute transaction with Prisma
 * 
 * Example:
 * ```typescript
 * await executeTransaction(async (tx) => {
 *   await tx.member.create({ data: {...} });
 *   await tx.payment.create({ data: {...} });
 * });
 * ```
 */
export const executeTransaction = async <T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> => {
  const client = getPrisma();
  return await client.$transaction(async (tx) => {
    return await callback(tx as PrismaClient);
  });
};

export default {
  getPrisma,
  closePrisma,
  isPrismaConnected,
  testPrismaConnection,
  executeRawQuery,
  executeRawQuerySingle,
  executeTransaction
};

