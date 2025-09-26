# Membership System Caching Strategy

## Overview

For our membership system, implementing an effective caching strategy is crucial to ensure fast response times, reduce database load, and provide a smooth user experience, especially for analytics dashboards that process large volumes of data. This document outlines our comprehensive caching approach across all system layers.

## 1. Database Layer Caching

### 1.1 Query Result Caching

- **Materialized Views**: For complex analytics queries that are computationally expensive
  ```sql
  CREATE MATERIALIZED VIEW mv_top_wards AS
  SELECT w.id, w.name, m.name as municipality, p.name as province,
         COUNT(mem.id) as members
  FROM wards w
  JOIN municipalities m ON w.municipality_id = m.id
  JOIN provinces p ON m.province_id = p.id
  JOIN members mem ON mem.ward_id = w.id
  GROUP BY w.id, w.name, m.name, p.name
  ORDER BY members DESC
  LIMIT 10;
  ```

- **Refresh Schedule**:
  - Nightly refresh for general analytics data
  - Hourly refresh for critical metrics (e.g., largest entities tracking)
  - Manual refresh option for administrators

### 1.2 Database Query Cache

- Enable MySQL query cache for frequently executed queries
- Configure appropriate cache size based on server resources:
  ```
  query_cache_type = 1
  query_cache_size = 64M
  query_cache_limit = 2M
  ```

## 2. Backend API Caching

### 2.1 Redis Cache Implementation

- **Setup**:
  ```javascript
  // cacheConfig.js
  const redis = require('redis');
  const client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  });
  
  module.exports = client;
  ```

- **Cache Middleware**:
  ```javascript
  // cacheMiddleware.js
  const redisClient = require('./cacheConfig');
  
  const cacheMiddleware = (duration) => {
    return (req, res, next) => {
      const key = `membership:${req.originalUrl}`;
      
      redisClient.get(key, (err, data) => {
        if (err) return next();
        
        if (data) {
          return res.status(200).json(JSON.parse(data));
        }
        
        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function(body) {
          redisClient.setex(key, duration, JSON.stringify(body));
          return originalJson.call(this, body);
        };
        
        next();
      });
    };
  };
  
  module.exports = cacheMiddleware;
  ```

### 2.2 Cache Implementation by Data Type

| Data Type | Cache Duration | Invalidation Trigger |
|-----------|----------------|----------------------|
| National Analytics | 24 hours | New member registration |
| Province Analytics | 12 hours | Province data update |
| Top Entities | 6 hours | Membership count changes |
| User Profile | 1 hour | Profile update |
| System Settings | 48 hours | Settings change |

### 2.3 Endpoint-Specific Caching

```javascript
// analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Cache durations in seconds
const CACHE_DURATIONS = {
  NATIONAL: 86400,    // 24 hours
  PROVINCE: 43200,    // 12 hours
  TOP_ENTITIES: 21600 // 6 hours
};

router.get('/national', cacheMiddleware(CACHE_DURATIONS.NATIONAL), analyticsController.getNationalAnalytics);
router.get('/province/:id', cacheMiddleware(CACHE_DURATIONS.PROVINCE), analyticsController.getProvinceAnalytics);
router.get('/top-wards', cacheMiddleware(CACHE_DURATIONS.TOP_ENTITIES), analyticsController.getTopWards);
router.get('/top-municipalities', cacheMiddleware(CACHE_DURATIONS.TOP_ENTITIES), analyticsController.getTopMunicipalities);
router.get('/top-regions', cacheMiddleware(CACHE_DURATIONS.TOP_ENTITIES), analyticsController.getTopRegions);

module.exports = router;
```

### 2.4 Cache Invalidation Strategy

- **Event-Based Invalidation**:
  ```javascript
  // memberController.js
  const redisClient = require('../config/cacheConfig');
  
  const updateMember = async (req, res) => {
    try {
      // Update member logic
      // ...
      
      // Invalidate related caches
      const keysToDelete = [
        `membership:/api/analytics/national`,
        `membership:/api/analytics/province/${member.province_id}`,
        `membership:/api/analytics/top-wards`,
        `membership:/api/analytics/top-municipalities`,
        `membership:/api/analytics/top-regions`
      ];
      
      keysToDelete.forEach(key => redisClient.del(key));
      
      return res.status(200).json({
        status: 'success',
        message: 'Member updated successfully',
        data: { member },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Error handling
    }
  };
  ```

