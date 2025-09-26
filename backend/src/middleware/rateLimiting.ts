import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
}

// Request queue for handling high load
class RequestQueue {
  private queue: Array<{
    req: Request;
    res: Response;
    next: NextFunction;
    timestamp: number;
  }> = [];
  private processing = false;
  private maxQueueSize: number;
  private processingConcurrency: number;
  private currentProcessing = 0;

  constructor(maxQueueSize = 1000, processingConcurrency = 50) {
    this.maxQueueSize = maxQueueSize;
    this.processingConcurrency = processingConcurrency;
  }

  async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      res.status(503).json({
        success: false,
        error: {
          code: 'QUEUE_FULL',
          message: 'Server is currently overloaded. Please try again later.',
          retryAfter: 30
        }
      });
      return;
    }

    // Add to queue
    this.queue.push({
      req,
      res,
      next,
      timestamp: Date.now()
    });

    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0 && this.currentProcessing < this.processingConcurrency) {
      const item = this.queue.shift();
      if (!item) continue;

      // Check if request has timed out (30 seconds)
      if (Date.now() - item.timestamp > 30000) {
        item.res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out while in queue'
          }
        });
        continue;
      }

      this.currentProcessing++;
      
      // Process request
      setImmediate(() => {
        try {
          item.next();
        } catch (error) {
          console.error('Error processing queued request:', error);
          if (!item.res.headersSent) {
            item.res.status(500).json({
              success: false,
              error: {
                code: 'PROCESSING_ERROR',
                message: 'Error processing request'
              }
            });
          }
        } finally {
          this.currentProcessing--;
        }
      });
    }

    // Continue processing if there are more items
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 10);
    } else {
      this.processing = false;
    }
  }

  getStats(): {
    queueLength: number;
    currentProcessing: number;
    maxQueueSize: number;
    processingConcurrency: number;
  } {
    return {
      queueLength: this.queue.length,
      currentProcessing: this.currentProcessing,
      maxQueueSize: this.maxQueueSize,
      processingConcurrency: this.processingConcurrency
    };
  }
}

// Global request queue instance
const globalRequestQueue = new RequestQueue(2000, 100); // Increased for high load

// Rate limiter class
class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => req.ip || 'unknown',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later',
      statusCode: 429,
      ...config
    };
  }

  async middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = `rate_limit:${this.config.keyGenerator!(req)}`;
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Get current request count
      const requestsData: { count: number; resetTime: number } =
        await cacheService.get(key) || { count: 0, resetTime: now + this.config.windowMs };

      // Reset if window has expired
      if (now > requestsData.resetTime) {
        requestsData.count = 0;
        requestsData.resetTime = now + this.config.windowMs;
      }

      // Check if limit exceeded
      if (requestsData.count >= this.config.maxRequests) {
        const retryAfter = Math.ceil((requestsData.resetTime - now) / 1000);
        
        if (!res.headersSent) {
          res.set({
            'X-RateLimit-Limit': this.config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(requestsData.resetTime).toISOString(),
            'Retry-After': retryAfter.toString()
          });
        }

        res.status(this.config.statusCode!).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: this.config.message,
            retryAfter
          }
        });
        return;
      }

      // Increment counter
      requestsData.count++;
      await cacheService.set(key, requestsData, Math.ceil(this.config.windowMs / 1000));

      // Set rate limit headers
      if (!res.headersSent) {
        res.set({
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': (this.config.maxRequests - requestsData.count).toString(),
          'X-RateLimit-Reset': new Date(requestsData.resetTime).toISOString()
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if cache fails
      next();
    }
  }
}

// Predefined rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiting
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes per IP
  }),

  // Member lookup rate limiting (more restrictive)
  memberLookup: new RateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute per IP
  }),

  // Card generation rate limiting (most restrictive)
  cardGeneration: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 card generations per 5 minutes per IP
  }),

  // Bulk operations rate limiting
  bulkOperations: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 bulk operations per hour per IP
  })
};

// Request queuing middleware for high load scenarios
export const requestQueueMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check current system load
  const queueStats = globalRequestQueue.getStats();
  
  // If system is under heavy load, queue the request
  if (queueStats.currentProcessing >= queueStats.processingConcurrency * 0.8) {
    globalRequestQueue.add(req, res, next);
  } else {
    next();
  }
};

// Circuit breaker for database operations
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;

  constructor(failureThreshold = 5, recoveryTimeout = 30000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breaker for database operations
export const databaseCircuitBreaker = new CircuitBreaker(10, 60000); // 10 failures, 1 minute recovery

// Performance monitoring middleware
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Monitor response time
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      console.warn(`Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    // Set performance headers only if response hasn't been sent
    if (!res.headersSent) {
      res.set('X-Response-Time', `${responseTime}ms`);
    }
  });
  
  next();
};

// Health check middleware
export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/health') {
    const queueStats = globalRequestQueue.getStats();
    const circuitBreakerState = databaseCircuitBreaker.getState();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      queue: queueStats,
      circuitBreaker: circuitBreakerState,
      cache: {
        available: cacheService.isAvailable()
      }
    };
    
    // Determine overall health status
    if (queueStats.queueLength > queueStats.maxQueueSize * 0.8 || 
        circuitBreakerState.state === 'OPEN') {
      health.status = 'degraded';
    }
    
    res.json(health);
    return;
  }
  
  next();
};

// Export middleware functions
export const applyRateLimit = (limiter: RateLimiter) => limiter.middleware.bind(limiter);
export { globalRequestQueue, CircuitBreaker };
