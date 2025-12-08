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
        console.log('📧 Email would be sent (service not configured):', {
          to: emailData.to,
          subject: emailData.subject,
          content: emailData.text || emailData.html?.substring(0, 100) + '...'
        });
        return true; // Return true for development/testing
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
}

// Create singleton instance
export const emailService = new EmailService();
