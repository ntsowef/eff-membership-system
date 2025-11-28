import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { UserModel, UserDetails } from '../models/users';
import { RoleModel } from '../models/roles';
import { executeQuery } from '../config/database';

import { logAuthentication, logLogout, logPasswordReset, logPasswordChange } from './auditLogger';
import bcrypt from 'bcrypt';
import { SessionManagementService } from '../services/sessionManagementService';

// Rate limiting storage for login attempts
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,           // Maximum failed attempts per window
  windowMs: 15 * 60 * 1000, // 15 minutes window
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block duration
  progressiveDelay: true,   // Enable progressive delays
};

// Rate limiting helper functions
const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
};

const cleanupExpiredAttempts = (): void => {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts.entries()) {
    // Remove expired attempts (older than window + block duration)
    if (now - attempt.firstAttempt > RATE_LIMIT_CONFIG.windowMs + RATE_LIMIT_CONFIG.blockDurationMs) {
      loginAttempts.delete(ip);
    }
  }
};

const checkRateLimit = (ip: string): { allowed: boolean; retryAfter?: number; message?: string } => {
  cleanupExpiredAttempts();

  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    return { allowed: true };
  }

  // Check if currently blocked
  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    const retryAfter = Math.ceil((attempt.blockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      message: `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
    };
  }

  // Check if within rate limit window
  if (now - attempt.firstAttempt < RATE_LIMIT_CONFIG.windowMs) {
    if (attempt.count >= RATE_LIMIT_CONFIG.maxAttempts) {
      // Block the IP
      attempt.blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
      const retryAfter = Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 1000);
      return {
        allowed: false,
        retryAfter,
        message: `Too many login attempts. Account temporarily locked for ${Math.ceil(retryAfter / 60)} minutes.`
      };
    }
  } else {
    // Reset the window
    attempt.count = 0;
    attempt.firstAttempt = now;
  }

  return { allowed: true };
};

const recordLoginAttempt = (ip: string, success: boolean): void => {
  cleanupExpiredAttempts();

  const now = Date.now();
  let attempt = loginAttempts.get(ip);

  if (!attempt) {
    attempt = {
      count: 0,
      firstAttempt: now,
      lastAttempt: now
    };
    loginAttempts.set(ip, attempt);
  }

  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(ip);
  } else {
    // Increment failed attempts
    if (now - attempt.firstAttempt >= RATE_LIMIT_CONFIG.windowMs) {
      // Reset window
      attempt.count = 1;
      attempt.firstAttempt = now;
    } else {
      attempt.count++;
    }
    attempt.lastAttempt = now;
  }
};

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserDetails;
    }
  }
}

// JWT payload interface with province context
interface JWTPayload {
  id: number;
  email: string;
  role_name: string;
  admin_level?: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  iat: number;
  exp: number;
}

// Generate JWT token with province context
export const generateToken = (user: UserDetails): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role_name: user.role_name,
      admin_level: user.admin_level,
      province_code: (user as any).province_code,
      district_code: (user as any).district_code,
      municipal_code: (user as any).municipal_code,
      ward_code: (user as any).ward_code
    },
    config.security.jwtSecret,
    {
      expiresIn: '24h',
      issuer: 'geomaps-api',
      audience: 'geomaps-client'
    }
  );
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  try {
    // First try with issuer/audience validation
    try {
      return jwt.verify(token, config.security.jwtSecret, {
        issuer: 'geomaps-api',
        audience: 'geomaps-client'
      }) as JWTPayload;
    } catch (audienceError) {
      // If audience validation fails, try without it (for backward compatibility)
      console.log('JWT audience validation failed, trying without audience validation');
      return jwt.verify(token, config.security.jwtSecret) as JWTPayload;
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') {
      // Create a mock user for development
      const mockUser: UserDetails = {
        id: 1,
        name: 'Development User',
        email: 'dev@example.com',
        password: '',
        role_id: 1,
        role_name: 'super_admin',
        admin_level: 'national',
        failed_login_attempts: 0,
        mfa_enabled: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      req.user = mockUser;
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Authorization header is required');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      throw new AuthenticationError('Token is required');
    }

    const payload = verifyToken(token);

    // Get full user details from database
    const user = await UserModel.getUserById(payload.id);
    if (!user || !user.is_active) {
      throw new AuthenticationError('User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Authorization middleware factory
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!allowedRoles.includes(req.user.role_name)) {
        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Optional authentication middleware (doesn't throw error if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;

      if (token) {
        try {
          const payload = verifyToken(token);
          const user = await UserModel.getUserById(payload.id);
          if (user && user.is_active) {
            req.user = user;
          }
        } catch (error) {
          // Ignore token errors in optional auth
          console.warn('Optional auth token verification failed:', error);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// API key authentication middleware (for service-to-service communication)
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }

    // In a real application, you would validate the API key against a database
    // For now, we'll use a simple environment variable
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey || apiKey !== validApiKey) {
      throw new AuthenticationError('Invalid API key');
    }

    // Create a service user for API key authentication
    const serviceUser: UserDetails = {
      id: 0,
      name: 'API Service',
      email: 'api-service@system.local',
      password: '',
      role_id: 1,
      role_name: 'super_admin',
      admin_level: 'national',
      failed_login_attempts: 0,
      mfa_enabled: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    req.user = serviceUser;

    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting by user
export const createUserRateLimit = (windowMs: number, maxRequests: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id?.toString() || req.ip || 'anonymous';
    const now = Date.now();

    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this user',
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
        }
      });
      return;
    }

    userLimit.count++;
    next();
  };
};

// Middleware to log user actions
export const logUserAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user) {
      console.log(`User Action: ${req.user.name} (${req.user.role_name}) - ${action} - ${req.method} ${req.path}`);
    }
    next();
  };
};

// Check if user has permission for specific resource
export const checkResourcePermission = (resourceType: string, action: 'read' | 'write' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Use the new permission system
      const permissionName = `${resourceType}.${action}`;
      const hasPermission = await RoleModel.userHasPermission(req.user.id, permissionName);

      if (!hasPermission) {
        throw new AuthorizationError(`Insufficient permissions for ${action} on ${resourceType}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};



// Simple login endpoint (for demonstration - in production, use proper user management)
export const createAuthRoutes = () => {
  const router = require('express').Router();

  // Login endpoint with rate limiting
  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AuthenticationError('Email and password are required');
      }

      // Apply rate limiting specifically to login attempts
      const clientIP = getClientIP(req);
      const rateLimitCheck = checkRateLimit(clientIP);

      if (!rateLimitCheck.allowed) {
        console.log(`🚫 Rate limit exceeded for IP: ${clientIP}`);

        // Record the failed attempt due to rate limiting
        recordLoginAttempt(clientIP, false);

        return res.status(429).json({
          success: false,
          message: rateLimitCheck.message || 'Too many login attempts',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitCheck.retryAfter,
          timestamp: new Date().toISOString()
        });
      }

      // Authenticate user using user management service
      const bcrypt = require('bcrypt');
      const { executeQuery } = require('../config/database');

      // Get user from database
      console.log(`🔍 Login attempt - NODE_ENV: ${process.env.NODE_ENV}, Email: ${email}`);

      try {
        // Query the database for the user
        const userQuery = `
          SELECT
            u.user_id as id,
            u.name,
            u.email,
            u.password,
            u.admin_level,
            u.province_code,
            u.district_code,
            u.municipal_code,
            u.ward_code,
            u.is_active,
            u.mfa_enabled,
            u.failed_login_attempts,
            r.role_name as role_name
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.role_id
          WHERE u.email = $1 AND u.is_active = TRUE
        `;

        const userResults = await executeQuery(userQuery, [email]);

        if (userResults.length === 0) {
          console.log('❌ User not found or inactive');
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password'
            }
          });
        }

        const user = userResults[0];
        console.log(`👤 Found user: ${user.name} (${user.admin_level})`);

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          console.log('❌ Invalid password');
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password'
            }
          });
        }

        console.log(`✅ Password verified for user: ${user.name}`);

        // User authenticated successfully

        // Generate JWT token with province context
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role_name: user.role_name,
            admin_level: user.admin_level,
            province_code: user.province_code,
            district_code: user.district_code,
            municipal_code: user.municipal_code,
            ward_code: user.ward_code
          },
          config.security.jwtSecret,
          { expiresIn: '24h' }
        );

        // Update last login information
        await executeQuery(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1 WHERE user_id = $2',
          [req.ip, user.id]
        );

        // Create user session in database
        const sessionData = await SessionManagementService.createSession(
          user.id,
          clientIP,
          req.headers['user-agent'] || 'Unknown'
        );

        // Log successful authentication
        await logAuthentication(email, true, req);

        // Record successful login attempt (clears rate limiting)
        recordLoginAttempt(clientIP, true);

        // Log province context if applicable
        if (user.province_code) {
          console.log(`🏛️ Province context: ${user.province_code}`);
        }

        return res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              admin_level: user.admin_level,
              province_code: user.province_code,
              district_code: user.district_code,
              municipal_code: user.municipal_code,
              ward_code: user.ward_code,
              role: user.role_name,
              is_active: user.is_active,
              created_at: user.created_at,
              updated_at: user.updated_at
            },
            token,
            session_id: sessionData.session_id,
            expires_in: '24h'
          }
        });

      } catch (dbError) {
        console.error('❌ Database error during authentication:', dbError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Authentication system temporarily unavailable'
          }
        });
      }
    } catch (error) {
      // Record failed login attempt for any authentication error
      const clientIP = getClientIP(req);
      recordLoginAttempt(clientIP, false);
      return next(error);
    }
  });

  // Token validation endpoint
  router.get('/validate', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
        valid: true
      },
      timestamp: new Date().toISOString()
    });
  });

  // Logout endpoint
  router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      const userId = req.user!.id;

      if (sessionId) {
        // Terminate the specific session
        await SessionManagementService.terminateSession(sessionId, 'user_logout');
      } else {
        // If no session ID provided, terminate all user sessions
        const clientIP = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Find and terminate sessions based on user ID and IP/User Agent
        await executeQuery(`
          UPDATE user_sessions
          SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 AND is_active = TRUE
        `, [userId, clientIP, userAgent]);
      }

      // Log logout
      await logLogout(req.user!.id, req);

      res.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Logout endpoint
  router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (user) {
        // Log the logout event
        await logLogout(user.id, req);

        console.log(`🚪 User logged out: ${user.email}`);
      }

      res.json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  });

  // Password reset request endpoint
  router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AuthenticationError('Email is required');
      }

      const resetToken = await UserModel.generatePasswordResetToken(email);

      if (resetToken) {
        // TODO: Send email with reset token
        // For now, just return success (in production, always return success to prevent email enumeration)
        console.log(`Password reset token for ${email}: ${resetToken}`);
      }

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Password reset endpoint
  router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new AuthenticationError('Token and new password are required');
      }

      const success = await UserModel.resetPasswordWithToken({ token, newPassword });

      if (!success) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Log password reset (we don't have user ID here, so log without it)
      await logPasswordReset(undefined, req);

      res.json({
        success: true,
        message: 'Password reset successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Change password endpoint (authenticated)
  router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AuthenticationError('Current password and new password are required');
      }

      const success = await UserModel.changePassword(req.user!.id, { currentPassword, newPassword });

      if (!success) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Log password change
      await logPasswordChange(req.user!.id, req);

      res.json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Logout endpoint (client-side token removal)
  router.post('/logout', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Logout successful - please remove token from client',
      timestamp: new Date().toISOString()
    });
  });

  return router;
};

