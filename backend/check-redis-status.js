#!/usr/bin/env node

/**
 * Redis Status Checker
 * 
 * This script checks the Redis instance configuration and role (master/replica)
 * to help diagnose the "READONLY You can't write against a read only replica" error.
 */

const Redis = require('ioredis');
require('dotenv').config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0');

console.log('🔍 Redis Status Checker');
console.log('======================\n');

async function checkRedisStatus() {
  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    lazyConnect: true,
    retryStrategy: () => null // Don't retry on connection failure
  });

  try {
    console.log(`📡 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
    await redis.connect();
    console.log('✅ Connected successfully!\n');

    // Get Redis role (master/slave/sentinel)
    console.log('📊 Checking Redis role...');
    const roleInfo = await redis.role();
    console.log('Role:', roleInfo[0]);
    
    if (roleInfo[0] === 'slave' || roleInfo[0] === 'replica') {
      console.log('⚠️  WARNING: This Redis instance is a REPLICA (read-only)');
      console.log('   Master host:', roleInfo[1]);
      console.log('   Master port:', roleInfo[2]);
      console.log('   Replication state:', roleInfo[3]);
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   Your application is connecting to a READ-ONLY replica.');
      console.log('   You need to connect to the MASTER instance for write operations.\n');
      console.log('💡 SOLUTION:');
      console.log(`   Update REDIS_HOST to point to the master: ${roleInfo[1]}`);
      console.log(`   Update REDIS_PORT to: ${roleInfo[2]}`);
    } else if (roleInfo[0] === 'master') {
      console.log('✅ This Redis instance is a MASTER (read-write)');
      console.log('   Connected replicas:', roleInfo[1].length);
      console.log('\n✅ Configuration is correct for write operations.');
    }

    // Get Redis info
    console.log('\n📊 Redis Server Info:');
    const info = await redis.info('replication');
    const lines = info.split('\r\n').filter(line => line && !line.startsWith('#'));
    lines.forEach(line => console.log('  ', line));

    // Test write operation
    console.log('\n🧪 Testing write operation...');
    try {
      await redis.set('test:write_check', 'success', 'EX', 10);
      console.log('✅ Write operation successful!');
      await redis.del('test:write_check');
    } catch (writeError) {
      console.log('❌ Write operation failed:', writeError.message);
      if (writeError.message.includes('READONLY')) {
        console.log('\n⚠️  CONFIRMED: This Redis instance is READ-ONLY');
        console.log('   You must connect to the master instance for write operations.');
      }
    }

    // Check for common ports
    console.log('\n🔍 Checking common Redis ports...');
    const portsToCheck = [6379, 6380, 6381];
    for (const port of portsToCheck) {
      if (port === REDIS_PORT) continue;
      
      const testRedis = new Redis({
        host: REDIS_HOST,
        port: port,
        password: REDIS_PASSWORD,
        lazyConnect: true,
        retryStrategy: () => null,
        connectTimeout: 2000
      });

      try {
        await testRedis.connect();
        const testRole = await testRedis.role();
        console.log(`  Port ${port}: ${testRole[0].toUpperCase()}`);
        await testRedis.quit();
      } catch (err) {
        console.log(`  Port ${port}: Not accessible`);
      }
    }

    await redis.quit();
    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('   1. Redis is not running');
    console.log('   2. Wrong host/port configuration');
    console.log('   3. Authentication required (check REDIS_PASSWORD)');
    console.log('   4. Firewall blocking connection');
  }
}

checkRedisStatus().catch(console.error);

