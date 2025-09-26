import { Router } from 'express';
import { MembershipModel, CreateMembershipData, UpdateMembershipData, MembershipFilters } from '../models/memberships';
import { MemberModel } from '../models/members';
import { asyncHandler, sendSuccess, sendPaginatedSuccess, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { validate, commonSchemas, membershipSchemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Membership filter schema
const membershipFilterSchema = Joi.object({
  member_id: Joi.number().integer().positive().optional(),
  status_id: Joi.number().integer().min(1).max(5).optional(),
  subscription_type_id: Joi.number().integer().min(1).max(2).optional(),
  ward_code: Joi.string().min(5).max(15).optional(),
  is_expired: Joi.boolean().optional(),
  expires_within_days: Joi.number().integer().min(1).max(365).optional(),
  date_joined_from: Joi.date().iso().optional(),
  date_joined_to: Joi.date().iso().min(Joi.ref('date_joined_from')).optional()
}).concat(commonSchemas.pagination);

// Get all memberships with filtering and pagination
router.get('/',
  validate({ query: membershipFilterSchema }),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'date_joined',
      sortOrder = 'desc',
      member_id,
      status_id,
      subscription_type_id,
      ward_code,
      is_expired,
      expires_within_days,
      date_joined_from,
      date_joined_to
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const filters: MembershipFilters = {
      member_id: member_id ? parseInt(member_id as string) : undefined,
      status_id: status_id ? parseInt(status_id as string) : undefined,
      subscription_type_id: subscription_type_id ? parseInt(subscription_type_id as string) : undefined,
      ward_code: ward_code as string,
      is_expired: is_expired === 'true' ? true : is_expired === 'false' ? false : undefined,
      expires_within_days: expires_within_days ? parseInt(expires_within_days as string) : undefined,
      date_joined_from: date_joined_from as string,
      date_joined_to: date_joined_to as string
    };

    const [memberships, total] = await Promise.all([
      MembershipModel.getAllMemberships(filters, limitNum, offset, sortBy as string, sortOrder as 'asc' | 'desc'),
      MembershipModel.getMembershipsCount(filters)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    sendPaginatedSuccess(res, memberships, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }, 'Memberships retrieved successfully');
  })
);

// Get membership by ID
router.get('/:id',
  validate({ params: commonSchemas.id }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const membership = await MembershipModel.getMembershipById(parseInt(id));

    if (!membership) {
      throw new NotFoundError(`Membership with ID ${id} not found`);
    }

    sendSuccess(res, membership, 'Membership retrieved successfully');
  })
);

// Get membership by member ID
router.get('/member/:memberId',
  validate({ params: commonSchemas.memberId }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const membership = await MembershipModel.getMembershipByMemberId(parseInt(memberId));

    if (!membership) {
      throw new NotFoundError(`No membership found for member ID ${memberId}`);
    }

    sendSuccess(res, membership, 'Membership retrieved successfully');
  })
);

// Create new membership
router.post('/',
  validate({ body: membershipSchemas.create }),
  asyncHandler(async (req, res) => {
    const membershipData: CreateMembershipData = req.body;

    // Check if member exists
    const member = await MemberModel.getMemberById(membershipData.member_id);
    if (!member) {
      throw new ValidationError(`Member with ID ${membershipData.member_id} does not exist`);
    }

    // Check if member already has active membership
    const hasActiveMembership = await MembershipModel.memberHasActiveMembership(membershipData.member_id);
    if (hasActiveMembership) {
      throw new ValidationError(`Member already has an active membership`);
    }

    const membershipId = await MembershipModel.createMembership(membershipData);
    const newMembership = await MembershipModel.getMembershipById(membershipId);

    sendSuccess(res, newMembership, 'Membership created successfully', 201);
  })
);

