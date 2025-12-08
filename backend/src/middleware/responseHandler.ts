/**
 * Response Handler Middleware
 * 
 * Provides utility functions for handling async routes and standardizing API responses
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper for Express routes
 * Catches errors from async route handlers and passes them to error middleware
 * 
 * @param fn - Async route handler function
 * @returns Express middleware function
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Send success response
 * 
 * @param res - Express response object
 * @param data - Response data
 * @param message - Success message
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (
  res: Response,
  data: any = null,
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

/**
 * Send error response
 * 
 * @param res - Express response object
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param error - Error details (optional)
 */
export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  error: any = null
): void => {
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  // Include error details in development mode
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = {
      message: error.message,
      stack: error.stack,
      ...error
    };
  }

  res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * 
 * @param res - Express response object
 * @param data - Array of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param message - Success message
 */
export const sendPaginatedResponse = (
  res: Response,
  data: any[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): void => {
  const totalPages = Math.ceil(total / limit);
  
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Send file download response
 * 
 * @param res - Express response object
 * @param filePath - Path to file
 * @param fileName - Download file name
 * @param contentType - MIME type (optional)
 */
export const sendFileDownload = (
  res: Response,
  filePath: string,
  fileName: string,
  contentType?: string
): void => {
  if (contentType) {
    res.setHeader('Content-Type', contentType);
  }
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.download(filePath, fileName);
};

/**
 * Send created response (201)
 * 
 * @param res - Express response object
 * @param data - Created resource data
 * @param message - Success message
 */
export const sendCreated = (
  res: Response,
  data: any = null,
  message: string = 'Resource created successfully'
): void => {
  sendSuccess(res, data, message, 201);
};

/**
 * Send no content response (204)
 * 
 * @param res - Express response object
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/**
 * Send not found response (404)
 * 
 * @param res - Express response object
 * @param message - Error message
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): void => {
  sendError(res, message, 404);
};

/**
 * Send bad request response (400)
 * 
 * @param res - Express response object
 * @param message - Error message
 * @param errors - Validation errors (optional)
 */
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request',
  errors: any = null
): void => {
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(400).json(response);
};

/**
 * Send unauthorized response (401)
 * 
 * @param res - Express response object
 * @param message - Error message
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): void => {
  sendError(res, message, 401);
};

/**
 * Send forbidden response (403)
 * 
 * @param res - Express response object
 * @param message - Error message
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden'
): void => {
  sendError(res, message, 403);
};

