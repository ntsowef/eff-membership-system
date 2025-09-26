import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const sendSuccess = <T = any>(
  res: Response,
  data?: T,
  message: string = 'Operation successful',
  statusCode: number = 200,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  }
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    message: 'Request failed',
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

// Helper functions for creating response objects (without sending)
export const createSuccessResponse = <T = any>(
  data?: T,
  message: string = 'Operation successful',
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  }
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    pagination
  };
};

export const createErrorResponse = (
  message: string = 'Operation failed',
  errorCode: string = 'INTERNAL_ERROR',
  details?: any
): ApiResponse => {
  return {
    success: false,
    message,
    error: {
      code: errorCode,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
};

export const sendValidationError = (
  res: Response,
  errors: any[],
  message: string = 'Validation failed'
): Response => {
  return sendError(res, message, 400, 'VALIDATION_ERROR', { errors });
};

export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): Response => {
  return sendError(res, `${resource} not found`, 404, 'NOT_FOUND');
};

export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized access'
): Response => {
  return sendError(res, message, 401, 'UNAUTHORIZED');
};

export const sendForbidden = (
  res: Response,
  message: string = 'Access forbidden'
): Response => {
  return sendError(res, message, 403, 'FORBIDDEN');
};
