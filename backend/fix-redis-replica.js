#!/usr/bin/env node

/**
 * Fix Redis Replica Configuration
 * 
 * This script converts a Redis replica back to a standalone master
 * by executing the REPLICAOF NO ONE command.
 */

const Redis = require('ioredis');
require('dotenv').config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0');

console.log('🔧 Fixing Redis Replica Configuration');
console.log('======================================\n');

async function fixRedisReplica() {
  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    lazyConnect: true,
    retryStrategy: () => null
  });

  try {
    console.log(`📡 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
    await redis.connect();
    console.log('✅ Connected successfully!\n');

    // Check current role
    console.log('📊 Current Redis Role:');
    const currentRole = await redis.role();
    console.log('   Role:', currentRole[0]);
    
    if (currentRole[0] === 'slave' || currentRole[0] === 'replica') {
      console.log('   Master host:', currentRole[1]);
      console.log('   Master port:', currentRole[2]);
      console.log('   ⚠️  This is a READ-ONLY replica\n');
      
      // Convert to master
      console.log('🔄 Converting replica to master...');
      await redis.replicaof('NO', 'ONE');
      console.log('✅ Command executed: REPLICAOF NO ONE\n');
      
      // Wait a moment for the change to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check new role
      console.log('📊 New Redis Role:');
      const newRole = await redis.role();
      console.log('   Role:', newRole[0]);
      
      if (newRole[0] === 'master') {
        console.log('   ✅ Successfully converted to MASTER!\n');
      } else {
        console.log('   ⚠️  Role change may still be in progress\n');
      }
      
    } else if (currentRole[0] === 'master') {
      console.log('   ✅ Already a MASTER (no changes needed)\n');
    }

    // Test write operation
    console.log('🧪 Testing write operation...');
    try {
      await redis.set('test:write_check', 'success', 'EX', 10);
      console.log('✅ Write operation successful!');
      await redis.del('test:write_check');
    } catch (writeError) {
      console.log('❌ Write operation failed:', writeError.message);
      if (writeError.message.includes('READONLY')) {
        console.log('\n⚠️  Still getting READONLY errors.');
        console.log('   You may need to restart Redis service for changes to take effect.');
      }
    }

    await redis.quit();
    
    console.log('\n✅ Done!\n');
    console.log('💡 To make this permanent:');
    console.log('   1. Find your Redis configuration file (redis.conf)');
    console.log('   2. Comment out or remove the line: replicaof <masterip> <masterport>');
    console.log('   3. Restart Redis service\n');
    console.log('   On Windows, you can restart Redis with:');
    console.log('   Restart-Service Redis\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('   1. Redis is not running');
    console.log('   2. Wrong host/port configuration');
    console.log('   3. Authentication required (check REDIS_PASSWORD)');
    console.log('   4. Insufficient permissions to change replication settings');
    process.exit(1);
  }
}

fixRedisReplica().catch(console.error);

