# Email Templates Test Suite

This directory contains comprehensive test scripts for all email templates in the EFF Membership System.

## 📧 Available Email Templates

The system includes the following email templates:

### 1. **Welcome Email**
- **Template ID**: `welcome-email`
- **Purpose**: Sent to new members when their membership is activated
- **Variables**: Member name, membership number

### 2. **Application Status Notifications**

#### a. Application Submitted
- **Template ID**: `application-submitted`
- **Purpose**: Confirmation email when application is submitted
- **Variables**: Applicant name, application number

#### b. Application Under Review
- **Template ID**: `application-under-review`
- **Purpose**: Notification when application is being reviewed
- **Variables**: Applicant name, application number

#### c. Application Approved
- **Template ID**: `application-approved`
- **Purpose**: Congratulations email when application is approved
- **Variables**: Applicant name, application number

#### d. Application Rejected
- **Template ID**: `application-rejected`
- **Purpose**: Notification when application is rejected
- **Variables**: Applicant name, application number, rejection reason

### 3. **Membership Expiry Reminders**

#### a. Expiry Reminder (30+ days)
- **Template ID**: `expiry-reminder`
- **Purpose**: Friendly reminder about upcoming expiry
- **Variables**: Member name, membership number, expiry date, days until expiry

#### b. Expiry Warning (6-15 days)
- **Template ID**: `expiry-warning`
- **Purpose**: Warning about approaching expiry
- **Variables**: Member name, membership number, expiry date, days until expiry

#### c. Expiry Urgent (1-5 days)
- **Template ID**: `expiry-urgent`
- **Purpose**: Urgent notification about imminent expiry
- **Variables**: Member name, membership number, expiry date, days until expiry

### 4. **Password Reset**
- **Template ID**: `password-reset`
- **Purpose**: Password reset link for users
- **Variables**: User name, reset token, reset URL

### 5. **System Announcements**

#### a. Text Announcement
- **Template ID**: `system-announcement-text`
- **Purpose**: Plain text system announcements
- **Variables**: Subject, message content

#### b. HTML Announcement
- **Template ID**: `system-announcement-html`
- **Purpose**: Rich HTML system announcements
- **Variables**: Subject, HTML content

---

## 🚀 Usage

### Prerequisites

1. **Configure SMTP Settings** in `.env.postgres`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_SECURE=false
   SMTP_FROM=noreply@eff.org.za
   ```

2. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

### Running Tests

#### Test All Templates
```bash
npm run test:email -- --email your-email@example.com
```

#### Test Specific Template
```bash
npm run test:email -- --email your-email@example.com --template welcome-email
```

#### Using ts-node Directly
```bash
cd test/email
ts-node email-templates-test.ts --email your-email@example.com
```

### Command Line Options

| Option | Description | Required |
|--------|-------------|----------|
| `--email <email>` | Email address to send test emails to | Yes |
| `--template <name>` | Test specific template only | No |
| `--all` | Send all templates in sequence (default) | No |

---

## 📝 Examples

### Example 1: Test All Templates
```bash
npm run test:email -- --email john.doe@example.com
```

This will send all 11 email templates to `john.doe@example.com` with a 2-second delay between each email.

### Example 2: Test Welcome Email Only
```bash
npm run test:email -- --email jane.smith@example.com --template welcome-email
```

### Example 3: Test Password Reset
```bash
npm run test:email -- --email admin@example.com --template password-reset
```

### Example 4: Test Expiry Notifications
```bash
npm run test:email -- --email member@example.com --template expiry-urgent
npm run test:email -- --email member@example.com --template expiry-warning
npm run test:email -- --email member@example.com --template expiry-reminder
```

---

## 🔧 Configuration

### Gmail Setup (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Update .env.postgres**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_SECURE=false
   SMTP_FROM=noreply@eff.org.za
   ```

### Other SMTP Providers

#### Outlook/Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_SECURE=false
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
```

---

## 📊 Test Output

The test script provides detailed output:

```
╔════════════════════════════════════════════════════════════════╗
║           EFF Membership System - Email Template Test         ║
╚════════════════════════════════════════════════════════════════╝

Test Configuration:
  Target Email: john@example.com
  SMTP Host: smtp.gmail.com
  SMTP Port: 587
  SMTP User: noreply@eff.org.za

Testing email configuration...
✓ Email configuration is valid

Running 11 test(s)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test: Welcome Email for New Members
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing: Welcome Email
✅ Email sent successfully: <message-id>
✓ Success

...

╔════════════════════════════════════════════════════════════════╗
║                      Test Summary                              ║
╚════════════════════════════════════════════════════════════════╝

Total Tests: 11
Passed: 11
Failed: 0
```

---

## 🐛 Troubleshooting

### Issue: "Email service not configured"
**Solution**: Check that all SMTP environment variables are set in `.env.postgres`

### Issue: "Authentication failed"
**Solution**: 
- For Gmail: Use App Password, not regular password
- Verify SMTP credentials are correct
- Check if 2FA is enabled (required for Gmail)

### Issue: "Connection timeout"
**Solution**:
- Check firewall settings
- Verify SMTP port is not blocked
- Try different SMTP port (587 or 465)

### Issue: "Invalid email format"
**Solution**: Ensure email address follows format: `user@domain.com`

### Issue: Emails not received
**Solution**:
- Check spam/junk folder
- Verify recipient email address is correct
- Check SMTP_FROM address is valid
- Review email service logs

---

## 📁 File Structure

```
test/email/
├── README.md                    # This file
├── email-templates-test.ts      # Main test script
└── sample-outputs/              # Sample email outputs (optional)
    ├── welcome-email.html
    ├── application-approved.html
    └── ...
```

---

## 🔐 Security Notes

1. **Never commit** `.env` files with real credentials
2. **Use App Passwords** for Gmail (not your main password)
3. **Rotate credentials** regularly
4. **Limit test email** sending to avoid spam filters
5. **Use test email addresses** for development

---

## 📚 Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Email Service Implementation](../../backend/src/services/emailService.ts)

---

## 🤝 Contributing

When adding new email templates:

1. Add template method to `emailService.ts`
2. Add test case to `email-templates-test.ts`
3. Update this README with template details
4. Test thoroughly before committing

---

## 📞 Support

For issues or questions:
- Check troubleshooting section above
- Review email service logs
- Contact system administrator

---

**Last Updated**: 2025-10-03
**Version**: 1.0.0

