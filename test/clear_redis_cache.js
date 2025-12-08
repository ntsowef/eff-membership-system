const redis = require('redis');

const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  legacyMode: true
});

async function clearCache() {
  try {
    await client.connect();
    console.log('Connected to Redis');
    
    await client.flushAll();
    console.log('✅ All Redis cache cleared!');
    
    await client.quit();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

clearCache();

