# SMS Webhook Endpoint Documentation

**Date:** 2025-10-07  
**Status:** ✅ IMPLEMENTED  
**Endpoint:** `POST /api/v1/sms-webhooks/delivery/json-applink`

---

## 📋 Overview

The SMS webhook endpoint receives delivery status callbacks from JSON Applink when SMS messages are delivered, failed, or pending. This allows the system to track SMS delivery in real-time and update the database accordingly.

**Webhook URL:**
```
http://localhost:8000/api/v1/sms-webhooks/delivery/json-applink
```

**Production URL (replace with your domain):**
```
https://your-domain.com/api/v1/sms-webhooks/delivery/json-applink
```

---

## ✅ Webhook Already Implemented

**Yes, the webhook endpoint is already created and registered!**

### Implementation Details

**File:** `backend/src/routes/smsWebhooks.ts` (Line 104)

```typescript
// JSON Applink specific webhook endpoint
router.post('/delivery/json-applink', logWebhookRequest, async (req, res, next) => {
  try {
    const webhookData = req.body;

    logger.info('JSON Applink delivery webhook received', {
      headers: req.headers,
      body: webhookData
    });

    // Process webhook data
    const processedData = {
      message_id: webhookData.reference || webhookData.message_id || webhookData.id,
      provider_message_id: webhookData.tracking_id || webhookData.external_id,
      status: webhookData.status || webhookData.delivery_status,
      error_code: webhookData.error_code || webhookData.failure_code,
      error_message: webhookData.error_message || webhookData.failure_reason,
      delivery_timestamp: webhookData.delivered_at || webhookData.timestamp,
      cost: webhookData.cost || webhookData.price
    };

    await SMSDeliveryTrackingService.processDeliveryWebhook(processedData);

    res.status(200).json({
      success: true,
      message: 'JSON Applink delivery webhook processed successfully',
      message_id: processedData.message_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('JSON Applink webhook processing failed', { error });
    next(error);
  }
});
```

**Registered in:** `backend/src/app.ts` (Line 236)

```typescript
app.use(`${apiPrefix}/sms-webhooks`, smsWebhookRoutes);
```

---

## 📊 Webhook Payload Format

### Expected Payload from JSON Applink

```json
{
  "reference": "eff_1696704123_abc123",
  "message_id": "msg_1696704123",
  "tracking_id": "track_1696704123",
  "status": "delivered",
  "delivery_status": "delivered",
  "delivered_at": "2025-10-07T19:53:02.589Z",
  "timestamp": "2025-10-07T19:53:02.589Z",
  "msisdn": "+27796222802",
  "cost": 0.15,
  "price": 0.15
}
```

### Supported Status Values

| Status | Description |
|--------|-------------|
| `delivered` | SMS successfully delivered |
| `failed` | SMS delivery failed |
| `pending` | SMS delivery pending |
| `sent` | SMS sent to carrier |
| `queued` | SMS queued for sending |

### Error Payload Example

```json
{
  "reference": "eff_1696704123_abc123",
  "message_id": "msg_1696704123",
  "status": "failed",
  "error_code": "INVALID_NUMBER",
  "error_message": "Invalid phone number format",
  "failure_code": "INVALID_NUMBER",
  "failure_reason": "Invalid phone number format",
  "timestamp": "2025-10-07T19:53:02.636Z",
  "msisdn": "+27796222802",
  "cost": 0
}
```

---

## 🧪 How to Test the Webhook

### Prerequisites

1. **Backend server must be running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Database must be connected**

3. **Port 8000 must be accessible**

### Option 1: Using Test Script

```bash
node test/sms/test-webhook-endpoint.js
```

**Expected Output:**
```
✅ Test 1: Delivery Success
✅ Test 2: Delivery Failed
✅ Test 3: Delivery Pending
✅ Test 4: Test Endpoint
✅ Test 5: Minimal Payload

🎉 All webhook tests passed!
```

### Option 2: Using curl

**Test Delivery Success:**
```bash
curl -X POST http://localhost:8000/api/v1/sms-webhooks/delivery/json-applink \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "eff_test_123",
    "message_id": "msg_test_123",
    "status": "delivered",
    "delivered_at": "2025-10-07T19:53:02.589Z",
    "msisdn": "+27796222802",
    "cost": 0.15
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "JSON Applink delivery webhook processed successfully",
  "message_id": "eff_test_123",
  "timestamp": "2025-10-07T19:53:02.589Z"
}
```

### Option 3: Using Postman

1. **Method:** POST
2. **URL:** `http://localhost:8000/api/v1/sms-webhooks/delivery/json-applink`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (raw JSON):**
   ```json
   {
     "reference": "eff_test_123",
     "message_id": "msg_test_123",
     "status": "delivered",
     "delivered_at": "2025-10-07T19:53:02.589Z",
     "msisdn": "+27796222802",
     "cost": 0.15
   }
   ```

---

## 🔧 Configuration for JSON Applink

### Step 1: Get Public URL

For local development, use **ngrok** to expose your local server:

```bash
# Install ngrok (if not installed)
# Download from https://ngrok.com/download

# Start ngrok
ngrok http 8000
```

