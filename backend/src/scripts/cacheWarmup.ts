import axios from 'axios';
import { cacheService } from '../services/cacheService';

// Cache warm-up configuration
interface WarmupEndpoint {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  data?: any;
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
  retries?: number;
}

// Critical endpoints to warm up
const WARMUP_ENDPOINTS: WarmupEndpoint[] = [
  // High priority - Core analytics
  {
    url: '/api/v1/analytics/dashboard',
    priority: 'high',
    timeout: 30000
  },
  {
    url: '/api/v1/analytics/comprehensive',
    priority: 'high',
    timeout: 45000
  },
  
  // High priority - System statistics
  {
    url: '/api/v1/statistics/system',
    priority: 'high',
    timeout: 20000
  },
  {
    url: '/api/v1/statistics/demographics',
    priority: 'high',
    timeout: 25000
  },
  
  // Medium priority - Membership analytics
  {
    url: '/api/v1/analytics/membership',
    priority: 'medium',
    timeout: 20000
  },
  {
    url: '/api/v1/analytics/meetings',
    priority: 'medium',
    timeout: 15000
  },
  {
    url: '/api/v1/analytics/leadership',
    priority: 'medium',
    timeout: 15000
  },
  
  // Medium priority - Statistics
  {
    url: '/api/v1/statistics/ward-membership',
    priority: 'medium',
    timeout: 20000
  },
  {
    url: '/api/v1/statistics/membership-trends',
    priority: 'medium',
    timeout: 15000
  },
  
  // Low priority - Lookup data
  {
    url: '/api/v1/lookups/provinces',
    priority: 'low',
    timeout: 10000
  },
  {
    url: '/api/v1/lookups/genders',
    priority: 'low',
    timeout: 5000
  },
  {
    url: '/api/v1/lookups/races',
    priority: 'low',
    timeout: 5000
  },
  {
    url: '/api/v1/lookups/languages',
    priority: 'low',
    timeout: 5000
  }
];

