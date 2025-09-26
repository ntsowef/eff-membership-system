import { executeQuery, executeQuerySingle } from '../config/database';
import { logger } from '../utils/logger';
import { SMSService } from './smsService';
import cron from 'node-cron';

export interface ProviderHealthStatus {
  provider_name: string;
  is_healthy: boolean;
  health_message: string;
  response_time_ms: number;
  consecutive_failures: number;
  last_error_message?: string;
  last_error_timestamp?: Date;
  success_rate_24h: number;
  average_response_time_24h: number;
  total_messages_24h: number;
  last_check_timestamp: Date;
}

export interface ProviderPerformanceMetrics {
  provider_name: string;
  total_messages: number;
  delivered_messages: number;
  failed_messages: number;
  pending_messages: number;
  delivery_rate: number;
  average_cost: number;
  average_response_time: number;
}

export class SMSProviderMonitoringService {
  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static isMonitoringActive = false;

  // Start provider health monitoring
  static startMonitoring(): void {
    if (this.isMonitoringActive) {
      logger.info('SMS provider monitoring is already active');
      return;
    }

    logger.info('Starting SMS provider health monitoring');
    this.isMonitoringActive = true;

    // Schedule health checks every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.performHealthCheck();
      } catch (error: any) {
        logger.error('Scheduled health check failed', { error: error.message });
      }
    });

    // Schedule performance metrics update every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.updatePerformanceMetrics();
      } catch (error: any) {
        logger.error('Performance metrics update failed', { error: error.message });
      }
    });

    // Perform initial health check
    this.performHealthCheck().catch(error => {
      logger.error('Initial health check failed', { error: error.message });
    });
  }

  // Stop provider health monitoring
  static stopMonitoring(): void {
    if (!this.isMonitoringActive) {
      logger.info('SMS provider monitoring is not active');
      return;
    }

    logger.info('Stopping SMS provider health monitoring');
    this.isMonitoringActive = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Perform health check for current provider
  static async performHealthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    let healthStatus: ProviderHealthStatus;

    try {
      const provider = SMSService.getProvider();
      const providerName = provider.name;

      logger.info('Performing health check', { provider: providerName });

      // Get current health status from database
      const currentStatus = await this.getProviderHealthStatus(providerName);

      let isHealthy = true;
      let healthMessage = 'Provider is healthy';
      let responseTime = 0;
      let consecutiveFailures = currentStatus?.consecutive_failures || 0;
      let lastErrorMessage: string | undefined;
      let lastErrorTimestamp: Date | undefined;

      // Perform health check if provider supports it
      if (provider.healthCheck) {
        try {
          const healthResult = await provider.healthCheck();
          isHealthy = healthResult.healthy;
          healthMessage = healthResult.message;
          responseTime = healthResult.latency || 0;

          if (!isHealthy) {
            consecutiveFailures++;
            lastErrorMessage = healthResult.message;
            lastErrorTimestamp = new Date();
          } else {
            consecutiveFailures = 0; // Reset on successful check
          }
        } catch (error: any) {
          isHealthy = false;
          healthMessage = `Health check failed: ${error.message}`;
          responseTime = Date.now() - startTime;
          consecutiveFailures++;
          lastErrorMessage = error.message;
          lastErrorTimestamp = new Date();
        }
      } else {
        // If no health check method, assume healthy
        responseTime = Date.now() - startTime;
      }

      // Calculate 24h performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(providerName);

      healthStatus = {
        provider_name: providerName,
        is_healthy: isHealthy,
        health_message: healthMessage,
        response_time_ms: responseTime,
        consecutive_failures: consecutiveFailures,
        last_error_message: lastErrorMessage,
        last_error_timestamp: lastErrorTimestamp,
        success_rate_24h: performanceMetrics.delivery_rate,
        average_response_time_24h: performanceMetrics.average_response_time,
        total_messages_24h: performanceMetrics.total_messages,
        last_check_timestamp: new Date()
      };

      // Update health status in database
      await this.updateProviderHealthStatus(healthStatus);

      logger.info('Health check completed', {
        provider: providerName,
        healthy: isHealthy,
        responseTime,
        consecutiveFailures
      });

      return healthStatus;

    } catch (error: any) {
      logger.error('Health check failed', { error: error.message });
      
      // Return failed health status
      healthStatus = {
        provider_name: 'Unknown',
        is_healthy: false,
        health_message: `Health check error: ${error.message}`,
        response_time_ms: Date.now() - startTime,
        consecutive_failures: 999,
        last_error_message: error.message,
        last_error_timestamp: new Date(),
        success_rate_24h: 0,
        average_response_time_24h: 0,
        total_messages_24h: 0,
        last_check_timestamp: new Date()
      };

      return healthStatus;
    }
  }

  // Get provider health status from database
  static async getProviderHealthStatus(providerName: string): Promise<ProviderHealthStatus | null> {
    try {
      const query = `
        SELECT provider_name, is_healthy, health_message, response_time_ms,
               consecutive_failures, last_error_message, last_error_timestamp,
               success_rate_24h, average_response_time_24h, total_messages_24h,
               last_check_timestamp
        FROM sms_provider_health
        WHERE provider_name = ?
      `;

      const result = await executeQuerySingle(query, [providerName]);
      return result || null;

    } catch (error: any) {
      logger.error('Failed to get provider health status', {
        error: error.message,
        providerName
      });
      return null;
    }
  }

  // Update provider health status in database
  static async updateProviderHealthStatus(healthStatus: ProviderHealthStatus): Promise<void> {
    try {
      const query = `
        INSERT INTO sms_provider_health (
          provider_name, is_healthy, health_message, response_time_ms,
          consecutive_failures, last_error_message, last_error_timestamp,
          success_rate_24h, average_response_time_24h, total_messages_24h,
          last_check_timestamp, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          is_healthy = VALUES(is_healthy),
          health_message = VALUES(health_message),
          response_time_ms = VALUES(response_time_ms),
          consecutive_failures = VALUES(consecutive_failures),
          last_error_message = VALUES(last_error_message),
          last_error_timestamp = VALUES(last_error_timestamp),
          success_rate_24h = VALUES(success_rate_24h),
          average_response_time_24h = VALUES(average_response_time_24h),
          total_messages_24h = VALUES(total_messages_24h),
          last_check_timestamp = VALUES(last_check_timestamp),
          updated_at = NOW()
      `;

      await executeQuery(query, [
        healthStatus.provider_name,
        healthStatus.is_healthy,
        healthStatus.health_message,
        healthStatus.response_time_ms,
        healthStatus.consecutive_failures,
        healthStatus.last_error_message || null,
        healthStatus.last_error_timestamp || null,
        healthStatus.success_rate_24h,
        healthStatus.average_response_time_24h,
        healthStatus.total_messages_24h,
        healthStatus.last_check_timestamp
      ]);

    } catch (error: any) {
      logger.error('Failed to update provider health status', {
        error: error.message,
        healthStatus
      });
      throw error;
    }
  }

  // Calculate performance metrics for a provider
  static async calculatePerformanceMetrics(providerName: string): Promise<ProviderPerformanceMetrics> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_messages,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_messages,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
          SUM(CASE WHEN status IN ('pending', 'queued', 'sending', 'sent') THEN 1 ELSE 0 END) as pending_messages,
          ROUND(AVG(COALESCE(cost, 0)), 4) as average_cost
        FROM sms_delivery_tracking
        WHERE provider_name = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;

      const result = await executeQuerySingle(query, [providerName]);

      const totalMessages = result?.total_messages || 0;
      const deliveredMessages = result?.delivered_messages || 0;
      const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

      return {
        provider_name: providerName,
        total_messages: totalMessages,
        delivered_messages: deliveredMessages,
        failed_messages: result?.failed_messages || 0,
        pending_messages: result?.pending_messages || 0,
        delivery_rate: Math.round(deliveryRate * 100) / 100,
        average_cost: result?.average_cost || 0,
        average_response_time: 0 // This would need to be tracked separately
      };

    } catch (error: any) {
      logger.error('Failed to calculate performance metrics', {
        error: error.message,
        providerName
      });

      return {
        provider_name: providerName,
        total_messages: 0,
        delivered_messages: 0,
        failed_messages: 0,
        pending_messages: 0,
        delivery_rate: 0,
        average_cost: 0,
        average_response_time: 0
      };
    }
  }

  // Update performance metrics for all providers
  static async updatePerformanceMetrics(): Promise<void> {
    try {
      logger.info('Updating performance metrics for all providers');

      const providers = await executeQuery(`
        SELECT DISTINCT provider_name 
        FROM sms_provider_health
      `);

      for (const provider of providers || []) {
        const metrics = await this.calculatePerformanceMetrics(provider.provider_name);
        
        await executeQuery(`
          UPDATE sms_provider_health
          SET success_rate_24h = ?,
              total_messages_24h = ?,
              updated_at = NOW()
          WHERE provider_name = ?
        `, [
          metrics.delivery_rate,
          metrics.total_messages,
          provider.provider_name
        ]);
      }

      logger.info('Performance metrics updated successfully');

    } catch (error: any) {
      logger.error('Failed to update performance metrics', {
        error: error.message
      });
      throw error;
    }
  }

  // Get all provider health statuses
  static async getAllProviderHealthStatuses(): Promise<ProviderHealthStatus[]> {
    try {
      const query = `
        SELECT provider_name, is_healthy, health_message, response_time_ms,
               consecutive_failures, last_error_message, last_error_timestamp,
               success_rate_24h, average_response_time_24h, total_messages_24h,
               last_check_timestamp
        FROM sms_provider_health
        ORDER BY provider_name
      `;

      const results = await executeQuery(query);
      return results || [];

    } catch (error: any) {
      logger.error('Failed to get all provider health statuses', {
        error: error.message
      });
      return [];
    }
  }

  // Check if monitoring is active
  static isMonitoringRunning(): boolean {
    return this.isMonitoringActive;
  }
}

export default SMSProviderMonitoringService;
