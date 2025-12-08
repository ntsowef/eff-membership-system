/**
 * Test Redis Connection
 * 
 * Quick script to verify Redis is running and accessible
 */

import Redis from 'ioredis';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null; // Stop retrying
    }
    return Math.min(times * 100, 2000);
  }
};

async function testRedisConnection() {
  console.log('🔍 Testing Redis Connection...\n');
  console.log('Configuration:', {
    host: REDIS_CONFIG.host,
    port: REDIS_CONFIG.port,
    password: REDIS_CONFIG.password ? '***' : 'none'
  });
  console.log('');

  const redis = new Redis(REDIS_CONFIG);

  try {
    // Test 1: Ping
    console.log('Test 1: PING');
    const pong = await redis.ping();
    console.log(`✅ PING response: ${pong}\n`);

    // Test 2: Set and Get
    console.log('Test 2: SET and GET');
    await redis.set('test:connection', 'success', 'EX', 10);
    const value = await redis.get('test:connection');
    console.log(`✅ SET/GET test: ${value}\n`);

    // Test 3: Check Redis Info
    console.log('Test 3: Redis Info');
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log(`✅ Redis version: ${version}\n`);

    // Test 4: Check Memory
    const memory = await redis.info('memory');
    const usedMemory = memory.match(/used_memory_human:([^\r\n]+)/)?.[1];
    console.log(`✅ Memory used: ${usedMemory}\n`);

    console.log('🎉 All Redis tests passed!');
    console.log('✅ Redis is running and accessible\n');

    return true;
  } catch (error: any) {
    console.error('❌ Redis connection failed!');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Redis is not running');
    console.error('2. Redis is running on a different port');
    console.error('3. Redis requires authentication');
    console.error('4. Firewall is blocking the connection');
    console.error('\nTo start Redis:');
    console.error('- Windows: redis-server.exe');
    console.error('- Linux/Mac: redis-server');
    console.error('- Docker: docker run -d -p 6379:6379 redis:latest\n');
    
    return false;
  } finally {
    await redis.quit();
  }
}

// Run the test
testRedisConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