// Update membership
router.put('/:id',
  validate({ 
    params: commonSchemas.id,
    body: membershipSchemas.update 
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData: UpdateMembershipData = req.body;
    const membershipId = parseInt(id);

    // Check if membership exists
    const existingMembership = await MembershipModel.getMembershipById(membershipId);
    if (!existingMembership) {
      throw new NotFoundError(`Membership with ID ${id} not found`);
    }

    const updated = await MembershipModel.updateMembership(membershipId, updateData);
    if (!updated) {
      throw new ValidationError('No changes were made to the membership');
    }

    const updatedMembership = await MembershipModel.getMembershipById(membershipId);
    sendSuccess(res, updatedMembership, 'Membership updated successfully');
  })
);

// Delete membership
router.delete('/:id',
  validate({ params: commonSchemas.id }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const membershipId = parseInt(id);

    // Check if membership exists
    const existingMembership = await MembershipModel.getMembershipById(membershipId);
    if (!existingMembership) {
      throw new NotFoundError(`Membership with ID ${id} not found`);
    }

    const deleted = await MembershipModel.deleteMembership(membershipId);
    if (!deleted) {
      throw new ValidationError('Failed to delete membership');
    }

    sendSuccess(res, { deleted: true, membership_id: membershipId }, 'Membership deleted successfully');
  })
);

// Get expiring memberships
router.get('/reports/expiring',
  validate({ 
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(30)
    })
  }),
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const expiringMemberships = await MembershipModel.getExpiringMemberships(parseInt(days as string));

    sendSuccess(res, {
      memberships: expiringMemberships,
      count: expiringMemberships.length,
      days: parseInt(days as string)
    }, `Memberships expiring within ${days} days retrieved successfully`);
  })
);

// Get expired memberships
router.get('/reports/expired',
  asyncHandler(async (req, res) => {
    const expiredMemberships = await MembershipModel.getExpiredMemberships();

    sendSuccess(res, {
      memberships: expiredMemberships,
      count: expiredMemberships.length
    }, 'Expired memberships retrieved successfully');
  })
);

// Check if member has active membership
router.get('/check/active/:memberId',
  validate({ params: commonSchemas.memberId }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const memberIdNum = parseInt(memberId);

    // Check if member exists
    const member = await MemberModel.getMemberById(memberIdNum);
    if (!member) {
      throw new NotFoundError(`Member with ID ${memberId} not found`);
    }

    const hasActiveMembership = await MembershipModel.memberHasActiveMembership(memberIdNum);
    
    sendSuccess(res, { 
      member_id: memberIdNum,
      has_active_membership: hasActiveMembership,
      can_create_membership: !hasActiveMembership
    }, 'Membership status checked');
  })
);

// Get membership statistics
router.get('/statistics/summary',
  asyncHandler(async (req, res) => {
    const { ward_code } = req.query;
    
    const filters: MembershipFilters = ward_code ? { ward_code: ward_code as string } : {};
    
    const [
      totalMemberships,
      activeMemberships,
      expiredMemberships,
      newMemberships,
      renewalMemberships,
      expiringIn30Days
    ] = await Promise.all([
      MembershipModel.getMembershipsCount(filters),
      MembershipModel.getMembershipsCount({ ...filters, status_id: 1 }),
      MembershipModel.getMembershipsCount({ ...filters, is_expired: true }),
      MembershipModel.getMembershipsCount({ ...filters, subscription_type_id: 1 }),
      MembershipModel.getMembershipsCount({ ...filters, subscription_type_id: 2 }),
      MembershipModel.getMembershipsCount({ ...filters, expires_within_days: 30 })
    ]);

    const statistics = {
      total: totalMemberships,
      status: {
        active: activeMemberships,
        expired: expiredMemberships,
        expiring_soon: expiringIn30Days
      },
      subscription_types: {
        new: newMemberships,
        renewal: renewalMemberships
      },
      percentages: {
        active: totalMemberships > 0 ? Math.round((activeMemberships / totalMemberships) * 100) : 0,
        expired: totalMemberships > 0 ? Math.round((expiredMemberships / totalMemberships) * 100) : 0,
        renewal_rate: totalMemberships > 0 ? Math.round((renewalMemberships / totalMemberships) * 100) : 0
      },
      ward_code: ward_code || 'all'
    };

    sendSuccess(res, statistics, 'Membership statistics retrieved successfully');
  })
);

export default router;
