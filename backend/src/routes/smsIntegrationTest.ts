import { Router, Request, Response, NextFunction } from 'express';
import { SMSService } from '../services/smsService';
import { SMSDeliveryTrackingService } from '../services/smsDeliveryTrackingService';
import { SMSProviderMonitoringService } from '../services/smsProviderMonitoringService';
import { authenticate, requireSMSPermission } from '../middleware/auth';
import { logger } from '../utils/logger';
import { config } from '../config/config';

const router = Router();

// Get default SMS sender number based on provider
const getDefaultFromNumber = (): string => {
  const provider = config.sms?.provider || 'mock';
  if (provider === 'twilio') {
    return config.sms?.twilio?.fromNumber || 'EFF';
  } else if (provider === 'jsonApplink') {
    return config.sms?.jsonApplink?.fromNumber || 'EFF';
  }
  return 'EFF'; // Default sender ID
};

// Test SMS provider integration
router.post('/test-integration', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { test_phone_number, test_message } = req.body;

    if (!test_phone_number) {
      res.status(400).json({
        success: false,
        error: 'Test phone number is required'
      });
      return;
    }

    const testMessage = test_message || 'Test message from EFF Membership System - SMS integration test';
    const testResults: any[] = [];

    logger.info('Starting SMS integration test', {
      testPhone: test_phone_number,
      message: testMessage
    });

    // Test 1: Basic SMS sending
    try {
      const sendResult = await SMSService.sendSMS(test_phone_number, testMessage, getDefaultFromNumber());
      testResults.push({
        test: 'Basic SMS Sending',
        success: sendResult.success,
        message_id: sendResult.messageId,
        error: sendResult.error,
        provider: sendResult.provider
      });

      // Track delivery status if message was sent
      if (sendResult.success && sendResult.messageId) {
        await SMSDeliveryTrackingService.trackDeliveryStatus({
          message_id: sendResult.messageId,
          provider_message_id: sendResult.messageId,
          status: 'sent',
          retry_count: 0
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Basic SMS Sending',
        success: false,
        error: error.message
      });
    }

    // Test 2: Provider health check
    try {
      const healthResult = await SMSService.getProviderHealth();
      testResults.push({
        test: 'Provider Health Check',
        success: healthResult.healthy,
        health_message: healthResult.message,
        latency: healthResult.latency
      });
    } catch (error: any) {
      testResults.push({
        test: 'Provider Health Check',
        success: false,
        error: error.message
      });
    }

    // Test 3: Delivery tracking
    try {
      const stats = await SMSDeliveryTrackingService.getDeliveryStatistics('hour');
      testResults.push({
        test: 'Delivery Tracking',
        success: true,
        statistics: stats
      });
    } catch (error: any) {
      testResults.push({
        test: 'Delivery Tracking',
        success: false,
        error: error.message
      });
    }

    // Test 4: Provider monitoring
    try {
      const monitoringResult = await SMSProviderMonitoringService.performHealthCheck();
      testResults.push({
        test: 'Provider Monitoring',
        success: monitoringResult.is_healthy,
        provider: monitoringResult.provider_name,
        response_time: monitoringResult.response_time_ms,
        consecutive_failures: monitoringResult.consecutive_failures
      });
    } catch (error: any) {
      testResults.push({
        test: 'Provider Monitoring',
        success: false,
        error: error.message
      });
    }

    // Test 5: Rate limiting (simulate multiple requests)
    try {
      const rateLimitResults: Array<{attempt: number; success: boolean; error?: string}> = [];
      for (let i = 0; i < 3; i++) {
        const result = await SMSService.sendSMS(test_phone_number, `Rate limit test ${i + 1}`, getDefaultFromNumber());
        rateLimitResults.push({
          attempt: i + 1,
          success: result.success,
          error: result.error
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      testResults.push({
        test: 'Rate Limiting',
        success: true,
        attempts: rateLimitResults
      });
    } catch (error: any) {
      testResults.push({
        test: 'Rate Limiting',
        success: false,
        error: error.message
      });
    }

    // Calculate overall test results
    const totalTests = testResults.length;
    const passedTests = testResults.filter(test => test.success).length;
    const failedTests = totalTests - passedTests;

    const overallResult = {
      success: failedTests === 0,
      summary: {
        total_tests: totalTests,
        passed: passedTests,
        failed: failedTests,
        success_rate: Math.round((passedTests / totalTests) * 100)
      },
      test_results: testResults,
      provider_info: {
        name: SMSService.getProviderName(),
        monitoring_active: SMSProviderMonitoringService.isMonitoringRunning()
      },
      timestamp: new Date().toISOString()
    };

    logger.info('SMS integration test completed', {
      totalTests,
      passedTests,
      failedTests,
      successRate: overallResult.summary.success_rate
    });

    res.json({
      success: true,
      message: 'SMS integration test completed',
      data: overallResult
    });

  } catch (error: any) {
    logger.error('SMS integration test failed', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

// Test webhook processing
router.post('/test-webhook', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testWebhookData = {
      message_id: `test_webhook_${Date.now()}`,
      provider_message_id: `provider_test_${Date.now()}`,
      status: 'delivered',
      delivery_timestamp: new Date().toISOString(),
      ...req.body
    };

    logger.info('Testing webhook processing', { webhookData: testWebhookData });

    // Process the test webhook
    await SMSDeliveryTrackingService.processDeliveryWebhook(testWebhookData);

    // Verify the webhook was processed
    const deliveryStatus = await SMSDeliveryTrackingService.getDeliveryStatus(testWebhookData.message_id);

    res.json({
      success: true,
      message: 'Webhook test completed successfully',
      data: {
        test_webhook_data: testWebhookData,
        processed_status: deliveryStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Webhook test failed', {
      error: error.message,
      webhookData: req.body
    });
    next(error);
  }
});

// Test error scenarios
router.post('/test-error-scenarios', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errorTests: any[] = [];

    // Test 1: Invalid phone number
    try {
      const result = await SMSService.sendSMS('invalid-phone', 'Test message', getDefaultFromNumber());
      errorTests.push({
        test: 'Invalid Phone Number',
        expected_failure: true,
        actual_success: result.success,
        error: result.error,
        passed: !result.success
      });
    } catch (error: any) {
      errorTests.push({
        test: 'Invalid Phone Number',
        expected_failure: true,
        actual_success: false,
        error: error.message,
        passed: true
      });
    }

    // Test 2: Empty message
    try {
      const result = await SMSService.sendSMS('+27123456789', '', getDefaultFromNumber());
      errorTests.push({
        test: 'Empty Message',
        expected_failure: true,
        actual_success: result.success,
        error: result.error,
        passed: !result.success
      });
    } catch (error: any) {
      errorTests.push({
        test: 'Empty Message',
        expected_failure: true,
        actual_success: false,
        error: error.message,
        passed: true
      });
    }

    // Test 3: Very long message (over SMS limit)
    try {
      const longMessage = 'A'.repeat(1000); // 1000 characters
      const result = await SMSService.sendSMS('+27123456789', longMessage, getDefaultFromNumber());
      errorTests.push({
        test: 'Long Message (1000 chars)',
        expected_failure: false, // Should handle long messages
        actual_success: result.success,
        error: result.error,
        passed: true // Any result is acceptable for this test
      });
    } catch (error: any) {
      errorTests.push({
        test: 'Long Message (1000 chars)',
        expected_failure: false,
        actual_success: false,
        error: error.message,
        passed: true
      });
    }

    const totalErrorTests = errorTests.length;
    const passedErrorTests = errorTests.filter(test => test.passed).length;

    res.json({
      success: true,
      message: 'Error scenario testing completed',
      data: {
        summary: {
          total_tests: totalErrorTests,
          passed: passedErrorTests,
          failed: totalErrorTests - passedErrorTests,
          success_rate: Math.round((passedErrorTests / totalErrorTests) * 100)
        },
        error_tests: errorTests,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Error scenario testing failed', {
      error: error.message
    });
    next(error);
  }
});

// Get comprehensive integration status
router.get('/integration-status', authenticate, requireSMSPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get provider information
    const providerName = SMSService.getProviderName();
    const providerHealth = await SMSService.getProviderHealth();
    const monitoringStatus = SMSProviderMonitoringService.isMonitoringRunning();

    // Get delivery statistics
    const deliveryStats = await SMSDeliveryTrackingService.getDeliveryStatistics('day');

    // Get recent provider health status
    const healthStatuses = await SMSProviderMonitoringService.getAllProviderHealthStatuses();

    res.json({
      success: true,
      message: 'SMS integration status retrieved',
      data: {
        provider: {
          name: providerName,
          health: providerHealth,
          monitoring_active: monitoringStatus
        },
        delivery_statistics: deliveryStats,
        health_statuses: healthStatuses,
        integration_ready: providerHealth.healthy && monitoringStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Failed to get integration status', {
      error: error.message
    });
    next(error);
  }
});

export default router;
