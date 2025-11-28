# SMS Quick Reference Guide

**Last Updated:** 2025-10-07

---

## 🚀 Quick Start

### Enable SMS
```bash
# In .env.postgres
SMS_ENABLED=true
SMS_PROVIDER=json-applink
```

### Disable SMS
```bash
# In .env.postgres
SMS_ENABLED=false
```

### Restart Backend
```bash
cd backend
npm run dev
```

---

## 📋 Configuration Checklist

- [ ] Set `SMS_ENABLED=true` or `false` in `.env.postgres`
- [ ] Set `SMS_PROVIDER=json-applink` in `.env.postgres`
- [ ] Verify JSON Applink credentials are correct
- [ ] Restart backend server
- [ ] Test SMS sending

---

## 🔑 JSON Applink Credentials

```bash
# In .env.postgres
JSON_APPLINK_API_URL=https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
JSON_APPLINK_AUTH_CODE=EFFAPPLINK
JSON_APPLINK_AFFILIATE_CODE=INT001-1161-001
JSON_APPLINK_FROM_NUMBER=+27123456789
JSON_APPLINK_RATE_LIMIT=100
```

---

## 🧪 Test SMS Sending

### Option 1: Test Script
```bash
node test/sms/test-correct-payload-format.js
```

### Option 2: From Code
```typescript
import { SMSService } from './services/smsService';

const result = await SMSService.sendSMS(
  '+27796222802',
  'Test message',
  'EFF'
);

console.log(result);
```

---

## 📊 SMS Status

### Check if SMS is Enabled
```typescript
import { config } from './config/config';

console.log('SMS Enabled:', config.sms?.enabled);
console.log('SMS Provider:', config.sms?.provider);
```

### Check Provider Health
```typescript
import { SMSService } from './services/smsService';

const health = await SMSService.getProviderHealth();
console.log(health);
```

---

## 🎯 Common Scenarios

### Development (No SMS)
```bash
SMS_ENABLED=false
SMS_PROVIDER=mock
```

### Testing (Real SMS, Limited)
```bash
SMS_ENABLED=true
SMS_PROVIDER=json-applink
# Test with specific numbers only
```

### Production (Full SMS)
```bash
SMS_ENABLED=true
SMS_PROVIDER=json-applink
# All credentials configured
```

### Emergency Disable
```bash
SMS_ENABLED=false
# Then restart backend
```

---

## 🔄 Switching Providers

### Use JSON Applink (Production)
```bash
SMS_ENABLED=true
SMS_PROVIDER=json-applink
```

### Use Mock (Development)
```bash
SMS_ENABLED=true
SMS_PROVIDER=mock
```

### Disable All SMS
```bash
SMS_ENABLED=false
# Provider doesn't matter when disabled
```

---

## 📱 SMS Features

### Birthday SMS
- Automatically sends birthday messages
- Controlled by `SMS_ENABLED`
- Configure in Birthday SMS settings

### Renewal Reminders
- Sends membership renewal reminders
- 30-day, 7-day, and expired notifications
- Controlled by `SMS_ENABLED`

### Bulk Campaigns
- Send SMS to multiple members
- Geographic filtering supported
- Controlled by `SMS_ENABLED`

### Individual Messages
- Send SMS to specific members
- From member profile or communication module
- Controlled by `SMS_ENABLED`

---

## 🆘 Troubleshooting

### SMS Not Sending

**Check:**
1. `SMS_ENABLED=true` in `.env.postgres`
2. Backend restarted after config change
3. Credentials are correct
4. Phone number format: `+27796222802`

**Logs:**
```bash
tail -f backend/logs/app.log
```

### SMS Disabled Message

**Cause:** `SMS_ENABLED=false` in `.env.postgres`

**Fix:**
1. Set `SMS_ENABLED=true`
2. Restart backend

### Authentication Failed

**Cause:** Incorrect credentials

**Fix:**
1. Verify `JSON_APPLINK_AUTH_CODE=EFFAPPLINK`
2. Verify `JSON_APPLINK_AFFILIATE_CODE=INT001-1161-001`
3. Restart backend

---

## 📚 Documentation

- **Full Guide:** `docs/SMS-ENABLE-DISABLE-CONTROL.md`
- **Integration:** `docs/JSON-APPLINK-SMS-SUCCESS.md`
- **Test Scripts:** `test/sms/test-correct-payload-format.js`

---

## ✨ Quick Commands

```bash
# Enable SMS
echo "SMS_ENABLED=true" >> .env.postgres

# Disable SMS
echo "SMS_ENABLED=false" >> .env.postgres

# Restart backend (development)
cd backend && npm run dev

# Test SMS
node test/sms/test-correct-payload-format.js

# Check logs
tail -f backend/logs/app.log
```

---

## 🎯 Summary

| Action | Command |
|--------|---------|
| Enable SMS | `SMS_ENABLED=true` in `.env.postgres` |
| Disable SMS | `SMS_ENABLED=false` in `.env.postgres` |
| Restart | `cd backend && npm run dev` |
| Test | `node test/sms/test-correct-payload-format.js` |
| Check Status | Check `config.sms?.enabled` |

---

**Remember:** Always restart the backend after changing `.env.postgres`!

