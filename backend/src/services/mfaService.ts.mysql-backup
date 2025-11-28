import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError, ValidationError } from '../middleware/errorHandler';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export interface MFASetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
  manual_entry_key: string;
}

export interface MFASettings {
  id: number;
  user_id: number;
  secret_key: string;
  backup_codes: string[];
  is_enabled: boolean;
  enabled_at?: string;
  disabled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MFAVerification {
  valid: boolean;
  used_backup_code?: boolean;
  remaining_backup_codes?: number;
}

export class MFAService {
  private static readonly APP_NAME = 'Membership System';
  private static readonly ISSUER = 'Membership Organization';

  // Generate MFA setup for user
  static async generateMFASetup(userId: number, userEmail: string): Promise<MFASetup> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.APP_NAME} (${userEmail})`,
        issuer: this.ISSUER,
        length: 32
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Store in database (but don't enable yet)
      await executeQuery(`
        INSERT INTO user_mfa_settings (user_id, secret_key, backup_codes, is_enabled)
        VALUES (?, ?, ?, FALSE)
        ON DUPLICATE KEY UPDATE
        secret_key = VALUES(secret_key),
        backup_codes = VALUES(backup_codes),
        is_enabled = FALSE,
        disabled_at = NOW()
      `, [userId, secret.base32, JSON.stringify(backupCodes)]);

      return {
        secret: secret.base32,
        qr_code: qrCode,
        backup_codes: backupCodes,
        manual_entry_key: secret.base32
      };
    } catch (error) {
      throw createDatabaseError('Failed to generate MFA setup', error);
    }
  }

  // Enable MFA after verification
  static async enableMFA(userId: number, token: string): Promise<{ success: boolean; backup_codes: string[] }> {
    try {
      // Get user's MFA settings
      const mfaSettings = await executeQuerySingle(`
        SELECT * FROM user_mfa_settings WHERE user_id = ?
      `, [userId]);

      if (!mfaSettings) {
        throw new ValidationError('MFA setup not found. Please generate setup first.');
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: mfaSettings.secret_key,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (60 seconds) tolerance
      });

      if (!verified) {
        throw new ValidationError('Invalid MFA token. Please try again.');
      }

      // Enable MFA
      await executeQuery(`
        UPDATE user_mfa_settings 
        SET is_enabled = TRUE, enabled_at = NOW(), disabled_at = NULL
        WHERE user_id = ?
      `, [userId]);

      // Update user table
      await executeQuery(`
        UPDATE users SET mfa_enabled = TRUE WHERE id = ?
      `, [userId]);

      const backupCodes = JSON.parse(mfaSettings.backup_codes);

      return {
        success: true,
        backup_codes: backupCodes
      };
    } catch (error) {
      throw createDatabaseError('Failed to enable MFA', error);
    }
  }

  // Disable MFA
  static async disableMFA(userId: number, token: string): Promise<{ success: boolean }> {
    try {
      // Verify current token before disabling
      const isValid = await this.verifyMFAToken(userId, token);
      
      if (!isValid.valid) {
        throw new ValidationError('Invalid MFA token. Cannot disable MFA.');
      }

      // Disable MFA
      await executeQuery(`
        UPDATE user_mfa_settings 
        SET is_enabled = FALSE, disabled_at = NOW()
        WHERE user_id = ?
      `, [userId]);

      // Update user table
      await executeQuery(`
        UPDATE users SET mfa_enabled = FALSE WHERE id = ?
      `, [userId]);

      return { success: true };
    } catch (error) {
      throw createDatabaseError('Failed to disable MFA', error);
    }
  }

  // Verify MFA token
  static async verifyMFAToken(userId: number, token: string): Promise<MFAVerification> {
    try {
      const mfaSettings = await executeQuerySingle(`
        SELECT * FROM user_mfa_settings 
        WHERE user_id = ? AND is_enabled = TRUE
      `, [userId]);

      if (!mfaSettings) {
        return { valid: false };
      }

      // First try TOTP verification
      const totpValid = speakeasy.totp.verify({
        secret: mfaSettings.secret_key,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (totpValid) {
        return { valid: true };
      }

      // If TOTP fails, try backup codes
      const backupCodes = JSON.parse(mfaSettings.backup_codes || '[]');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const backupCodeIndex = backupCodes.findIndex((code: string) => 
        crypto.createHash('sha256').update(code).digest('hex') === hashedToken
      );

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(backupCodeIndex, 1);
        
        // Update backup codes in database
        await executeQuery(`
          UPDATE user_mfa_settings 
          SET backup_codes = ?
          WHERE user_id = ?
        `, [JSON.stringify(backupCodes), userId]);

        return {
          valid: true,
          used_backup_code: true,
          remaining_backup_codes: backupCodes.length
        };
      }

      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  // Generate new backup codes
  static async generateNewBackupCodes(userId: number, currentToken: string): Promise<string[]> {
    try {
      // Verify current token
      const isValid = await this.verifyMFAToken(userId, currentToken);
      
      if (!isValid.valid) {
        throw new ValidationError('Invalid MFA token. Cannot generate new backup codes.');
      }

      const newBackupCodes = this.generateBackupCodes();

      // Update backup codes
      await executeQuery(`
        UPDATE user_mfa_settings 
        SET backup_codes = ?
        WHERE user_id = ? AND is_enabled = TRUE
      `, [JSON.stringify(newBackupCodes), userId]);

      return newBackupCodes;
    } catch (error) {
      throw createDatabaseError('Failed to generate new backup codes', error);
    }
  }

  // Get MFA status for user
  static async getMFAStatus(userId: number): Promise<{
    enabled: boolean;
    backup_codes_remaining?: number;
    enabled_at?: string;
  }> {
    try {
      const mfaSettings = await executeQuerySingle(`
        SELECT is_enabled, backup_codes, enabled_at
        FROM user_mfa_settings 
        WHERE user_id = ?
      `, [userId]);

      if (!mfaSettings) {
        return { enabled: false };
      }

      const backupCodes = JSON.parse(mfaSettings.backup_codes || '[]');

      return {
        enabled: mfaSettings.is_enabled,
        backup_codes_remaining: mfaSettings.is_enabled ? backupCodes.length : undefined,
        enabled_at: mfaSettings.enabled_at
      };
    } catch (error) {
      throw createDatabaseError('Failed to get MFA status', error);
    }
  }

  // Check if MFA is required for user
  static async isMFARequired(userId: number): Promise<boolean> {
    try {
      // Check system configuration
      const config = await executeQuerySingle(`
        SELECT config_value 
        FROM system_configuration 
        WHERE config_key = 'mfa_required_for_admins'
      `);

      const mfaRequiredForAdmins = config ? JSON.parse(config.config_value) : false;

      if (!mfaRequiredForAdmins) {
        return false;
      }

      // Check if user is admin
      const user = await executeQuerySingle(`
        SELECT admin_level FROM users WHERE id = ?
      `, [userId]);

      return user && user.admin_level !== 'none';
    } catch (error) {
      return false;
    }
  }

  // Generate backup codes
  private static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  // Validate backup code format
  static validateBackupCodeFormat(code: string): boolean {
    return /^[A-F0-9]{8}$/.test(code.toUpperCase());
  }

  // Get MFA statistics for admin dashboard
  static async getMFAStatistics(): Promise<{
    total_users: number;
    mfa_enabled_users: number;
    mfa_required_users: number;
    mfa_adoption_rate: number;
  }> {
    try {
      const stats = await executeQuerySingle(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN mfa_enabled = TRUE THEN 1 END) as mfa_enabled_users,
          COUNT(CASE WHEN admin_level != 'none' THEN 1 END) as mfa_required_users
        FROM users
        WHERE is_active = TRUE
      `);

      const mfaAdoptionRate = stats.mfa_required_users > 0 
        ? (stats.mfa_enabled_users / stats.mfa_required_users) * 100 
        : 0;

      return {
        total_users: stats.total_users,
        mfa_enabled_users: stats.mfa_enabled_users,
        mfa_required_users: stats.mfa_required_users,
        mfa_adoption_rate: Math.round(mfaAdoptionRate * 100) / 100
      };
    } catch (error) {
      throw createDatabaseError('Failed to get MFA statistics', error);
    }
  }
}
