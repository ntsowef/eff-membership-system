import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * Upload Rate Limiting Middleware
 * 
 * Provides multiple layers of rate limiting for file uploads:
 * 1. Per-user upload frequency limits
 * 2. Per-user concurrent upload limits
 * 3. System-wide concurrent upload limits
 */

// Track concurrent uploads per user
const concurrentUploads = new Map<number, number>();

// Track system-wide concurrent uploads
let systemConcurrentUploads = 0;

/**
 * Rate limiter for upload frequency
 * Limits: 5 uploads per 15 minutes per user
 */
export const uploadFrequencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.UPLOAD_FREQUENCY_LIMIT || '5', 10), // Max 5 uploads per window
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP address
    const userId = (req as any).user?.id;
    return userId ? `user-${userId}` : `ip-${req.ip}`;
  },
  message: {
    success: false,
    error: 'Too many uploads. Please wait before uploading again.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for super admins
  skip: (req: Request) => {
    const userRole = (req as any).user?.role;
    return userRole === 'super_admin';
  }
});

/**
 * Middleware to limit concurrent uploads per user
 * Limits: 2 concurrent uploads per user
 */
export const concurrentUploadLimiter = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role;

  // Skip for super admins
  if (userRole === 'super_admin') {
    return next();
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_UPLOADS_PER_USER || '2', 10);
  const current = concurrentUploads.get(userId) || 0;

  if (current >= maxConcurrent) {
    return res.status(429).json({
      success: false,
      error: `You already have ${current} upload(s) in progress. Please wait for them to complete.`,
      code: 'CONCURRENT_UPLOAD_LIMIT_EXCEEDED',
      currentUploads: current,
      maxAllowed: maxConcurrent
    });
  }

  // Increment concurrent upload count
  concurrentUploads.set(userId, current + 1);
  systemConcurrentUploads++;

  console.log(`📊 User ${userId} concurrent uploads: ${current + 1}/${maxConcurrent}`);
  console.log(`📊 System concurrent uploads: ${systemConcurrentUploads}`);

  // Decrement on response finish
  res.on('finish', () => {
    const newCount = (concurrentUploads.get(userId) || 1) - 1;
    if (newCount <= 0) {
      concurrentUploads.delete(userId);
    } else {
      concurrentUploads.set(userId, newCount);
    }
    systemConcurrentUploads = Math.max(0, systemConcurrentUploads - 1);
    
    console.log(`📊 User ${userId} concurrent uploads decreased: ${newCount}/${maxConcurrent}`);
    console.log(`📊 System concurrent uploads: ${systemConcurrentUploads}`);
  });

  next();
};

/**
 * Middleware to limit system-wide concurrent uploads
 * Limits: 20 concurrent uploads across all users
 */
export const systemConcurrentUploadLimiter = (req: Request, res: Response, next: NextFunction) => {
  const maxSystemConcurrent = parseInt(process.env.MAX_SYSTEM_CONCURRENT_UPLOADS || '20', 10);

  if (systemConcurrentUploads >= maxSystemConcurrent) {
    return res.status(503).json({
      success: false,
      error: 'System is currently processing maximum number of uploads. Please try again in a few minutes.',
      code: 'SYSTEM_OVERLOADED',
      currentUploads: systemConcurrentUploads,
      maxAllowed: maxSystemConcurrent
    });
  }

  next();
};

/**
 * Get current upload statistics
 */
export const getUploadStats = () => {
  const userStats = Array.from(concurrentUploads.entries()).map(([userId, count]) => ({
    userId,
    concurrentUploads: count
  }));

  return {
    systemConcurrentUploads,
    maxSystemConcurrent: parseInt(process.env.MAX_SYSTEM_CONCURRENT_UPLOADS || '20', 10),
    userConcurrentUploads: userStats,
    totalUsers: userStats.length
  };
};

/**
 * Reset upload counters (for testing/debugging)
 */
export const resetUploadCounters = () => {
  concurrentUploads.clear();
  systemConcurrentUploads = 0;
  console.log('🔄 Upload counters reset');
};

