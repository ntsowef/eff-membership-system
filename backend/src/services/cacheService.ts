import Redis from 'ioredis';
import { createDatabaseError } from '../middleware/errorHandler';

// Cache configuration
interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  connectionTimeout: number;
  commandTimeout: number;
  enabled: boolean;
}

// Cache metrics interface
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalOperations: number;
  hitRate: number;
}

// Cache key patterns
export const CacheKeys = {
  MEMBER: (id: number) => `member:${id}`,
  MEMBER_LIST: (filters: string) => `members:list:${filters}`,
  MEMBER_COUNT: (filters: string) => `members:count:${filters}`,
  MEETING: (id: number) => `meeting:${id}`,
  MEETING_LIST: (filters: string) => `meetings:list:${filters}`,
  LEADERSHIP: (id: number) => `leadership:${id}`,
  LEADERSHIP_STRUCTURE: (level: string, entityId: number) => `leadership:structure:${level}:${entityId}`,
  ANALYTICS_DASHBOARD: (filters: string) => `analytics:dashboard:${filters}`,
  ANALYTICS_MEMBERSHIP: (filters: string) => `analytics:membership:${filters}`,
  ANALYTICS_MEETINGS: (filters: string) => `analytics:meetings:${filters}`,
  ANALYTICS_LEADERSHIP: (filters: string) => `analytics:leadership:${filters}`,
  USER_PERMISSIONS: (userId: number) => `user:permissions:${userId}`,
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  BULK_OPERATION: (id: number) => `bulk_operation:${id}`,
  NOTIFICATION_QUEUE: () => 'notifications:queue',
  RATE_LIMIT: (key: string) => `rate_limit:${key}`,
  SEARCH_RESULTS: (query: string, filters: string) => `search:${query}:${filters}`
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  PERMANENT: -1     // No expiration
};

class CacheService {
  private redis?: Redis;
  private config: CacheConfig;
  private isConnected: boolean = false;
  private metrics: CacheMetrics;

  constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'membership:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '1800'),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
      connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '5000'),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
      enabled: process.env.CACHE_ENABLED !== 'false'
    };

    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      hitRate: 0
    };

    // Only initialize Redis if caching is enabled
    if (this.config.enabled) {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetries,
        connectTimeout: this.config.connectionTimeout,
        commandTimeout: this.config.commandTimeout,
        lazyConnect: true,
        enableReadyCheck: true
      });

      this.setupEventHandlers();
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis ready for operations');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.isConnected = false;
      this.metrics.errors++;
    });

    this.redis.on('close', () => {
      console.log('⚠️ Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  // Initialize Redis connection
  async connect(): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      console.log('⚠️ Redis caching is disabled');
      return;
    }

    try {
      await this.redis.connect();
      console.log('✅ Redis cache service initialized');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      // Don't throw error - allow app to continue without cache
    }
  }

  // Disconnect from Redis
  async disconnect(): Promise<void> {
    if (!this.redis) return;

    try {
      this.redis.disconnect();
      console.log('✅ Redis disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
    }
  }

  // Check if cache is available
  isAvailable(): boolean {
    return this.config.enabled && this.isConnected && this.redis?.status === 'ready';
  }

  // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable() || !this.redis) {
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value === null) {
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }
      this.metrics.hits++;
      this.updateMetrics();
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return null;
    }
  }

  // Set value in cache
  async set(key: string, value: any, ttl: number = this.config.defaultTTL): Promise<boolean> {
    if (!this.isAvailable() || !this.redis) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
      this.metrics.sets++;
      this.updateMetrics();
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return false;
    }
  }

  // Delete key from cache
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable() || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      this.metrics.deletes++;
      this.updateMetrics();
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return false;
    }
  }

  // Delete multiple keys
  async delMany(keys: string[]): Promise<number> {
    if (!this.isAvailable() || !this.redis || keys.length === 0) {
      return 0;
    }

    try {
      const result = await this.redis.del(...keys);
      this.metrics.deletes += result;
      this.updateMetrics();
      return result;
    } catch (error) {
      console.error(`Cache delete many error:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return 0;
    }
  }

  // Delete keys by pattern
  async delByPattern(pattern: string): Promise<number> {
    if (!this.isAvailable() || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      const result = await this.redis.del(...keys);
      this.metrics.deletes += result;
      this.updateMetrics();
      return result;
    } catch (error) {
      console.error(`Cache delete by pattern error for pattern ${pattern}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable() || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return false;
    }
  }

  // Set expiration for key
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isAvailable() || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return false;
    }
  }

  // Get TTL for key
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable() || !this.redis) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return -1;
    }
  }

  // Increment counter
  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.isAvailable() || !this.redis) {
      return 0;
    }

    try {
      const result = await this.redis.incr(key);
      if (ttl && result === 1) {
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return 0;
    }
  }

  // Add to set
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isAvailable() || !this.redis) {
      return 0;
    }

    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      console.error(`Cache sadd error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return 0;
    }
  }

  // Check if member exists in set
  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.isAvailable() || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      console.error(`Cache sismember error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return false;
    }
  }

  // Get all members of set
  async smembers(key: string): Promise<string[]> {
    if (!this.isAvailable() || !this.redis) {
      return [];
    }

    try {
      return await this.redis.smembers(key);
    } catch (error) {
      console.error(`Cache smembers error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return [];
    }
  }

  // Push to list
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.isAvailable() || !this.redis) {
      return 0;
    }

    try {
      return await this.redis.lpush(key, ...values);
    } catch (error) {
      console.error(`Cache lpush error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return 0;
    }
  }

  // Pop from list
  async lpop(key: string): Promise<string | null> {
    if (!this.isAvailable() || !this.redis) {
      return null;
    }

    try {
      return await this.redis.lpop(key);
    } catch (error) {
      console.error(`Cache lpop error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return null;
    }
  }

  // Get list length
  async llen(key: string): Promise<number> {
    if (!this.isAvailable() || !this.redis) {
      return 0;
    }

    try {
      return await this.redis.llen(key);
    } catch (error) {
      console.error(`Cache llen error for key ${key}:`, error);
      this.metrics.errors++;
      this.updateMetrics();
      return 0;
    }
  }

  // Get cache info (legacy method name)
  async info(): Promise<any> {
    return this.getInfo();
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    if (!this.isAvailable() || !this.redis) {
      return {
        connected: false,
        keys: 0,
        memory: 0,
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        hitRate: this.metrics.hitRate
      };
    }

    try {
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');

      return {
        connected: true,
        status: this.redis.status,
        info: info,
        keyspace: keyspace,
        metrics: this.metrics
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      this.metrics.errors++;
      this.updateMetrics();
      return {
        connected: false,
        error: (error as Error).message,
        metrics: this.metrics
      };
    }
  }
  // Update metrics and calculate hit rate
  private updateMetrics(): void {
    this.metrics.totalOperations = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = this.metrics.totalOperations > 0
      ? (this.metrics.hits / this.metrics.totalOperations) * 100
      : 0;
  }

  // Get cache metrics
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      hitRate: 0
    };
  }

  // Get cache info
  async getInfo(): Promise<any> {
    if (!this.isAvailable() || !this.redis) {
      return null;
    }

    try {
      return await this.redis.info();
    } catch (error) {
      console.error('Cache info error:', error);
      return null;
    }
  }

  // Flush all cache
  async flushAll(): Promise<boolean> {
    if (!this.isAvailable() || !this.redis) {
      return false;
    }

    try {
      await this.redis.flushall();
      this.resetMetrics();
      return true;
    } catch (error) {
      console.error('Cache flush all error:', error);
      this.metrics.errors++;
      this.updateMetrics();
      return false;
    }
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Cache decorator for methods
export function Cached(cacheKey: string, ttl: number = CacheTTL.MEDIUM) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Try to get from cache first
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);

      // Cache the result
      await cacheService.set(cacheKey, result, ttl);

      return result;
    };
  };
}

export default cacheService;