**Output:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8000
```

### Step 2: Configure JSON Applink

Contact JSON Applink support and provide them with your webhook URL:

**Development (ngrok):**
```
https://abc123.ngrok.io/api/v1/sms-webhooks/delivery/json-applink
```

**Production:**
```
https://your-domain.com/api/v1/sms-webhooks/delivery/json-applink
```

### Step 3: Update .env.postgres

```bash
# SMS Webhook Configuration
SMS_CALLBACK_URL=https://your-domain.com/api/v1/sms-webhooks/delivery/json-applink
```

---

## 📊 Webhook Features

### 1. Automatic Logging

All webhook requests are automatically logged to the database:

**Table:** `sms_webhook_log`

**Columns:**
- `id` - Auto-increment ID
- `provider_name` - Provider name (JSON Applink)
- `request_method` - HTTP method (POST)
- `request_headers` - Request headers (JSON)
- `request_body` - Request body (JSON)
- `request_ip` - Sender IP address
- `response_status` - Response status code
- `response_message` - Response message
- `processed_successfully` - Success flag
- `processing_error` - Error details (if failed)
- `message_id` - SMS message ID
- `received_at` - Timestamp received
- `processed_at` - Timestamp processed

### 2. Delivery Tracking

Webhook data is processed and stored in:

**Table:** `sms_delivery_tracking`

**Columns:**
- `id` - Auto-increment ID
- `message_id` - SMS message ID
- `provider_message_id` - Provider's message ID
- `status` - Delivery status
- `error_code` - Error code (if failed)
- `error_message` - Error message (if failed)
- `delivery_timestamp` - Delivery timestamp
- `retry_count` - Number of retries
- `cost` - SMS cost
- `created_at` - Record created
- `updated_at` - Record updated

### 3. Real-time Updates

When a webhook is received:
1. Request is logged to `sms_webhook_log`
2. Delivery status is updated in `sms_delivery_tracking`
3. SMS record is updated in `sms_messages` table
4. Response is sent back to JSON Applink

---

## 🔍 Monitoring Webhooks

### View Webhook Logs

**Endpoint:** `GET /api/v1/sms-webhooks/logs`

**Query Parameters:**
- `provider` - Filter by provider (e.g., "JSON Applink")
- `limit` - Number of records (default: 50)
- `offset` - Pagination offset (default: 0)

**Example:**
```bash
curl http://localhost:8000/api/v1/sms-webhooks/logs?provider=JSON%20Applink&limit=10
```

### View Delivery Statistics

**Endpoint:** `GET /api/v1/sms-webhooks/stats`

**Query Parameters:**
- `timeframe` - hour, day, week, month (default: day)

**Example:**
```bash
curl http://localhost:8000/api/v1/sms-webhooks/stats?timeframe=day
```

---

## 🆘 Troubleshooting

### Issue: Webhook Not Receiving Callbacks

**Possible Causes:**
1. Backend server not running
2. Firewall blocking incoming connections
3. JSON Applink not configured with correct URL
4. Using localhost URL (not accessible from internet)

**Solutions:**
1. Start backend: `cd backend && npm run dev`
2. Use ngrok for local testing: `ngrok http 8000`
3. Verify URL with JSON Applink support
4. Use public domain in production

### Issue: Webhook Returns 500 Error

**Possible Causes:**
1. Database connection issues
2. Missing database tables
3. Invalid webhook payload format

**Solutions:**
1. Check database connection
2. Run database migrations
3. Check webhook logs: `GET /api/v1/sms-webhooks/logs`

### Issue: Webhook Logs Not Showing

**Possible Causes:**
1. `sms_webhook_log` table doesn't exist
2. Database permissions issue

**Solutions:**
1. Run database migrations
2. Check database user permissions

---

## 📚 Related Endpoints

### Test Webhook Endpoint

**Endpoint:** `POST /api/v1/sms-webhooks/test/:provider`

**Purpose:** Test webhook processing without authentication

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/sms-webhooks/test/json-applink \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "test_123",
    "status": "delivered"
  }'
```

### Generic Webhook Endpoint

**Endpoint:** `POST /api/v1/sms-webhooks/delivery/:provider`

**Purpose:** Generic webhook for any provider

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/sms-webhooks/delivery/json-applink \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "test_123",
    "status": "delivered"
  }'
```

---

## ✨ Summary

**Webhook Endpoint:** ✅ Already implemented and working

**Location:** `backend/src/routes/smsWebhooks.ts` (Line 104)

**URL:** `POST /api/v1/sms-webhooks/delivery/json-applink`

**Features:**
- ✅ Automatic request logging
- ✅ Delivery status tracking
- ✅ Error handling
- ✅ Real-time updates
- ✅ Monitoring endpoints

**To Test:**
1. Start backend: `cd backend && npm run dev`
2. Run test: `node test/sms/test-webhook-endpoint.js`
3. Check logs: `GET /api/v1/sms-webhooks/logs`

**For Production:**
1. Use ngrok for local testing
2. Configure JSON Applink with public URL
3. Monitor webhook logs regularly
4. Set up alerts for failed webhooks

---

**Last Updated:** 2025-10-07  
**Status:** ✅ READY TO USE