- **Scheduled Invalidation**:
  ```javascript
  // cacheManager.js
  const cron = require('node-cron');
  const redisClient = require('./cacheConfig');
  
  // Clear analytics cache every night at 2 AM
  cron.schedule('0 2 * * *', () => {
    redisClient.keys('membership:/api/analytics/*', (err, keys) => {
      if (err) return console.error('Error fetching cache keys:', err);
      
      if (keys.length > 0) {
        redisClient.del(keys, (err) => {
          if (err) return console.error('Error clearing cache:', err);
          console.log(`Cleared ${keys.length} analytics cache entries`);
        });
      }
    });
  });
  ```

## 3. Frontend Caching

### 3.1 React Query Implementation

```typescript
// hooks/useAnalytics.ts
import { useQuery, useQueryClient } from 'react-query';
import { analyticsService } from '../services/analyticsService';

export const useTopWards = () => {
  return useQuery(
    'topWards', 
    analyticsService.getTopWards,
    {
      staleTime: 1000 * 60 * 60, // 1 hour
      cacheTime: 1000 * 60 * 60 * 2, // 2 hours
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Error fetching top wards:', error);
      }
    }
  );
};

export const useTopMunicipalities = () => {
  return useQuery(
    'topMunicipalities', 
    analyticsService.getTopMunicipalities,
    {
      staleTime: 1000 * 60 * 60, // 1 hour
      cacheTime: 1000 * 60 * 60 * 2, // 2 hours
      refetchOnWindowFocus: false
    }
  );
};

// Function to invalidate analytics cache
export const invalidateAnalyticsCache = () => {
  const queryClient = useQueryClient();
  queryClient.invalidateQueries('topWards');
  queryClient.invalidateQueries('topMunicipalities');
  queryClient.invalidateQueries('topRegions');
  queryClient.invalidateQueries('nationalAnalytics');
};
```

### 3.2 Local Storage for User Preferences

```typescript
// utils/localStorageCache.ts
export const storageKeys = {
  USER_PREFERENCES: 'membership-user-prefs',
  LAST_VIEWED_PROVINCE: 'membership-last-province',
  DASHBOARD_FILTERS: 'membership-dashboard-filters'
};

export const setStorageItem = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getStorageItem = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};
```

### 3.3 Service Worker for Asset Caching

```javascript
// public/service-worker.js
const CACHE_NAME = 'membership-system-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for static assets
  if (event.request.url.includes('/static/') || 
      event.request.url.includes('/favicon.ico') ||
      event.request.url.includes('/manifest.json')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});
```

## 4. Monitoring and Optimization

### 4.1 Cache Hit Rate Monitoring

```javascript
// middleware/cacheMetrics.js
const prometheus = require('prom-client');

const cacheHitCounter = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['endpoint']
});

const cacheMissCounter = new prometheus.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['endpoint']
});

const cacheMetricsMiddleware = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function() {
    const endpoint = req.path;
    const cacheHit = res.get('X-Cache') === 'HIT';
    
    if (cacheHit) {
      cacheHitCounter.inc({ endpoint });
    } else {
      cacheMissCounter.inc({ endpoint });
    }
    
    return originalEnd.apply(this, arguments);
  };
  
  next();
};

module.exports = cacheMetricsMiddleware;
```

### 4.2 Cache Size Management

```javascript
// cacheManager.js
const redisClient = require('./cacheConfig');

// Monitor cache size
const monitorCacheSize = async () => {
  const info = await redisClient.info();
  const usedMemory = info.match(/used_memory_human:(\S+)/)[1];
  console.log(`Redis cache size: ${usedMemory}`);
  
  // If memory usage exceeds threshold, clear less important caches
  if (usedMemory.endsWith('G')) {
    const sizeInGB = parseFloat(usedMemory);
    if (sizeInGB > 1) { // If over 1GB
      console.log('Cache size exceeds threshold, clearing old caches');
      // Clear non-critical caches
      redisClient.keys('membership:/api/analytics/historical/*', (err, keys) => {
        if (keys.length > 0) {
          redisClient.del(keys);
        }
      });
    }
  }
};

// Run every hour
setInterval(monitorCacheSize, 1000 * 60 * 60);
```

## 5. Deployment Considerations

### 5.1 Redis Cluster Configuration

For production environments with high traffic:

```yaml
# docker-compose.yml
version: '3'
services:
  redis-master:
    image: redis:6
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    
  redis-replica:
    image: redis:6
    ports:
      - "6380:6379"
    command: redis-server --slaveof redis-master 6379
    depends_on:
      - redis-master

volumes:
  redis-data:
```

