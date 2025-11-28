import axios from 'axios';

// Define types inline to avoid import issues with Vite
interface AxiosError {
  response?: {
    status?: number;
    data?: any;
    statusText?: string;
  };
  config?: {
    url?: string;
    method?: string;
  };
  message: string;
  code?: string;
}

interface AxiosResponse {
  status: number;
  data: any;
  config: {
    url?: string;
    method?: string;
  };
  headers: Record<string, string>;
}

// Error page routes mapping
const ERROR_ROUTES = {
  400: '/error/bad-request',
  401: '/error/access-denied',
  403: '/error/access-denied',
  404: '/error/not-found',
  500: '/error/server-error',
  503: '/error/service-unavailable',
} as const;

// Routes that should not trigger automatic error page redirects
const EXCLUDED_ROUTES = [
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/refresh',
  '/api/v1/auth/verify',
  '/api/v1/maintenance/status',
] as const;

// Error types that should not trigger redirects
const EXCLUDED_ERROR_TYPES = [
  'validation',
  'authentication',
  'authorization',
] as const;

interface ErrorInterceptorOptions {
  enableAutoRedirect?: boolean;
  enableLogging?: boolean;
  excludedRoutes?: string[];
  excludedStatusCodes?: number[];
  onError?: (error: AxiosError) => void;
}

class ErrorInterceptor {
  private options: Required<ErrorInterceptorOptions>;
  private requestInterceptorId?: number;
  private responseInterceptorId?: number;

  constructor(options: ErrorInterceptorOptions = {}) {
    this.options = {
      enableAutoRedirect: true,
      enableLogging: true,
      excludedRoutes: [...EXCLUDED_ROUTES],
      excludedStatusCodes: [],
      onError: () => {},
      ...options,
    };
  }

  private shouldExcludeRequest(url?: string): boolean {
    if (!url) return false;
    return this.options.excludedRoutes.some(route => url.includes(route));
  }

  private shouldExcludeStatusCode(statusCode: number): boolean {
    return this.options.excludedStatusCodes.includes(statusCode);
  }

  private logError(error: AxiosError): void {
    if (!this.options.enableLogging) return;

    console.group('🚨 API Error Intercepted');
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
    console.error('Method:', error.config?.method?.toUpperCase());
    console.error('Message:', error.response?.data?.message || error.message);
    console.error('Full Error:', error);
    console.groupEnd();
  }

  private getErrorPageRoute(statusCode: number): string {
    return ERROR_ROUTES[statusCode as keyof typeof ERROR_ROUTES] || '/error/generic';
  }

  private handleErrorRedirect(error: AxiosError): void {
    const statusCode = error.response?.status;
    const url = error.config?.url;

    // Skip if no status code or URL
    if (!statusCode || !url) return;

    // Skip if request should be excluded
    if (this.shouldExcludeRequest(url)) return;

    // Skip if status code should be excluded
    if (this.shouldExcludeStatusCode(statusCode)) return;

    // Skip if auto-redirect is disabled
    if (!this.options.enableAutoRedirect) return;

    // Skip if it's a client-side navigation error (not a real API error)
    if (url.startsWith('/') && !url.startsWith('/api/')) return;

    // Get error page route
    const errorRoute = this.getErrorPageRoute(statusCode);

    // Redirect to error page with error details
    const errorState = {
      statusCode,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.details || '',
      timestamp: new Date(),
      originalUrl: url,
    };

    // Use setTimeout to avoid navigation during render
    setTimeout(() => {
      window.location.href = `${errorRoute}?code=${statusCode}&url=${encodeURIComponent(url)}`;
    }, 100);
  }

  public setup(): void {
    // Request interceptor (for logging outgoing requests)
    this.requestInterceptorId = axios.interceptors.request.use(
      (config) => {
        if (this.options.enableLogging && config.url && !this.shouldExcludeRequest(config.url)) {
          console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        if (this.options.enableLogging) {
          console.error('🚨 Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor (for handling errors)
    this.responseInterceptorId = axios.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful responses in development
        if (this.options.enableLogging && process.env.NODE_ENV === 'development') {
          const url = response.config.url;
          if (url && !this.shouldExcludeRequest(url)) {
            console.log(`✅ API Success: ${response.status} ${response.config.method?.toUpperCase()} ${url}`);
          }
        }
        return response;
      },
      (error: AxiosError) => {
        // Log the error
        this.logError(error);

        // Call custom error handler
        this.options.onError(error);

        // Handle error redirect
        this.handleErrorRedirect(error);

        // Always reject the promise so calling code can handle the error
        return Promise.reject(error);
      }
    );
  }

  public teardown(): void {
    if (this.requestInterceptorId !== undefined) {
      axios.interceptors.request.eject(this.requestInterceptorId);
      this.requestInterceptorId = undefined;
    }

    if (this.responseInterceptorId !== undefined) {
      axios.interceptors.response.eject(this.responseInterceptorId);
      this.responseInterceptorId = undefined;
    }
  }

  public updateOptions(newOptions: Partial<ErrorInterceptorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}

// Global instance
let globalErrorInterceptor: ErrorInterceptor | null = null;

// Setup function to initialize the error interceptor
export const setupErrorInterceptor = (options?: ErrorInterceptorOptions): ErrorInterceptor => {
  // Teardown existing interceptor if it exists
  if (globalErrorInterceptor) {
    globalErrorInterceptor.teardown();
  }

  // Create new interceptor
  globalErrorInterceptor = new ErrorInterceptor(options);
  globalErrorInterceptor.setup();

  return globalErrorInterceptor;
};

// Teardown function
export const teardownErrorInterceptor = (): void => {
  if (globalErrorInterceptor) {
    globalErrorInterceptor.teardown();
    globalErrorInterceptor = null;
  }
};

// Get current interceptor instance
export const getErrorInterceptor = (): ErrorInterceptor | null => {
  return globalErrorInterceptor;
};

// Utility function to manually trigger error page navigation
export const navigateToErrorPage = (statusCode: number, message?: string, details?: string): void => {
  const errorRoute = ERROR_ROUTES[statusCode as keyof typeof ERROR_ROUTES] || '/error/generic';
  const errorState = {
    statusCode,
    message: message || 'An error occurred',
    details: details || '',
    timestamp: new Date(),
  };

  // Navigate to error page
  window.location.href = `${errorRoute}?code=${statusCode}`;
};

// Export the ErrorInterceptor class for advanced usage
export { ErrorInterceptor };
export type { ErrorInterceptorOptions };
