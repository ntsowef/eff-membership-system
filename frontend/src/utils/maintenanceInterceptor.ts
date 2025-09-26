import axios, { AxiosError, type AxiosResponse } from 'axios';
import { MaintenanceService } from '../services/maintenanceService';

let maintenanceRedirectPending = false;

/**
 * Setup axios interceptor to handle maintenance mode responses
 */
export const setupMaintenanceInterceptor = () => {
  // Response interceptor to catch maintenance mode errors
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      // Reset redirect flag on successful responses
      if (maintenanceRedirectPending) {
        maintenanceRedirectPending = false;
      }
      return response;
    },
    (error: AxiosError) => {
      // Check if this is a maintenance mode error
      if (MaintenanceService.isMaintenanceError(error)) {
        const maintenanceError = MaintenanceService.getMaintenanceError(error);
        
        if (maintenanceError && !maintenanceRedirectPending) {
          maintenanceRedirectPending = true;
          
          // Only redirect if we're not already on the maintenance page
          if (!window.location.pathname.includes('/maintenance')) {
            // Use a small delay to prevent multiple redirects
            setTimeout(() => {
              window.location.href = '/maintenance';
            }, 100);
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
};

/**
 * Check if current request should be retried after maintenance ends
 */
export const shouldRetryAfterMaintenance = (error: AxiosError): boolean => {
  return MaintenanceService.isMaintenanceError(error);
};

/**
 * Create a retry mechanism for requests that fail due to maintenance
 */
export const createMaintenanceRetry = (
  originalRequest: () => Promise<any>,
  maxRetries = 3,
  retryDelay = 5000
) => {
  return async (): Promise<any> => {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await originalRequest();
      } catch (error) {
        if (shouldRetryAfterMaintenance(error as AxiosError) && retries < maxRetries - 1) {
          retries++;
          console.log(`Request failed due to maintenance, retrying in ${retryDelay}ms (attempt ${retries}/${maxRetries})`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Check if maintenance is still active
          try {
            const status = await MaintenanceService.getInstance().getStatus(true);
            if (status.is_enabled) {
              // Still in maintenance, continue retrying
              continue;
            }
          } catch (statusError) {
            // If we can't check status, assume maintenance is over and retry
          }
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`Request failed after ${maxRetries} retries due to maintenance mode`);
  };
};

/**
 * Wrapper for API calls that automatically handles maintenance mode
 */
export const withMaintenanceHandling = <T>(
  apiCall: () => Promise<T>,
  options: {
    showMaintenanceMessage?: boolean;
    redirectToMaintenance?: boolean;
    retryAfterMaintenance?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> => {
  const {
    showMaintenanceMessage = true,
    redirectToMaintenance = true,
    retryAfterMaintenance = false,
    maxRetries = 3,
    retryDelay = 5000
  } = options;

  const executeCall = async (): Promise<T> => {
    try {
      return await apiCall();
    } catch (error) {
      if (MaintenanceService.isMaintenanceError(error as AxiosError)) {
        const maintenanceError = MaintenanceService.getMaintenanceError(error as AxiosError);
        
        if (showMaintenanceMessage && maintenanceError) {
          console.warn('API call blocked by maintenance mode:', maintenanceError.message);
        }
        
        if (redirectToMaintenance && !window.location.pathname.includes('/maintenance')) {
          window.location.href = '/maintenance';
        }
        
        if (retryAfterMaintenance) {
          // Create retry mechanism
          const retryCall = createMaintenanceRetry(apiCall, maxRetries, retryDelay);
          return await retryCall();
        }
      }
      
      throw error;
    }
  };

  return executeCall();
};

/**
 * Hook for components to handle maintenance mode gracefully
 */
export const useMaintenanceHandler = () => {
  const handleMaintenanceError = (error: any) => {
    if (MaintenanceService.isMaintenanceError(error)) {
      const maintenanceError = MaintenanceService.getMaintenanceError(error);
      
      if (maintenanceError) {
        return {
          isMaintenanceError: true,
          message: maintenanceError.message,
          level: maintenanceError.maintenance_level,
          estimatedEnd: maintenanceError.estimated_end
        };
      }
    }
    
    return {
      isMaintenanceError: false,
      message: null,
      level: null,
      estimatedEnd: null
    };
  };

  const wrapApiCall = <T>(
    apiCall: () => Promise<T>,
    options?: Parameters<typeof withMaintenanceHandling>[1]
  ): Promise<T> => {
    return withMaintenanceHandling(apiCall, options);
  };

  return {
    handleMaintenanceError,
    wrapApiCall,
    isMaintenanceError: MaintenanceService.isMaintenanceError,
    getMaintenanceError: MaintenanceService.getMaintenanceError
  };
};
