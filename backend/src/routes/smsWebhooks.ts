import { Router, Request, Response, NextFunction } from 'express';
import { SMSCallbackService } from '../services/smsCallbackService';
import { SMSProviderMonitoringService } from '../services/smsProviderMonitoringService';
import { executeQuery } from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';
import { authenticate, requireSMSPermission } from '../middleware/auth';

const router = Router();

// =====================================================================================
// Helper: get client IP
// =====================================================================================
const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.ip
    || req.socket?.remoteAddress
    || 'unknown';
};

// =====================================================================================
// JSON Applink specific webhook endpoint
// MUST be defined BEFORE the generic /:provider route
// =====================================================================================
router.post('/delivery/json-applink', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookData = req.body;
    const requestIP = getClientIP(req);

    logger.info('JSON Applink delivery webhook received', {
      ip: requestIP,
      body: webhookData,
    });

    // Validate request
    if (!webhookData || typeof webhookData !== 'object') {
      throw new ValidationError('Invalid webhook data format');
    }

    // Authentication and rate limiting removed per user request for all providers


    // If it's a reply (MO), route to processMOCallback
    if (webhookData.responseType === 'reply') {
      const result = await SMSCallbackService.processMOCallback(
        'json-applink', webhookData, req.headers as Record<string, any>, requestIP
      );
      
      res.status(200).json({
        success: result.success,
        message: result.success ? 'JSON Applink MO processed' : (result.error || 'MO processing failed'),
        member_id: result.memberId,
        id_number: result.idNumber,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Process the callback (delivery report)
    const result = await SMSCallbackService.processCallback(
      'json-applink', webhookData, req.headers as Record<string, any>, requestIP
    );

    res.status(200).json({
      success: result.success,
      message: result.success ? 'JSON Applink webhook processed successfully' : 'Processing failed',
      callback_id: result.callbackId,
      message_id: result.messageId,
      delivery_status: result.deliveryStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('JSON Applink webhook processing failed', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// MO (Mobile Originated) SMS webhook endpoint
// Used for keywords like "RENEW"
// =====================================================================================
router.post('/mo/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = req.params.provider;
    const webhookData = req.body;
    const requestIP = getClientIP(req);

    logger.info('SMS MO webhook received', { provider, ip: requestIP, body: webhookData });

    if (!webhookData || typeof webhookData !== 'object') {
      throw new ValidationError('Invalid webhook data format');
    }

    // Process the MO callback
    // Note: SMSCallbackService.processMOCallback handles the delegation to business logic
    const result = await SMSCallbackService.processMOCallback(
      provider, webhookData, req.headers as Record<string, any>, requestIP
    );

    res.status(200).json({
      success: result.success,
      message: result.success ? 'MO webhook processed successfully' : (result.error || 'Processing failed'),
      member_id: result.memberId,
      id_number: result.idNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('SMS MO webhook processing failed', { provider: req.params.provider, error: error.message });
    next(error);
  }
});

// =====================================================================================
// Generic SMS delivery status webhook endpoint
// =====================================================================================
router.post('/delivery/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = req.params.provider;
    const webhookData = req.body;
    const requestIP = getClientIP(req);

    logger.info('SMS delivery webhook received', { provider, ip: requestIP, body: webhookData });

    if (!webhookData || typeof webhookData !== 'object') {
      throw new ValidationError('Invalid webhook data format');
    }

    // Authentication and rate limiting removed per user request for all providers


    // Process the callback
    const result = await SMSCallbackService.processCallback(
      provider, webhookData, req.headers as Record<string, any>, requestIP
    );

    res.status(200).json({
      success: result.success,
      message: result.success ? 'Delivery webhook processed successfully' : 'Processing failed',
      callback_id: result.callbackId,
      message_id: result.messageId,
      delivery_status: result.deliveryStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('SMS delivery webhook processing failed', { provider: req.params.provider, error: error.message });
    next(error);
  }
});

// =====================================================================================
// Get delivery callbacks (admin)
// =====================================================================================
router.get('/callbacks', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider_name, delivery_status, message_id, page, limit, start_date, end_date } = req.query;

    const result = await SMSCallbackService.getCallbacks({
      provider_name: provider_name as string,
      delivery_status: delivery_status as string,
      message_id: message_id as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
      start_date: start_date as string,
      end_date: end_date as string,
    });

    res.json({
      success: true,
      data: {
        callbacks: result.callbacks,
        total: result.total,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get callbacks', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// Get callback statistics (admin)
// =====================================================================================
router.get('/callback-stats', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeframe = 'day' } = req.query;
    const stats = await SMSCallbackService.getCallbackStats(timeframe as 'hour' | 'day' | 'week' | 'month');

    res.json({
      success: true,
      data: { statistics: stats, timeframe, timestamp: new Date().toISOString() },
    });
  } catch (error: any) {
    logger.error('Failed to get callback stats', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// Retry failed callbacks (admin)
// =====================================================================================
router.post('/retry-failed', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { max_attempts = 3 } = req.body;
    const retried = await SMSCallbackService.retryFailedCallbacks(max_attempts);

    res.json({
      success: true,
      message: `Retried ${retried} failed callbacks`,
      data: { retried_count: retried },
    });
  } catch (error: any) {
    logger.error('Failed to retry callbacks', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// Get webhook logs (admin)
// =====================================================================================
router.get('/logs', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, limit = '50', offset = '0' } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (provider) {
      conditions.push(`provider_name = $${idx++}`);
      params.push(provider);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const logs = await executeQuery(
      `SELECT * FROM sms_webhook_log ${where} ORDER BY received_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({
      success: true,
      data: {
        logs: logs || [],
        total: Array.isArray(logs) ? logs.length : 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get webhook logs', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// Get delivery statistics (admin)
// =====================================================================================
router.get('/stats', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeframe = 'day' } = req.query;
    const stats = await SMSCallbackService.getCallbackStats(timeframe as 'hour' | 'day' | 'week' | 'month');

    res.json({
      success: true,
      data: { statistics: stats, timeframe, timestamp: new Date().toISOString() },
    });
  } catch (error: any) {
    logger.error('Failed to get delivery statistics', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// Get provider health status (admin)
// =====================================================================================
router.get('/provider-health', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthStatuses = await SMSProviderMonitoringService.getAllProviderHealthStatuses();
    const currentProviderHealth = await SMSProviderMonitoringService.performHealthCheck();

    res.json({
      success: true,
      data: {
        current_provider: currentProviderHealth,
        all_providers: healthStatuses,
        monitoring_active: SMSProviderMonitoringService.isMonitoringRunning(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get provider health status', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// Trigger manual health check (admin)
// =====================================================================================
router.post('/health-check', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthStatus = await SMSProviderMonitoringService.performHealthCheck();

    res.json({
      success: true,
      message: 'Health check completed',
      data: { health_status: healthStatus, timestamp: new Date().toISOString() },
    });
  } catch (error: any) {
    logger.error('Manual health check failed', { error: error.message });
    next(error);
  }
});

// =====================================================================================
// Get supported providers
// =====================================================================================
router.get('/providers', authenticate, requireSMSPermission(), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        providers: SMSCallbackService.getSupportedProviders(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// =====================================================================================
// Test webhook endpoint (development/testing only)
// =====================================================================================
router.post('/test/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = req.params.provider;
    const requestIP = getClientIP(req);
    const testData = {
      message_id: `test_${Date.now()}`,
      provider_message_id: `${provider}_test_${Date.now()}`,
      status: 'delivered',
      delivery_timestamp: new Date().toISOString(),
      ...req.body,
    };

    const result = await SMSCallbackService.processCallback(
      provider, testData, req.headers as Record<string, any>, requestIP
    );

    logger.info('Test webhook processed', { provider, result });

    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      data: { ...testData, callback_id: result.callbackId },
    });
  } catch (error: any) {
    logger.error('Test webhook processing failed', { provider: req.params.provider, error: error.message });
    next(error);
  }
});

export default router;
