# IEC API CloudScraper Integration Guide

**Date:** 2025-11-25  
**Purpose:** Bypass Cloudflare protection when accessing IEC API

---

## 🔐 Overview

The IEC (Independent Electoral Commission) API is protected by **Cloudflare**, which blocks standard HTTP clients like `axios` or `fetch`. To bypass this protection, we use **CloudScraper** - the Node.js equivalent of Python's `cloudscraper` module.

---

## 📦 Installation

### Install CloudScraper
```bash
cd backend
npm install cloudscraper
```

**Note:** There is no `@types/cloudscraper` package, so we created custom type declarations in `backend/src/types/cloudscraper.d.ts`.

---

## 🔧 Implementation

### 1. Import CloudScraper
```typescript
import cloudscraper from 'cloudscraper';
```

### 2. Get OAuth2 Token (Bypassing Cloudflare)
```typescript
const response = await cloudscraper.post({
  uri: 'https://api.elections.org.za/token',
  form: {
    grant_type: 'password',
    username: config.iec.username,
    password: config.iec.password
  },
  json: true, // Automatically parse JSON response
  timeout: 30000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const accessToken = response.access_token;
```

### 3. Verify Voter (Bypassing Cloudflare)
```typescript
const response = await cloudscraper.get({
  uri: `https://api.elections.org.za/api/v1/Voters/IDNumber?ID=${idNumber}`,
  json: true,
  timeout: 30000,
  headers: {
    'Authorization': `bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const isRegistered = response.bRegistered;
```

---

## 🆚 Comparison: Axios vs CloudScraper

### ❌ Axios (Blocked by Cloudflare)
```typescript
// This will fail with 403 Forbidden or Cloudflare challenge
const response = await axios.get('https://api.elections.org.za/api/v1/Voters/IDNumber?ID=123', {
  headers: { 'Authorization': `bearer ${token}` }
});
```

### ✅ CloudScraper (Bypasses Cloudflare)
```typescript
// This will succeed by solving Cloudflare challenge automatically
const response = await cloudscraper.get({
  uri: 'https://api.elections.org.za/api/v1/Voters/IDNumber?ID=123',
  json: true,
  headers: { 'Authorization': `bearer ${token}` }
});
```

---

## 🔑 Key Differences

| Feature | Axios | CloudScraper |
|---------|-------|--------------|
| **Cloudflare Bypass** | ❌ No | ✅ Yes |
| **Response Format** | `response.data` | Direct response |
| **JSON Parsing** | Automatic | Set `json: true` |
| **User Agent** | Optional | Recommended |
| **Challenge Solving** | ❌ No | ✅ Automatic |

---

## 📝 Response Structure

### CloudScraper Response (Direct)
```typescript
const response = await cloudscraper.get({ uri: '...', json: true });
// response is the parsed JSON object directly
console.log(response.bRegistered); // true/false
```

### Axios Response (Nested)
```typescript
const response = await axios.get('...');
// response.data contains the parsed JSON
console.log(response.data.bRegistered); // true/false
```

---

## ⚙️ Configuration Options

### Basic Options
```typescript
{
  uri: 'https://api.elections.org.za/...',  // URL to request
  method: 'GET',                             // HTTP method
  json: true,                                // Parse JSON automatically
  timeout: 30000,                            // 30 second timeout
  headers: { ... }                           // Custom headers
}
```

### Advanced Options
```typescript
{
  cloudflareTimeout: 30000,      // Max time to solve Cloudflare challenge
  cloudflareMaxTimeout: 60000,   // Absolute max timeout
  followRedirect: true,          // Follow redirects
  maxRedirects: 10,              // Max number of redirects
  agentOptions: {                // Custom agent options
    rejectUnauthorized: false    // Ignore SSL errors (not recommended)
  }
}
```

---

## 🚨 Error Handling

### Common Errors

#### 1. Cloudflare Challenge Failed
```typescript
try {
  const response = await cloudscraper.get({ uri: '...' });
} catch (error) {
  if (error.message.includes('captcha')) {
    console.error('Cloudflare CAPTCHA detected - manual intervention required');
  }
}
```

#### 2. Timeout
```typescript
try {
  const response = await cloudscraper.get({ uri: '...', timeout: 30000 });
} catch (error) {
  if (error.code === 'ETIMEDOUT') {
    console.error('Request timed out');
  }
}
```

#### 3. Authentication Failed
```typescript
try {
  const response = await cloudscraper.post({ uri: '/token', form: { ... } });
} catch (error) {
  if (error.statusCode === 401) {
    console.error('Invalid credentials');
  }
}
```

---

## 🔍 Debugging

### Enable Debug Logging
```typescript
// Set environment variable
process.env.DEBUG = 'cloudscraper';

// Or use verbose logging
const response = await cloudscraper.get({
  uri: '...',
  verbose: true  // Log all requests and responses
});
```

### Check Response
```typescript
const response = await cloudscraper.get({
  uri: '...',
  json: false,  // Get raw response
  resolveWithFullResponse: true  // Get full response object
});

console.log('Status:', response.statusCode);
console.log('Headers:', response.headers);
console.log('Body:', response.body);
```

---

## 📊 Performance

### CloudScraper vs Axios

| Metric | Axios | CloudScraper |
|--------|-------|--------------|
| **First Request** | ~100ms | ~2-5 seconds (challenge solving) |
| **Subsequent Requests** | ~100ms | ~100ms (cookies cached) |
| **Memory Usage** | Low | Medium |
| **CPU Usage** | Low | Medium (during challenge) |

**Note:** CloudScraper is slower on the first request because it needs to solve the Cloudflare challenge, but subsequent requests are fast because it caches the cookies.

---

## ✅ Best Practices

1. **Reuse CloudScraper Instance**
   - Don't create a new instance for each request
   - Cookies are cached per instance

2. **Set Appropriate Timeouts**
   - Token requests: 30 seconds
   - Voter verification: 30 seconds
   - Cloudflare challenge: 60 seconds

3. **Use Realistic User Agent**
   - Mimic a real browser
   - Update periodically

4. **Handle Rate Limits**
   - IEC API has rate limits
   - Use Redis-based rate limiting
   - Implement exponential backoff

5. **Error Handling**
   - Catch and log all errors
   - Retry failed requests (max 3 times)
   - Fallback to manual verification if needed

---

## 🔗 Related Files

- **IEC API Service:** `backend/src/services/iecApiService.ts`
- **IEC Verification Service:** `backend/src/services/bulk-upload/iecVerificationService.ts`
- **Type Declarations:** `backend/src/types/cloudscraper.d.ts`
- **Rate Limiting:** `backend/src/services/iecRateLimitService.ts`

---

## 📚 Resources

- **CloudScraper npm:** https://www.npmjs.com/package/cloudscraper
- **CloudScraper GitHub:** https://github.com/codemanki/cloudscraper
- **IEC API Documentation:** (Internal)

---

**Last Updated:** 2025-11-25  
**Maintained By:** Development Team

