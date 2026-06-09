import nodemailer from 'nodemailer';
import { config } from '../config/config';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email template interface
interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Email data interface
interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

// Email service class
export class EmailService {
  private transporter!: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  // Initialize email transporter
  private initializeTransporter(): void {
    try {
      // Support both SMTP_* and MAIL_* environment variables
      const host = process.env.SMTP_HOST || process.env.MAIL_HOST || 'localhost';
      const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '587');
      const user = process.env.SMTP_USER || process.env.MAIL_USERNAME || '';
      const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || '';
      const secure = process.env.SMTP_SECURE === 'true' || process.env.MAIL_ENCRYPTION === 'ssl';

      const emailConfig: any = {
        host,
        port,
        secure,
        auth: {
          user,
          pass
        },
        tls: {
          rejectUnauthorized: false // Accept self-signed certificates
        }
      };

      // Check if email is configured
      if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('⚠️  Email service not configured. Email notifications will be logged only.');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;

      // Verify connection
      this.verifyConnection();
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  // Verify email connection
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service verification failed:', error);
      this.isConfigured = false;
    }
  }

  // Send email
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ Email NOT sent (service not configured):', {
          to: emailData.to,
          subject: emailData.subject
        });
        return false; // Service not configured — email was NOT delivered
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || process.env.MAIL_USERNAME,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // Send application status notification
  async sendApplicationStatusNotification(
    email: string,
    applicantName: string,
    applicationNumber: string,
    status: string,
    rejectionReason?: string,
    membershipNumber?: string
  ): Promise<boolean> {
    const templates = {
      'Submitted': {
        subject: 'EFF Membership Application Received - ' + applicationNumber,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #DC143C; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .app-number { background-color: #fff; padding: 15px; border-left: 4px solid #DC143C; margin: 20px 0; font-size: 18px; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .important { color: #DC143C; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Economic Freedom Fighters</h1>
                <p>Membership Application Confirmation</p>
              </div>
              <div class="content">
                <h2>Application Submitted Successfully! ✅</h2>
                <p>Dear <strong>${applicantName}</strong>,</p>
                <p>Thank you for applying to join the Economic Freedom Fighters (EFF). Your membership application has been received and is being processed.</p>

                <div class="app-number">
                  📋 Your Application Reference Number: <span class="important">${applicationNumber}</span>
                </div>

                <p><strong>Please keep this reference number safe.</strong> You will need it to:</p>
                <ul>
                  <li>Track your application status</li>
                  <li>Make payment for your membership</li>
                  <li>Communicate with our membership team</li>
                </ul>

                <h3>What Happens Next?</h3>
                <ol>
                  <li><strong>Payment Processing:</strong> Complete your membership payment using your application reference number</li>
                  <li><strong>Document Verification:</strong> Our team will verify your submitted information</li>
                  <li><strong>Application Review:</strong> Your application will be reviewed within 5-10 business days</li>
                  <li><strong>Notification:</strong> You will receive an SMS and email notification once your application is approved</li>
                </ol>

                <p>If you have any questions, please contact our membership team and quote your application reference number: <strong>${applicationNumber}</strong></p>

                <p style="margin-top: 30px;">Aluta Continua!<br><strong>EFF Membership Team</strong></p>
              </div>
              <div class="footer">
                <p>Economic Freedom Fighters | Membership Department</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      'Under Review': {
        subject: 'Application Under Review - ' + applicationNumber,
        html: `
          <h2>Application Under Review</h2>
          <p>Dear ${applicantName},</p>
          <p>Your membership application <strong>${applicationNumber}</strong> is currently under review.</p>
          <p>We will notify you of the outcome shortly.</p>
          <br>
          <p>Best regards,<br>Membership Team</p>
        `
      },
      'Approved': {
        subject: '🎉 EFF Membership Approved - Welcome to the Movement!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #DC143C; color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .membership-box { background-color: #fff; border: 2px solid #DC143C; padding: 20px; margin: 20px 0; text-align: center; }
              .membership-number { font-size: 24px; font-weight: bold; color: #DC143C; margin: 10px 0; }
              .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
              .button { display: inline-block; padding: 12px 30px; background-color: #DC143C; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Congratulations!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px;">Your EFF Membership Has Been Approved</p>
              </div>

              <div class="content">
                <p>Dear <strong>${applicantName}</strong>,</p>

                <p>We are thrilled to inform you that your Economic Freedom Fighters (EFF) membership application <strong>${applicationNumber}</strong> has been <strong style="color: #DC143C;">APPROVED</strong>!</p>

                ${membershipNumber ? `
                <div class="membership-box">
                  <p style="margin: 0; font-size: 16px;">Your Membership Number</p>
                  <div class="membership-number">${membershipNumber}</div>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Please keep this number for your records</p>
                </div>
                ` : ''}

                <h3 style="color: #DC143C;">Welcome to the Movement!</h3>
                <p>You are now officially part of the Economic Freedom Fighters - a revolutionary movement committed to economic emancipation and social justice.</p>

                <h3 style="color: #DC143C;">What's Next?</h3>
                <ul>
                  <li>You will receive your membership card shortly</li>
                  <li>Stay connected with your local branch for meetings and activities</li>
                  <li>Participate in our campaigns and community programs</li>
                  <li>Access member-only resources and benefits</li>
                </ul>

                <p><strong>Together, we fight for economic freedom in our lifetime!</strong></p>

                <p style="margin-top: 30px;">
                  <strong>Aluta Continua!</strong><br>
                  EFF Membership Team
                </p>
              </div>

              <div class="footer">
                <p><strong>Economic Freedom Fighters</strong></p>
                <p>For inquiries, contact us at: info@effonline.org</p>
                <p>&copy; ${new Date().getFullYear()} Economic Freedom Fighters. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      'Rejected': {
        subject: 'Application Status - ' + applicationNumber,
        html: `
          <h2>Application Status Update</h2>
          <p>Dear ${applicantName},</p>
          <p>Thank you for your interest in joining our organization.</p>
          <p>After careful review, we regret to inform you that your membership application <strong>${applicationNumber}</strong> could not be approved at this time.</p>
          ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
          <p>You are welcome to reapply in the future.</p>
          <br>
          <p>Best regards,<br>Membership Team</p>
        `
      }
    };

    const template = templates[status as keyof typeof templates];
    if (!template) {
      console.error('Unknown application status for email template:', status);
      return false;
    }

    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html
    });
  }

  // Send membership expiry reminder
  async sendMembershipExpiryReminder(
    email: string,
    memberName: string,
    membershipNumber: string,
    expiryDate: string,
    daysUntilExpiry: number
  ): Promise<boolean> {
    const urgencyLevel = daysUntilExpiry <= 5 ? 'urgent' : daysUntilExpiry <= 15 ? 'warning' : 'reminder';
    
    const templates = {
      urgent: {
        subject: `URGENT: Membership Expires in ${daysUntilExpiry} days - ${membershipNumber}`,
        html: `
          <h2 style="color: #d32f2f;">URGENT: Membership Expiring Soon</h2>
          <p>Dear ${memberName},</p>
          <p>Your membership <strong>${membershipNumber}</strong> will expire in <strong style="color: #d32f2f;">${daysUntilExpiry} days</strong> on ${expiryDate}.</p>
          <p><strong>Please renew immediately to avoid interruption of services.</strong></p>
          <p>To renew your membership, please contact our membership team or visit our website.</p>
          <br>
          <p>Best regards,<br>Membership Team</p>
        `
      },
      warning: {
        subject: `Membership Renewal Required - Expires in ${daysUntilExpiry} days`,
        html: `
          <h2 style="color: #f57c00;">Membership Renewal Required</h2>
          <p>Dear ${memberName},</p>
          <p>Your membership <strong>${membershipNumber}</strong> will expire in <strong>${daysUntilExpiry} days</strong> on ${expiryDate}.</p>
          <p>Please renew your membership to continue enjoying our services.</p>
          <p>To renew your membership, please contact our membership team or visit our website.</p>
          <br>
          <p>Best regards,<br>Membership Team</p>
        `
      },
      reminder: {
        subject: `Membership Renewal Reminder - ${membershipNumber}`,
        html: `
          <h2>Membership Renewal Reminder</h2>
          <p>Dear ${memberName},</p>
          <p>This is a friendly reminder that your membership <strong>${membershipNumber}</strong> will expire on ${expiryDate} (in ${daysUntilExpiry} days).</p>
          <p>To ensure uninterrupted service, please renew your membership before the expiry date.</p>
          <p>To renew your membership, please contact our membership team or visit our website.</p>
          <br>
          <p>Best regards,<br>Membership Team</p>
        `
      }
    };

    const template = templates[urgencyLevel];
    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html
    });
  }

  // Send system announcement
  async sendSystemAnnouncement(
    emails: string[],
    subject: string,
    message: string,
    isHtml: boolean = false
  ): Promise<boolean> {
    const emailData: EmailData = {
      to: emails,
      subject: subject,
      [isHtml ? 'html' : 'text']: message
    };

    if (!isHtml) {
      // Add basic HTML wrapper for text messages
      emailData.html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>System Announcement</h2>
          <div style="white-space: pre-wrap;">${message}</div>
          <br>
          <p>Best regards,<br>System Administrator</p>
        </div>
      `;
    }

    return await this.sendEmail(emailData);
  }

  // Send password reset email
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    return await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>You have requested to reset your password. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>If you cannot click the link, copy and paste this URL into your browser:</p>
        <p>${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you did not request this password reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>System Administrator</p>
      `
    });
  }

  // Send welcome email for new members
  async sendWelcomeEmail(
    email: string,
    memberName: string,
    membershipNumber: string
  ): Promise<boolean> {
    return await this.sendEmail({
      to: email,
      subject: `Welcome to Our Organization - ${membershipNumber}`,
      html: `
        <h2>Welcome to Our Organization!</h2>
        <p>Dear ${memberName},</p>
        <p>Congratulations! Your membership has been activated.</p>
        <p><strong>Membership Number:</strong> ${membershipNumber}</p>
        <p>You now have access to all member benefits and services.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <br>
        <p>Welcome aboard!</p>
        <p>Best regards,<br>Membership Team</p>
      `
    });
  }

  // Send new user credentials email
  async sendNewUserCredentials(
    email: string,
    userName: string,
    loginEmail: string,
    temporaryPassword: string,
    adminLevel: string,
    roleName: string
  ): Promise<boolean> {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return await this.sendEmail({
      to: email,
      subject: 'Welcome to EFF Membership Portal - Your Account Details',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DC143C; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
            .credentials { background-color: #fff; padding: 20px; border-left: 4px solid #DC143C; margin: 20px 0; }
            .credentials p { margin: 10px 0; }
            .credentials strong { color: #DC143C; }
            .button { display: inline-block; padding: 12px 30px; background-color: #DC143C; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to EFF Membership Portal</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Your administrator account has been successfully created! You now have access to the EFF Membership Management System.</p>

              <div class="credentials">
                <h3>📋 Your Account Details:</h3>
                <p><strong>Name:</strong> ${userName}</p>
                <p><strong>Email/Username:</strong> ${loginEmail}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${temporaryPassword}</code></p>
                <p><strong>Admin Level:</strong> ${adminLevel.charAt(0).toUpperCase() + adminLevel.slice(1)}</p>
                <p><strong>Role:</strong> ${roleName}</p>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This is a temporary password. Please change it immediately after your first login.</li>
                  <li>Never share your password with anyone.</li>
                  <li>Use a strong, unique password for your account.</li>
                  <li>Enable Two-Factor Authentication (2FA) for additional security.</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${loginUrl}/login" class="button">Login to Your Account</a>
              </div>

              <h3>🚀 Getting Started:</h3>
              <ol>
                <li>Click the button above or visit: <a href="${loginUrl}/login">${loginUrl}/login</a></li>
                <li>Enter your email and temporary password</li>
                <li>Change your password when prompted</li>
                <li>Complete your profile setup</li>
                <li>Enable Two-Factor Authentication (recommended)</li>
              </ol>

              <h3>📚 Your Responsibilities:</h3>
              <p>As a <strong>${adminLevel}</strong> administrator, you have access to:</p>
              <ul>
                <li>Member management and records</li>
                <li>Administrative functions for your assigned area</li>
                <li>Reports and analytics</li>
                <li>Communication tools</li>
              </ul>

              <p>Please ensure you:</p>
              <ul>
                <li>Keep member information confidential</li>
                <li>Follow data protection policies</li>
                <li>Report any security concerns immediately</li>
                <li>Use the system responsibly and ethically</li>
              </ul>

              <h3>📞 Need Help?</h3>
              <p>If you have any questions or need assistance:</p>
              <ul>
                <li>Contact your system administrator</li>
                <li>Check the help documentation in the portal</li>
                <li>Email: support@effmemberportal.org</li>
              </ul>

              <p style="margin-top: 30px;">Welcome to the team! We're excited to have you on board.</p>

              <p><strong>Aluta Continua!</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message from the EFF Membership Portal.</p>
              <p>Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Economic Freedom Fighters. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to EFF Membership Portal!

Hello ${userName},

Your administrator account has been successfully created!

YOUR ACCOUNT DETAILS:
- Name: ${userName}
- Email/Username: ${loginEmail}
- Temporary Password: ${temporaryPassword}
- Admin Level: ${adminLevel.charAt(0).toUpperCase() + adminLevel.slice(1)}
- Role: ${roleName}

IMPORTANT SECURITY NOTICE:
⚠️ This is a temporary password. Please change it immediately after your first login.
⚠️ Never share your password with anyone.
⚠️ Enable Two-Factor Authentication (2FA) for additional security.

GETTING STARTED:
1. Visit: ${loginUrl}/login
2. Enter your email and temporary password
3. Change your password when prompted
4. Complete your profile setup
5. Enable Two-Factor Authentication (recommended)

YOUR RESPONSIBILITIES:
As a ${adminLevel} administrator, please ensure you:
- Keep member information confidential
- Follow data protection policies
- Report any security concerns immediately
- Use the system responsibly and ethically

NEED HELP?
Contact your system administrator or email: support@effmemberportal.org

Welcome to the team!

Aluta Continua!

---
This is an automated message from the EFF Membership Portal.
© ${new Date().getFullYear()} Economic Freedom Fighters. All rights reserved.
      `
    });
  }

  // Test email configuration
  async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Email service is not configured'
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: 'Email configuration is valid'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Email configuration error: ' + error + ''
      };
    }
  }

  // Send bulk upload completion email notification with report and attendance register attachments
  async sendBulkUploadCompletionEmail(
    email: string,
    userName: string,
    fileName: string,
    results: {
      totalRecords: number;
      successfulRecords: number;
      failedRecords: number;
      duplicates: number;
      processingDuration: string;
      reportPath?: string;
    },
    errors?: Array<{ row?: number; id_number?: string; error: string }>,
    attachmentPaths?: string[] // Array of file paths to attach (report + attendance registers)
  ): Promise<boolean> {
    const successRate = results.totalRecords > 0
      ? ((results.successfulRecords / results.totalRecords) * 100).toFixed(1)
      : '0';

    const statusColor = results.failedRecords === 0 ? '#4caf50' : results.failedRecords > results.successfulRecords ? '#f44336' : '#ff9800';
    const statusText = results.failedRecords === 0 ? 'Completed Successfully' : 'Completed with Errors';

    // Build error summary if there are errors
    let errorSummaryHtml = '';
    if (errors && errors.length > 0) {
      const displayErrors = errors.slice(0, 10); // Show first 10 errors
      errorSummaryHtml = `
        <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">⚠️ Error Summary (First ${displayErrors.length} of ${errors.length})</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #ffeeba;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Row</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">ID Number</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Error</th>
              </tr>
            </thead>
            <tbody>
              ${displayErrors.map(err => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${err.row || 'N/A'}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${err.id_number || 'N/A'}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${err.error}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${errors.length > 10 ? `<p style="margin-top: 10px; color: #856404;">...and ${errors.length - 10} more errors. See the full report for details.</p>` : ''}
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bulk Upload Complete</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a237e 0%, #c62828 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Bulk Upload Complete</h1>
        </div>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Dear ${userName || 'Administrator'},</p>

          <p>Your bulk membership file has finished processing:</p>

          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${statusColor};">
            <h3 style="margin: 0 0 10px 0; color: ${statusColor};">${statusText}</h3>
            <p style="margin: 5px 0;"><strong>File:</strong> ${fileName}</p>
            <p style="margin: 5px 0;"><strong>Processing Time:</strong> ${results.processingDuration}</p>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1a237e;">📈 Processing Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #e3f2fd;">
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Records</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${results.totalRecords}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #4caf50;"><strong>✅ Successful</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #4caf50;">${results.successfulRecords}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #f44336;"><strong>❌ Failed</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #f44336;">${results.failedRecords}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #ff9800;"><strong>🔄 Duplicates</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #ff9800;">${results.duplicates}</td>
              </tr>
              <tr style="background-color: #e8f5e9;">
                <td style="padding: 10px;"><strong>Success Rate</strong></td>
                <td style="padding: 10px; text-align: right;"><strong>${successRate}%</strong></td>
              </tr>
            </table>
          </div>

          ${errorSummaryHtml}

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #1a237e;">
            <h3 style="margin: 0 0 10px 0; color: #1a237e;">📎 Attachments</h3>
            <p style="margin: 5px 0;">The following files are attached to this email:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Processing Report</strong> - Complete Excel report with all upload details</li>
              <li><strong>Attendance Registers</strong> - PDF attendance registers for compliant wards (if any)</li>
            </ul>
          </div>

          <p style="margin-top: 20px;">Best regards,<br><strong>EFF Membership System</strong></p>
        </div>

        <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
          <p>This is an automated message from the EFF Membership Portal.</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Bulk Upload Complete

Dear ${userName || 'Administrator'},

Your bulk membership file has finished processing.

File: ${fileName}
Status: ${statusText}
Processing Time: ${results.processingDuration}

PROCESSING SUMMARY:
- Total Records: ${results.totalRecords}
- Successful: ${results.successfulRecords}
- Failed: ${results.failedRecords}
- Duplicates: ${results.duplicates}
- Success Rate: ${successRate}%

${errors && errors.length > 0 ? `\nERRORS (First 10):\n${errors.slice(0, 10).map(e => `Row ${e.row || 'N/A'}: ${e.error}`).join('\n')}` : ''}

ATTACHMENTS:
- Processing Report (Excel)
- Attendance Registers (PDF) for compliant wards

Best regards,
EFF Membership System
    `;

    // Build attachments array from provided paths
    const attachments: Array<{ filename: string; path: string }> = [];
    if (attachmentPaths && attachmentPaths.length > 0) {
      const fs = require('fs');
      const path = require('path');

      for (const filePath of attachmentPaths) {
        if (filePath && fs.existsSync(filePath)) {
          attachments.push({
            filename: path.basename(filePath),
            path: filePath
          });
        }
      }
    }

    return await this.sendEmail({
      to: email,
      subject: `Bulk Upload ${statusText}: ${fileName} - ${results.successfulRecords}/${results.totalRecords} records processed`,
      html: htmlContent,
      text: textContent,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  }

  // Send payment transaction notification to admin
  async sendPaymentNotification(
    paymentDetails: {
      transactionId: string;
      amount: string;
      paymentBrand: string;
      paymentType: string;
      memberName?: string;
      memberId?: number | null;
      resultCode: string;
      status: 'success' | 'failed';
    }
  ): Promise<boolean> {
    const adminEmail = process.env.MAIL_FROM_ADDRESS || 'effmembership@bakkie-connect.co.za';
    const statusColor = paymentDetails.status === 'success' ? '#4caf50' : '#f44336';
    const statusIcon = paymentDetails.status === 'success' ? '✅' : '❌';
    const statusText = paymentDetails.status === 'success' ? 'SUCCESSFUL' : 'FAILED';
    const now = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });

    return await this.sendEmail({
      to: adminEmail,
      subject: `${statusIcon} Card Payment ${statusText} - R${paymentDetails.amount} (${paymentDetails.paymentType})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a1a 0%, #DC143C 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
            .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 16px; color: white; background-color: ${statusColor}; }
            .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .details-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
            .details-table td:first-child { font-weight: bold; color: #555; width: 40%; }
            .footer { text-align: center; padding: 15px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">💳 Payment Notification</h1>
              <p style="margin: 5px 0 0 0;">EFF Membership Portal</p>
            </div>
            <div class="content">
              <div style="text-align: center; margin: 15px 0;">
                <span class="status-badge">${statusIcon} Payment ${statusText}</span>
              </div>

              <table class="details-table">
                <tr>
                  <td>Transaction ID</td>
                  <td><strong>${paymentDetails.transactionId}</strong></td>
                </tr>
                <tr>
                  <td>Amount</td>
                  <td><strong style="font-size: 18px; color: #DC143C;">R${paymentDetails.amount}</strong></td>
                </tr>
                <tr>
                  <td>Payment Type</td>
                  <td>${paymentDetails.paymentType}</td>
                </tr>
                <tr>
                  <td>Card Brand</td>
                  <td>${paymentDetails.paymentBrand}</td>
                </tr>
                ${paymentDetails.memberName ? `
                <tr>
                  <td>Member</td>
                  <td>${paymentDetails.memberName}</td>
                </tr>` : ''}
                ${paymentDetails.memberId ? `
                <tr>
                  <td>Member ID</td>
                  <td>${paymentDetails.memberId}</td>
                </tr>` : ''}
                <tr>
                  <td>Result Code</td>
                  <td>${paymentDetails.resultCode}</td>
                </tr>
                <tr>
                  <td>Date/Time</td>
                  <td>${now}</td>
                </tr>
              </table>

              <p style="margin-top: 20px; color: #666; font-size: 13px;">
                This is an automated payment notification from the Peach Payments integration.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Economic Freedom Fighters. Membership Portal.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  }
}

// Create singleton instance
export const emailService = new EmailService();
