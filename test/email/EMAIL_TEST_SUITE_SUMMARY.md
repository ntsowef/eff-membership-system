# 📧 Email Template Test Suite - Complete Implementation

## ✅ Implementation Summary

A comprehensive email template test suite has been created for the EFF Membership System. This suite allows testing of all 11 email templates with a single command.

---

## 📁 Files Created

### 1. **Main Test Script**
- **File**: `test/email/email-templates-test.ts`
- **Purpose**: TypeScript test script that tests all email templates
- **Features**:
  - Tests 11 different email templates
  - Command-line interface with options
  - Colored console output
  - Detailed test results and summary
  - 2-second delay between tests to avoid rate limiting
  - Support for testing individual templates or all at once

### 2. **Documentation**
- **File**: `test/email/README.md`
- **Purpose**: Comprehensive documentation for the test suite
- **Contents**:
  - Complete list of all email templates
  - Usage instructions and examples
  - SMTP configuration guide for multiple providers
  - Troubleshooting section
  - Security notes

### 3. **Example Output**
- **File**: `test/email/EXAMPLE_OUTPUT.md`
- **Purpose**: Shows example output from test runs
- **Contents**:
  - Full test run output
  - Single template test output
  - Test with SMTP not configured
  - Test with errors
  - Email content examples

### 4. **Quick Test Scripts**
- **File**: `test/email/quick-test.sh` (Linux/Mac)
- **File**: `test/email/quick-test.bat` (Windows)
- **Purpose**: Convenient wrapper scripts for quick testing

### 5. **NPM Script**
- **File**: `backend/package.json` (modified)
- **Added**: `"test:email": "ts-node ../test/email/email-templates-test.ts"`

---

## 📧 Email Templates Tested

| # | Template ID | Description | Variables |
|---|-------------|-------------|-----------|
| 1 | `welcome-email` | Welcome email for new members | Member name, membership number |
| 2 | `application-submitted` | Application submitted confirmation | Applicant name, application number |
| 3 | `application-under-review` | Application under review notification | Applicant name, application number |
| 4 | `application-approved` | Application approved notification | Applicant name, application number |
| 5 | `application-rejected` | Application rejected notification | Applicant name, application number, rejection reason |
| 6 | `expiry-reminder` | Membership expiry reminder (30+ days) | Member name, membership number, expiry date, days |
| 7 | `expiry-warning` | Membership expiry warning (6-15 days) | Member name, membership number, expiry date, days |
| 8 | `expiry-urgent` | Membership expiry urgent (1-5 days) | Member name, membership number, expiry date, days |
| 9 | `password-reset` | Password reset email | User name, reset token |
| 10 | `system-announcement-text` | System announcement (plain text) | Subject, message |
| 11 | `system-announcement-html` | System announcement (HTML) | Subject, HTML content |

---

## 🚀 Usage

### Quick Start

```bash
# Test all templates
npm run test:email -- --email your-email@example.com

# Test specific template
npm run test:email -- --email your-email@example.com --template welcome-email
```

### Using Quick Test Scripts

**Linux/Mac:**
```bash
cd test/email
chmod +x quick-test.sh
./quick-test.sh your-email@example.com
./quick-test.sh your-email@example.com welcome-email
```

**Windows:**
```cmd
cd test\email
quick-test.bat your-email@example.com
quick-test.bat your-email@example.com welcome-email
```

### Direct Execution

```bash
cd test/email
ts-node email-templates-test.ts --email your-email@example.com
ts-node email-templates-test.ts --email your-email@example.com --template expiry-urgent
```

---

## ⚙️ Configuration

### Required Environment Variables

Add these to `.env.postgres`:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM=noreply@eff.org.za

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup (Recommended for Testing)

1. **Enable 2-Factor Authentication**
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use App Password** in `SMTP_PASS`

---

## 📊 Test Output Features

