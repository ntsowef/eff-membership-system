import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

interface ErrorHandlerOptions {
  showNotification?: boolean;
  redirectOnError?: boolean;
  logError?: boolean;
}

interface ErrorInfo {
  statusCode: number;
  message: string;
  details?: string;
  timestamp: Date;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const navigate = useNavigate();
  const {
    showNotification: _showNotification = true,
    redirectOnError: _redirectOnError = true,
    logError = true,
  } = options;

  const logErrorToConsole = useCallback((error: any, context?: string) => {
    if (logError && process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Handler${context ? ` - ${context}` : ''}`);
      console.error('Error:', error);
      console.error('Stack:', error?.stack);
      console.error('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }, [logError]);

  const extractErrorInfo = useCallback((error: any): ErrorInfo => {
    let statusCode = 500;
    let message = 'An unexpected error occurred';
    let details = '';

    if (error?.response) {
      // Axios error with response
      statusCode = error.response.status;
      message = error.response.data?.message || error.message || message;
      details = error.response.data?.details || '';
    } else if (error?.request) {
      // Network error
      statusCode = 503;
      message = 'Network error - please check your connection';
      details = 'The request was made but no response was received';
    } else if (error instanceof Error) {
      // JavaScript error
      message = error.message;
      details = error.stack || '';
    } else if (typeof error === 'string') {
      message = error;
    }

    return {
      statusCode,
      message,
      details,
      timestamp: new Date(),
    };
  }, []);

  const getErrorPageRoute = useCallback((statusCode: number): string => {
    switch (statusCode) {
      case 400:
        return '/error/bad-request';
      case 401:
      case 403:
        return '/error/access-denied';
      case 404:
        return '/error/not-found';
      case 500:
        return '/error/server-error';
      case 503:
        return '/error/service-unavailable';
      default:
        return `/error/generic?code=${statusCode}`;
    }
  }, []);

  const handleError = useCallback((
    error: any,
    context?: string,
    customOptions?: Partial<ErrorHandlerOptions>
  ) => {
    const finalOptions = { ...options, ...customOptions };
    const errorInfo = extractErrorInfo(error);

    // Log error
    if (finalOptions.logError) {
      logErrorToConsole(error, context);
    }

    // Show notification (you can integrate with your notification system here)
    if (finalOptions.showNotification) {
      // Example: toast.error(errorInfo.message);
      console.warn('Error notification:', errorInfo.message);
    }

    // Redirect to error page
    if (finalOptions.redirectOnError) {
      const errorRoute = getErrorPageRoute(errorInfo.statusCode);
      navigate(errorRoute, {
        state: {
          statusCode: errorInfo.statusCode,
          message: errorInfo.message,
          details: errorInfo.details,
          timestamp: errorInfo.timestamp,
          context,
        },
      });
    }

    return errorInfo;
  }, [options, extractErrorInfo, logErrorToConsole, getErrorPageRoute, navigate]);

  const handleApiError = useCallback((error: AxiosError, context?: string) => {
    return handleError(error, context || 'API Request');
  }, [handleError]);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    context?: string
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context || 'Async Operation');
      throw error; // Re-throw so calling code can handle it if needed
    }
  }, [handleError]);

  const createErrorHandler = useCallback((context: string) => {
    return (error: any) => handleError(error, context);
  }, [handleError]);

  return {
    handleError,
    handleApiError,
    handleAsyncError,
    createErrorHandler,
    extractErrorInfo,
    getErrorPageRoute,
  };
};

// Utility function for handling promise rejections
export const withErrorHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler: (error: any) => void,
  context?: string
) => {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler(error);
      console.error(`Error in ${context || 'function'}:`, error);
      return undefined;
    }
  };
};

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // You can integrate with your error reporting service here
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // You can integrate with your error reporting service here
  });
};

export default useErrorHandler;
