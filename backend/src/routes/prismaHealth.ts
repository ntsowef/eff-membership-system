/**
 * Prisma Health Check Routes - Pilot Implementation
 * 
 * These routes demonstrate Prisma ORM working with the existing infrastructure.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { HealthCheckService } from '../services/healthCheckService';

const router = Router();

/**
 * GET /api/v1/prisma-health
 * Comprehensive health check using Prisma
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthCheck = await HealthCheckService.performHealthCheck();

    const statusCode = healthCheck.status === 'healthy' ? 200 :
                       healthCheck.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: healthCheck.status !== 'unhealthy',
      message: `System is ${healthCheck.status}`,
      data: healthCheck
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/prisma-health/database
 * Database-specific health check
 */
router.get('/database', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await HealthCheckService.getDatabaseStats();

    res.json({
      success: true,
      message: 'Database statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/prisma-health/connection
 * Test database connection
 */
router.get('/connection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connected = await HealthCheckService.testConnection();

    res.json({
      success: connected,
      message: connected ? 'Database connection successful' : 'Database connection failed',
      data: {
        connected,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

