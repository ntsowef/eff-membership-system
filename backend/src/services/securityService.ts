const bcrypt = require('bcrypt');
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { executeQuery, executeQuerySingle } from '../config/database';
import { cacheService } from './cacheService';
import { createDatabaseError } from '../middleware/errorHandler';

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

      // Store MFA setup in database
      await executeQuery(`
        INSERT INTO user_mfa_settings (user_id, secret_key, backup_codes, is_enabled, created_at)
        VALUES (?, ?, ?, FALSE, NOW())
        ON DUPLICATE KEY UPDATE 
        secret_key = VALUES(secret_key),
        backup_codes = VALUES(backup_codes),
        updated_at = NOW()
      `, [userId, secret.base32, JSON.stringify(backupCodes)]);

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
      const mfaSettings = await executeQuerySingle(`
        SELECT secret_key, backup_codes FROM user_mfa_settings 
        WHERE user_id = ? AND is_enabled = TRUE
      `, [userId]);

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
      const backupCodes = JSON.parse(mfaSettings.backup_codes || '[]');
      const hashedToken = await bcrypt.hash(token, 10);
      
      for (const code of backupCodes) {
        if (await bcrypt.compare(token, code)) {
          // Remove used backup code
          const updatedCodes = backupCodes.filter((c: string) => c !== code);
          await executeQuery(`
            UPDATE user_mfa_settings 
            SET backup_codes = ?, updated_at = NOW()
            WHERE user_id = ?
          `, [JSON.stringify(updatedCodes), userId]);
          
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
      await executeQuery(`
        UPDATE user_mfa_settings 
        SET is_enabled = TRUE, enabled_at = NOW(), updated_at = NOW()
        WHERE user_id = ?
      `, [userId]);

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
      await executeQuery(`
        UPDATE user_mfa_settings 
        SET is_enabled = FALSE, disabled_at = NOW(), updated_at = NOW()
        WHERE user_id = ?
      `, [userId]);

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
      const result = await executeQuerySingle(`
        SELECT is_enabled FROM user_mfa_settings 
        WHERE user_id = ? AND is_enabled = TRUE
      `, [userId]);

      return !!result;
    } catch (error) {
      return false;
    }
  }

  // Account lockout management
  static async recordLoginAttempt(userId: number, ipAddress: string, userAgent: string, success: boolean, failureReason?: string): Promise<void> {
    try {
      // Record login attempt
      await executeQuery(`
        INSERT INTO login_attempts (user_id, ip_address, user_agent, success, failure_reason, attempted_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [userId, ipAddress, userAgent, success, failureReason]);

      if (!success) {
        // Check failed attempts in last hour
        const failedAttempts = await executeQuerySingle(`
          SELECT COUNT(*) as count FROM login_attempts 
          WHERE user_id = ? AND success = FALSE 
          AND attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, [userId]);

        if (failedAttempts && failedAttempts.count >= this.MAX_FAILED_ATTEMPTS) {
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

      await executeQuery(`
        UPDATE users 
        SET account_locked = TRUE, locked_until = ?, locked_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [lockoutUntil, userId]);

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
      const result = await executeQuerySingle(`
        SELECT account_locked, locked_until FROM users 
        WHERE id = ? AND account_locked = TRUE
      `, [userId]);

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
      await executeQuery(`
        UPDATE users 
        SET account_locked = FALSE, locked_until = NULL, updated_at = NOW()
        WHERE id = ?
      `, [userId]);

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
      await executeQuery(`
        INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [sessionId, userId, ipAddress, userAgent, expiresAt]);

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
      const session = await executeQuerySingle(`
        SELECT user_id, expires_at FROM user_sessions 
        WHERE session_id = ? AND expires_at > NOW()
      `, [sessionId]);

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
      await executeQuery(`
        DELETE FROM user_sessions WHERE session_id = ?
      `, [sessionId]);

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
      await executeQuery(`
        INSERT INTO security_events (user_id, event_type, ip_address, user_agent, details, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [userId, eventType, ipAddress, userAgent, JSON.stringify(details)]);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Get user security settings
  static async getUserSecuritySettings(userId: number): Promise<SecuritySettings> {
    try {
      const settings = await executeQuerySingle(`
        SELECT * FROM user_security_settings WHERE user_id = ?
      `, [userId]);

      if (settings) {
        return settings;
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
      const result = await executeQuerySingle(`
        SELECT password_changed_at FROM users 
        WHERE id = ? AND password_changed_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [userId, this.PASSWORD_EXPIRY_DAYS]);

      return !!result;
    } catch (error) {
      return false;
    }
  }

  // Suspicious activity detection
  static async detectSuspiciousActivity(userId: number, ipAddress: string): Promise<boolean> {
    try {
      // Check for multiple IPs in short time
      const recentIPs = await executeQuery(`
        SELECT DISTINCT ip_address FROM login_attempts 
        WHERE user_id = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `, [userId]);

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
