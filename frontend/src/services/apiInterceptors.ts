/**
 * Enhanced API Interceptors
 *
 * Handles network errors, service failures, and implements retry logic
 * with exponential backoff for transient failures.
 */

import axios, { AxiosError } from 'axios';
import { useUIStore } from '../store';
import { devLog } from '../utils/logger';

interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  retryDelay: 1000, // Start with 1 second
  retryCondition: (error: AxiosError) => {
    // Retry on network errors and 5xx server errors
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }
};

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(retryCount: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30 seconds
}

/**
 * Check if error is a network error
 */
function isNetworkError(error: AxiosError): boolean {
  return !error.response && (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.message.includes('Network Error')
  );
}

/**
 * Check if error is a service unavailable error
 */
function isServiceUnavailable(error: AxiosError): boolean {
  return error.response?.status === 503;
}

/**
 * Check if error is a database error
 */
function isDatabaseError(error: AxiosError): boolean {
  const data = error.response?.data as any;
  return error.response?.status === 503 && 
         data?.error?.code === 'DATABASE_ERROR';
}

/**
 * Check if error is a cache error
 */
function isCacheError(error: AxiosError): boolean {
  const data = error.response?.data as any;
  return data?.error?.code === 'CACHE_ERROR' ||
         data?.message?.toLowerCase().includes('cache');
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: AxiosError): string {
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  if (isDatabaseError(error)) {
    return 'Database connection issue. Some features may be temporarily unavailable.';
  }
  
  if (isCacheError(error)) {
    return 'System is running with reduced performance. Your request may take longer than usual.';
  }
  
  if (isServiceUnavailable(error)) {
    return 'Service is temporarily unavailable. Please try again in a few moments.';
  }
  
  if (error.response) {
    const status = error.response.status;
    if (status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (status === 404) {
      return 'The requested resource was not found.';
    }
    if (status >= 500) {
      return 'A server error occurred. Our team has been notified.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Setup enhanced API interceptors
 */
export function setupEnhancedInterceptors() {
  // Request interceptor
  axios.interceptors.request.use(
    (config: any) => {
      // Initialize retry count
      config.__retryCount = config.__retryCount || 0;

      // Add Authorization header from Zustand persisted storage
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          const token = parsed.state?.token;
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Failed to parse auth-storage:', error);
        }
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor with retry logic
  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as any;

      // Skip retry for health check requests
      if (config?.headers?.['X-Health-Check']) {
        return Promise.reject(error);
      }

      // Skip retry for requests with X-No-Retry header (e.g., file uploads)
      if (config?.headers?.['X-No-Retry']) {
        return Promise.reject(error);
      }

      const retryConfig = { ...DEFAULT_RETRY_CONFIG };
      const retryCount = config.__retryCount || 0;

      // Log error for debugging
      console.error('API Error:', {
        url: config?.url,
        method: config?.method,
        status: error.response?.status,
        code: error.code,
        message: error.message,
        retryCount
      });

      // Determine if we should retry
      const shouldRetry = retryCount < retryConfig.retries &&
                         retryConfig.retryCondition!(error);

      if (shouldRetry) {
        config.__retryCount = retryCount + 1;
        const delay = getRetryDelay(retryCount, retryConfig.retryDelay);

        devLog(`Retrying request (${config.__retryCount}/${retryConfig.retries}) after ${delay}ms`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry the request
        return axios(config);
      }

      // No more retries, handle the error
      handleApiError(error);

      return Promise.reject(error);
    }
  );

  devLog('✅ Enhanced API interceptors configured');
}

/**
 * Handle API errors and update UI state
 */
function handleApiError(error: AxiosError): void {
  const store = useUIStore.getState();
  const message = getUserFriendlyMessage(error);
  
  // Update connection status based on error type
  if (isNetworkError(error)) {
    store.setConnectionStatus('disconnected');
    store.setHealthError('Backend server is unreachable');
    store.setShowConnectionBanner(true);
  } else if (isDatabaseError(error)) {
    store.setServiceStatus('unhealthy');
    store.setHealthError('Database connection failure');
    store.setShowConnectionBanner(true);
  } else if (isCacheError(error)) {
    store.setServiceStatus('degraded');
    store.setHealthError('Cache service unavailable - performance may be affected');
    // Don't show banner for cache errors, just a warning notification
  } else if (isServiceUnavailable(error)) {
    store.setServiceStatus('unhealthy');
    store.setHealthError('Service temporarily unavailable');
    store.setShowConnectionBanner(true);
  }
  
  // Show notification for non-auth errors
  if (error.response?.status !== 401) {
    const notificationType = isCacheError(error) ? 'warning' : 'error';
    store.addNotification({
      type: notificationType,
      message
    });
  }
}

