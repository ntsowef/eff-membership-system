// Error types for TypeScript
export interface ErrorPageProps {
  statusCode?: number;
  message?: string;
  details?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

// Error page mapping for easy access
export const ErrorPages = {
  400: 'BadRequest',
  401: 'AccessDenied',
  403: 'AccessDenied',
  404: 'NotFound',
  500: 'ServerError',
  503: 'ServiceUnavailable',
} as const;

// Error page components mapping
export const ErrorComponents = {
  BadRequest: () => import('./BadRequest'),
  AccessDenied: () => import('./AccessDenied'),
  NotFound: () => import('./NotFound'),
  ServerError: () => import('./ServerError'),
  ServiceUnavailable: () => import('./ServiceUnavailable'),
  GenericError: () => import('./GenericError'),
} as const;

// Helper function to get error page component by status code
export const getErrorPageByStatus = (statusCode: number) => {
  const errorPageName = ErrorPages[statusCode as keyof typeof ErrorPages];
  return errorPageName || 'GenericError';
};
