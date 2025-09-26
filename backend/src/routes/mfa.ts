import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { MFAService } from '../services/mfaService';
import { ValidationError } from '../middleware/errorHandler';
import { logAudit, AuditAction, EntityType } from '../middleware/auditLogger';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const router = express.Router();

// Validation schemas
const enableMFASchema = Joi.object({
  token: Joi.string().length(6).pattern(/^\d{6}$/).required()
});

const disableMFASchema = Joi.object({
  token: Joi.string().required() // Can be TOTP or backup code
});

const verifyMFASchema = Joi.object({
  token: Joi.string().required()
});

const generateBackupCodesSchema = Joi.object({
  current_token: Joi.string().required()
});

// Generate MFA setup
router.post('/setup',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userEmail = req.user!.email;

      // Check if MFA is already enabled
      const mfaStatus = await MFAService.getMFAStatus(userId);
      if (mfaStatus.enabled) {
        throw new ValidationError('MFA is already enabled for this account');
      }

      const setup = await MFAService.generateMFASetup(userId, userEmail);

      // Log MFA setup generation
      await logAudit(
        userId,
        AuditAction.CREATE,
        EntityType.SYSTEM,
        userId,
        undefined,
        {
          action: 'mfa_setup_generated',
          user_email: userEmail
        },
        req
      );

      sendSuccess(res, {
        qr_code: setup.qr_code,
        manual_entry_key: setup.manual_entry_key,
        backup_codes: setup.backup_codes
      }, 'MFA setup generated successfully. Please scan the QR code or enter the manual key in your authenticator app.');
    } catch (error) {
      next(error);
    }
  }
);

// Enable MFA
router.post('/enable',
  authenticate,
  validate({ body: enableMFASchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      const result = await MFAService.enableMFA(userId, token);

      // Log MFA enablement
      await logAudit(
        userId,
        AuditAction.UPDATE,
        EntityType.USER,
        userId,
        undefined,
        {
          action: 'mfa_enabled',
          user_email: req.user!.email
        },
        req
      );

      sendSuccess(res, {
        enabled: true,
        backup_codes: result.backup_codes
      }, 'MFA has been successfully enabled. Please save your backup codes in a secure location.');
    } catch (error) {
      next(error);
    }
  }
);

// Disable MFA
router.post('/disable',
  authenticate,
  validate({ body: disableMFASchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      await MFAService.disableMFA(userId, token);

      // Log MFA disablement
      await logAudit(
        userId,
        AuditAction.UPDATE,
        EntityType.USER,
        userId,
        undefined,
        {
          action: 'mfa_disabled',
          user_email: req.user!.email
        },
        req
      );

      sendSuccess(res, { enabled: false }, 'MFA has been successfully disabled.');
    } catch (error) {
      next(error);
    }
  }
);

// Verify MFA token
router.post('/verify',
  authenticate,
  validate({ body: verifyMFASchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      const verification = await MFAService.verifyMFAToken(userId, token);

      if (verification.valid) {
        // Log successful MFA verification
        await logAudit(
          userId,
          AuditAction.READ,
          EntityType.SYSTEM,
          userId,
          undefined,
          {
            action: 'mfa_verification_success',
            used_backup_code: verification.used_backup_code || false,
            remaining_backup_codes: verification.remaining_backup_codes
          },
          req
        );

        let message = 'MFA token verified successfully.';
        if (verification.used_backup_code) {
          message += ` Backup code used. ${verification.remaining_backup_codes} backup codes remaining.`;
        }

        sendSuccess(res, {
          valid: true,
          used_backup_code: verification.used_backup_code,
          remaining_backup_codes: verification.remaining_backup_codes
        }, message);
      } else {
        // Log failed MFA verification
        await logAudit(
          userId,
          AuditAction.READ,
          EntityType.SYSTEM,
          userId,
          undefined,
          {
            action: 'mfa_verification_failed',
            user_email: req.user!.email
          },
          req
        );

        sendError(res, 'Invalid MFA token.', 400);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Generate new backup codes
router.post('/backup-codes/regenerate',
  authenticate,
  validate({ body: generateBackupCodesSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { current_token } = req.body;

      const newBackupCodes = await MFAService.generateNewBackupCodes(userId, current_token);

      // Log backup code regeneration
      await logAudit(
        userId,
        AuditAction.UPDATE,
        EntityType.SYSTEM,
        userId,
        undefined,
        {
          action: 'mfa_backup_codes_regenerated',
          user_email: req.user!.email,
          new_codes_count: newBackupCodes.length
        },
        req
      );

      sendSuccess(res, {
        backup_codes: newBackupCodes
      }, 'New backup codes generated successfully. Please save them in a secure location.');
    } catch (error) {
      next(error);
    }
  }
);

// Get MFA status
router.get('/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const status = await MFAService.getMFAStatus(userId);
      const isRequired = await MFAService.isMFARequired(userId);

      sendSuccess(res, {
        ...status,
        required: isRequired
      }, 'MFA status retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
);

// Get MFA statistics (admin only)
router.get('/statistics',
  authenticate,
  requirePermission('analytics.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statistics = await MFAService.getMFAStatistics();

      sendSuccess(res, statistics, 'MFA statistics retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
);

// Check if MFA is required for user (public endpoint for login flow)
router.get('/required/:userId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      const isRequired = await MFAService.isMFARequired(userId);
      const status = await MFAService.getMFAStatus(userId);

      sendSuccess(res, {
        required: isRequired,
        enabled: status.enabled
      }, 'MFA requirement status retrieved.');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
