/**
 * Member Renewal Requests Routes
 * Handles member-initiated renewal requests and admin approval workflow
 */

import { Router, Request, Response, NextFunction } from 'express';
import { MemberRenewalRequestModel, CreateRenewalRequestData, ApproveRenewalData, RejectRenewalData } from '../models/memberRenewalRequests';
import { MemberModel } from '../models/members';
import { MembershipModel } from '../models/memberships';
import { authenticate, authorize } from '../middleware/auth';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createRenewalRequestSchema = Joi.object({
  renewal_period_months: Joi.number().integer().min(1).max(60).default(12)
    .description('Number of months to renew (1-60)'),
  payment_method: Joi.string().valid('online', 'bank_transfer', 'cash', 'eft', 'card').required()
    .description('Payment method used'),
  payment_reference: Joi.string().max(100).optional()
    .description('Payment reference number'),
  payment_amount: Joi.number().positive().required()
    .description('Amount paid for renewal'),
  notes: Joi.string().max(500).optional()
    .description('Additional notes about the renewal')
});

const approveRenewalSchema = Joi.object({
  admin_notes: Joi.string().max(500).optional()
    .description('Admin notes about the approval')
});

const rejectRenewalSchema = Joi.object({
  rejection_reason: Joi.string().min(10).max(500).required()
    .description('Reason for rejecting the renewal request')
});

const pendingRenewalsFilterSchema = Joi.object({
  province_code: Joi.string().max(10).optional(),
  district_code: Joi.string().max(20).optional(),
  municipality_code: Joi.string().max(20).optional(),
  ward_code: Joi.string().max(20).optional(),
  payment_status: Joi.string().valid('Pending', 'Processing', 'Completed', 'Failed', 'Refunded').optional()
});

/**
 * POST /api/member-renewals/request
 * Member-initiated renewal request
 * Requires authentication
 */
router.post('/request', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { error, value } = createRenewalRequestSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Get member_id from authenticated user
    const memberId = req.user?.member_id;
    if (!memberId) {
      throw new AuthorizationError('No member profile associated with this user account');
    }

    // Get member's membership
    const membership = await MembershipModel.getMembershipByMemberId(memberId);
    if (!membership) {
      throw new NotFoundError('No active membership found for this member');
    }

    // Create renewal request data
    const renewalData: CreateRenewalRequestData = {
      member_id: memberId,
      membership_id: membership.membership_id,
      renewal_period_months: value.renewal_period_months,
      payment_method: value.payment_method,
      payment_reference: value.payment_reference,
      payment_amount: value.payment_amount,
      notes: value.notes
    };

    // Create renewal request
    const renewalId = await MemberRenewalRequestModel.createRenewalRequest(renewalData);

    // Get created renewal details
    const renewal = await MemberRenewalRequestModel.getRenewalById(renewalId);

    res.status(201).json({
      success: true,
      message: 'Renewal request submitted successfully. Pending admin approval.',
      data: {
        renewal_id: renewalId,
        renewal_status: 'Pending',
        payment_status: 'Pending',
        renewal_details: renewal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/member-renewals/my-requests
 * Get authenticated member's renewal history
 * Requires authentication
 */
router.get('/my-requests', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.user?.member_id;
    if (!memberId) {
      throw new AuthorizationError('No member profile associated with this user account');
    }

    const renewals = await MemberRenewalRequestModel.getMemberRenewalHistory(memberId);

    res.json({
      success: true,
      data: {
        renewals,
        total: renewals.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/member-renewals/pending
 * Get all pending renewal requests for admin review
 * Requires admin or finance role
 */
router.get('/pending', authenticate, authorize('admin', 'finance', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate query parameters
    const { error, value } = pendingRenewalsFilterSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const renewals = await MemberRenewalRequestModel.getPendingRenewals(value);

    res.json({
      success: true,
      data: {
        renewals,
        total: renewals.length,
        filters: value
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/member-renewals/:id
 * Get renewal request details by ID
 * Requires authentication (member can view own, admin can view all)
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    const renewal = await MemberRenewalRequestModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal request not found');
    }

    // Check authorization: member can only view their own renewals
    const isAdmin = req.user?.role && ['admin', 'finance', 'super_admin'].includes(req.user.role);
    const isOwnRenewal = req.user?.member_id === renewal.member_id;

    if (!isAdmin && !isOwnRenewal) {
      throw new AuthorizationError('You are not authorized to view this renewal request');
    }

    res.json({
      success: true,
      data: {
        renewal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/member-renewals/:id/approve
 * Approve a renewal request
 * Requires admin or finance role
 */
router.post('/:id/approve', authenticate, authorize('admin', 'finance', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    // Validate request body
    const { error, value } = approveRenewalSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if renewal exists
    const renewal = await MemberRenewalRequestModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal request not found');
    }

    // Approve renewal
    const approvalData: ApproveRenewalData = {
      approved_by: req.user!.id,
      admin_notes: value.admin_notes
    };

    const success = await MemberRenewalRequestModel.approveRenewal(renewalId, approvalData);

    if (!success) {
      throw new Error('Failed to approve renewal request');
    }

    // Get updated renewal details
    const updatedRenewal = await MemberRenewalRequestModel.getRenewalById(renewalId);

    res.json({
      success: true,
      message: 'Renewal request approved successfully. Membership status updated to Active.',
      data: {
        renewal: updatedRenewal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/member-renewals/:id/reject
 * Reject a renewal request
 * Requires admin or finance role
 */
router.post('/:id/reject', authenticate, authorize('admin', 'finance', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    // Validate request body
    const { error, value } = rejectRenewalSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if renewal exists
    const renewal = await MemberRenewalRequestModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal request not found');
    }

    // Reject renewal
    const rejectionData: RejectRenewalData = {
      rejected_by: req.user!.id,
      rejection_reason: value.rejection_reason
    };

    const success = await MemberRenewalRequestModel.rejectRenewal(renewalId, rejectionData);

    if (!success) {
      throw new Error('Failed to reject renewal request');
    }

    // Get updated renewal details
    const updatedRenewal = await MemberRenewalRequestModel.getRenewalById(renewalId);

    res.json({
      success: true,
      message: 'Renewal request rejected.',
      data: {
        renewal: updatedRenewal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;

