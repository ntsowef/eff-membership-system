import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { SecurityService } from '../services/securityService';
import { cacheService } from '../services/cacheService';
import { executeQuery } from '../config/database';

// Extended Request interface for security context
export interface SecurityRequest extends Request {
  security?: {
    sessionId?: string;
    deviceFingerprint?: string;
    riskScore?: number;
    isTrustedDevice?: boolean;
  };
}

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(windowMs / 1000)
        },
        timestamp: new Date().toISOString()
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/api/v1/health';
    }
  });
};

// Different rate limits for different endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later.'
);

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many API requests, please try again later.'
);

export const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests
  'Too many requests to sensitive endpoint, please try again later.'
);

// Slow down middleware for progressive delays
export const createSlowDown = (windowMs: number, delayAfter: number, delayMs: number): any => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  });
};

export const authSlowDown: any = createSlowDown(
  15 * 60 * 1000, // 15 minutes
  2, // Start slowing down after 2 requests
  500 // 500ms delay, increasing by 500ms for each request
);

// Comprehensive security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Account lockout middleware
export const checkAccountLockout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next();
    }

    // Get user ID from email
    const user = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (!user || user.length === 0) {
      return next();
    }

    const userId = user[0].id;
    const isLocked = await SecurityService.isAccountLocked(userId);

    if (isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts',
        error: {
          code: 'ACCOUNT_LOCKED',
          details: 'Please try again later or contact support'
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    console.error('Account lockout check error:', error);
    next();
  }
};

// MFA requirement middleware
export const requireMFA = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: { code: 'AUTHENTICATION_REQUIRED' },
        timestamp: new Date().toISOString()
      });
    }

    const mfaEnabled = await SecurityService.isMFAEnabled(userId);
    const mfaToken = req.headers['x-mfa-token'] as string;

    if (mfaEnabled && !mfaToken) {
      return res.status(403).json({
        success: false,
        message: 'MFA token required',
        error: { code: 'MFA_REQUIRED' },
        timestamp: new Date().toISOString()
      });
    }

    if (mfaEnabled && mfaToken) {
      const isValidMFA = await SecurityService.verifyMFA(userId, mfaToken);
      if (!isValidMFA) {
        return res.status(403).json({
          success: false,
          message: 'Invalid MFA token',
          error: { code: 'INVALID_MFA_TOKEN' },
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  } catch (error) {
    console.error('MFA check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during MFA verification',
      error: { code: 'INTERNAL_ERROR' },
      timestamp: new Date().toISOString()
    });
  }
};

// Device fingerprinting middleware
export const deviceFingerprinting = (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';
    const connection = req.get('Connection') || '';
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || '';

    // Create device fingerprint
    const fingerprint = Buffer.from(
      `${userAgent}|${acceptLanguage}|${acceptEncoding}|${connection}|${ip}`
    ).toString('base64');

    req.security = {
      ...req.security,
      deviceFingerprint: fingerprint
    };

    next();
  } catch (error) {
    console.error('Device fingerprinting error:', error);
    next();
  }
};

// Suspicious activity detection middleware
export const detectSuspiciousActivity = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const ipAddress = req.ip || (req.socket && req.socket.remoteAddress) || '';

    if (userId) {
      const isSuspicious = await SecurityService.detectSuspiciousActivity(userId, ipAddress);

      if (isSuspicious) {
        req.security = {
          ...req.security,
          riskScore: 8 // High risk score
        };

        // Log suspicious activity
        await SecurityService.logSecurityEvent(
          userId,
          'suspicious_activity',
          ipAddress,
          req.get('User-Agent') || '',
          {
            endpoint: req.path,
            method: req.method,
            fingerprint: req.security?.deviceFingerprint
          }
        );
      }
    }

    next();
  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    next();
  }
};

// Session validation middleware
export const validateSession = async (req: SecurityRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const sessionId = req.headers['x-session-id'] as string;

    if (sessionId) {
      const session = await SecurityService.validateSession(sessionId);

      if (session.valid) {
        req.security = {
          ...req.security,
          sessionId: sessionId
        };
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired session',
          error: { code: 'INVALID_SESSION' },
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    next();
  }
};

// IP whitelist middleware for admin endpoints
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || (req.socket && req.socket.remoteAddress) || '';

    if (allowedIPs.includes(clientIP) || allowedIPs.includes('*')) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: 'Access denied from this IP address',
      error: { code: 'IP_NOT_ALLOWED' },
      timestamp: new Date().toISOString()
    });
  };
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Remove potentially dangerous characters from query parameters
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    console.error('Request sanitization error:', error);
    next();
  }
};

// Helper function to recursively sanitize objects
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Security logging middleware
export const securityLogger = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const ipAddress = req.ip || (req.socket && req.socket.remoteAddress) || '';
    const userAgent = req.get('User-Agent') || '';

    // Log sensitive endpoint access
    const sensitiveEndpoints = ['/auth/', '/admin/', '/system/', '/bulk-operations/'];
    const isSensitive = sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));

    if (isSensitive && userId) {
      await SecurityService.logSecurityEvent(
        userId,
        'suspicious_activity',
        ipAddress,
        userAgent,
        {
          endpoint: req.path,
          method: req.method,
          query: req.query,
          riskScore: req.security?.riskScore || 0
        }
      );
    }

    next();
  } catch (error) {
    console.error('Security logging error:', error);
    next();
  }
};

// Password strength validation middleware
export const validatePasswordStrength = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return next();
    }

    const errors: string[] = [];

    // Minimum length
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Maximum length
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    // Uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common passwords check
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        error: {
          code: 'WEAK_PASSWORD',
          details: errors
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    console.error('Password validation error:', error);
    next();
  }
};

export default {
  securityHeaders,
  authRateLimit,
  apiRateLimit,
  strictRateLimit,
  authSlowDown,
  checkAccountLockout,
  requireMFA,
  deviceFingerprinting,
  detectSuspiciousActivity,
  validateSession,
  ipWhitelist,
  sanitizeRequest,
  securityLogger,
  validatePasswordStrength
};
