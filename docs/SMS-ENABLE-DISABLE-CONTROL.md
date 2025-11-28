# SMS Enable/Disable Control

**Date:** 2025-10-07  
**Feature:** SMS Global Enable/Disable Switch  
**Status:** ✅ IMPLEMENTED

---

## 📋 Overview

You can now control whether SMS sending is enabled or disabled globally using a simple environment variable in the `.env.postgres` file. This allows you to:

- **Disable SMS during development/testing** to avoid sending real messages
- **Enable SMS in production** when ready to send messages
- **Quickly disable SMS** if there's an issue or you need to pause sending
- **Control costs** by disabling SMS when not needed

---

## 🎛️ How to Control SMS

### Enable SMS (Default for Production)

**In `.env.postgres`:**
```bash
SMS_ENABLED=true
```

**Result:**
- ✅ SMS will be sent normally
- ✅ All SMS features work (birthday SMS, renewal reminders, bulk campaigns)
- ✅ Messages are delivered via JSON Applink

### Disable SMS (For Development/Testing)

**In `.env.postgres`:**
```bash
SMS_ENABLED=false
```

**Result:**
- ❌ SMS sending is blocked
- ❌ No messages are sent to JSON Applink API
- ❌ No SMS costs incurred
- ✅ Application continues to work normally
- ✅ SMS attempts are logged but not sent

---

## 🔧 Configuration

### Environment Variable

**File:** `.env.postgres`

```bash
# SMS Configuration
# Set to 'true' to enable SMS sending, 'false' to disable
# When disabled, all SMS sending attempts will be blocked
SMS_ENABLED=true

# SMS Provider Selection
SMS_PROVIDER=json-applink

# JSON Applink Configuration
JSON_APPLINK_API_URL=https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
JSON_APPLINK_AUTH_CODE=EFFAPPLINK
JSON_APPLINK_AFFILIATE_CODE=INT001-1161-001
JSON_APPLINK_FROM_NUMBER=+27123456789
JSON_APPLINK_RATE_LIMIT=100
```

### Valid Values

| Value | Effect |
|-------|--------|
| `true` | SMS enabled - messages will be sent |
| `false` | SMS disabled - messages will be blocked |
| Not set | Defaults to `false` (disabled) |

---

## 📊 Behavior When Disabled

### What Happens

When `SMS_ENABLED=false`:

1. **SMS Sending Blocked:**
   - All calls to `SMSService.sendSMS()` return immediately
   - No API requests are made to JSON Applink
   - No SMS costs are incurred

2. **Response Returned:**
   ```json
   {
     "success": false,
     "error": "SMS sending is disabled. Set SMS_ENABLED=true in .env to enable.",
     "provider": "disabled"
   }
   ```

3. **Logging:**
   - SMS attempts are logged with info level
   - Logs include: recipient, message length, sender
   - Example log:
     ```
     INFO: SMS sending is disabled via configuration
     {
       "to": "+27796222802",
       "messageLength": 45,
       "from": "EFF"
     }
     ```

4. **Application Behavior:**
   - Application continues to work normally
   - No errors are thrown
   - Users may see "SMS disabled" messages in UI
   - Background jobs (birthday SMS, renewal reminders) run but don't send

---

## 🧪 Testing

### Test with SMS Disabled

**1. Set in `.env.postgres`:**
```bash
SMS_ENABLED=false
```

**2. Restart backend:**
```bash
cd backend
npm run dev
```

**3. Try sending SMS:**
```typescript
const result = await SMSService.sendSMS(
  '+27796222802',
  'Test message',
  'EFF'
);

console.log(result);
// Output:
// {
//   success: false,
//   error: 'SMS sending is disabled. Set SMS_ENABLED=true in .env to enable.',
//   provider: 'disabled'
// }
```

**4. Check logs:**
```
INFO: SMS sending is disabled via configuration
{
  "to": "+27796222802",
  "messageLength": 12,
  "from": "EFF"
}
```

### Test with SMS Enabled

**1. Set in `.env.postgres`:**
```bash
SMS_ENABLED=true
```

**2. Restart backend:**
```bash
cd backend
npm run dev
```

**3. Try sending SMS:**
```typescript
const result = await SMSService.sendSMS(
  '+27796222802',
  'Test message',
  'EFF'
);

console.log(result);
// Output:
// {
//   success: true,
//   messageId: 'eff_1696704123_abc123',
//   provider: 'JSON Applink'
// }
```

**4. Check phone:**
- SMS should be received on +27796222802

---

## 🎯 Use Cases

### Development Environment

**Scenario:** Testing application features without sending real SMS

**Configuration:**
```bash
SMS_ENABLED=false
SMS_PROVIDER=mock
```

**Benefits:**
- No SMS costs during development
- No accidental messages sent to real users
- Can test SMS logic without actual delivery

### Staging Environment

**Scenario:** Testing with real SMS provider but limited sending

**Configuration:**
```bash
SMS_ENABLED=true
SMS_PROVIDER=json-applink
# Use test phone numbers only
```

