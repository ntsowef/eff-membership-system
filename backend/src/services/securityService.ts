const bcrypt = require('bcrypt');
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getPrisma } from './prismaService';
import { cacheService } from './cacheService';
import { createDatabaseError } from '../middleware/errorHandler';

const prisma = getPrisma();

// Security interfaces
export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface SecuritySettings {
  mfa_enabled: boolean;
  session_timeout_minutes: number;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  password_expiry_days: number;
  require_password_change: boolean;
}

export interface LoginAttempt {
  user_id: number;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  attempted_at: Date;
}

export interface SecurityEvent {
  user_id: number;
  event_type: 'login' | 'logout' | 'password_change' | 'mfa_setup' | 'account_locked' | 'suspicious_activity';
  ip_address: string;
  user_agent: string;
  details?: any;
  created_at: Date;
}

// Security Service
export class SecurityService {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30; // minutes
  private static readonly SESSION_TIMEOUT = 24 * 60; // minutes
  private static readonly PASSWORD_EXPIRY_DAYS = 90;

  // Multi-Factor Authentication
  static async setupMFA(userId: number, appName: string = 'GEOMAPS Membership'): Promise<MFASetup> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${appName} - User ${userId}`,
        issuer: appName,
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store MFA setup in database - UPSERT operation
      await prisma.user_mfa_settings.upsert({
        where: { user_id: userId },
        update: {
          secret_key: secret.base32,
          backup_codes: backupCodes,
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          secret_key: secret.base32,
          backup_codes: backupCodes,
          is_enabled: false
        }
      });

      return {
        secret: secret.base32!,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      throw createDatabaseError('Failed to setup MFA', error);
    }
  }

  // Verify MFA token
  static async verifyMFA(userId: number, token: string): Promise<boolean> {
    try {
      const mfaSettings = await prisma.user_mfa_settings.findFirst({
        where: {
          user_id: userId,
          is_enabled: true
        },
        select: {
          secret_key: true,
          backup_codes: true
        }
      });

      if (!mfaSettings) {
        return false;
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: mfaSettings.secret_key,
        token: token,
        window: 2, // Allow 2 time steps (60 seconds) tolerance
        encoding: 'base32'
      });

      if (verified) {
        return true;
      }

      // Check backup codes
      const backupCodes = Array.isArray(mfaSettings.backup_codes)
        ? mfaSettings.backup_codes
        : JSON.parse((mfaSettings.backup_codes as string) || '[]');

      for (const code of backupCodes) {
        if (await bcrypt.compare(token, code)) {
          // Remove used backup code
          const updatedCodes = backupCodes.filter((c: string) => c !== code);
          await prisma.user_mfa_settings.update({
            where: { user_id: userId },
            data: {
              backup_codes: updatedCodes,
              updated_at: new Date()
            }
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      throw createDatabaseError('Failed to verify MFA', error);
    }
  }

  // Enable MFA for user
  static async enableMFA(userId: number, verificationToken: string): Promise<boolean> {
    try {
      // Verify the token first
      const isValid = await this.verifyMFA(userId, verificationToken);
      if (!isValid) {
        return false;
      }

      // Enable MFA
      await prisma.user_mfa_settings.update({
        where: { user_id: userId },
        data: {
          is_enabled: true,
          enabled_at: new Date(),
          updated_at: new Date()
        }
      });

      // Log security event
      await this.logSecurityEvent(userId, 'mfa_setup', '', '', { action: 'enabled' });

      return true;
    } catch (error) {
      throw createDatabaseError('Failed to enable MFA', error);
    }
  }

  // Disable MFA for user
  static async disableMFA(userId: number): Promise<boolean> {
    try {
      await prisma.user_mfa_settings.update({
        where: { user_id: userId },
        data: {
          is_enabled: false,
          disabled_at: new Date(),
          updated_at: new Date()
        }
      });

      // Log security event
      await this.logSecurityEvent(userId, 'mfa_setup', '', '', { action: 'disabled' });

      return true;
    } catch (error) {
      throw createDatabaseError('Failed to disable MFA', error);
    }
  }

  // Check if user has MFA enabled
  static async isMFAEnabled(userId: number): Promise<boolean> {
    try {
      const result = await prisma.user_mfa_settings.findFirst({
        where: {
          user_id: userId,
          is_enabled: true
        },
        select: { is_enabled: true }
      });

      return !!result;
    } catch (error) {
      return false;
    }
  }

  // Account lockout management
  static async recordLoginAttempt(userId: number, ipAddress: string, userAgent: string, success: boolean, failureReason?: string): Promise<void> {
    try {
      // Record login attempt
      await prisma.login_attempts.create({
        data: {
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: success,
          failure_reason: failureReason
        }
      });

      if (!success) {
        // Check failed attempts in last hour
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const failedCount = await prisma.login_attempts.count({
          where: {
            user_id: userId,
            success: false,
            attempted_at: { gt: oneHourAgo }
          }
        });

        if (failedCount >= this.MAX_FAILED_ATTEMPTS) {
          await this.lockAccount(userId, ipAddress, userAgent);
        }
      } else {
        // Clear lockout on successful login
        await this.clearAccountLockout(userId);
      }
    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  }

  // Lock user account
  static async lockAccount(userId: number, ipAddress: string, userAgent: string): Promise<void> {
    try {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION);

      await prisma.users.update({
        where: { user_id: userId },
        data: {
          account_locked: true,
          locked_until: lockoutUntil,
          locked_at: new Date(),
          updated_at: new Date()
        }
      });

      // Log security event
      await this.logSecurityEvent(userId, 'account_locked', ipAddress, userAgent, {
        reason: 'too_many_failed_attempts',
        locked_until: lockoutUntil
      });

      // Cache lockout status
      await cacheService.set(`account_locked:${userId}`, true, this.LOCKOUT_DURATION * 60);
    } catch (error) {
      throw createDatabaseError('Failed to lock account', error);
    }
  }

  // Check if account is locked
  static async isAccountLocked(userId: number): Promise<boolean> {
    try {
      // Check cache first
      const cached = await cacheService.get(`account_locked:${userId}`);
      if (cached !== null) {
        return cached as boolean;
      }

      // Check database
      const result = await prisma.users.findFirst({
        where: {
          user_id: userId,
          account_locked: true
        },
        select: {
          account_locked: true,
          locked_until: true
        }
      });

      if (!result) {
        return false;
      }

      // Check if lockout has expired
      if (result.locked_until && new Date() > new Date(result.locked_until)) {
        await this.clearAccountLockout(userId);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Clear account lockout
  static async clearAccountLockout(userId: number): Promise<void> {
    try {
      await prisma.users.update({
        where: { user_id: userId },
        data: {
          account_locked: false,
          locked_until: null,
          updated_at: new Date()
        }
      });

      // Clear cache
      await cacheService.del(`account_locked:${userId}`);
    } catch (error) {
      console.error('Failed to clear account lockout:', error);
    }
  }

  // Session management
  static async createSession(userId: number, ipAddress: string, userAgent: string): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.SESSION_TIMEOUT);

      // Store session in database
      await prisma.user_sessions.create({
        data: {
          session_id: sessionId,
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt
        }
      });

      // Store session in cache
      await cacheService.set(`session:${sessionId}`, {
        userId,
        ipAddress,
        userAgent,
        expiresAt
      }, this.SESSION_TIMEOUT * 60);

      return sessionId;
    } catch (error) {
      throw createDatabaseError('Failed to create session', error);
    }
  }

  // Validate session
  static async validateSession(sessionId: string): Promise<{ userId: number; valid: boolean }> {
    try {
      // Check cache first
      const cached = await cacheService.get(`session:${sessionId}`);
      if (cached) {
        const session = cached as any;
        if (new Date() < new Date(session.expiresAt)) {
          return { userId: session.userId, valid: true };
        }
      }

      // Check database
      const session = await prisma.user_sessions.findFirst({
        where: {
          session_id: sessionId,
          expires_at: { gt: new Date() }
        },
        select: {
          user_id: true,
          expires_at: true
        }
      });

      if (session) {
        return { userId: session.user_id, valid: true };
      }

      return { userId: 0, valid: false };
    } catch (error) {
      return { userId: 0, valid: false };
    }
  }

  // Invalidate session
  static async invalidateSession(sessionId: string): Promise<void> {
    try {
      await prisma.user_sessions.delete({
        where: { session_id: sessionId }
      });

      await cacheService.del(`session:${sessionId}`);
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }

  // Log security events
  static async logSecurityEvent(
    userId: number,
    eventType: SecurityEvent['event_type'],
    ipAddress: string,
    userAgent: string,
    details?: any
  ): Promise<void> {
    try {
      await prisma.security_events.create({
        data: {
          user_id: userId,
          event_type: eventType,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: details
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Get user security settings
  static async getUserSecuritySettings(userId: number): Promise<SecuritySettings> {
    try {
      const settings = await prisma.user_security_settings.findUnique({
        where: { user_id: userId }
      });

      if (settings) {
        return {
          mfa_enabled: settings.mfa_enabled || false,
          session_timeout_minutes: settings.session_timeout_minutes || this.SESSION_TIMEOUT,
          max_failed_attempts: settings.max_failed_attempts || this.MAX_FAILED_ATTEMPTS,
          lockout_duration_minutes: settings.lockout_duration_minutes || this.LOCKOUT_DURATION,
          password_expiry_days: settings.password_expiry_days || this.PASSWORD_EXPIRY_DAYS,
          require_password_change: settings.require_password_change || false
        };
      }

      // Return default settings
      return {
        mfa_enabled: false,
        session_timeout_minutes: this.SESSION_TIMEOUT,
        max_failed_attempts: this.MAX_FAILED_ATTEMPTS,
        lockout_duration_minutes: this.LOCKOUT_DURATION,
        password_expiry_days: this.PASSWORD_EXPIRY_DAYS,
        require_password_change: false
      };
    } catch (error) {
      throw createDatabaseError('Failed to get security settings', error);
    }
  }

  // Helper methods
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(bcrypt.hashSync(code, 10));
    }
    return codes;
  }

  private static generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Password security
  static async checkPasswordExpiry(userId: number): Promise<boolean> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - this.PASSWORD_EXPIRY_DAYS);

      const result = await prisma.users.findFirst({
        where: {
          user_id: userId,
          password_changed_at: { lt: expiryDate }
        },
        select: { password_changed_at: true }
      });

      return !!result;
    } catch (error) {
      return false;
    }
  }

  // Suspicious activity detection
  static async detectSuspiciousActivity(userId: number, ipAddress: string): Promise<boolean> {
    try {
      // Check for multiple IPs in short time
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentIPs = await prisma.login_attempts.findMany({
        where: {
          user_id: userId,
          attempted_at: { gt: oneHourAgo }
        },
        select: { ip_address: true },
        distinct: ['ip_address']
      });

      if (recentIPs.length > 3) {
        await this.logSecurityEvent(userId, 'suspicious_activity', ipAddress, '', {
          reason: 'multiple_ips',
          ip_count: recentIPs.length
        });
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}