// Permission-based authorization middleware
export const requirePermission = (permissionName: string, targetLocationCode?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip permission checks in development mode
      if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') {
        return next();
      }

      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Simplified permission checking - allow all authenticated users for now
      // TODO: Implement proper permission system with permissions table
      console.log(`Permission check: ${req.user.role_name} requesting ${permissionName} - GRANTED (simplified)`);

      // For now, allow all authenticated users to access statistics
      // In a full implementation, you would check against a permissions table

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Hierarchical access control middleware
export const requireHierarchicalAccess = (level: 'national' | 'province' | 'region' | 'municipality' | 'ward') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const userLevel = req.user.admin_level;
      const hierarchyOrder = ['national', 'province', 'region', 'municipality', 'ward'];

      const userLevelIndex = hierarchyOrder.indexOf(userLevel || 'none');
      const requiredLevelIndex = hierarchyOrder.indexOf(level);

      // Super admin has access to everything
      if (req.user.role_name === 'super_admin') {
        return next();
      }

      // User must have equal or higher level access
      if (userLevelIndex === -1 || userLevelIndex > requiredLevelIndex) {
        throw new AuthorizationError(`Access denied. Required access level: ${level} or higher`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Entity access control middleware (checks if user can access specific entity)
export const requireEntityAccess = (entityType: 'province' | 'region' | 'municipality' | 'ward') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Super admin has access to everything
      if (req.user.role_name === 'super_admin') {
        return next();
      }

      const entityId = parseInt(req.params.id || req.body[`${entityType}_id`]);
      if (!entityId) {
        throw new AuthorizationError('Entity ID is required');
      }

      // Check if user has access to this specific entity
      const userEntityId = req.user[`${entityType}_id` as keyof UserDetails] as number;

      if (userEntityId && userEntityId !== entityId) {
        throw new AuthorizationError(`Access denied to this ${entityType}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Hierarchical admin level checking middleware
export const requireAdminLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Simplified admin level check - only national admin supported
      if (req.user.admin_level !== 'national') {
        throw new AuthorizationError(`Insufficient admin level. Only national admin is supported.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Geographic scope checking middleware
export const requireGeographicAccess = (requiredScope: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const targetLocationCode = req.params.locationCode || req.body.location_code || req.query.location_code;

      // No geographic restrictions for national admin
      if (req.user.admin_level !== 'national') {
        throw new AuthorizationError(`Geographic access denied. Only national admin is supported.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// General user management permission checking (for listing, creating, etc.)
export const requireUserManagementAccess = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // User management check - national and provincial admin can manage users
      const allowedLevels = ['national', 'province'];
      if (!allowedLevels.includes(req.user.admin_level || '') && req.user.role_name !== 'super_admin') {
        throw new AuthorizationError('User management is restricted to National and Provincial Admin users only');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Specific user management permission checking (for operations on specific users)
export const requireUserManagementPermission = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const targetUserId = parseInt(req.params.userId || req.body.user_id);

      if (!targetUserId) {
        throw new AuthorizationError('Target user ID required');
      }

      // User management check - national and provincial admin can manage users
      const allowedLevels = ['national', 'province'];
      if (!allowedLevels.includes(req.user.admin_level || '') && req.user.role_name !== 'super_admin') {
        throw new AuthorizationError('User management is restricted to National and Provincial Admin users only');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Geographic data filtering middleware - supports province and municipality levels
export const applyGeographicFilter = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Debug logging
    console.log('🔍 applyGeographicFilter called for user:', {
      id: req.user.id,
      email: req.user.email,
      admin_level: req.user.admin_level,
      province_code: (req.user as any).province_code,
      role_name: req.user.role_name
    });

    // Skip filtering for national admin and super admin
    if (req.user.admin_level === 'national' || req.user.role_name === 'super_admin') {
      console.log('🔍 Skipping filtering for national/super admin');
      return next();
    }

    // Apply province filtering for provincial admin
    if (req.user.admin_level === 'province' && (req.user as any).province_code) {
      // Add province filter to query parameters
      req.query.province_code = (req.user as any).province_code;

      // Log province-based access for audit
      console.log(`🔒 Province filter applied: User ${req.user.email} accessing data for province ${(req.user as any).province_code}`);

      // Add province context to request for use in queries
      (req as any).provinceContext = {
        province_code: (req.user as any).province_code,
        district_code: (req.user as any).district_code,
        municipal_code: (req.user as any).municipal_code,
        ward_code: (req.user as any).ward_code
      };

      console.log('🔍 Province context set:', (req as any).provinceContext);
    } else if (req.user.admin_level === 'province') {
      // Provincial admin without province assignment - deny access
      console.log('❌ Provincial admin without province assignment');
      throw new AuthorizationError('Provincial admin user has no assigned province');
    }

    // Apply municipality filtering for municipality admin
    if (req.user.admin_level === 'municipality' && (req.user as any).municipal_code) {
      // Add municipality filter to query parameters
      req.query.municipality_code = (req.user as any).municipal_code;

      // Also add province and district filters for complete geographic context
      if ((req.user as any).province_code) {
        req.query.province_code = (req.user as any).province_code;
      }
      if ((req.user as any).district_code) {
        req.query.district_code = (req.user as any).district_code;
      }

      // Log municipality-based access for audit
      console.log(`🔒 Municipality filter applied: User ${req.user.email} accessing data for municipality ${(req.user as any).municipal_code}`);

      // Add municipality context to request for use in queries
      (req as any).municipalityContext = {
        province_code: (req.user as any).province_code,
        district_code: (req.user as any).district_code,
        municipal_code: (req.user as any).municipal_code,
        ward_code: (req.user as any).ward_code
      };
    } else if (req.user.admin_level === 'municipality') {
      // Municipality admin without municipality assignment - deny access
      throw new AuthorizationError('Municipality admin user has no assigned municipality');
    }

    // Apply ward filtering for ward admin
    if (req.user.admin_level === 'ward' && (req.user as any).ward_code) {
      // Add ward filter to query parameters
      req.query.ward_code = (req.user as any).ward_code;

      // Also add province, district, and municipality filters for complete geographic context
      if ((req.user as any).province_code) {
        req.query.province_code = (req.user as any).province_code;
      }
      if ((req.user as any).district_code) {
        req.query.district_code = (req.user as any).district_code;
      }
      if ((req.user as any).municipal_code) {
        req.query.municipality_code = (req.user as any).municipal_code;
      }

      // Log ward-based access for audit
      console.log(`🔒 Ward filter applied: User ${req.user.email} accessing data for ward ${(req.user as any).ward_code}`);

      // Add ward context to request for use in queries
      (req as any).wardContext = {
        province_code: (req.user as any).province_code,
        district_code: (req.user as any).district_code,
        municipal_code: (req.user as any).municipal_code,
        ward_code: (req.user as any).ward_code
      };

      console.log('🔍 Ward context set:', (req as any).wardContext);
    } else if (req.user.admin_level === 'ward') {
      // Ward admin without ward assignment - deny access
      console.log('❌ Ward admin without ward assignment');
      throw new AuthorizationError('Ward admin user has no assigned ward');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Legacy alias for backward compatibility
export const applyProvinceFilter = applyGeographicFilter;

// Enhanced permission middleware with geographic context (province/municipality)
export const requirePermissionWithGeographicFilter = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // First check basic permission
      await new Promise<void>((resolve, reject) => {
        requirePermission(permissionName)(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Then apply geographic filtering (province or municipality)
      applyGeographicFilter(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// Legacy alias for backward compatibility
export const requirePermissionWithProvinceFilter = requirePermissionWithGeographicFilter;

// SMS Communication restriction middleware - National Admin only
export const requireSMSPermission = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }


      if (req.user.admin_level !== 'national' && req.user.role_name !== 'super_admin') {
        throw new AuthorizationError('SMS communication is restricted to National Admin users only');
      }

      console.log(`🔒 SMS Permission granted: User ${req.user.email} (${req.user.admin_level}) accessing SMS features`);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// National Admin Only restriction middleware - For sensitive features
export const requireNationalAdminOnly = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Only National Admin and Super Admin can access
      if (req.user.admin_level !== 'national' && req.user.role_name !== 'super_admin') {
        throw new AuthorizationError('This feature is restricted to National Admin users only');
      }

      console.log(`🔒 National Admin Permission granted: User ${req.user.email} (${req.user.admin_level}) accessing national-only features`);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Election Management restriction middleware - National Admin only (updated from National and Provincial)
export const requireElectionManagementPermission = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Only National Admin and Super Admin can access election management
      if (req.user.admin_level !== 'national' && req.user.role_name !== 'super_admin') {
        throw new AuthorizationError('Election management is restricted to National Admin users only');
      }

      console.log(`🔒 Election Management Permission granted: User ${req.user.email} (${req.user.admin_level}) accessing election features`);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Leadership Management restriction middleware - National and Provincial Admin only (except meetings)
export const requireLeadershipManagementPermission = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Only National Admin, Provincial Admin, and Super Admin can manage leadership
      const allowedLevels = ['national', 'province'];
      if (!allowedLevels.includes(req.user.admin_level || '') && req.user.role_name !== 'super_admin') {
        throw new AuthorizationError('Leadership management is restricted to National and Provincial Admin users only');
      }

      console.log(`🔒 Leadership Management Permission granted: User ${req.user.email} (${req.user.admin_level}) accessing leadership management features`);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// War Council Structure Management restriction middleware - National Admin only
export const requireWarCouncilManagementPermission = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Only National Admin and Super Admin can manage War Council Structure
      // This is more restrictive than general leadership management
      const allowedLevels = ['national'];
      if (!allowedLevels.includes(req.user.admin_level || '') && req.user.role_name !== 'super_admin') {
        throw new AuthorizationError('War Council Structure management is restricted to National Admin users only');
      }

      console.log(`🔒 War Council Management Permission granted: User ${req.user.email} (${req.user.admin_level}) accessing War Council Structure features`);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Enhanced role-based permission checker
export const requireSpecificPermissions = (permissions: string[], requireAll: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Super admin has all permissions
      if (req.user.role_name === 'super_admin') {
        return next();
      }

      const userPermissions: boolean[] = [];

      // Check each permission
      for (const permission of permissions) {
        const hasPermission = await RoleModel.userHasPermission(req.user.id, permission);
        userPermissions.push(hasPermission);
      }

      // Determine if user has required permissions
      const hasRequiredPermissions = requireAll
        ? userPermissions.every(p => p)
        : userPermissions.some(p => p);

      if (!hasRequiredPermissions) {
        const permissionType = requireAll ? 'all' : 'any';
        throw new AuthorizationError(`User requires ${permissionType} of the following permissions: ${permissions.join(', ')}`);
      }

      console.log(`🔒 Specific permissions granted: User ${req.user.email} has required permissions`);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate province access for specific operations
export const validateProvinceAccess = (targetProvinceCode: string, req: Request): boolean => {
  if (!req.user) {
    return false;
  }

  // National admin and super admin have access to all provinces
  if (req.user.admin_level === 'national' || req.user.role_name === 'super_admin') {
    return true;
  }

  // Provincial admin can only access their assigned province
  if (req.user.admin_level === 'province') {
    return (req.user as any).province_code === targetProvinceCode;
  }

  return false;
};

// Audit logging for province-based access attempts
export const logProvinceAccess = async (req: Request, action: string, targetProvince?: string): Promise<void> => {
  try {
    const logEntry = {
      user_id: req.user?.id,
      user_email: req.user?.email,
      admin_level: req.user?.admin_level,
      user_province: (req.user as any)?.province_code,
      action,
      target_province: targetProvince,
      endpoint: `${req.method} ${req.path}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    console.log('🔍 Province Access Log:', JSON.stringify(logEntry, null, 2));

    // In a production environment, you would save this to a dedicated audit log table
    // await executeQuery('INSERT INTO province_access_logs SET ?', [logEntry]);
  } catch (error) {
    console.error('Failed to log province access:', error);
  }
};
