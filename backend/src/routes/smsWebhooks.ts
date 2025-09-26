import { Router, Request, Response, NextFunction } from 'express';
import { SMSDeliveryTrackingService } from '../services/smsDeliveryTrackingService';
import { SMSProviderMonitoringService } from '../services/smsProviderMonitoringService';
import { executeQuery } from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';
import { authenticate, requireSMSPermission } from '../middleware/auth';

const router = Router();

// Middleware to log all webhook requests
const logWebhookRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Log the webhook request for debugging and audit purposes
    await executeQuery(`
      INSERT INTO sms_webhook_log (
        provider_name, request_method, request_headers, request_body,
        request_ip, received_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      req.params.provider || 'unknown',
      req.method,
      JSON.stringify(req.headers),
      JSON.stringify(req.body),
      req.ip || req.connection.remoteAddress
    ]);

    next();
  } catch (error: any) {
    logger.error('Failed to log webhook request', { error: error.message });
    next(); // Continue processing even if logging fails
  }
};

// Generic SMS delivery status webhook endpoint
router.post('/delivery/:provider', logWebhookRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = req.params.provider;
    const webhookData = req.body;

    logger.info('SMS delivery webhook received', {
      provider,
      headers: req.headers,
      body: webhookData
    });

    // Validate webhook data
    if (!webhookData || typeof webhookData !== 'object') {
      throw new ValidationError('Invalid webhook data format');
    }

    // Process the delivery status webhook
    await SMSDeliveryTrackingService.processDeliveryWebhook(webhookData);

    // Update webhook log with success
    await executeQuery(`
      UPDATE sms_webhook_log 
      SET processed_successfully = TRUE, 
          processed_at = NOW(),
          response_status = 200,
          response_message = 'Webhook processed successfully'
      WHERE provider_name = ? 
        AND received_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
      ORDER BY id DESC 
      LIMIT 1
    `, [provider]);

    res.status(200).json({
      success: true,
      message: 'Delivery status webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('SMS delivery webhook processing failed', {
      provider: req.params.provider,
      error: error.message,
      webhookData: req.body
    });

    // Update webhook log with error
    try {
      await executeQuery(`
        UPDATE sms_webhook_log 
        SET processed_successfully = FALSE, 
            processed_at = NOW(),
            response_status = 500,
            response_message = ?,
            processing_error = ?
        WHERE provider_name = ? 
          AND received_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
        ORDER BY id DESC 
        LIMIT 1
      `, [error.message, error.stack, req.params.provider]);
    } catch (logError: any) {
      logger.error('Failed to update webhook log with error', { error: logError.message });
    }

    next(error);
  }
});

// JSON Applink specific webhook endpoint (if they have specific format requirements)
router.post('/delivery/json-applink', logWebhookRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookData = req.body;

    logger.info('JSON Applink delivery webhook received', {
      headers: req.headers,
      body: webhookData
    });

    // JSON Applink specific processing (customize based on their webhook format)
    const processedData = {
      message_id: webhookData.reference || webhookData.message_id || webhookData.id,
      provider_message_id: webhookData.tracking_id || webhookData.external_id || webhookData.message_id,
      status: webhookData.status || webhookData.delivery_status,
      error_code: webhookData.error_code || webhookData.failure_code,
      error_message: webhookData.error_message || webhookData.failure_reason,
      delivery_timestamp: webhookData.delivered_at || webhookData.timestamp,
      cost: webhookData.cost || webhookData.price
    };

    await SMSDeliveryTrackingService.processDeliveryWebhook(processedData);

    // Update webhook log with success
    await executeQuery(`
      UPDATE sms_webhook_log 
      SET processed_successfully = TRUE, 
          processed_at = NOW(),
          response_status = 200,
          response_message = 'JSON Applink webhook processed successfully',
          message_id = ?
      WHERE provider_name = 'JSON Applink' 
        AND received_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
      ORDER BY id DESC 
      LIMIT 1
    `, [processedData.message_id]);

    res.status(200).json({
      success: true,
      message: 'JSON Applink delivery webhook processed successfully',
      message_id: processedData.message_id,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('JSON Applink webhook processing failed', {
      error: error.message,
      webhookData: req.body
    });

    // Update webhook log with error
    try {
      await executeQuery(`
        UPDATE sms_webhook_log 
        SET processed_successfully = FALSE, 
            processed_at = NOW(),
            response_status = 500,
            response_message = ?,
            processing_error = ?
        WHERE provider_name = 'JSON Applink' 
          AND received_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
        ORDER BY id DESC 
        LIMIT 1
      `, [error.message, error.stack]);
    } catch (logError: any) {
      logger.error('Failed to update webhook log with error', { error: logError.message });
    }

    next(error);
  }
});

// Get webhook logs for debugging (admin only)
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, provider_name, request_method, request_headers, request_body,
             request_ip, response_status, response_message, processed_successfully,
             processing_error, message_id, received_at, processed_at
      FROM sms_webhook_log
    `;

    const params: any[] = [];

    if (provider) {
      query += ' WHERE provider_name = ?';
      params.push(provider);
    }

    query += ' ORDER BY received_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const logs = await executeQuery(query, params);

    res.json({
      success: true,
      data: {
        logs: logs || [],
        total: logs?.length || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error: any) {
    logger.error('Failed to get webhook logs', { error: error.message });
    next(error);
  }
});

// Get delivery statistics
router.get('/stats', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeframe = 'day' } = req.query;

    const stats = await SMSDeliveryTrackingService.getDeliveryStatistics(
      timeframe as 'hour' | 'day' | 'week' | 'month'
    );

    res.json({
      success: true,
      data: {
        statistics: stats,
        timeframe,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Failed to get delivery statistics', { error: error.message });
    next(error);
  }
});

// Get provider health status
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
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Failed to get provider health status', { error: error.message });
    next(error);
  }
});

// Trigger manual health check
router.post('/health-check', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthStatus = await SMSProviderMonitoringService.performHealthCheck();

    res.json({
      success: true,
      message: 'Health check completed',
      data: {
        health_status: healthStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Manual health check failed', { error: error.message });
    next(error);
  }
});

// Test webhook endpoint (for development/testing)
router.post('/test/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = req.params.provider;
    const testData = {
      message_id: `test_${Date.now()}`,
      provider_message_id: `${provider}_test_${Date.now()}`,
      status: 'delivered',
      delivery_timestamp: new Date(),
      ...req.body
    };

    await SMSDeliveryTrackingService.trackDeliveryStatus({
      message_id: testData.message_id,
      provider_message_id: testData.provider_message_id,
      status: testData.status,
      delivery_timestamp: testData.delivery_timestamp,
      retry_count: 0
    });

    logger.info('Test webhook processed', {
      provider,
      testData
    });

    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      data: testData
    });

  } catch (error: any) {
    logger.error('Test webhook processing failed', {
      provider: req.params.provider,
      error: error.message
    });
    next(error);
  }
});

export default router;
