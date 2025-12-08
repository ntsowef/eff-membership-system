import { getPrisma } from './prismaService';
import { createDatabaseError, ValidationError } from '../middleware/errorHandler';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

const prisma = getPrisma();

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

      // Store in database (but don't enable yet) - UPSERT operation
      await prisma.user_mfa_settings.upsert({
        where: { user_id: userId },
        update: {
          secret_key: secret.base32,
          backup_codes: backupCodes,
          is_enabled: false,
          disabled_at: new Date(),
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
      const mfaSettings = await prisma.user_mfa_settings.findUnique({
        where: { user_id: userId }
      });

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

      // Enable MFA in both tables using transaction
      await prisma.$transaction([
        prisma.user_mfa_settings.update({
          where: { user_id: userId },
          data: {
            is_enabled: true,
            enabled_at: new Date(),
            disabled_at: null,
            updated_at: new Date()
          }
        }),
        prisma.users.update({
          where: { user_id: userId },
          data: { mfa_enabled: true }
        })
      ]);

      const backupCodes = Array.isArray(mfaSettings.backup_codes)
        ? mfaSettings.backup_codes
        : JSON.parse(mfaSettings.backup_codes as string);

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

      // Disable MFA in both tables using transaction
      await prisma.$transaction([
        prisma.user_mfa_settings.update({
          where: { user_id: userId },
          data: {
            is_enabled: false,
            disabled_at: new Date(),
            updated_at: new Date()
          }
        }),
        prisma.users.update({
          where: { user_id: userId },
          data: { mfa_enabled: false }
        })
      ]);

      return { success: true };
    } catch (error) {
      throw createDatabaseError('Failed to disable MFA', error);
    }
  }

  // Verify MFA token
  static async verifyMFAToken(userId: number, token: string): Promise<MFAVerification> {
    try {
      const mfaSettings = await prisma.user_mfa_settings.findFirst({
        where: {
          user_id: userId,
          is_enabled: true
        }
      });

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
      const backupCodes = Array.isArray(mfaSettings.backup_codes)
        ? mfaSettings.backup_codes
        : JSON.parse((mfaSettings.backup_codes as string) || '[]');

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const backupCodeIndex = backupCodes.findIndex((code: string) =>
        crypto.createHash('sha256').update(code).digest('hex') === hashedToken
      );

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(backupCodeIndex, 1);

        // Update backup codes in database
        await prisma.user_mfa_settings.update({
          where: { user_id: userId },
          data: {
            backup_codes: backupCodes,
            updated_at: new Date()
          }
        });

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
      await prisma.user_mfa_settings.update({
        where: { user_id: userId },
        data: {
          backup_codes: newBackupCodes,
          updated_at: new Date()
        }
      });

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
      const mfaSettings = await prisma.user_mfa_settings.findUnique({
        where: { user_id: userId },
        select: {
          is_enabled: true,
          backup_codes: true,
          enabled_at: true
        }
      });

      if (!mfaSettings) {
        return { enabled: false };
      }

      const backupCodes = Array.isArray(mfaSettings.backup_codes)
        ? mfaSettings.backup_codes
        : JSON.parse((mfaSettings.backup_codes as string) || '[]');

      return {
        enabled: mfaSettings.is_enabled || false,
        backup_codes_remaining: mfaSettings.is_enabled ? backupCodes.length : undefined,
        enabled_at: mfaSettings.enabled_at?.toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to get MFA status', error);
    }
  }

  // Check if MFA is required for user
  static async isMFARequired(userId: number): Promise<boolean> {
    try {
      // Check system configuration
      const config = await prisma.system_configuration.findUnique({
        where: { config_key: 'mfa_required_for_admins' },
        select: { config_value: true }
      });

      const mfaRequiredForAdmins = config ? JSON.parse(config.config_value as string) : false;

      if (!mfaRequiredForAdmins) {
        return false;
      }

      // Check if user is admin
      const user = await prisma.users.findUnique({
        where: { user_id: userId },
        select: { admin_level: true }
      });

      return user !== null && user.admin_level !== 'none';
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
      const [totalUsers, mfaEnabledUsers, mfaRequiredUsers] = await Promise.all([
        prisma.users.count({
          where: { is_active: true }
        }),
        prisma.users.count({
          where: {
            is_active: true,
            mfa_enabled: true
          }
        }),
        prisma.users.count({
          where: {
            is_active: true,
            admin_level: { not: 'none' }
          }
        })
      ]);

      const mfaAdoptionRate = mfaRequiredUsers > 0
        ? (mfaEnabledUsers / mfaRequiredUsers) * 100
        : 0;

      return {
        total_users: totalUsers,
        mfa_enabled_users: mfaEnabledUsers,
        mfa_required_users: mfaRequiredUsers,
        mfa_adoption_rate: Math.round(mfaAdoptionRate * 100) / 100
      };
    } catch (error) {
      throw createDatabaseError('Failed to get MFA statistics', error);
    }
  }
}
