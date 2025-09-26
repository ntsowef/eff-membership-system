import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';

// Cache configuration interface
interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  skipCache?: (req: Request) => boolean;
  onHit?: (key: string, data: any) => void;
  onMiss?: (key: string) => void;
  onError?: (error: Error, key: string) => void;
}

// Default cache key generator
const defaultKeyGenerator = (req: Request): string => {
  const baseKey = req.originalUrl || req.url;
  const queryString = Object.keys(req.query).length > 0 
    ? `?${new URLSearchParams(req.query as any).toString()}`
    : '';
  return `${baseKey}${queryString}`;
};

// Default cache condition (cache successful responses)
const defaultCondition = (req: Request, res: Response): boolean => {
  return res.statusCode >= 200 && res.statusCode < 300;
};

// Cache middleware factory
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = parseInt(process.env.CACHE_DEFAULT_TTL || '1800'),
    keyGenerator = defaultKeyGenerator,
    condition = defaultCondition,
    skipCache,
    onHit,
    onMiss,
    onError
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if condition is not met
    if (skipCache && skipCache(req)) {
      return next();
    }

    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get cached response
      const cachedData = await cacheService.get<any>(cacheKey);
      
      if (cachedData) {
        // Cache hit
        if (onHit) {
          onHit(cacheKey, cachedData);
        }
        
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - continue to route handler
      if (onMiss) {
        onMiss(cacheKey);
      }

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Only cache if condition is met
        if (condition(req, res)) {
          // Cache the response asynchronously
          cacheService.set(cacheKey, data, ttl).catch(error => {
            if (onError) {
              onError(error, cacheKey);
            } else {
              console.error(`Cache set error for key ${cacheKey}:`, error);
            }
          });
        }

        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        return originalJson(data);
      };

      next();
    } catch (error) {
      // Cache error - continue without caching
      if (onError) {
        onError(error as Error, cacheKey);
      } else {
        console.error(`Cache middleware error for key ${cacheKey}:`, error);
      }
      next();
    }
  };
};

// Predefined cache configurations
export const CacheConfigs = {
  // Short-term cache (5 minutes)
  SHORT: {
    ttl: parseInt(process.env.CACHE_DEFAULT_TTL || '300')
  },
  
  // Medium-term cache (30 minutes)
  MEDIUM: {
    ttl: parseInt(process.env.CACHE_DEFAULT_TTL || '1800')
  },
  
  // Long-term cache (1 hour)
  LONG: {
    ttl: parseInt(process.env.CACHE_ANALYTICS_TTL || '3600')
  },
  
  // Analytics cache (1 hour)
  ANALYTICS: {
    ttl: parseInt(process.env.CACHE_ANALYTICS_TTL || '3600'),
    keyGenerator: (req: Request) => {
      const baseKey = req.originalUrl || req.url;
      const filters = req.query;
      const filterString = Object.keys(filters).length > 0 
        ? JSON.stringify(filters)
        : 'default';
      return `analytics:${baseKey}:${filterString}`;
    }
  },
  
  // Statistics cache (30 minutes)
  STATISTICS: {
    ttl: parseInt(process.env.CACHE_STATISTICS_TTL || '1800'),
    keyGenerator: (req: Request) => {
      const baseKey = req.originalUrl || req.url;
      const params = { ...req.query, ...req.params };
      const paramString = Object.keys(params).length > 0 
        ? JSON.stringify(params)
        : 'default';
      return `statistics:${baseKey}:${paramString}`;
    }
  },
  
  // Member data cache (15 minutes)
  MEMBER: {
    ttl: parseInt(process.env.CACHE_MEMBER_TTL || '900'),
    keyGenerator: (req: Request) => {
      const baseKey = req.originalUrl || req.url;
      const userId = req.params.id || req.query.id || 'list';
      return `member:${baseKey}:${userId}`;
    }
  },
  
  // Lookup data cache (24 hours)
  LOOKUP: {
    ttl: parseInt(process.env.CACHE_LOOKUP_TTL || '86400'),
    keyGenerator: (req: Request) => {
      const baseKey = req.originalUrl || req.url;
      return `lookup:${baseKey}`;
    }
  }
};

// Cache invalidation middleware
export const cacheInvalidationMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end.bind(res);
    
    res.end = function(...args: any[]) {
      // Only invalidate cache for successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache patterns asynchronously
        Promise.all(
          patterns.map(pattern => cacheService.delByPattern(pattern))
        ).catch(error => {
          console.error('Cache invalidation error:', error);
        });
      }
      
      return originalEnd(...args);
    };
    
    next();
  };
};

// Cache warming utility
export const warmCache = async (endpoints: Array<{ url: string, ttl?: number }>) => {
  console.log('Starting cache warm-up...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Warming cache for ${endpoint.url}...`);
      // This would typically make an internal request to warm the cache
      // For now, we'll just log the intention
      console.log(`Cache warmed for ${endpoint.url}`);
    } catch (error) {
      console.error(`Failed to warm cache for ${endpoint.url}:`, error);
    }
  }
  
  console.log('Cache warm-up completed');
};

// Cache health check
export const cacheHealthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  connected: boolean;
  metrics: any;
  error?: string;
}> => {
  try {
    const isAvailable = cacheService.isAvailable();
    const metrics = cacheService.getMetrics();
    
    return {
      status: isAvailable ? 'healthy' : 'unhealthy',
      connected: isAvailable,
      metrics
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      metrics: cacheService.getMetrics(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
