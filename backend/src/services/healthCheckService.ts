/**
 * Health Check Service - Prisma Pilot Implementation
 * 
 * This service demonstrates the Prisma ORM migration pattern.
 * It replaces raw SQL queries with type-safe Prisma queries.
 */

import { getPrisma } from './prismaService';

const prisma = getPrisma();

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: DatabaseHealth;
    cache: CacheHealth;
    system: SystemHealth;
  };
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  connected: boolean;
  responseTime: number;
  details?: {
    userCount?: number;
    memberCount?: number;
    error?: string;
  };
}

export interface CacheHealth {
  status: 'healthy' | 'unhealthy';
  connected: boolean;
  details?: {
    error?: string;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

export class HealthCheckService {
  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    const [databaseHealth, cacheHealth, systemHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkSystem()
    ]);

    const overallStatus = this.determineOverallStatus(
      databaseHealth.status,
      cacheHealth.status,
      systemHealth.status
    );

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks: {
        database: databaseHealth,
        cache: cacheHealth,
        system: systemHealth
      }
    };
  }

  /**
   * Check database health using Prisma
   */
  private static async checkDatabase(): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // Test database connection with a simple query using Prisma
      const userCount = await prisma.users.count();
      const memberCount = await prisma.members.count();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        connected: true,
        responseTime,
        details: {
          userCount,
          memberCount
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        connected: false,
        responseTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check cache health
   */
  private static async checkCache(): Promise<CacheHealth> {
    try {
      // Import cache service dynamically to avoid circular dependencies
      const { cacheService } = await import('./cacheService');
      
      const isAvailable = cacheService.isAvailable();

      return {
        status: isAvailable ? 'healthy' : 'unhealthy',
        connected: isAvailable
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check system health
   */
  private static async checkSystem(): Promise<SystemHealth> {
    const os = await import('os');

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    const uptime = process.uptime();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (memoryPercentage > 90 || cpuUsage > 90) {
      status = 'unhealthy';
    } else if (memoryPercentage > 80 || cpuUsage > 80) {
      status = 'degraded';
    }

    return {
      status,
      uptime,
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: memoryPercentage
      },
      cpu: {
        usage: cpuUsage
      }
    };
  }

  /**
   * Determine overall health status
   */
  private static determineOverallStatus(
    database: 'healthy' | 'unhealthy',
    cache: 'healthy' | 'unhealthy',
    system: 'healthy' | 'degraded' | 'unhealthy'
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (database === 'unhealthy') {
      return 'unhealthy';
    }

    if (system === 'unhealthy') {
      return 'unhealthy';
    }

    if (cache === 'unhealthy' || system === 'degraded') {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get database statistics using Prisma
   */
  static async getDatabaseStats() {
    try {
      const [
        userCount,
        memberCount,
        pendingApplications,
        activeSessions
      ] = await Promise.all([
        prisma.users.count(),
        prisma.members.count(),
        prisma.membership_applications.count({
          where: {
            status: 'pending'
          }
        }),
        prisma.user_sessions.count({
          where: {
            expires_at: {
              gte: new Date()
            }
          }
        })
      ]);

      return {
        users: userCount,
        members: memberCount,
        activeMembers: memberCount, // Simplified for pilot
        pendingApplications,
        activeSessions
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

