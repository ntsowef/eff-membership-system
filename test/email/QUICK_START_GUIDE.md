# 🚀 Email Template Test - Quick Start Guide

Get started testing email templates in 5 minutes!

---

## ⚡ Quick Start (3 Steps)

### Step 1: Configure SMTP

Edit `.env.postgres` and add:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM=noreply@eff.org.za
```

### Step 2: Run Test

```bash
cd backend
npm run test:email -- --email your-email@example.com
```

### Step 3: Check Your Inbox

You should receive 11 test emails!

---

## 📧 Gmail Setup (Recommended)

### 1. Enable 2-Factor Authentication
- Go to [Google Account Security](https://myaccount.google.com/security)
- Enable 2-Step Verification

### 2. Generate App Password
- Go to [App Passwords](https://myaccount.google.com/apppasswords)
- Select "Mail" and "Other (Custom name)"
- Enter "EFF Membership System"
- Click "Generate"
- Copy the 16-character password

### 3. Update .env.postgres
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # Your 16-char app password
SMTP_SECURE=false
SMTP_FROM=noreply@eff.org.za
```

---

## 🎯 Common Use Cases

### Test All Templates
```bash
npm run test:email -- --email john@example.com
```

### Test Single Template
```bash
npm run test:email -- --email john@example.com --template welcome-email
```

### Test Without SMTP (Development)
Just run the command without configuring SMTP. Emails will be logged to console.

---

## 📋 Available Templates

| Template ID | Description |
|-------------|-------------|
| `welcome-email` | Welcome email for new members |
| `application-submitted` | Application submitted confirmation |
| `application-under-review` | Application under review |
| `application-approved` | Application approved |
| `application-rejected` | Application rejected |
| `expiry-reminder` | Expiry reminder (30+ days) |
| `expiry-warning` | Expiry warning (6-15 days) |
| `expiry-urgent` | Expiry urgent (1-5 days) |
| `password-reset` | Password reset email |
| `system-announcement-text` | System announcement (text) |
| `system-announcement-html` | System announcement (HTML) |

---

## 🐛 Troubleshooting

### ❌ "Email service not configured"
**Fix**: Add SMTP settings to `.env.postgres`

### ❌ "Authentication failed"
**Fix**: Use Gmail App Password (not regular password)

### ❌ "Connection timeout"
**Fix**: Check firewall, try port 587 or 465

### ❌ Emails not received
**Fix**: Check spam folder, verify email address

---

## 💡 Pro Tips

1. **Test in Development**: Run without SMTP config to see email content in console
2. **Rate Limiting**: Script automatically waits 2 seconds between emails
3. **Single Template**: Test one template at a time during development
4. **Check Spam**: First test emails might go to spam folder
5. **Use Test Email**: Use a test email address, not production

---

## 📞 Need Help?

1. Read the full [README.md](./README.md)
2. Check [EXAMPLE_OUTPUT.md](./EXAMPLE_OUTPUT.md) for expected output
3. Review [EMAIL_TEST_SUITE_SUMMARY.md](./EMAIL_TEST_SUITE_SUMMARY.md)
4. Contact system administrator

---

## ✅ Success Checklist

- [ ] SMTP configured in `.env.postgres`
- [ ] Gmail App Password generated (if using Gmail)
- [ ] Backend dependencies installed (`npm install`)
- [ ] Test command runs without errors
- [ ] Emails received in inbox
- [ ] All 11 templates tested successfully

---

## 🎉 You're Ready!

Once you see this output, you're all set:

```
╔════════════════════════════════════════════════════════════════╗
║                      Test Summary                              ║
╚════════════════════════════════════════════════════════════════╝

Total Tests: 11
Passed: 11
Failed: 0
```

**Happy Testing! 🚀**

