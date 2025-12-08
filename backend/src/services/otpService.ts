import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { executeQuery } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';
import { SMSService } from './smsService';
import { EmailService } from './emailService';
import {
  logOTPGenerated,
  logOTPSent,
  logOTPSendFailed,
  logOTPValidated,
  logOTPValidationFailed,
  logOTPResent,
  logOTPSessionCreated
} from '../middleware/auditLogger';

/**
 * OTP Service for Multi-Factor Authentication
 * Handles OTP generation, validation, and session management
 * for Provincial, Municipality, and Ward Admin users
 */

export interface OTPRecord {
  otp_id: number;
  user_id: number;
  otp_code_hash: string;
  generated_at: Date;
  expires_at: Date;
  validated_at?: Date;
  is_validated: boolean;
  is_expired: boolean;
  attempts_count: number;
  max_attempts: number;
  session_token?: string;
  session_expires_at?: Date;
  sent_to_number?: string;
  delivery_status: string;
  ip_address?: string;
  user_agent?: string;
}

export interface OTPGenerationResult {
  otp_id: number;
  otp_code: string; // Plain OTP code (only returned once for SMS sending)
  expires_at: Date;
  sent_to_number: string;
}

export interface OTPValidationResult {
  success: boolean;
  session_token?: string;
  session_expires_at?: Date;
  message: string;
  attempts_remaining?: number;
}

