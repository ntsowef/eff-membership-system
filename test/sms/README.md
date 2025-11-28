# SMS Testing Scripts

This directory contains test scripts for the JSON Applink SMS API integration.

## 📋 Prerequisites

1. **Environment Configuration**
   - Ensure `.env.postgres` file is configured with JSON Applink credentials:
     ```env
     SMS_PROVIDER=json-applink
     JSON_APPLINK_API_URL=https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
     JSON_APPLINK_API_KEY=EFFAPPLINK
     JSON_APPLINK_USERNAME=effapplink
     JSON_APPLINK_PASSWORD=R6W68DHSQ
     JSON_APPLINK_FROM_NUMBER=+27123456789
     ```

2. **Dependencies**
   - Node.js installed (v14 or higher)
   - Required npm packages: `axios`, `dotenv`

## 🚀 Running the Tests

### Option 1: JavaScript Version (Recommended)

```bash
# From the project root directory
node test/sms/test-json-applink-sms.js
```

### Option 2: TypeScript Version

```bash
# From the project root directory
npx ts-node test/sms/test-json-applink-sms.ts
```

### Option 3: From Backend Directory

```bash
# Navigate to backend directory
cd backend

# Run the test
node ../test/sms/test-json-applink-sms.js
```

## 📱 Test Details

The test script will:

1. ✅ Load configuration from `.env.postgres`
2. ✅ Validate all required credentials are present
3. ✅ Test API connection
4. ✅ Send a test SMS to: **27796222802**
5. ✅ Display the response from the API

### Test Message

The script sends a test message like:
```
Hello from EFF Membership System! This is a test SMS sent at [timestamp]. 
If you receive this, the SMS integration is working correctly.
```

## 📊 Expected Output

### Successful Test

```
╔════════════════════════════════════════════════════════════╗
║         JSON Applink SMS API Test Script                  ║
║         EFF Membership Management System                  ║
╚════════════════════════════════════════════════════════════╝

✅ Configuration loaded successfully
📡 API URL: https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
🔑 API Key: EFFA***
👤 Username: effapplink
📱 From Number: EFF

🔍 Testing API connection...
✅ API is reachable (Status: 200)

============================================================
SENDING TEST SMS
============================================================

📤 Sending SMS...
   To: 27796222802
   Message: Hello from EFF Membership System! ...
   From: EFF

✅ SMS sent successfully! (1234ms)
📥 Response:
{
  "message_id": "abc123",
  "status": "sent"
}

============================================================
TEST RESULT
============================================================
✅ TEST PASSED
📨 Message ID: abc123
📱 Please check your phone for the test SMS

============================================================

✅ Test script completed
```

### Failed Test

```
❌ SMS sending failed!
📥 Error Response:
   Status: 401
   Data: {
     "error": "Invalid credentials"
   }

============================================================
TEST RESULT
============================================================
❌ TEST FAILED
⚠️ Error: Invalid credentials

💡 Troubleshooting Tips:
   1. Verify your API credentials in .env.postgres
   2. Check if the API URL is correct
   3. Ensure your account has sufficient credits
   4. Verify the phone number format (should include country code)
   5. Check your network connection
   6. Contact JSON Applink support if the issue persists
```

## 🔧 Customization

### Change Test Phone Number

Edit the script and modify this line:

```javascript
const testPhoneNumber = '27796222802'; // Change to your number
```

### Change Test Message

Edit the script and modify this line:

```javascript
const testMessage = 'Your custom test message here';
```

### Adjust API Payload

If the JSON Applink API requires different fields, modify the `payload` object in the `sendTestSMS` method:

```javascript
const payload = {
  username: this.username,
  password: this.password,
  api_key: this.apiKey,
  to: to,
  from: this.fromNumber,
  message: message,
  // Add additional fields as required by your API
};
```

## 🐛 Troubleshooting

### Error: Missing required environment variables

**Solution:** Ensure all required variables are set in `.env.postgres`:
- `JSON_APPLINK_API_URL`
- `JSON_APPLINK_API_KEY`
- `JSON_APPLINK_USERNAME`
- `JSON_APPLINK_PASSWORD`

### Error: No response from server

**Possible causes:**
1. Incorrect API URL
2. Network connectivity issues
3. Firewall blocking outbound connections
4. API server is down

**Solution:** 
- Verify the API URL is correct
- Check your internet connection
- Contact JSON Applink support

### Error: Invalid credentials

**Solution:**
- Double-check your API credentials
- Ensure there are no extra spaces in the credentials
- Verify your account is active with JSON Applink

### Error: Insufficient credits

**Solution:**
- Check your account balance with JSON Applink
- Top up your account if needed

## 📚 API Documentation

For detailed JSON Applink API documentation, contact your JSON Applink account manager or visit their developer portal.

## 🔐 Security Notes

- Never commit `.env.postgres` file to version control
- Keep your API credentials secure
- Rotate credentials regularly
- Use environment-specific credentials (dev, staging, production)

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the API response for error details
3. Contact JSON Applink support: [support contact]
4. Check the main application logs for additional context

## 🔗 Related Files

- `backend/src/services/smsService.ts` - SMS service implementation
- `backend/src/routes/smsWebhooks.ts` - SMS webhook handlers
- `backend/src/config/config.ts` - Configuration loader
- `.env.postgres` - Environment configuration

## ✅ Next Steps

After successful testing:

1. ✅ Verify SMS was received on the test phone
2. ✅ Check the webhook callback URL is configured
3. ✅ Test the full SMS flow in the application
4. ✅ Monitor SMS delivery rates
5. ✅ Set up production credentials when ready

