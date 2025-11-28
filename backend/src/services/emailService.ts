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
    rejectionReason?: string
  ): Promise<boolean> {
    const templates = {
      'Submitted': {
        subject: 'Application Submitted - ' + applicationNumber,
        html: `
          <h2>Application Submitted Successfully</h2>
          <p>Dear ${applicantName},</p>
          <p>Your membership application <strong>${applicationNumber}</strong> has been submitted successfully.</p>
          <p>We will review your application and notify you of the outcome within 5-10 business days.</p>
          <p>Thank you for your interest in joining our organization.</p>
          <br>
          <p>Best regards,<br>Membership Team</p>
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
        subject: 'Application Approved - ' + applicationNumber,
        html: `
          <h2>Congratulations! Application Approved</h2>
          <p>Dear ${applicantName},</p>
          <p>We are pleased to inform you that your membership application <strong>${applicationNumber}</strong> has been approved.</p>
          <p>Welcome to our organization! You will receive your membership details shortly.</p>
          <br>
          <p>Best regards,<br>Membership Team</p>
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