export class OTPService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_VALIDITY_HOURS = 24;
  private static readonly SESSION_VALIDITY_HOURS = 24;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly SALT_ROUNDS = 10;

  /**
   * Generate a 6-digit OTP code
   */
  private static generateOTPCode(): string {
    // Generate a random 6-digit number
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
  }

  /**
   * Hash OTP code for secure storage
   */
  private static async hashOTP(otp: string): Promise<string> {
    return await bcrypt.hash(otp, this.SALT_ROUNDS);
  }

  /**
   * Verify OTP code against hash
   */
  private static async verifyOTP(otp: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(otp, hash);
  }

  /**
   * Generate session token after successful OTP validation
   */
  private static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if user requires MFA based on admin level and role
   * National and Super Admin users do NOT require MFA
   */
  static requiresMFA(adminLevel: string, roleName?: string): boolean {
    // Super admin and national admin do NOT require MFA
    // Check for SUPER_ADMIN role_code (uppercase)
    if (roleName === 'SUPER_ADMIN' || adminLevel.toLowerCase() === 'national') {
      return false;
    }

    // Only province, municipality, and ward admins require MFA
    const mfaRequiredLevels = ['province', 'municipality', 'ward'];
    return mfaRequiredLevels.includes(adminLevel.toLowerCase());
  }

  /**
   * Generate and store OTP for a user
   */
  static async generateOTP(
    userId: number,
    phoneNumber: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<OTPGenerationResult> {
    try {
      // Generate OTP code
      const otpCode = this.generateOTPCode();
      const otpHash = await this.hashOTP(otpCode);

      // Calculate expiry time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.OTP_VALIDITY_HOURS);

      // Insert OTP record into database
      const query = `
        INSERT INTO user_otp_codes (
          user_id,
          otp_code_hash,
          otp_plain,
          expires_at,
          sent_to_number,
          ip_address,
          user_agent,
          max_attempts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING otp_id, expires_at
      `;

      const result = await executeQuery(query, [
        userId,
        otpHash,
        otpCode, // Store plain OTP temporarily for SMS sending
        expiresAt,
        phoneNumber,
        ipAddress,
        userAgent,
        this.MAX_ATTEMPTS
      ]);

      const otpRecord = result[0];

      console.log(`✅ OTP generated for user ${userId}, expires at ${expiresAt}`);

      // Audit log: OTP generated
      await logOTPGenerated(userId, otpRecord.otp_id, phoneNumber);

      return {
        otp_id: otpRecord.otp_id,
        otp_code: otpCode,
        expires_at: otpRecord.expires_at,
        sent_to_number: phoneNumber
      };
    } catch (error) {
      console.error('❌ Error generating OTP:', error);
      throw createDatabaseError('Failed to generate OTP', error);
    }
  }

  /**
   * Clear plain OTP from database after SMS is sent
   */
  static async clearPlainOTP(otpId: number): Promise<void> {
    try {
      await executeQuery(
        'UPDATE user_otp_codes SET otp_plain = NULL WHERE otp_id = $1',
        [otpId]
      );
      console.log(`🔒 Plain OTP cleared for OTP ID ${otpId}`);
    } catch (error) {
      console.error('❌ Error clearing plain OTP:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Update OTP delivery status
   */
  static async updateDeliveryStatus(
    otpId: number,
    status: 'sent' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      await executeQuery(
        `UPDATE user_otp_codes
         SET delivery_status = $1,
             delivery_attempted_at = CURRENT_TIMESTAMP,
             delivery_error = $2
         WHERE otp_id = $3`,
        [status, error || null, otpId]
      );
      console.log(`📱 OTP delivery status updated: ${status} for OTP ID ${otpId}`);
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
    }
  }

  /**
   * Validate OTP code
   */
  static async validateOTP(
    userId: number,
    otpCode: string,
    ipAddress?: string
  ): Promise<OTPValidationResult> {
    try {
      // Get active OTP for user
      const query = `
        SELECT
          otp_id,
          otp_code_hash,
          attempts_count,
          max_attempts,
          expires_at,
          is_validated,
          is_expired
        FROM user_otp_codes
        WHERE user_id = $1
          AND is_validated = FALSE
          AND is_expired = FALSE
          AND expires_at > CURRENT_TIMESTAMP
          AND invalidated_at IS NULL
        ORDER BY generated_at DESC
        LIMIT 1
      `;

      const result = await executeQuery(query, [userId]);

      if (result.length === 0) {
        // Audit log: OTP validation failed - no active OTP
        await logOTPValidationFailed(userId, undefined, 'No active OTP found', 0);

        return {
          success: false,
          message: 'No active OTP found. Please request a new OTP.'
        };
      }

      const otpRecord = result[0];

      // Check if max attempts exceeded
      if (otpRecord.attempts_count >= otpRecord.max_attempts) {
        await this.invalidateOTP(otpRecord.otp_id, 'max_attempts_exceeded');

        // Audit log: OTP validation failed - max attempts exceeded
        await logOTPValidationFailed(userId, otpRecord.otp_id, 'Maximum attempts exceeded', 0);

        return {
          success: false,
          message: 'Maximum validation attempts exceeded. Please request a new OTP.'
        };
      }

      // Increment attempts count
      await executeQuery(
        'UPDATE user_otp_codes SET attempts_count = attempts_count + 1 WHERE otp_id = $1',
        [otpRecord.otp_id]
      );

      // Verify OTP
      const isValid = await this.verifyOTP(otpCode, otpRecord.otp_code_hash);

      if (!isValid) {
        const attemptsRemaining = otpRecord.max_attempts - (otpRecord.attempts_count + 1);
        console.log(`❌ Invalid OTP for user ${userId}. Attempts remaining: ${attemptsRemaining}`);

        // Audit log: OTP validation failed
        await logOTPValidationFailed(userId, otpRecord.otp_id, 'Invalid OTP code', attemptsRemaining);

        return {
          success: false,
          message: `Invalid OTP code. ${attemptsRemaining} attempts remaining.`,
          attempts_remaining: attemptsRemaining
        };
      }

      // OTP is valid - generate session token
      const sessionToken = this.generateSessionToken();
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setHours(sessionExpiresAt.getHours() + this.SESSION_VALIDITY_HOURS);

      // Update OTP record
      await executeQuery(
        `UPDATE user_otp_codes
         SET is_validated = TRUE,
             validated_at = CURRENT_TIMESTAMP,
             session_token = $1,
             session_expires_at = $2
         WHERE otp_id = $3`,
        [sessionToken, sessionExpiresAt, otpRecord.otp_id]
      );

      console.log(`✅ OTP validated successfully for user ${userId}`);

      // Audit log: OTP validated successfully
      await logOTPValidated(userId, otpRecord.otp_id);

      // Audit log: OTP session created
      await logOTPSessionCreated(userId, otpRecord.otp_id, sessionExpiresAt);

      return {
        success: true,
        session_token: sessionToken,
        session_expires_at: sessionExpiresAt,
        message: 'OTP validated successfully'
      };
    } catch (error) {
      console.error('❌ Error validating OTP:', error);
      throw createDatabaseError('Failed to validate OTP', error);
    }
  }

  /**
   * Verify OTP session token
   */
  static async verifySession(userId: number, sessionToken: string): Promise<boolean> {
    try {
      const query = `
        SELECT otp_id
        FROM user_otp_codes
        WHERE user_id = $1
          AND session_token = $2
          AND is_validated = TRUE
          AND session_expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `;

      const result = await executeQuery(query, [userId, sessionToken]);
      return result.length > 0;
    } catch (error) {
      console.error('❌ Error verifying session:', error);
      return false;
    }
  }

  /**
   * Invalidate OTP
   */
  static async invalidateOTP(otpId: number, reason: string): Promise<void> {
    try {
      await executeQuery(
        `UPDATE user_otp_codes
         SET invalidated_at = CURRENT_TIMESTAMP,
             invalidation_reason = $1,
             is_expired = TRUE
         WHERE otp_id = $2`,
        [reason, otpId]
      );
      console.log(`🚫 OTP invalidated: ${reason} for OTP ID ${otpId}`);
    } catch (error) {
      console.error('❌ Error invalidating OTP:', error);
    }
  }

  /**
   * Get active OTP for user
   */
  static async getActiveOTP(userId: number): Promise<OTPRecord | null> {
    try {
      const query = `
        SELECT *
        FROM user_otp_codes
        WHERE user_id = $1
          AND is_validated = FALSE
          AND is_expired = FALSE
          AND expires_at > CURRENT_TIMESTAMP
          AND invalidated_at IS NULL
        ORDER BY generated_at DESC
        LIMIT 1
      `;

      const result = await executeQuery(query, [userId]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('❌ Error getting active OTP:', error);
      return null;
    }
  }

  /**
   * Check if user has valid OTP session
   */
  static async hasValidSession(userId: number): Promise<boolean> {
    try {
      const query = `
        SELECT otp_id
        FROM user_otp_codes
        WHERE user_id = $1
          AND is_validated = TRUE
          AND session_expires_at > CURRENT_TIMESTAMP
        ORDER BY validated_at DESC
        LIMIT 1
      `;

      const result = await executeQuery(query, [userId]);
      return result.length > 0;
    } catch (error) {
      console.error('❌ Error checking session:', error);
      return false;
    }
  }

  /**
   * Get OTP statistics for audit
   */
  static async getOTPStats(userId: number): Promise<any> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_otps,
          COUNT(CASE WHEN is_validated = TRUE THEN 1 END) as validated_otps,
          COUNT(CASE WHEN is_expired = TRUE THEN 1 END) as expired_otps,
          COUNT(CASE WHEN invalidated_at IS NOT NULL THEN 1 END) as invalidated_otps,
          AVG(attempts_count) as avg_attempts
        FROM user_otp_codes
        WHERE user_id = $1
          AND generated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
      `;

      const result = await executeQuery(query, [userId]);
      return result[0];
    } catch (error) {
      console.error('❌ Error getting OTP stats:', error);
      return null;
    }
  }

  /**
   * Clean up expired OTPs (for maintenance)
   */
  static async cleanupExpiredOTPs(daysOld: number = 30): Promise<number> {
    try {
      const query = `
        DELETE FROM user_otp_codes
        WHERE generated_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
          AND (is_validated = TRUE OR is_expired = TRUE)
      `;

      const result = await executeQuery(query);
      console.log(`🧹 Cleaned up expired OTPs older than ${daysOld} days`);
      return Array.isArray(result) ? result.length : 0;
    } catch (error) {
      console.error('❌ Error cleaning up OTPs:', error);
      return 0;
    }
  }

  /**
   * Send OTP via SMS
   */
  static async sendOTPViaSMS(
    userId: number,
    otpId: number,
    otpCode: string,
    phoneNumber: string,
    userName: string
  ): Promise<boolean> {
    try {
      // Format phone number (ensure it starts with +27 for South Africa)
      let formattedNumber = phoneNumber.trim();
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '+27' + formattedNumber.substring(1);
      } else if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+27' + formattedNumber;
      }

      // Create SMS message
      const message = `Your EFF Membership System OTP code is: ${otpCode}. This code is valid for 24 hours. Do not share this code with anyone.`;

      console.log(`📱 Sending OTP to ${formattedNumber}...`);

      // Send SMS using SMS service
      const result = await SMSService.sendSMS(
        formattedNumber,
        message,
        'EFF-MFA' // From name/number
      );

      if (result.success) {
        console.log(`✅ OTP SMS sent successfully to ${formattedNumber}`);
        await this.updateDeliveryStatus(otpId, 'sent');
        await this.clearPlainOTP(otpId); // Clear plain OTP after sending

        // Audit log: OTP sent successfully
        await logOTPSent(userId, otpId, phoneNumber);

        return true;
      } else {
        console.error(`❌ Failed to send OTP SMS: ${result.error}`);
        await this.updateDeliveryStatus(otpId, 'failed', result.error);

        // Audit log: OTP send failed
        await logOTPSendFailed(userId, otpId, result.error || 'Unknown error');

        return false;
      }
    } catch (error) {
      console.error('❌ Error sending OTP SMS:', error);
      await this.updateDeliveryStatus(otpId, 'failed', (error as Error).message);

      // Audit log: OTP send failed
      await logOTPSendFailed(userId, otpId, (error as Error).message);

      return false;
    }
  }

  /**
   * Send OTP via Email
   */
  static async sendOTPViaEmail(
    userId: number,
    otpId: number,
    otpCode: string,
    email: string,
    userName: string
  ): Promise<boolean> {
    try {
      const emailService = new EmailService();

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DC143C; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #DC143C;
              text-align: center;
              padding: 20px;
              background-color: #fff;
              border: 2px dashed #DC143C;
              margin: 20px 0;
              letter-spacing: 8px;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { color: #d32f2f; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>EFF Membership System</h1>
              <p>Multi-Factor Authentication</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>You have requested to log in to the EFF Membership Management System.</p>
              <p>Your One-Time Password (OTP) is:</p>
              <div class="otp-code">${otpCode}</div>
              <p><strong>This code is valid for 24 hours.</strong></p>
              <p>You can use this code for multiple logins within the next 24 hours.</p>
              <p class="warning">⚠️ Do not share this code with anyone. EFF staff will never ask for your OTP.</p>
              <p>If you did not request this code, please ignore this email or contact our support team immediately.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the EFF Membership Management System.</p>
              <p>© ${new Date().getFullYear()} Economic Freedom Fighters. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
Hello ${userName},

You have requested to log in to the EFF Membership Management System.

Your One-Time Password (OTP) is: ${otpCode}

This code is valid for 24 hours. You can use this code for multiple logins within the next 24 hours.

⚠️ Do not share this code with anyone. EFF staff will never ask for your OTP.

If you did not request this code, please ignore this email or contact our support team immediately.

---
This is an automated message from the EFF Membership Management System.
© ${new Date().getFullYear()} Economic Freedom Fighters. All rights reserved.
      `;

      console.log(`📧 Sending OTP to ${email}...`);

      const emailSent = await emailService.sendEmail({
        to: email,
        subject: 'EFF Membership System - Your Login OTP Code',
        html: emailHtml,
        text: emailText
      });

      if (emailSent) {
        console.log(`✅ OTP email sent successfully to ${email}`);
        // Audit log: OTP sent via email
        await logOTPSent(userId, otpId, email);
        return true;
      } else {
        console.error(`❌ Failed to send OTP email to ${email}`);
        // Audit log: OTP email send failed
        await logOTPSendFailed(userId, otpId, 'Email sending failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending OTP email:', error);
      // Audit log: OTP email send failed
      await logOTPSendFailed(userId, otpId, (error as Error).message);
      return false;
    }
  }

  /**
   * Generate OTP and send via SMS and Email (convenience method)
   * Updated to check for existing valid OTP within 24 hours
   */
  static async generateAndSendOTP(
    userId: number,
    userName: string,
    phoneNumber: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string; expires_at?: Date; otp_id?: number; is_existing?: boolean }> {
    try {
      // Check if user already has a valid OTP (not expired, within 24 hours)
      const activeOTP = await this.getActiveOTP(userId);

      if (activeOTP) {
        const now = new Date();
        const expiresAt = new Date(activeOTP.expires_at);
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();

        // If OTP is still valid (not expired), reuse it
        if (timeUntilExpiry > 0) {
          console.log(`♻️ Reusing existing valid OTP for user ${userId}. Expires at ${expiresAt}`);

          return {
            success: true,
            message: 'You have an active OTP. Please check your SMS and Email for the code sent earlier.',
            expires_at: activeOTP.expires_at,
            otp_id: activeOTP.otp_id,
            is_existing: true
          };
        }
      }

      // No valid OTP exists, generate new one
      const otpResult = await this.generateOTP(userId, phoneNumber, ipAddress, userAgent);

      // Determine if we should send SMS (only if valid phone number)
      const shouldSendSMS = phoneNumber && phoneNumber !== 'N/A' && phoneNumber.trim() !== '';

      // Send OTP via SMS and/or Email
      let smsSent = false;
      let emailSent = false;

      if (shouldSendSMS) {
        // Send via both SMS and Email
        [smsSent, emailSent] = await Promise.all([
          this.sendOTPViaSMS(
            userId,
            otpResult.otp_id,
            otpResult.otp_code,
            phoneNumber,
            userName
          ),
          this.sendOTPViaEmail(
            userId,
            otpResult.otp_id,
            otpResult.otp_code,
            email,
            userName
          )
        ]);
      } else {
        // Send via Email only
        console.log(`📧 No valid phone number, sending OTP via email only to ${email}`);
        emailSent = await this.sendOTPViaEmail(
          userId,
          otpResult.otp_id,
          otpResult.otp_code,
          email,
          userName
        );
      }

      // Check if at least one delivery method succeeded
      if (!smsSent && !emailSent) {
        return {
          success: false,
          message: 'Failed to send OTP. Please try again or contact support.'
        };
      }

      // Build success message based on what was sent
      let deliveryMessage = 'OTP sent successfully';
      if (smsSent && emailSent) {
        deliveryMessage += ' via SMS and Email';
      } else if (smsSent) {
        deliveryMessage += ' via SMS (Email delivery failed)';
      } else {
        deliveryMessage += ' via Email';
      }

      return {
        success: true,
        message: `${deliveryMessage}. The code is valid for 24 hours and can be used for multiple logins.`,
        expires_at: otpResult.expires_at,
        otp_id: otpResult.otp_id,
        is_existing: false
      };
    } catch (error) {
      console.error('❌ Error in generateAndSendOTP:', error);
      return {
        success: false,
        message: 'Failed to generate and send OTP. Please try again.'
      };
    }
  }
}

