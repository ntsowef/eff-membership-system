import Redis from 'ioredis';
import { config } from '../config/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    const redisConfig: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'membership:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };

    this.client = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready for operations');
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('⚠️  Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  public async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Failed to disconnect from Redis:', error);
    }
  }

  public getClient(): Redis {
    return this.client;
  }

  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  // Session management methods
  public async setSession(sessionId: string, sessionData: any, ttlSeconds: number = 86400): Promise<void> {
    try {
      const key = 'session:' + sessionId + '';
      await this.client.setex(key, ttlSeconds, JSON.stringify(sessionData));
    } catch (error) {
      console.error('❌ Failed to set session in Redis:', error);
      throw error;
    }
  }

  public async getSession(sessionId: string): Promise<any | null> {
    try {
      const key = 'session:' + sessionId + '';
      const sessionData = await this.client.get(key);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('❌ Failed to get session from Redis:', error);
      return null;
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = 'session:' + sessionId + '';
      await this.client.del(key);
    } catch (error) {
      console.error('❌ Failed to delete session from Redis:', error);
    }
  }

  public async refreshSession(sessionId: string, ttlSeconds: number = 86400): Promise<boolean> {
    try {
      const key = 'session:' + sessionId + '';
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error('❌ Failed to refresh session in Redis:', error);
      return false;
    }
  }

  public async getUserSessions(userId: number): Promise<string[]> {
    try {
      const pattern = `session:*`;
      const keys = await this.client.keys(pattern);
      const userSessions: string[] = [];

      for (const key of keys) {
        const sessionData = await this.client.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.userId === userId) {
            userSessions.push(key.replace('session:', ''));
          }
        }
      }

      return userSessions;
    } catch (error) {
      console.error('❌ Failed to get user sessions from Redis:', error);
      return [];
    }
  }

  public async deleteUserSessions(userId: number): Promise<number> {
    try {
      const userSessions = await this.getUserSessions(userId);
      if (userSessions.length === 0) {
        return 0;
      }

      const keys = userSessions.map(sessionId => 'session:' + sessionId + '');
      return await this.client.del(...keys);
    } catch (error) {
      console.error('❌ Failed to delete user sessions from Redis:', error);
      return 0;
    }
  }

  // Cache management methods
  public async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('❌ Failed to set cache in Redis:', error);
      throw error;
    }
  }

  public async get(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Failed to get cache from Redis:', error);
      return null;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('❌ Failed to delete cache from Redis:', error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Failed to check cache existence in Redis:', error);
      return false;
    }
  }

  public async flushAll(): Promise<void> {
    try {
      await this.client.flushall();
    } catch (error) {
      console.error('❌ Failed to flush Redis cache:', error);
      throw error;
    }
  }

  // Statistics and monitoring
  public async getStats(): Promise<any> {
    try {
      const info = await this.client.info();
      const keyCount = await this.client.dbsize();
      
      return {
        connected: this.isConnected,
        keyCount,
        info: this.parseRedisInfo(info)
      };
    } catch (error) {
      console.error('❌ Failed to get Redis stats:', error);
      return {
        connected: false,
        keyCount: 0,
        info: {}
      };
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  // Redis Hash operations
  public async hset(key: string, field: string | object, value?: any): Promise<void> {
    try {
      if (typeof field === 'object') {
        // Set multiple fields - ensure all values are properly serialized
        const serializedFields: Record<string, string> = {};
        for (const [k, v] of Object.entries(field)) {
          serializedFields[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
        await this.client.hset(key, serializedFields);
      } else {
        // Set single field
        await this.client.hset(key, field, JSON.stringify(value));
      }
    } catch (error) {
      console.error('❌ Failed to set hash in Redis:', error);
      throw error;
    }
  }

  public async hget(key: string, field: string): Promise<any | null> {
    try {
      const value = await this.client.hget(key, field);
      if (!value) return null;

      // Try to parse as JSON, if it fails return as string
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not JSON
      }
    } catch (error) {
      console.error('❌ Failed to get hash from Redis:', error);
      return null;
    }
  }

  public async hgetall(key: string): Promise<any> {
    try {
      const hash = await this.client.hgetall(key);
      const result: any = {};

      // Parse JSON values
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value; // Keep as string if not JSON
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to get all hash from Redis:', error);
      return {};
    }
  }

  // Redis List operations
  public async lpush(key: string, value: any): Promise<number> {
    try {
      return await this.client.lpush(key, JSON.stringify(value));
    } catch (error) {
      console.error('❌ Failed to push to list in Redis:', error);
      throw error;
    }
  }

  public async brpop(key: string, timeout: number): Promise<[string, string] | null> {
    try {
      const result = await this.client.brpop(key, timeout);
      return result;
    } catch (error) {
      console.error('❌ Failed to pop from list in Redis:', error);
      return null;
    }
  }

  public async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      console.error('❌ Failed to get list length from Redis:', error);
      return 0;
    }
  }

  // Redis Key operations
  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('❌ Failed to get keys from Redis:', error);
      return [];
    }
  }

  // Connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Health check
  public async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();
