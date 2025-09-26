import { Router, Request, Response, NextFunction } from 'express';
import { VoterVerificationModel, CreateVoterVerificationData, UpdateVoterVerificationData, VoterVerificationFilters } from '../models/voterVerifications';
import { MemberModel } from '../models/members';
import { authenticate, requirePermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createVerificationSchema = Joi.object({
  member_id: Joi.number().integer().positive().required(),
  verification_method: Joi.string().valid('API', 'Manual', 'Document').required(),
  status: Joi.string().valid('Registered', 'Not Registered', 'Pending', 'Error').required(),
  voter_registration_number: Joi.string().max(50).optional(),
  voting_district: Joi.string().max(100).optional(),
  next_verification_date: Joi.date().iso().optional(),
  verification_notes: Joi.string().max(1000).optional()
});

const updateVerificationSchema = Joi.object({
  status: Joi.string().valid('Registered', 'Not Registered', 'Pending', 'Error').optional(),
  voter_registration_number: Joi.string().max(50).optional(),
  voting_district: Joi.string().max(100).optional(),
  next_verification_date: Joi.date().iso().optional(),
  verification_notes: Joi.string().max(1000).optional()
});

const bulkVerificationSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
  verification_method: Joi.string().valid('API', 'Manual', 'Document').required(),
  verification_notes: Joi.string().max(1000).optional()
});

// Create new voter verification
router.post('/', authenticate, requirePermission('voter_verification.create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createVerificationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if member exists
    const member = await MemberModel.getMemberById(value.member_id);
    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const verificationData: CreateVoterVerificationData = {
      ...value,
      verified_by: req.user!.id
    };

    const verificationId = await VoterVerificationModel.createVerification(verificationData);
    const verification = await VoterVerificationModel.getVerificationById(verificationId);

    // Log the verification creation
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      verificationId,
      undefined,
      { member_id: value.member_id, status: value.status, method: value.verification_method },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Voter verification created successfully',
      data: {
        verification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get all voter verifications (admin only)
router.get('/', authenticate, requirePermission('voter_verification.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: VoterVerificationFilters = {};
    
    if (req.query.member_id) filters.member_id = parseInt(req.query.member_id as string);
    if (req.query.verification_method) filters.verification_method = req.query.verification_method as string;
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.verified_by) filters.verified_by = parseInt(req.query.verified_by as string);
    if (req.query.ward_code) filters.ward_code = req.query.ward_code as string;
    if (req.query.municipal_code) filters.municipal_code = req.query.municipal_code as string;
    if (req.query.district_code) filters.district_code = req.query.district_code as string;
    if (req.query.province_code) filters.province_code = req.query.province_code as string;
    if (req.query.verification_date_from) filters.verification_date_from = req.query.verification_date_from as string;
    if (req.query.verification_date_to) filters.verification_date_to = req.query.verification_date_to as string;
    if (req.query.next_verification_due === 'true') filters.next_verification_due = true;
    if (req.query.search) filters.search = req.query.search as string;

    // No geographic filtering needed - all admins are national level

    const [verifications, totalCount] = await Promise.all([
      VoterVerificationModel.getVerifications(limit, offset, filters),
      VoterVerificationModel.getVerificationCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Voter verifications retrieved successfully',
      data: {
        verifications,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get voter verification by ID
router.get('/:id', authenticate, requirePermission('voter_verification.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const verificationId = parseInt(req.params.id);
    if (isNaN(verificationId)) {
      throw new ValidationError('Invalid verification ID');
    }

    const verification = await VoterVerificationModel.getVerificationById(verificationId);
    if (!verification) {
      throw new NotFoundError('Voter verification not found');
    }

    res.json({
      success: true,
      message: 'Voter verification retrieved successfully',
      data: {
        verification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's voter verification history
router.get('/member/:memberId', authenticate, requirePermission('voter_verification.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      throw new ValidationError('Invalid member ID');
    }

    // Check if member exists
    const member = await MemberModel.getMemberById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const verifications = await VoterVerificationModel.getVerifications(100, 0, { member_id: memberId });

    res.json({
      success: true,
      message: 'Member voter verification history retrieved successfully',
      data: {
        member: {
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          id_number: member.id_number
        },
        verifications
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's latest voter verification
router.get('/member/:memberId/latest', authenticate, requirePermission('voter_verification.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      throw new ValidationError('Invalid member ID');
    }

    const verification = await VoterVerificationModel.getMemberLatestVerification(memberId);
    if (!verification) {
      throw new NotFoundError('No voter verification found for this member');
    }

    res.json({
      success: true,
      message: 'Latest voter verification retrieved successfully',
      data: {
        verification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update voter verification
router.put('/:id', authenticate, requirePermission('voter_verification.update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const verificationId = parseInt(req.params.id);
    if (isNaN(verificationId)) {
      throw new ValidationError('Invalid verification ID');
    }

    const { error, value } = updateVerificationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if verification exists
    const existingVerification = await VoterVerificationModel.getVerificationById(verificationId);
    if (!existingVerification) {
      throw new NotFoundError('Voter verification not found');
    }

    const updateData: UpdateVoterVerificationData = {
      ...value,
      verified_by: req.user!.id
    };

    const success = await VoterVerificationModel.updateVerification(verificationId, updateData);
    if (!success) {
      throw new Error('Failed to update voter verification');
    }

    const updatedVerification = await VoterVerificationModel.getVerificationById(verificationId);

    // Log the verification update
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      verificationId,
      { status: existingVerification.status },
      { status: value.status },
      req
    );

    res.json({
      success: true,
      message: 'Voter verification updated successfully',
      data: {
        verification: updatedVerification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get members due for verification
router.get('/due/verification', authenticate, requirePermission('voter_verification.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const membersDue = await VoterVerificationModel.getMembersDueForVerification(limit);

    res.json({
      success: true,
      message: 'Members due for verification retrieved successfully',
      data: {
        members_due: membersDue,
        count: membersDue.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get verification statistics
router.get('/stats/overview', authenticate, requirePermission('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    
    // No geographic filtering needed - all admins are national level

    const statistics = await VoterVerificationModel.getVerificationStatistics(filters);

    res.json({
      success: true,
      message: 'Voter verification statistics retrieved successfully',
      data: {
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete voter verification
router.delete('/:id', authenticate, requirePermission('voter_verification.delete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const verificationId = parseInt(req.params.id);
    if (isNaN(verificationId)) {
      throw new ValidationError('Invalid verification ID');
    }

    // Check if verification exists
    const verification = await VoterVerificationModel.getVerificationById(verificationId);
    if (!verification) {
      throw new NotFoundError('Voter verification not found');
    }

    const success = await VoterVerificationModel.deleteVerification(verificationId);
    if (!success) {
      throw new Error('Failed to delete voter verification');
    }

    // Log the verification deletion
    await logAudit(
      req.user!.id,
      AuditAction.DELETE,
      EntityType.SYSTEM,
      verificationId,
      { member_id: verification.member_id, status: verification.status },
      undefined,
      req
    );

    res.json({
      success: true,
      message: 'Voter verification deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
