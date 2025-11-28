# 🚀 Quick Start: Test JSON Applink SMS

## ⚡ Run the Test (3 Easy Steps)

### Step 1: Ensure Dependencies are Installed

```bash
npm install
```

### Step 2: Run the Test Script

```bash
npm run test:sms
```

Or directly:

```bash
node test/sms/test-json-applink-sms.js
```

### Step 3: Check Your Phone

You should receive an SMS at **27796222802** within a few seconds!

---

## 📋 What the Test Does

1. ✅ Loads your JSON Applink credentials from `.env.postgres`
2. ✅ Tests connection to the API
3. ✅ Sends a test SMS to: **27796222802**
4. ✅ Shows you the API response

---

## 🎯 Current Configuration

Your `.env.postgres` is configured with:

```env
SMS_PROVIDER=json-applink
JSON_APPLINK_API_URL=https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
JSON_APPLINK_API_KEY=EFFAPPLINK
JSON_APPLINK_USERNAME=effapplink
JSON_APPLINK_PASSWORD=R6W68DHSQ
JSON_APPLINK_FROM_NUMBER=+27123456789
```

---

## ✅ Expected Result

If successful, you'll see:

```
✅ TEST PASSED
📨 Message ID: [some_id]
📱 Please check your phone for the test SMS
```

And you'll receive an SMS like:

```
Hello from EFF Membership System! This is a test SMS sent at [timestamp]. 
If you receive this, the SMS integration is working correctly.
```

---

## ❌ If It Fails

Check these common issues:

1. **Invalid Credentials**
   - Verify credentials in `.env.postgres`
   - Contact JSON Applink support

2. **No Response from Server**
   - Check your internet connection
   - Verify the API URL is correct

3. **Insufficient Credits**
   - Check your account balance
   - Top up if needed

---

## 🔧 Customize the Test

### Change Phone Number

Edit `test/sms/test-json-applink-sms.js`:

```javascript
const testPhoneNumber = '27796222802'; // Change this
```

### Change Message

Edit `test/sms/test-json-applink-sms.js`:

```javascript
const testMessage = 'Your custom message here';
```

---

## 📞 Need Help?

- Check `test/sms/README.md` for detailed documentation
- Review the API response for error details
- Contact JSON Applink support

---

## 🎉 Next Steps

After successful test:

1. ✅ Verify SMS received
2. ✅ Configure webhook URL in JSON Applink dashboard
3. ✅ Test SMS in the main application
4. ✅ Monitor delivery rates

---

**Happy Testing! 📱**

