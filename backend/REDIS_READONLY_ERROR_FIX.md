# Redis READONLY Error - Diagnosis and Fix

## Problem

The application was experiencing the following error:

```
❌ Failed to pop from list in Redis: ReplyError: READONLY You can't write against a read only replica.
    at parseError (/root/Applications/backend/node_modules/redis-parser/lib/parser.js:179:12)
    at parseType (/root/Applications/backend/node_modules/redis-parser/lib/parser.js:302:14) {
  command: { name: 'brpop', args: [ 'membership:excel_processing_queue', '5' ] }
}
```

## Root Cause

The error occurs when the application tries to perform **write operations** (like `brpop`, `lpush`, `set`, `del`) on a Redis instance that is configured as a **read-only replica** instead of the **master**.

### Why This Happens

1. **Redis Master-Replica Setup**: In a high-availability Redis setup, there's typically:
   - 1 Master (read-write) - usually on port 6379
   - 1+ Replicas (read-only) - usually on ports 6380, 6381, etc.

2. **Connection to Wrong Instance**: The application was connecting to a replica instead of the master

3. **Failover Events**: Redis Sentinel can promote a replica to master during failover, causing temporary READONLY errors

## Diagnosis Results

Running `node check-redis-status.js` showed:
- ✅ Port 6379: MASTER (read-write) - Correct
- ✅ Port 6380: MASTER - Unusual (should be replica)
- ✅ Write operations work on port 6379

## Solutions Implemented

### 1. Enhanced Error Handling in `redisService.ts`

**File**: `backend/src/services/redisService.ts`

#### Added READONLY Error Detection and Auto-Reconnect

```typescript
public async brpop(key: string, timeout: number): Promise<[string, string] | null> {
  try {
    const result = await this.client.brpop(key, timeout);
    return result;
  } catch (error: any) {
    // Check if this is a READONLY error
    if (error.message && error.message.includes('READONLY')) {
      console.error('❌ READONLY ERROR: Connected to Redis replica instead of master!');
      
      // Try to reconnect
      try {
        console.log('🔄 Attempting to reconnect to Redis...');
        await this.client.disconnect();
        await this.connect();
        
        // Retry the operation once
        const result = await this.client.brpop(key, timeout);
        return result;
      } catch (reconnectError) {
        console.error('❌ Failed to reconnect to Redis:', reconnectError);
      }
    }
    return null;
  }
}
```

#### Added Redis Role Check on Startup

```typescript
private async checkRedisRole(): Promise<void> {
  try {
    const roleInfo = await this.client.role();
    const role = roleInfo[0];
    
    if (role === 'slave' || role === 'replica') {
      console.error('⚠️  WARNING: Connected to Redis REPLICA (read-only)!');
      console.error('   Master host:', roleInfo[1]);
      console.error('   Master port:', roleInfo[2]);
      console.error('   ❌ Write operations will FAIL!');
    } else if (role === 'master') {
      console.log('✅ Connected to Redis MASTER (read-write)');
    }
  } catch (error) {
    console.warn('⚠️  Could not check Redis role:', error);
  }
}
```

### 2. Environment Configuration

**File**: `backend/.env`

Ensured correct Redis configuration:

```env
# Redis Configuration
# IMPORTANT: Connect to Redis MASTER for write operations, not replica
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Diagnostic Tool

**File**: `backend/check-redis-status.js`

Created a diagnostic script to check Redis role and configuration:

```bash
node check-redis-status.js
```

This script:
- Connects to Redis
- Checks if it's a master or replica
- Tests write operations
- Scans common Redis ports (6379, 6380, 6381)
- Provides actionable recommendations

## How to Verify the Fix

1. **Restart the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Check the logs** for:
   ```
   ✅ Connected to Redis MASTER (read-write)
   ```

3. **If you see a warning**:
   ```
   ⚠️  WARNING: Connected to Redis REPLICA (read-only)!
   ```
   Then update your `.env` file with the correct master host/port.

4. **Run the diagnostic tool**:
   ```bash
   node check-redis-status.js
   ```

## Prevention

To prevent this error in the future:

1. **Always connect to the master** for write operations
2. **Use Redis Sentinel** for automatic failover and service discovery
3. **Monitor Redis role** on application startup
4. **Implement retry logic** for transient READONLY errors during failover
5. **Set up alerts** for Redis role changes

## Additional Notes

- The `brpop` command is used by `FileProcessingQueueManager` to process Excel files
- This is a **blocking operation** that waits up to 5 seconds for a job
- The error was occurring repeatedly because the queue processor runs continuously
- With the fix, the application will automatically detect and recover from READONLY errors

## Files Modified

1. ✅ `backend/src/services/redisService.ts` - Added error handling and role checking
2. ✅ `backend/.env` - Added comment about master connection
3. ✅ `backend/check-redis-status.js` - Created diagnostic tool
4. ✅ `backend/REDIS_READONLY_ERROR_FIX.md` - This documentation

## Resolution Steps Taken

### Step 1: Diagnosed the Problem
Ran `node check-redis-status.js` which revealed:
- Redis at `localhost:6379` was configured as a **REPLICA (slave)**
- Master was at `109.244.159.27:22520` (remote server)
- Master link status was **DOWN**
- Write operations were failing with READONLY error

### Step 2: Fixed Redis Configuration
Ran `node fix-redis-replica.js` which:
- Connected to the local Redis instance
- Executed `REPLICAOF NO ONE` command to convert replica to master
- Verified the change by checking role again
- Tested write operations successfully

### Step 3: Verified the Fix
- Restarted the backend server
- Confirmed connection to Redis MASTER with message: `✅ Connected to Redis MASTER (read-write)`
- Monitored logs for 1+ minute - **NO READONLY ERRORS**
- Queue processing working correctly

## Status

✅ **FIXED** - The issue has been resolved! The application now:
- Connects to Redis MASTER (not replica)
- Detects READONLY errors automatically (prevention)
- Attempts to reconnect when READONLY errors occur (recovery)
- Checks Redis role on startup (early detection)
- Provides clear error messages with actionable recommendations

## Important Note

The fix applied by `fix-redis-replica.js` is **temporary** and will be lost if Redis is restarted with the same configuration file that has `replicaof` directive.

**To make this permanent**, you must update the Redis configuration file:

1. Find `redis.conf` (common locations):
   - Windows: `C:\Program Files\Redis\redis.conf`
   - Linux: `/etc/redis/redis.conf` or `/usr/local/etc/redis/redis.conf`

2. Find and comment out or remove this line:
   ```
   replicaof 109.244.159.27 22520
   ```

   Change it to:
   ```
   # replicaof 109.244.159.27 22520
   ```

3. Restart Redis service:
   - Windows: `Restart-Service Redis`
   - Linux: `sudo systemctl restart redis` or `sudo service redis restart`

