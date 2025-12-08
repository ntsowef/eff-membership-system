/**
 * Clear Redis cache
 */

const { cacheService } = require('./dist/services/cacheService');

async function clearCache() {
  try {
    console.log('🧹 Clearing Redis cache...\n');
    
    // Clear all member caches
    const patterns = [
      'member:*',
      'card:*',
      'cache:*'
    ];
    
    for (const pattern of patterns) {
      console.log(`Clearing pattern: ${pattern}`);
      // Note: Redis doesn't have a direct "delete by pattern" in the simple client
      // We'll use flushdb to clear everything
    }
    
    // Get Redis client from cache service
    const redis = cacheService.client;
    
    if (redis) {
      await redis.flushDb();
      console.log('\n✅ Cache cleared successfully!');
    } else {
      console.log('\n⚠️  Redis client not available');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache();

