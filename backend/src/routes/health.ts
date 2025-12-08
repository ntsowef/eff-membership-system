import { Router } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { config } from '../config/config';

const router = Router();

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: '1.0.0',
    node_version: process.version,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  };

  sendSuccess(res, healthData, 'Server is healthy');
}));

// Detailed health check including database
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Check database health
  const dbHealth = await checkDatabaseHealth();
  
  const healthData = {
    status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: '1.0.0',
    node_version: process.version,
    response_time: Date.now() - startTime,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    database: dbHealth,
    services: {
      api: 'healthy',
      database: dbHealth.status
    }
  };

  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: healthData.status === 'healthy',
    message: `Server is ${healthData.status}`,
    data: healthData,
    timestamp: new Date().toISOString()
  });
}));

// Database-specific health check
router.get('/database', asyncHandler(async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  
  const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: dbHealth.status === 'healthy',
    message: `Database is ${dbHealth.status}`,
    data: dbHealth,
    timestamp: new Date().toISOString()
  });
}));

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', asyncHandler(async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  
  if (dbHealth.status === 'healthy') {
    sendSuccess(res, { ready: true }, 'Service is ready');
  } else {
    res.status(503).json({
      success: false,
      message: 'Service is not ready',
      data: { ready: false, reason: 'Database not available' },
      timestamp: new Date().toISOString()
    });
  }
}));

// Liveness probe (for Kubernetes/Docker)
router.get('/live', asyncHandler(async (req, res) => {
  sendSuccess(res, { alive: true }, 'Service is alive');
}));

export default router;