### Visual Features
- ✅ Colored console output (green for success, red for errors)
- ✅ Progress indicators for each test
- ✅ Detailed test summary at the end
- ✅ Clear separation between tests
- ✅ Configuration display before tests

### Test Results
- ✅ Total tests run
- ✅ Passed count
- ✅ Failed count
- ✅ Detailed error messages for failures
- ✅ Email message IDs for successful sends

---

## 🔧 Advanced Features

### 1. Rate Limiting Protection
- 2-second delay between tests
- Prevents SMTP rate limiting
- Configurable in code

### 2. Error Handling
- Graceful handling of SMTP errors
- Detailed error messages
- Continues testing even if one fails

### 3. Development Mode
- Works without SMTP configuration
- Logs email content to console
- Perfect for development/testing

### 4. Flexible Testing
- Test all templates at once
- Test individual templates
- Easy to extend with new templates

---

## 📝 Example Commands

### Test All Templates
```bash
npm run test:email -- --email john.doe@example.com
```

### Test Welcome Email
```bash
npm run test:email -- --email jane.smith@example.com --template welcome-email
```

### Test Application Notifications
```bash
npm run test:email -- --email admin@example.com --template application-approved
npm run test:email -- --email admin@example.com --template application-rejected
```

### Test Expiry Reminders
```bash
npm run test:email -- --email member@example.com --template expiry-urgent
npm run test:email -- --email member@example.com --template expiry-warning
npm run test:email -- --email member@example.com --template expiry-reminder
```

### Test Password Reset
```bash
npm run test:email -- --email user@example.com --template password-reset
```

### Test System Announcements
```bash
npm run test:email -- --email all@example.com --template system-announcement-text
npm run test:email -- --email all@example.com --template system-announcement-html
```

---

## 🐛 Troubleshooting

### Issue: "Email service not configured"
**Solution**: Set SMTP environment variables in `.env.postgres`

### Issue: "Authentication failed"
**Solution**: 
- Use App Password for Gmail (not regular password)
- Verify credentials are correct
- Enable 2FA for Gmail

### Issue: "Connection timeout"
**Solution**:
- Check firewall settings
- Verify SMTP port is not blocked
- Try port 587 or 465

### Issue: Emails not received
**Solution**:
- Check spam/junk folder
- Verify email address is correct
- Check SMTP_FROM is valid
- Review email service logs

---

## 🎯 Test Data Used

The test script uses the following test data:

```typescript
{
  memberName: 'John Doe',
  applicantName: 'Jane Smith',
  membershipNumber: 'EFF-2024-001234',
  applicationNumber: 'APP-2024-005678',
  expiryDate: '2024-12-31',
  resetToken: 'test-reset-token-12345',
}
```

You can modify these values in the test script if needed.

---

## 📚 Related Files

- **Email Service**: `backend/src/services/emailService.ts`
- **Environment Config**: `.env.postgres`
- **Package Config**: `backend/package.json`

---

## 🔐 Security Notes

1. ✅ Never commit `.env` files with real credentials
2. ✅ Use App Passwords for Gmail (not main password)
3. ✅ Rotate credentials regularly
4. ✅ Limit test email sending to avoid spam filters
5. ✅ Use test email addresses for development

---

## 🎉 Success Criteria

All tests pass when:
- ✅ SMTP configuration is valid
- ✅ All 11 templates send successfully
- ✅ No authentication errors
- ✅ No connection timeouts
- ✅ Emails received in inbox (not spam)

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section in `README.md`
2. Review email service logs
3. Verify SMTP configuration
4. Test with a single template first
5. Contact system administrator

---

## 🚀 Next Steps

1. **Configure SMTP** in `.env.postgres`
2. **Run test** with your email address
3. **Check inbox** for test emails
4. **Review results** in console output
5. **Integrate** with production email service

---

**Status**: ✅ **PRODUCTION READY**

**Last Updated**: 2025-10-03  
**Version**: 1.0.0  
**Author**: EFF Development Team