**Benefits:**
- Test real SMS integration
- Verify delivery and formatting
- Control costs with limited testing

### Production Environment

**Scenario:** Live system sending SMS to real users

**Configuration:**
```bash
SMS_ENABLED=true
SMS_PROVIDER=json-applink
JSON_APPLINK_AUTH_CODE=EFFAPPLINK
JSON_APPLINK_AFFILIATE_CODE=INT001-1161-001
```

**Benefits:**
- Full SMS functionality
- Birthday messages sent automatically
- Renewal reminders delivered
- Bulk campaigns work

### Emergency Disable

**Scenario:** Need to quickly stop all SMS sending

**Steps:**
1. Edit `.env.postgres`:
   ```bash
   SMS_ENABLED=false
   ```

2. Restart backend:
   ```bash
   pm2 restart backend
   # or
   npm run dev
   ```

3. All SMS sending stops immediately

**Use When:**
- SMS provider has issues
- Unexpected high costs
- Need to pause campaigns
- Testing or maintenance

---

## 🔄 Changing the Setting

### Without Restart (Not Recommended)

The setting is read from environment variables at startup. Changing `.env.postgres` won't take effect until backend restarts.

### With Restart (Recommended)

**1. Edit `.env.postgres`:**
```bash
SMS_ENABLED=true  # or false
```

**2. Restart backend:**

**Development:**
```bash
# Stop current process (Ctrl+C)
cd backend
npm run dev
```

**Production (PM2):**
```bash
pm2 restart backend
```

**Production (Docker):**
```bash
docker-compose restart backend
```

**3. Verify:**
```bash
# Check logs for confirmation
tail -f backend/logs/app.log
```

---

## 📝 Code Implementation

### Config Interface

**File:** `backend/src/config/config.ts`

```typescript
interface Config {
  sms?: {
    enabled?: boolean;  // ✅ New field
    provider?: string;
    jsonApplink?: {
      apiUrl: string;
      authenticationCode: string;
      affiliateCode: string;
      // ...
    };
  };
}

export const config: Config = {
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',  // ✅ Read from env
    provider: process.env.SMS_PROVIDER || 'mock',
    // ...
  }
};
```

### SMS Service

**File:** `backend/src/services/smsService.ts`

```typescript
static async sendSMS(to: string, message: string, from: string): Promise<SMSResponse> {
  // Check if SMS is enabled
  if (config.sms?.enabled === false) {
    logger.info('SMS sending is disabled via configuration', {
      to,
      messageLength: message.length,
      from
    });
    
    return {
      success: false,
      error: 'SMS sending is disabled. Set SMS_ENABLED=true in .env to enable.',
      provider: 'disabled'
    };
  }

  const provider = this.getProvider();
  return provider.sendSMS({ to, message, from });
}
```

---

## ✅ Benefits

### Cost Control
- ✅ Prevent accidental SMS costs during development
- ✅ Quickly disable SMS if costs are too high
- ✅ Test application without incurring charges

### Safety
- ✅ Prevent sending test messages to real users
- ✅ Disable SMS during maintenance
- ✅ Quick emergency stop if needed

### Flexibility
- ✅ Easy to toggle on/off
- ✅ No code changes required
- ✅ Works across all SMS features

### Development
- ✅ Test SMS logic without sending
- ✅ Debug SMS issues safely
- ✅ Develop new features without costs

---

## 🆘 Troubleshooting

### Issue: SMS Not Sending

**Check 1: Is SMS enabled?**
```bash
# In .env.postgres
SMS_ENABLED=true  # Should be 'true'
```

**Check 2: Did you restart backend?**
```bash
cd backend
npm run dev
```

**Check 3: Check logs**
```bash
tail -f backend/logs/app.log
# Look for: "SMS sending is disabled via configuration"
```

### Issue: SMS Still Sending When Disabled

**Possible Causes:**
1. Backend not restarted after changing `.env.postgres`
2. Typo in environment variable (should be `SMS_ENABLED=false`)
3. Using wrong `.env` file

**Solution:**
1. Verify `.env.postgres` has `SMS_ENABLED=false`
2. Restart backend completely
3. Check logs to confirm setting is read

---

## 📚 Related Documentation

- `docs/JSON-APPLINK-SMS-SUCCESS.md` - SMS integration guide
- `backend/src/services/smsService.ts` - SMS service implementation
- `backend/src/config/config.ts` - Configuration
- `.env.postgres` - Environment variables

---

## ✨ Summary

**Feature:** Global SMS enable/disable control via environment variable

**Configuration:**
```bash
# Enable SMS (production)
SMS_ENABLED=true

# Disable SMS (development/testing)
SMS_ENABLED=false
```

**Benefits:**
- ✅ Easy cost control
- ✅ Safe development/testing
- ✅ Quick emergency disable
- ✅ No code changes needed

**Usage:**
1. Edit `SMS_ENABLED` in `.env.postgres`
2. Restart backend
3. SMS sending enabled/disabled immediately

---

**Last Updated:** 2025-10-07  
**Status:** ✅ IMPLEMENTED AND READY TO USE

