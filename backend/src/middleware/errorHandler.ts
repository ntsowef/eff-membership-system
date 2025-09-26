import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';

// Error interface
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    method: string;
  };
}

// Global error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details
  console.error('🚨 Error occurred:', {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Determine status code
  const statusCode = error.statusCode || 500;
  
  // Determine error code
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  
  // Determine error message
  let message = error.message || 'An unexpected error occurred';
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    // Keep the original validation message instead of overriding it
    message = error.message || 'Validation failed';
  } else if (error.code === 'ER_DUP_ENTRY') {
    message = 'Duplicate entry - resource already exists';
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    message = 'Referenced resource does not exist';
  } else if (error.code === 'ECONNREFUSED') {
    message = 'Database connection failed';
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add details in development mode
  if (config.server.env === 'development') {
    errorResponse.error.details = {
      stack: error.stack,
      originalError: error.details || error
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error helper
export const createValidationError = (message: string, details?: any): ValidationError => {
  return new ValidationError(message, details);
};

// Database error helper
export const createDatabaseError = (message: string, originalError?: any): DatabaseError => {
  return new DatabaseError(message, originalError);
};

// Success response helper
export const sendSuccess = <T = any>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Error response helper
export const sendError = (
  res: Response,
  error: Error | ApiError,
  message?: string,
  statusCode?: number
): void => {
  const apiError = error as ApiError;
  const status = statusCode || apiError.statusCode || 500;
  const errorMessage = message || error.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message: errorMessage,
    error: {
      code: apiError.code || 'UNKNOWN_ERROR',
      details: apiError.details || null
    },
    timestamp: new Date().toISOString()
  });
};

// Paginated success response helper
export const sendPaginatedSuccess = <T = any>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message: string = 'Success'
): void => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  });
};