### 5.2 Cache Warm-Up Strategy

```javascript
// cacheWarmup.js
const redisClient = require('./cacheConfig');
const axios = require('axios');

const warmupEndpoints = [
  '/api/analytics/national',
  '/api/analytics/top-wards',
  '/api/analytics/top-municipalities',
  '/api/analytics/top-regions'
];

const warmupCache = async () => {
  console.log('Starting cache warm-up...');
  
  for (const endpoint of warmupEndpoints) {
    try {
      console.log(`Warming up ${endpoint}...`);
      await axios.get(`http://localhost:3000${endpoint}`);
    } catch (error) {
      console.error(`Error warming up ${endpoint}:`, error.message);
    }
  }
  
  console.log('Cache warm-up complete');
};

// Warm up cache on server start
warmupCache();

// Also warm up after scheduled cache clears
// This can be called after the cron job that clears caches
```

## 6. Fallback Mechanisms

### 6.1 Stale-While-Revalidate Pattern

```javascript
// analyticsController.js
const getTopWards = async (req, res) => {
  const cacheKey = 'top-wards';
  
  try {
    // Try to get from cache
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      res.set('X-Cache', 'HIT');
      res.json(JSON.parse(cachedData));
      
      // Check if cache is stale (older than 4 hours)
      const cacheInfo = await redisClient.ttl(cacheKey);
      if (cacheInfo < (60 * 60 * 2)) { // Less than 2 hours remaining
        // Refresh cache in background
        refreshTopWardsCache().catch(err => 
          console.error('Background cache refresh failed:', err)
        );
      }
    } else {
      // No cache, fetch fresh data
      res.set('X-Cache', 'MISS');
      const data = await fetchTopWardsFromDB();
      
      // Cache the result
      await redisClient.setex(cacheKey, 60 * 60 * 6, JSON.stringify(data)); // 6 hours
      
      res.json(data);
    }
  } catch (error) {
    // Handle errors
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch top wards',
      timestamp: new Date().toISOString()
    });
  }
};
```

## 7. Integration with Largest Entities Tracking

Our membership system tracks the largest entities by membership count:

1. Largest Ward: Ward 58 in Johannesburg Metropolitan, Gauteng (345 members)
2. Largest Municipality: Johannesburg Metropolitan in Gauteng (1,567 members)
3. Largest Region: City of Cape Town Metropolitan in Western Cape (1,850 members)

This information is displayed on both the national admin dashboard and the system settings page. To ensure this data is always up-to-date while maintaining performance:

### 7.1 Specialized Cache for Largest Entities

```javascript
// largestEntitiesCache.js
const redisClient = require('./cacheConfig');

const LARGEST_ENTITIES_KEY = 'membership:largest-entities';
const CACHE_DURATION = 60 * 60 * 3; // 3 hours

const getLargestEntities = async () => {
  try {
    const cachedData = await redisClient.get(LARGEST_ENTITIES_KEY);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // If not in cache, fetch from database
    const largestEntities = await fetchLargestEntitiesFromDB();
    
    // Cache the result
    await redisClient.setex(LARGEST_ENTITIES_KEY, CACHE_DURATION, JSON.stringify(largestEntities));
    
    return largestEntities;
  } catch (error) {
    console.error('Error fetching largest entities:', error);
    throw error;
  }
};

const invalidateLargestEntitiesCache = async () => {
  await redisClient.del(LARGEST_ENTITIES_KEY);
};

module.exports = {
  getLargestEntities,
  invalidateLargestEntitiesCache
};
```

### 7.2 Automatic Cache Updates on Membership Changes

```javascript
// membershipService.js
const { invalidateLargestEntitiesCache } = require('../cache/largestEntitiesCache');

const updateMembershipCount = async (wardId, change) => {
  try {
    // Update membership count in database
    await db.query('UPDATE wards SET member_count = member_count + ? WHERE id = ?', [change, wardId]);
    
    // Get ward details to check if it might be one of the largest
    const ward = await db.query('SELECT member_count FROM wards WHERE id = ?', [wardId]);
    
    // If member count is high enough to potentially affect largest entities
    if (ward.member_count > 200) { // Threshold based on known largest entities
      // Invalidate largest entities cache to ensure fresh data on next request
      await invalidateLargestEntitiesCache();
    }
    
    return true;
  } catch (error) {
    console.error('Error updating membership count:', error);
    throw error;
  }
};
```

This comprehensive caching strategy ensures our membership system delivers fast, reliable analytics while maintaining data freshness and system performance.