// Cache warm-up service
export class CacheWarmupService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  
  constructor(baseUrl: string = 'http://localhost:5000', headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'CacheWarmup/1.0',
      ...headers
    };
  }
  
  // Warm up a single endpoint
  async warmupEndpoint(endpoint: WarmupEndpoint): Promise<{
    success: boolean;
    url: string;
    responseTime: number;
    error?: string;
    cached?: boolean;
  }> {
    const startTime = Date.now();
    const fullUrl = `${this.baseUrl}${endpoint.url}`;
    
    try {
      console.log(`🔥 Warming up: ${endpoint.url}`);
      
      const response = await axios({
        method: endpoint.method || 'GET',
        url: fullUrl,
        headers: { ...this.defaultHeaders, ...endpoint.headers },
        data: endpoint.data,
        timeout: endpoint.timeout || 30000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses
      });
      
      const responseTime = Date.now() - startTime;
      const cached = response.headers['x-cache'] === 'HIT';
      
      console.log(`✅ Warmed up: ${endpoint.url} (${responseTime}ms)${cached ? ' [CACHED]' : ''}`);
      
      return {
        success: true,
        url: endpoint.url,
        responseTime,
        cached
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Failed to warm up: ${endpoint.url} (${responseTime}ms) - ${errorMessage}`);
      
      return {
        success: false,
        url: endpoint.url,
        responseTime,
        error: errorMessage
      };
    }
  }
  
  // Warm up multiple endpoints with retry logic
  async warmupEndpoints(endpoints: WarmupEndpoint[], options: {
    maxConcurrency?: number;
    retryFailures?: boolean;
    maxRetries?: number;
  } = {}): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      success: boolean;
      url: string;
      responseTime: number;
      error?: string;
      cached?: boolean;
    }>;
    duration: number;
  }> {
    const startTime = Date.now();
    const { maxConcurrency = 5, retryFailures = true, maxRetries = 2 } = options;
    
    console.log(`🚀 Starting cache warm-up for ${endpoints.length} endpoints...`);
    
    // Sort by priority
    const sortedEndpoints = [...endpoints].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    const results: Array<{
      success: boolean;
      url: string;
      responseTime: number;
      error?: string;
      cached?: boolean;
    }> = [];
    const failed: WarmupEndpoint[] = [];
    
    // Process endpoints in batches
    for (let i = 0; i < sortedEndpoints.length; i += maxConcurrency) {
      const batch = sortedEndpoints.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(endpoint => this.warmupEndpoint(endpoint));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Collect failed endpoints for retry
      if (retryFailures) {
        const failedEndpoints = batchResults
          .filter(result => !result.success)
          .map(result => sortedEndpoints.find(e => e.url === result.url))
          .filter((endpoint): endpoint is WarmupEndpoint => endpoint !== undefined);
        failed.push(...failedEndpoints);
      }
      
      // Small delay between batches to avoid overwhelming the server
      if (i + maxConcurrency < sortedEndpoints.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Retry failed endpoints
    if (retryFailures && failed.length > 0 && maxRetries > 0) {
      console.log(`🔄 Retrying ${failed.length} failed endpoints...`);
      
      for (let retry = 1; retry <= maxRetries; retry++) {
        const retryResults: typeof results = [];
        const stillFailed: WarmupEndpoint[] = [];

        for (const endpoint of failed) {
          if (endpoint) {
            const result = await this.warmupEndpoint(endpoint);
            retryResults.push(result);

            if (!result.success && retry < maxRetries) {
              stillFailed.push(endpoint);
            }
          }
        }

        // Update results
        retryResults.forEach(retryResult => {
          const originalIndex = results.findIndex(r => r.url === retryResult.url);
          if (originalIndex !== -1) {
            results[originalIndex] = retryResult;
          }
        });

        failed.length = 0;
        failed.push(...stillFailed);
        
        if (stillFailed.length === 0) break;
        
        // Delay before next retry
        if (retry < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log(`🏁 Cache warm-up completed in ${duration}ms`);
    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${failedCount}/${results.length}`);
    
    return {
      total: results.length,
      successful,
      failed: failedCount,
      results,
      duration
    };
  }
  
  // Warm up all critical endpoints
  async warmupCritical(): Promise<any> {
    const criticalEndpoints = WARMUP_ENDPOINTS.filter(e => e.priority === 'high');
    return this.warmupEndpoints(criticalEndpoints, { maxConcurrency: 3 });
  }
  
  // Warm up all endpoints
  async warmupAll(): Promise<any> {
    return this.warmupEndpoints(WARMUP_ENDPOINTS, { maxConcurrency: 5 });
  }
  
  // Warm up by priority
  async warmupByPriority(priority: 'high' | 'medium' | 'low'): Promise<any> {
    const filteredEndpoints = WARMUP_ENDPOINTS.filter(e => e.priority === priority);
    return this.warmupEndpoints(filteredEndpoints);
  }
  
  // Get cache status
  async getCacheStatus(): Promise<any> {
    try {
      const isAvailable = cacheService.isAvailable();
      const metrics = cacheService.getMetrics();
      const stats = await cacheService.getStats();
      
      return {
        available: isAvailable,
        metrics,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// CLI interface for cache warm-up
export const runCacheWarmup = async (options: {
  baseUrl?: string;
  priority?: 'high' | 'medium' | 'low' | 'all';
  headers?: Record<string, string>;
}) => {
  const { baseUrl, priority = 'all', headers } = options;
  
  const warmupService = new CacheWarmupService(baseUrl, headers);
  
  console.log('🔥 Cache Warm-up Service');
  console.log('========================');
  
  // Check cache status first
  const cacheStatus = await warmupService.getCacheStatus();
  console.log('Cache Status:', cacheStatus.available ? '✅ Available' : '❌ Unavailable');
  
  if (!cacheStatus.available) {
    console.warn('⚠️ Cache is not available, warm-up may not be effective');
  }
  
  let result: {
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      success: boolean;
      url: string;
      responseTime: number;
      error?: string;
      cached?: boolean;
    }>;
    duration: number;
  };

  switch (priority) {
    case 'high':
      result = await warmupService.warmupCritical();
      break;
    case 'medium':
    case 'low':
      result = await warmupService.warmupByPriority(priority);
      break;
    default:
      result = await warmupService.warmupAll();
  }
  
  return result;
};

// Export for use in other modules
export const cacheWarmupService = new CacheWarmupService();
