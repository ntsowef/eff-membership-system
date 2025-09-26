import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import 'express-async-errors';

import { config, validateConfig, logConfig } from './config/config';
import { initializeDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { redisService } from './services/redisService';

// Import routes
import healthRoutes from './routes/health';
import geographicRoutes from './routes/geographic';
import memberRoutes from './routes/members';
import membershipRoutes from './routes/memberships';
import membershipApplicationRoutes from './routes/membershipApplications';
import referenceDataRoutes from './routes/referenceData';
import documentRoutes from './routes/documents';
import notificationRoutes from './routes/notifications';
import auditLogRoutes from './routes/auditLogs';
import memberProfileRoutes from './routes/memberProfile';
import lookupRoutes from './routes/lookups';
import statisticsRoutes from './routes/statistics';
import membershipExpirationRoutes from './routes/membershipExpiration';
import membershipRenewalRoutes from './routes/membershipRenewal';
import digitalMembershipCardsRoutes from './routes/digitalMembershipCards';
import optimizedDigitalCardsRoutes from './routes/optimizedDigitalCards';
import maintenanceRoutes from './routes/maintenance';
import voterVerificationRoutes from './routes/voterVerifications';

// Import performance monitoring
import { performanceMonitor } from './services/performanceMonitoring';
import {
  performanceMonitoringMiddleware,
  healthCheckMiddleware,
  requestQueueMiddleware
} from './middleware/rateLimiting';
import meetingRoutes from './routes/meetings';
import hierarchicalMeetingRoutes from './routes/hierarchicalMeetings';
import meetingDocumentRoutes from './routes/meetingDocuments';
import memberSearchRoutes from './routes/memberSearch';
import memberAuditRoutes from './routes/memberAudit';
import wardMembershipAuditRoutes from './routes/wardMembershipAudit';

import documentsRoutes from './routes/documents';
import leadershipRoutes from './routes/leadership';
import electionsRoutes from './routes/elections';
import meetingsRoutes from './routes/meetings';
import analyticsRoutes from './routes/analytics';
import bulkOperationsRoutes from './routes/bulkOperations';
import systemRoutes from './routes/system';
import securityRoutes from './routes/security';
import importExportRoutes from './routes/importExport';
// import smsRoutes from './routes/sms'; // Temporarily disabled due to conflicts
import smsManagementRoutes from './routes/smsManagement';
import smsWebhookRoutes from './routes/smsWebhooks';
import smsIntegrationTestRoutes from './routes/smsIntegrationTest';
import communicationRoutes from './routes/communication';
import birthdaySMSRoutes from './routes/birthdaySMS';
import cacheManagementRoutes from './routes/cacheManagement';
import sessionManagementRoutes from './routes/sessionManagement';
import adminManagementRoutes from './routes/adminManagement';
import mfaRoutes from './routes/mfa';
import sessionsRoutes from './routes/sessions';
import viewsRoutes from './routes/views';
import fileProcessingRoutes from './routes/fileProcessing';
import twoTierApprovalRoutes from './routes/twoTierApprovalRoutes';
import unifiedFinancialDashboardRoutes from './routes/unifiedFinancialDashboardRoutes';
import financialTransactionQueryRoutes from './routes/financialTransactionQueryRoutes';
import paymentRoutes from './routes/paymentRoutes';
import simpleDashboardRoutes from './routes/simpleDashboardRoutes';
import iecApiRoutes from './routes/iecApiRoutes';
import iecElectoralEventsRoutes from './routes/iecElectoralEvents';
import iecLgeBallotResultsRoutes from './routes/iecLgeBallotResults';
import { createAuthRoutes } from './middleware/auth';
import { cacheService } from './services/cacheService';
import { cacheMetricsMiddleware } from './middleware/cacheMetrics';
import { ViewsService } from './services/viewsService';
import { SMSProviderMonitoringService } from './services/smsProviderMonitoringService';
import { WebSocketService } from './services/websocketService';
import { FileWatcherService } from './services/fileWatcherService';
import { FileProcessingQueueManager } from './services/fileProcessingQueueManager';
import securityMiddleware from './middleware/securityMiddleware';
import { maintenanceModeMiddleware, scheduledMaintenanceChecker } from './middleware/maintenanceMode';

// Validate configuration
validateConfig();

// Create Express application
const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting (disabled in development)
if (config.server.env !== 'development') {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);
  console.log('✅ Rate limiting enabled');
} else {
  console.log('⚠️  Rate limiting disabled for development');
}

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Additional security middleware
app.use(securityMiddleware.sanitizeRequest);
app.use(securityMiddleware.deviceFingerprinting);
app.use(securityMiddleware.detectSuspiciousActivity);
app.use(securityMiddleware.securityLogger);

