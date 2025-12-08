/**
 * Force clear Redis cache by connecting directly
 */

const Redis = require('ioredis');
require('dotenv').config();

async function clearCache() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  });

  try {
    console.log('🧹 Connecting to Redis...');
    
    // Test connection
    await redis.ping();
    console.log('✅ Connected to Redis');
    
    // Get all keys
    const keys = await redis.keys('*');
    console.log(`\n📊 Found ${keys.length} keys in Redis`);
    
    if (keys.length > 0) {
      console.log('\nSample keys:');
      keys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
      
      // Clear all keys
      console.log('\n🗑️  Clearing all keys...');
      await redis.flushdb();
      console.log('✅ All keys cleared!');
    } else {
      console.log('\n⚠️  No keys found in Redis');
    }
    
    // Verify
    const keysAfter = await redis.keys('*');
    console.log(`\n✅ Keys remaining: ${keysAfter.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await redis.quit();
    console.log('\n👋 Disconnected from Redis');
    process.exit(0);
  }
}

clearCache();

