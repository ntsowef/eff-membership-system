/**
 * Health Monitor Service
 *
 * Monitors backend connectivity and service health status.
 * Provides real-time updates on system availability.
 */

import axios, { AxiosError } from 'axios';
import { devLog, devWarn } from '../utils/logger';

// Create a dedicated axios instance for health checks to avoid interceptor interference
const healthCheckClient = axios.create({
  timeout: 10000, // 10 seconds timeout for health checks
  headers: {
    'X-Health-Check': 'true'
  }
});

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'unknown';

export interface HealthCheckResult {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  response_time: number;
  services: {
    api: {
      status: ServiceStatus;
      uptime: number;
    };
    database: {
      status: ServiceStatus;
      details?: any;
    };
    cache: {
      status: ServiceStatus;
      connected: boolean;
      error?: string;
    };
  };
}

export interface HealthStatus {
  connectionStatus: ConnectionStatus;
  serviceStatus: ServiceStatus;
  lastCheck: Date | null;
  lastSuccessfulCheck: Date | null;
  consecutiveFailures: number;
  healthData: HealthCheckResult | null;
  error: string | null;
}

type HealthStatusListener = (status: HealthStatus) => void;

class HealthMonitorService {
  private checkInterval: number = 30000; // 30 seconds
  private maxRetries: number = 3;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<HealthStatusListener> = new Set();
  
  private status: HealthStatus = {
    connectionStatus: 'unknown',
    serviceStatus: 'unknown',
    lastCheck: null,
    lastSuccessfulCheck: null,
    consecutiveFailures: 0,
    healthData: null,
    error: null
  };

  /**
   * Start monitoring backend health
   */
  start(): void {
    if (this.intervalId) {
      devWarn('Health monitor already running');
      return;
    }

    devLog('🏥 Starting health monitor service');

    // Perform initial check immediately
    this.performHealthCheck();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      devLog('🏥 Health monitor stopped');
    }
  }

  /**
   * Perform a health check
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.updateStatus({
        connectionStatus: 'checking'
      });

      const response = await healthCheckClient.get<{
        success: boolean;
        data: HealthCheckResult;
        message: string;
      }>('/api/v1/health/detailed');

      const responseTime = Date.now() - startTime;
      const healthData = response.data.data;

      this.updateStatus({
        connectionStatus: 'connected',
        serviceStatus: healthData.status,
        lastCheck: new Date(),
        lastSuccessfulCheck: new Date(),
        consecutiveFailures: 0,
        healthData: {
          ...healthData,
          response_time: responseTime
        },
        error: null
      });

      devLog(`✅ Health check passed: ${healthData.status} (${responseTime}ms)`);
      
    } catch (error) {
      this.handleHealthCheckError(error as AxiosError);
    }
  }

  /**
   * Handle health check errors
   */
  private handleHealthCheckError(error: AxiosError): void {
    const consecutiveFailures = this.status.consecutiveFailures + 1;
    let errorMessage = 'Unknown error';
    let serviceStatus: ServiceStatus = 'unhealthy';

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout - backend server not responding';
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      errorMessage = 'Network error - cannot reach backend server';
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      if (status === 503) {
        errorMessage = 'Service unavailable - backend services degraded';
        serviceStatus = 'degraded';
      } else if (status >= 500) {
        errorMessage = `Server error (${status})`;
      } else {
        errorMessage = `HTTP error ${status}`;
      }
    } else {
      errorMessage = error.message || 'Failed to connect to backend';
    }

    this.updateStatus({
      connectionStatus: 'disconnected',
      serviceStatus,
      lastCheck: new Date(),
      consecutiveFailures,
      error: errorMessage
    });

    console.error(`❌ Health check failed (${consecutiveFailures}/${this.maxRetries}):`, errorMessage);
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(updates: Partial<HealthStatus>): void {
    this.status = {
      ...this.status,
      ...updates
    };

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Error in health status listener:', error);
      }
    });
  }

  /**
   * Subscribe to health status changes
   */
  subscribe(listener: HealthStatusListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current status
    listener(this.status);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current status
   */
  getStatus(): HealthStatus {
    return { ...this.status };
  }

  /**
   * Force an immediate health check
   */
  async checkNow(): Promise<void> {
    await this.performHealthCheck();
  }

  /**
   * Update check interval
   */
  setCheckInterval(intervalMs: number): void {
    this.checkInterval = intervalMs;
    
    // Restart monitoring with new interval
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}

// Export singleton instance
export const healthMonitorService = new HealthMonitorService();

