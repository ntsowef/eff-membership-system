"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaginatedSuccess = exports.sendError = exports.sendSuccess = exports.createDatabaseError = exports.createValidationError = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.AuthorizationError = exports.AuthenticationError = exports.DatabaseError = exports.NotFoundError = exports.ValidationError = void 0;
const config_1 = require("../config/config");
// Custom error classes
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.statusCode = 400;
        this.code = 'VALIDATION_ERROR';
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.statusCode = 404;
        this.code = 'NOT_FOUND';
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class DatabaseError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.statusCode = 500;
        this.code = 'DATABASE_ERROR';
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.statusCode = 401;
        this.code = 'AUTHENTICATION_ERROR';
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.statusCode = 403;
        this.code = 'AUTHORIZATION_ERROR';
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
// Global error handler middleware
const errorHandler = (error, req, res, next) => {
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
    }
    else if (error.code === 'ER_DUP_ENTRY') {
        message = 'Duplicate entry - resource already exists';
    }
    else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        message = 'Referenced resource does not exist';
    }
    else if (error.code === 'ECONNREFUSED') {
        message = 'Database connection failed';
    }
    // Create error response
    const errorResponse = {
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
    if (config_1.config.server.env === 'development') {
        errorResponse.error.details = {
            stack: error.stack,
            originalError: error.details || error
        };
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Validation error helper
const createValidationError = (message, details) => {
    return new ValidationError(message, details);
};
exports.createValidationError = createValidationError;
// Database error helper
const createDatabaseError = (message, originalError) => {
    return new DatabaseError(message, originalError);
};
exports.createDatabaseError = createDatabaseError;
// Success response helper
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};
exports.sendSuccess = sendSuccess;
// Error response helper
const sendError = (res, error, message, statusCode) => {
    const apiError = error;
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
exports.sendError = sendError;
// Paginated success response helper
const sendPaginatedSuccess = (res, data, pagination, message = 'Success') => {
    res.status(200).json({
        success: true,
        message,
        data,
        pagination,
        timestamp: new Date().toISOString()
    });
};
exports.sendPaginatedSuccess = sendPaginatedSuccess;
