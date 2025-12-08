const Redis = require('../backend/node_modules/ioredis');

// Redis configuration
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: '',
  db: 0,
  keyPrefix: 'membership:'
});

async function clearAnalyticsCache() {
  console.log('🧹 Clearing Analytics Cache...\n');
  console.log('=' .repeat(80));

  try {
    // Connect to Redis
    await redis.ping();
    console.log('✅ Connected to Redis\n');

    // First, check all keys to see what's in Redis
    console.log('🔍 Checking all Redis keys...');
    const allKeys = await redis.keys('*');
    console.log(`   Total keys in Redis: ${allKeys.length}`);

    if (allKeys.length > 0) {
      console.log('   Sample keys (first 10):');
      allKeys.slice(0, 10).forEach(key => console.log(`     - ${key}`));
    }

    // Clear analytics cache - filter keys that contain analytics or statistics
    console.log('\n🗑️  Clearing analytics cache...');

    const analyticsKeys = allKeys.filter(key =>
      key.includes('/analytics/') || key.includes('/statistics/')
    );

    console.log(`   Found ${analyticsKeys.length} analytics/statistics keys to delete`);

    let totalDeleted = 0;

    if (analyticsKeys.length > 0) {
      console.log('   Deleting keys:');
      analyticsKeys.forEach(key => console.log(`     - ${key}`));

      // Remove the prefix before deleting
      const keysWithoutPrefix = analyticsKeys.map(key => key.replace('membership:', ''));
      const deleted = await redis.del(...keysWithoutPrefix);
      totalDeleted = deleted;
      console.log(`   ✅ Deleted ${deleted} keys`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Cache cleared successfully!`);
    console.log(`📊 Total keys deleted: ${totalDeleted}`);
    console.log('\n💡 Analytics dashboard will now show fresh data on next request');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  } finally {
    await redis.quit();
  }
}

// Run the cache clear
clearAnalyticsCache();

