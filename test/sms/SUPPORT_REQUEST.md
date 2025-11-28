# JSON Applink / GVI SMS API - Support Request

**Date:** 2025-10-07  
**Client:** EFF Membership Management System  
**Issue:** Authentication Failure

---

## 🔴 Problem Description

We are unable to authenticate with the JSON Applink SMS API. All authentication attempts result in:

```xml
<gviRequestResult>
    <resultCode>1</resultCode>
    <resultText>Invalid Authentication: Failed Authentication</resultText>
</gviRequestResult>
```

---

## 📋 Current Configuration

**API Endpoint:**
```
https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
```

**Credentials:**
- **Username:** `effapplink`
- **Password:** `R6W68DHSQ`
- **API Key:** `EFFAPPLINK`

---

## 🧪 Tests Performed

We have tested multiple authentication formats:

### Test 1: Standard JSON POST with Username/Password
```json
{
  "username": "effapplink",
  "password": "R6W68DHSQ",
  "to": "27796222802",
  "from": "+27123456789",
  "message": "Test SMS"
}
```
**Result:** `Invalid Authentication: Failed Authentication`

### Test 2: API Key as Username
```json
{
  "username": "EFFAPPLINK",
  "password": "R6W68DHSQ",
  "to": "27796222802",
  "from": "+27123456789",
  "message": "Test SMS"
}
```
**Result:** `Invalid Authentication: Failed Authentication`

### Test 3: Alternative Field Names
```json
{
  "username": "effapplink",
  "password": "R6W68DHSQ",
  "msisdn": "27796222802",
  "sender": "+27123456789",
  "text": "Test SMS"
}
```
**Result:** `Invalid Authentication: Failed Authentication`

### Test 4: GET Request with URL Parameters
**Result:** `405 Method Not Allowed` (API only accepts POST)

### Test 5: Form-Encoded POST
**Result:** `415 Unsupported Media Type` (API only accepts JSON)

---

## ✅ What We Confirmed

1. ✅ API endpoint is reachable
2. ✅ API accepts JSON POST requests
3. ✅ API returns XML responses
4. ✅ API rejects GET and form-encoded requests
5. ❌ **Authentication is failing consistently**

---

## ❓ Questions for Support

1. **Are the provided credentials correct and active?**
   - Username: `effapplink`
   - Password: `R6W68DHSQ`
   - API Key: `EFFAPPLINK`

2. **Does the account need to be activated or provisioned?**

3. **Is there IP whitelisting enabled on the account?**
   - If yes, please whitelist our IP address

4. **What is the correct authentication format?**
   - Should we use username/password in the JSON body?
   - Should we use API key authentication?
   - Should we use HTTP headers for authentication?

5. **Can you provide:**
   - Official API documentation
   - Working curl or code example
   - Account status confirmation

---

## 📞 Contact Information

**Organization:** EFF (Economic Freedom Fighters)  
**System:** Membership Management System  
**Contact:** [Your contact details]  
**Phone:** 27796222802  

---

## 🚨 Urgency

This is blocking our SMS integration for the membership system. We need to send SMS notifications to members for:
- Membership confirmations
- Meeting notifications
- Important announcements

**Please respond urgently with:**
1. Credential verification
2. Account activation status
3. Working API example
4. Any additional setup requirements

---

## 📎 Technical Details

**Request Format:**
- Method: POST
- Content-Type: application/json
- Endpoint: https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/

**Response Format:**
- Content-Type: application/xml
- Status Code: 200
- Error Code: 1 (Invalid Authentication)

**Test Phone Number:** 27796222802  
**Test Message:** "Test SMS from EFF System"

---

## 🔧 What We Need

1. ✅ Confirmation that credentials are correct
2. ✅ Account activation (if required)
3. ✅ IP whitelisting (if required)
4. ✅ Official API documentation
5. ✅ Working code example (curl, PHP, Node.js, or Python)
6. ✅ Any additional setup steps

---

**Thank you for your urgent assistance!**

---

## Appendix: Full Error Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gviRequestResult>
    <resultCode>1</resultCode>
    <resultText>Invalid Authentication: Failed Authentication</resultText>
</gviRequestResult>
```

**HTTP Status:** 200 OK  
**Response Time:** ~160ms  
**API Version:** v2