// Cache metrics middleware (before routes)
app.use(cacheMetricsMiddleware);

// Performance monitoring middleware
app.use(performanceMonitoringMiddleware);
app.use(healthCheckMiddleware);

// Request queuing for high load (applied globally)
app.use(requestQueueMiddleware);

// Logging middleware
if (config.server.env !== 'test') {
  app.use(morgan('combined'));
}

// Maintenance mode middleware (before API routes)
app.use(maintenanceModeMiddleware({
  exemptPaths: [
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/maintenance/status',
    '/api/v1/maintenance/toggle',
    '/api/v1/maintenance/config',
    '/api/v1/health'
  ]
}));

// API routes
const apiPrefix = `${config.server.apiPrefix}/${config.server.apiVersion}`;

app.use(`${apiPrefix}/auth`, createAuthRoutes());
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/maintenance`, maintenanceRoutes);
app.use(`${apiPrefix}/geographic`, geographicRoutes);
app.use(`${apiPrefix}/members`, memberRoutes);
app.use(`${apiPrefix}/memberships`, membershipRoutes);
app.use(`${apiPrefix}/membership-applications`, membershipApplicationRoutes);
app.use(`${apiPrefix}/reference`, referenceDataRoutes);
app.use(`${apiPrefix}/documents`, documentRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/audit-logs`, auditLogRoutes);
app.use(`${apiPrefix}/profile`, memberProfileRoutes);
app.use(`${apiPrefix}/lookups`, lookupRoutes);
app.use(`${apiPrefix}/statistics`, statisticsRoutes);
app.use(`${apiPrefix}/membership-expiration`, membershipExpirationRoutes);
app.use(`${apiPrefix}/membership-renewal`, membershipRenewalRoutes);
app.use(`${apiPrefix}/digital-cards`, digitalMembershipCardsRoutes);
app.use(`${apiPrefix}/optimized-cards`, optimizedDigitalCardsRoutes); // High-performance card generation
app.use(`${apiPrefix}/voter-verifications`, voterVerificationRoutes);
app.use(`${apiPrefix}/meetings`, meetingRoutes);
app.use(`${apiPrefix}/renewals`, membershipRenewalRoutes);
app.use(`${apiPrefix}/search`, memberSearchRoutes);
app.use(`${apiPrefix}/audit`, memberAuditRoutes);
app.use(`${apiPrefix}/audit/ward-membership`, wardMembershipAuditRoutes);

