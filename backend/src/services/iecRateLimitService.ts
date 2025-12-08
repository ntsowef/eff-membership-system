/**
 * IEC API Rate Limit Service
 * 
 * Tracks IEC API requests across all concurrent uploads to ensure we don't exceed
 * the 10,000 requests per hour limit.
 * 
 * Uses Redis for distributed rate limiting across multiple processes.
 */

import { redisService } from './redisService';

const IEC_RATE_LIMIT_KEY = 'iec_api:rate_limit';
const IEC_RATE_LIMIT_HOUR_KEY = 'iec_api:rate_limit:hour';
const IEC_MAX_REQUESTS_PER_HOUR = 10000;
const IEC_WARNING_THRESHOLD = 9000; // Warn at 90%
const ONE_HOUR_IN_SECONDS = 3600;

export interface RateLimitStatus {
  current_count: number;
  max_limit: number;
  remaining: number;
  reset_time: number; // Unix timestamp
  is_limited: boolean;
  is_warning: boolean;
  percentage_used: number;
}

export class IECRateLimitService {
  /**
   * Increment the request counter and check if rate limit is exceeded
   * @returns RateLimitStatus
   */
  static async incrementAndCheck(): Promise<RateLimitStatus> {
    try {
      // Get current hour key (e.g., "2025-11-24:15" for 3 PM)
      const currentHourKey = this.getCurrentHourKey();
      const fullKey = `${IEC_RATE_LIMIT_KEY}:${currentHourKey}`;

      // Increment counter
      const currentCount = await redisService.incr(fullKey);

      // Set expiry on first request of the hour
      if (currentCount === 1) {
        await redisService.expire(fullKey, ONE_HOUR_IN_SECONDS);
      }

      // Get TTL to calculate reset time
      const ttl = await redisService.ttl(fullKey);
      const resetTime = Date.now() + (ttl * 1000);

      const remaining = Math.max(0, IEC_MAX_REQUESTS_PER_HOUR - currentCount);
      const percentageUsed = (currentCount / IEC_MAX_REQUESTS_PER_HOUR) * 100;

      return {
        current_count: currentCount,
        max_limit: IEC_MAX_REQUESTS_PER_HOUR,
        remaining,
        reset_time: resetTime,
        is_limited: currentCount >= IEC_MAX_REQUESTS_PER_HOUR,
        is_warning: currentCount >= IEC_WARNING_THRESHOLD && currentCount < IEC_MAX_REQUESTS_PER_HOUR,
        percentage_used: Math.round(percentageUsed * 10) / 10
      };
    } catch (error) {
      console.error('❌ Error checking IEC rate limit:', error);
      // If Redis fails, allow the request but log the error
      return {
        current_count: 0,
        max_limit: IEC_MAX_REQUESTS_PER_HOUR,
        remaining: IEC_MAX_REQUESTS_PER_HOUR,
        reset_time: Date.now() + ONE_HOUR_IN_SECONDS * 1000,
        is_limited: false,
        is_warning: false,
        percentage_used: 0
      };
    }
  }

  /**
   * Get current rate limit status without incrementing
   * Alias: checkStatus
   * @returns RateLimitStatus
   */
  static async getStatus(): Promise<RateLimitStatus> {
    try {
      const currentHourKey = this.getCurrentHourKey();
      const fullKey = `${IEC_RATE_LIMIT_KEY}:${currentHourKey}`;

      const currentCount = await redisService.get(fullKey);
      const count = currentCount ? parseInt(currentCount, 10) : 0;

      const ttl = await redisService.ttl(fullKey);
      const resetTime = ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + ONE_HOUR_IN_SECONDS * 1000;

      const remaining = Math.max(0, IEC_MAX_REQUESTS_PER_HOUR - count);
      const percentageUsed = (count / IEC_MAX_REQUESTS_PER_HOUR) * 100;

      return {
        current_count: count,
        max_limit: IEC_MAX_REQUESTS_PER_HOUR,
        remaining,
        reset_time: resetTime,
        is_limited: count >= IEC_MAX_REQUESTS_PER_HOUR,
        is_warning: count >= IEC_WARNING_THRESHOLD && count < IEC_MAX_REQUESTS_PER_HOUR,
        percentage_used: Math.round(percentageUsed * 10) / 10
      };
    } catch (error) {
      console.error('❌ Error getting IEC rate limit status:', error);
      return {
        current_count: 0,
        max_limit: IEC_MAX_REQUESTS_PER_HOUR,
        remaining: IEC_MAX_REQUESTS_PER_HOUR,
        reset_time: Date.now() + ONE_HOUR_IN_SECONDS * 1000,
        is_limited: false,
        is_warning: false,
        percentage_used: 0
      };
    }
  }

  /**
   * Alias for getStatus - Check current rate limit status without incrementing
   * @returns RateLimitStatus
   */
  static async checkStatus(): Promise<RateLimitStatus> {
    return this.getStatus();
  }

  /**
   * Reset the rate limit counter (for testing purposes)
   */
  static async reset(): Promise<void> {
    try {
      const currentHourKey = this.getCurrentHourKey();
      const fullKey = `${IEC_RATE_LIMIT_KEY}:${currentHourKey}`;
      await redisService.del(fullKey);
      console.log('✅ IEC rate limit counter reset');
    } catch (error) {
      console.error('❌ Error resetting IEC rate limit:', error);
    }
  }

  /**
   * Get current hour key in format "YYYY-MM-DD:HH"
   */
  private static getCurrentHourKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    return `${year}-${month}-${day}:${hour}`;
  }

  /**
   * Format reset time as human-readable string
   */
  static formatResetTime(resetTime: number): string {
    const now = Date.now();
    const diff = resetTime - now;
    
    if (diff <= 0) {
      return 'now';
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