app.use(`${apiPrefix}/documents`, documentsRoutes);
app.use(`${apiPrefix}/leadership`, leadershipRoutes);
app.use(`${apiPrefix}/elections`, electionsRoutes);
app.use(`${apiPrefix}/meetings`, meetingsRoutes);
app.use(`${apiPrefix}/hierarchical-meetings`, hierarchicalMeetingRoutes);
app.use(`${apiPrefix}/meeting-documents`, meetingDocumentRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/bulk-operations`, bulkOperationsRoutes);
app.use(`${apiPrefix}/system`, systemRoutes);
app.use(`${apiPrefix}/security`, securityRoutes);
app.use(`${apiPrefix}/import-export`, importExportRoutes);
// app.use(`${apiPrefix}/sms`, smsRoutes); // Temporarily disabled
app.use(`${apiPrefix}/sms`, smsManagementRoutes);
app.use(`${apiPrefix}/sms-webhooks`, smsWebhookRoutes);
app.use(`${apiPrefix}/sms-test`, smsIntegrationTestRoutes);
app.use(`${apiPrefix}/communication`, communicationRoutes);
app.use(`${apiPrefix}/birthday-sms`, birthdaySMSRoutes);
app.use(`${apiPrefix}/cache`, cacheManagementRoutes);
app.use(`${apiPrefix}/session`, sessionManagementRoutes);
app.use(`${apiPrefix}/admin-management`, adminManagementRoutes);
app.use(`${apiPrefix}/mfa`, mfaRoutes);
app.use(`${apiPrefix}/sessions`, sessionsRoutes);
app.use(`${apiPrefix}/views`, viewsRoutes);
app.use(`${apiPrefix}/file-processing`, fileProcessingRoutes);
app.use(`${apiPrefix}/two-tier-approval`, twoTierApprovalRoutes);
app.use(`${apiPrefix}/financial-dashboard`, unifiedFinancialDashboardRoutes);
app.use(`${apiPrefix}/financial-transactions`, financialTransactionQueryRoutes);
app.use(`${apiPrefix}/payments`, paymentRoutes);
app.use(`${apiPrefix}/simple-dashboard`, simpleDashboardRoutes);
app.use(`${apiPrefix}/iec`, iecApiRoutes);
app.use(`${apiPrefix}/iec-electoral-events`, iecElectoralEventsRoutes);
app.use(`${apiPrefix}/lge-ballot-results`, iecLgeBallotResultsRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'GEOMAPS Backend API Server',
    version: '1.0.0',
    environment: config.server.env,
    apiPath: apiPrefix,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `${apiPrefix}/auth`,
      health: `${apiPrefix}/health`,
      geographic: `${apiPrefix}/geographic`,
      members: `${apiPrefix}/members`,
      memberships: `${apiPrefix}/memberships`,
      membership_applications: `${apiPrefix}/membership-applications`,
      documents: `${apiPrefix}/documents`,
      notifications: `${apiPrefix}/notifications`,
      audit_logs: `${apiPrefix}/audit-logs`,
      member_profile: `${apiPrefix}/profile`,
      lookups: `${apiPrefix}/lookups`,
      statistics: `${apiPrefix}/statistics`
    }
  });
});

// API info endpoint
app.get(`${apiPrefix}`, (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'GEOMAPS API v1',
    version: '1.0.0',
    environment: config.server.env,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `${apiPrefix}/auth`,
      health: `${apiPrefix}/health`,
      geographic: `${apiPrefix}/geographic`,
      members: `${apiPrefix}/members`,
      memberships: `${apiPrefix}/memberships`,
      lookups: `${apiPrefix}/lookups`,
      statistics: `${apiPrefix}/statistics`
    }
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server function
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Create database views for voting districts (temporarily disabled)
    // try {
    //   await ViewsService.createMembersVotingDistrictViews();
    //   console.log('✅ Members voting district views created successfully');
    // } catch (error) {
    //   console.warn('⚠️  Failed to create voting district views:', error);
    // }

    // Initialize Redis connection
    try {
      await redisService.connect();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('⚠️  Redis connection failed, using fallback cache:', error);
    }

    // Initialize cache service
    await cacheService.connect();

    // Start performance monitoring
    performanceMonitor.startMonitoring(30000); // Monitor every 30 seconds
    console.log('✅ Performance monitoring started');

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket service
    WebSocketService.initialize(server);

    // Start file watcher service
    const fileWatcher = FileWatcherService.getInstance();
    await fileWatcher.start();

    // Start queue processing
    const queueManager = FileProcessingQueueManager.getInstance();
    await queueManager.startProcessing();

    // Start HTTP server
    server.listen(config.server.port, () => {
      console.log('🚀 Server started successfully!');
      console.log(`📍 Server running on port ${config.server.port}`);
      console.log(`🌐 API available at: http://localhost:${config.server.port}${apiPrefix}`);
      console.log(`📊 Health check: http://localhost:${config.server.port}${apiPrefix}/health`);
      console.log(`🔌 WebSocket service: ${WebSocketService.isInitialized() ? 'Initialized' : 'Failed'}`);
      console.log(`📁 File watcher: ${fileWatcher.isActive() ? 'Active' : 'Inactive'}`);
      console.log(`🔄 Queue processor: ${queueManager.isCurrentlyProcessing() ? 'Processing' : 'Ready'}`);
      console.log(`⚡ Cache Service: ${cacheService.isAvailable() ? 'Connected' : 'Disconnected'}`);

      // Start SMS provider monitoring
      SMSProviderMonitoringService.startMonitoring();
      console.log(`📱 SMS Provider Monitoring: Active`);

      // Start scheduled maintenance checker (every 1 minute)
      setInterval(scheduledMaintenanceChecker, 60000);
      console.log(`🔧 Scheduled Maintenance Checker: Active`);

      // Log configuration
      logConfig();
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

      // Stop performance monitoring
      performanceMonitor.stopMonitoring();

      // Stop SMS provider monitoring
      SMSProviderMonitoringService.stopMonitoring();

      // WebSocket service removed

      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
