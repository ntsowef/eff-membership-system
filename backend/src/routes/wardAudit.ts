import { Router, Request, Response } from 'express';
import { WardAuditModel } from '../models/wardAudit';
import { GeographicModel } from '../models/geographic';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requirePermission } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { executeQuery, executeQuerySingle } from '../config/database';
import Joi from 'joi';
import { validate } from '../middleware/validation';
import { logDelegateAssignment, logDelegateRemoval } from '../middleware/auditLogger';

const router = Router();

// =====================================================
// Validation Schemas
// =====================================================

const provinceCodeSchema = Joi.object({
  province_code: Joi.string().required().min(2).max(3)
});

const municipalityCodeSchema = Joi.object({
  municipality_code: Joi.string().required()
});

const wardCodeSchema = Joi.object({
  ward_code: Joi.string().required()
});

const assignDelegateSchema = Joi.object({
  ward_code: Joi.string().required(),
  member_id: Joi.number().integer().required(),
  assembly_code: Joi.string().required().valid('SRPA', 'PPA', 'NPA'),
  selection_method: Joi.string().optional().valid('Elected', 'Appointed', 'Ex-Officio'),
  term_start_date: Joi.date().optional(),
  term_end_date: Joi.date().optional(),
  notes: Joi.string().optional()
});

const approveComplianceSchema = Joi.object({
  notes: Joi.string().optional()
});

const createMeetingSchema = Joi.object({
  meeting_id: Joi.number().integer().optional(), // Made optional - will be auto-generated
  meeting_type: Joi.string().required().valid('BPA', 'BGA'),
  presiding_officer_id: Joi.alternatives().try(
    Joi.number().integer(),
    Joi.string().allow('').optional()
  ).optional(),
  secretary_id: Joi.alternatives().try(
    Joi.number().integer(),
    Joi.string().allow('').optional()
  ).optional(),
  quorum_required: Joi.number().integer().required().min(0),
  quorum_achieved: Joi.number().integer().required().min(0),
  total_attendees: Joi.number().integer().required().min(0),
  quorum_verified_manually: Joi.boolean().optional(),
  quorum_verification_notes: Joi.string().allow('').optional(),
  meeting_took_place_verified: Joi.boolean().optional(),
  meeting_verification_notes: Joi.string().allow('').optional(),
  meeting_outcome: Joi.string().allow('').optional(),
  key_decisions: Joi.string().allow('').optional(),
  action_items: Joi.string().allow('').optional(),
  next_meeting_date: Joi.date().optional()
});

const updateMeetingSchema = Joi.object({
  presiding_officer_id: Joi.number().integer().optional(),
  secretary_id: Joi.number().integer().optional(),
  quorum_required: Joi.number().integer().optional().min(0),
  quorum_achieved: Joi.number().integer().optional().min(0),
  total_attendees: Joi.number().integer().optional().min(0),
  meeting_outcome: Joi.string().optional(),
  key_decisions: Joi.string().optional(),
  action_items: Joi.string().optional(),
  next_meeting_date: Joi.date().optional()
});

const recordIdSchema = Joi.object({
  record_id: Joi.number().integer().required()
});

// =====================================================
// Geographic Filtering Routes
// =====================================================

/**
 * GET /api/v1/ward-audit/municipalities
 * Get municipalities/subregions by province for ward audit
 *
 * For metropolitan municipalities, only show sub-regions (not parent metros)
 * For regular districts, show local municipalities
 */
router.get('/municipalities',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ query: provinceCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code } = req.query;

    // Get all municipalities for the province (including metros and subregions)
    const municipalities = await GeographicModel.getMunicipalitiesByProvince(province_code as string);

    // Separate metros and their subregions
    const metroParents = municipalities.filter(m => m.municipality_type === 'Metropolitan');
    const metroSubregions = municipalities.filter(m => m.municipality_type === 'Metro Sub-Region');
    const regularMunicipalities = municipalities.filter(m =>
      m.municipality_type === 'Local' || m.municipality_type === 'District'
    );

    // Get parent metro codes to exclude them
    const metroParentCodes = metroParents.map(m => m.municipality_code);

    // Filter out parent metros, keep only subregions and regular municipalities
    let filteredMunicipalities = [
      ...metroSubregions,
      ...regularMunicipalities.filter(m => !metroParentCodes.includes(m.municipality_code))
    ];

    // Enhance sub-region names to show parent metro
    filteredMunicipalities = filteredMunicipalities.map(m => {
      if (m.municipality_type === 'Metro Sub-Region' && m.parent_municipality_code) {
        // Find parent metro name
        const parentMetro = metroParents.find(p => p.municipality_code === m.parent_municipality_code);
        if (parentMetro) {
          // Format: "Johannesburg Region 1 (JHB001)"
          const parentName = parentMetro.municipality_name.replace('City of ', '').replace('Metropolitan Municipality', '').trim();
          return {
            ...m,
            municipality_name: `${parentName} - ${m.municipality_name} (${m.municipality_code})`
          };
        }
      }
      return m;
    });

    // Sort: Metro subregions first, then regular municipalities
    filteredMunicipalities.sort((a, b) => {
      // Metro subregions first
      if (a.municipality_type === 'Metro Sub-Region' && b.municipality_type !== 'Metro Sub-Region') return -1;
      if (a.municipality_type !== 'Metro Sub-Region' && b.municipality_type === 'Metro Sub-Region') return 1;
      // Then alphabetically by name
      return a.municipality_name.localeCompare(b.municipality_name);
    });

    sendSuccess(res, filteredMunicipalities, 'Municipalities retrieved successfully');
  })
);

/**
 * GET /api/v1/ward-audit/wards
 * Get wards by municipality with compliance data
 */
router.get('/wards',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ query: municipalityCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { municipality_code } = req.query;
    
    const wards = await WardAuditModel.getWardsByMunicipality(municipality_code as string);
    
    sendSuccess(res, wards, 'Wards retrieved successfully');
  })
);

// =====================================================
// Ward Compliance Routes
// =====================================================

/**
 * GET /api/v1/ward-audit/ward/:ward_code/compliance
 * Get detailed compliance check for a specific ward
 */
router.get('/ward/:ward_code/compliance',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    
    const complianceSummary = await WardAuditModel.getWardComplianceSummary(ward_code);
    
    if (!complianceSummary) {
      return sendError(res, 'Ward not found', 404);
    }
    
    sendSuccess(res, complianceSummary, 'Ward compliance data retrieved successfully');
  })
);

/**
 * POST /api/v1/ward-audit/ward/:ward_code/submit-compliance
 * Submit ward as compliant (only when criteria 1-4 pass)
 * This replaces the old approve endpoint with stricter validation
 */
router.post('/ward/:ward_code/submit-compliance',
  authenticate,
  requirePermission('ward_audit.approve'),
  validate({
    params: wardCodeSchema,
    body: approveComplianceSchema
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user.id || (req as any).user.user_id;

    // Get full ward compliance details (includes all 5 criteria)
    const wardDetails = await WardAuditModel.getWardComplianceDetails(ward_code);

    if (!wardDetails) {
      return sendError(res, 'Ward not found', 404);
    }

    // Check that criteria 1-4 are all passing
    const failedCriteria: string[] = [];

    if (!wardDetails.criterion_1_compliant) {
      failedCriteria.push('Criterion 1: Membership & Voting District Compliance');
    }
    if (!wardDetails.criterion_2_passed) {
      failedCriteria.push('Criterion 2: Meeting Quorum Verification');
    }
    if (!wardDetails.criterion_3_passed) {
      failedCriteria.push('Criterion 3: Meeting Attendance');
    }
    if (!wardDetails.criterion_4_passed) {
      failedCriteria.push('Criterion 4: Presiding Officer Information');
    }

    if (failedCriteria.length > 0) {
      return sendError(res,
        `Cannot submit ward as compliant. The following criteria are not met:\n${failedCriteria.join('\n')}`,
        400
      );
    }

    // All criteria 1-4 passed, approve the ward
    await WardAuditModel.approveWardCompliance(ward_code, userId, notes);

    sendSuccess(res, {
      ward_code,
      approved: true,
      message: 'Ward submitted as compliant successfully. Delegate assignment is now available.'
    }, 'Ward compliance submitted successfully');
  })
);

/**
 * POST /api/v1/ward-audit/ward/:ward_code/approve
 * Legacy endpoint - kept for backward compatibility
 * Redirects to submit-compliance
 */
router.post('/ward/:ward_code/approve',
  authenticate,
  requirePermission('ward_audit.approve'),
  validate({
    params: wardCodeSchema,
    body: approveComplianceSchema
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user.id || (req as any).user.user_id;

    // Get full ward compliance details
    const wardDetails = await WardAuditModel.getWardComplianceDetails(ward_code);

    if (!wardDetails) {
      return sendError(res, 'Ward not found', 404);
    }

    // Check that criteria 1-4 are all passing
    const failedCriteria: string[] = [];

    if (!wardDetails.criterion_1_compliant) {
      failedCriteria.push('Criterion 1');
    }
    if (!wardDetails.criterion_2_passed) {
      failedCriteria.push('Criterion 2');
    }
    if (!wardDetails.criterion_3_passed) {
      failedCriteria.push('Criterion 3');
    }
    if (!wardDetails.criterion_4_passed) {
      failedCriteria.push('Criterion 4');
    }

    if (failedCriteria.length > 0) {
      return sendError(res,
        `Cannot approve ward. Criteria ${failedCriteria.join(', ')} not met.`,
        400
      );
    }

    // Approve the ward
    await WardAuditModel.approveWardCompliance(ward_code, userId, notes);

    sendSuccess(res, { ward_code, approved: true }, 'Ward compliance approved successfully');
  })
);

/**
 * GET /api/v1/ward-audit/ward/:ward_code/voting-districts
 * Get voting district member counts for a ward
 */
router.get('/ward/:ward_code/voting-districts',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;

    const votingDistricts = await WardAuditModel.getVotingDistrictCompliance(ward_code);

    sendSuccess(res, votingDistricts, 'Voting district compliance data retrieved successfully');
  })
);

/**
 * GET /api/v1/ward-audit/members/province/:province_code
 * Get members filtered by province for presiding officer selection (Criterion 4)
 * @deprecated Use /members/province/:province_code/search instead for better performance
 */
router.get('/members/province/:province_code',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: provinceCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code } = req.params;

    const members = await WardAuditModel.getMembersByProvince(province_code);

    sendSuccess(res, members, `Members from province ${province_code} retrieved successfully`);
  })
);

/**
 * GET /api/v1/ward-audit/members/province/:province_code/search
 * Search members by province with autocomplete (for presiding officer)
 * Query params: q (search term), limit (default: 50)
 */
router.get('/members/province/:province_code/search',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: provinceCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code } = req.params;
    const { q: searchTerm = '', limit = 50 } = req.query;

    if (!searchTerm || (searchTerm as string).length < 2) {
      return sendSuccess(res, [], 'Search term must be at least 2 characters');
    }

    const members = await WardAuditModel.searchMembersByProvince(
      province_code,
      searchTerm as string,
      Math.min(Number(limit), 100) // Max 100 results
    );

    sendSuccess(res, members, `Found ${members.length} members matching "${searchTerm}"`);
  })
);

/**
 * GET /api/v1/ward-audit/ward/:ward_code/members/search
 * Search members by ward with autocomplete (for secretary)
 * Query params: q (search term), limit (default: 50)
 */
router.get('/ward/:ward_code/members/search',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const { q: searchTerm = '', limit = 50 } = req.query;

    if (!searchTerm || (searchTerm as string).length < 2) {
      return sendSuccess(res, [], 'Search term must be at least 2 characters');
    }

    const members = await WardAuditModel.searchMembersByWard(
      ward_code,
      searchTerm as string,
      Math.min(Number(limit), 100) // Max 100 results
    );

    sendSuccess(res, members, `Found ${members.length} members in ward matching "${searchTerm}"`);
  })
);

// =====================================================
// Meeting Management Routes
// =====================================================

/**
 * POST /api/v1/ward-audit/ward/:ward_code/meeting
 * Create a new ward meeting record
 */
router.post('/ward/:ward_code/meeting',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({
    params: wardCodeSchema,
    body: createMeetingSchema
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const userId = (req as any).user?.id; // Changed from user_id to id

    // Convert empty strings to null for optional numeric fields
    // Truncate meeting_outcome to 50 characters (database limit)
    const meetingOutcome = req.body.meeting_outcome === '' ? null :
      (req.body.meeting_outcome ? req.body.meeting_outcome.substring(0, 50) : null);

    const meetingData = {
      ...req.body,
      ward_code,
      presiding_officer_id: req.body.presiding_officer_id === '' ? null : req.body.presiding_officer_id,
      secretary_id: req.body.secretary_id === '' ? null : req.body.secretary_id,
      meeting_outcome: meetingOutcome,
      action_items: req.body.action_items === '' ? null : req.body.action_items,
      quorum_verified_by: req.body.quorum_verified_manually ? userId : null,
      meeting_verified_by: req.body.meeting_took_place_verified ? userId : null,
    };

    const meeting = await WardAuditModel.createMeetingRecord(meetingData);

    sendSuccess(res, meeting, 'Meeting record created successfully');
  })
);

/**
 * GET /api/v1/ward-audit/ward/:ward_code/meetings
 * Get all meeting records for a ward
 */
router.get('/ward/:ward_code/meetings',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const { meeting_type } = req.query;

    const meetings = await WardAuditModel.getWardMeetings(ward_code, meeting_type as string);

    sendSuccess(res, meetings, 'Ward meetings retrieved successfully');
  })
);

/**
 * GET /api/v1/ward-audit/ward/:ward_code/meeting/latest
 * Get the latest meeting record for a ward
 */
router.get('/ward/:ward_code/meeting/latest',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const { meeting_type } = req.query;

    const meeting = await WardAuditModel.getLatestWardMeeting(ward_code, meeting_type as string);

    if (!meeting) {
      return sendError(res, 'No meeting records found for this ward', 404);
    }

    sendSuccess(res, meeting, 'Latest meeting retrieved successfully');
  })
);

/**
 * PUT /api/v1/ward-audit/meeting/:record_id
 * Update a meeting record
 */
router.put('/meeting/:record_id',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({
    params: recordIdSchema,
    body: updateMeetingSchema
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { record_id } = req.params;

    await WardAuditModel.updateMeetingRecord(parseInt(record_id), req.body);

    sendSuccess(res, { record_id }, 'Meeting record updated successfully');
  })
);

/**
 * DELETE /api/v1/ward-audit/meeting/:record_id
 * Delete a meeting record
 */
router.delete('/meeting/:record_id',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({ params: recordIdSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { record_id } = req.params;

    await WardAuditModel.deleteMeetingRecord(parseInt(record_id));

    sendSuccess(res, { record_id }, 'Meeting record deleted successfully');
  })
);

/**
 * GET /api/v1/ward-audit/ward/:ward_code/compliance/details
 * Get enhanced ward compliance details with all 5 criteria
 */
router.get('/ward/:ward_code/compliance/details',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;

    const complianceDetails = await WardAuditModel.getWardComplianceDetails(ward_code);

    sendSuccess(res, complianceDetails, 'Ward compliance details retrieved successfully');
  })
);

// =====================================================
// Delegate Management Routes
// =====================================================

/**
 * GET /api/v1/ward-audit/ward/:ward_code/members
 * Get eligible members for delegate assignment in a ward
 */
router.get('/ward/:ward_code/members',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;

    const members = await WardAuditModel.getWardMembers(ward_code);

    sendSuccess(res, members, 'Ward members retrieved successfully');
  })
);

/**
 * GET /api/v1/ward-audit/ward/:ward_code/delegates
 * Get delegates for a ward
 */
router.get('/ward/:ward_code/delegates',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const { assembly_code } = req.query;

    const delegates = await WardAuditModel.getWardDelegates(
      ward_code,
      assembly_code as string | undefined
    );

    sendSuccess(res, delegates, 'Ward delegates retrieved successfully');
  })
);

/**
 * GET /api/v1/ward-audit/ward/:ward_code/delegate-limit/:assembly_type_id
 * Check delegate limit for an assembly type
 */
router.get('/ward/:ward_code/delegate-limit/:assembly_type_id',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({
    params: Joi.object({
      ward_code: Joi.string().required(),
      assembly_type_id: Joi.number().integer().required()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code, assembly_type_id } = req.params;

    const limitInfo = await WardAuditModel.checkDelegateLimit(
      ward_code,
      parseInt(assembly_type_id)
    );

    sendSuccess(res, limitInfo, 'Delegate limit info retrieved successfully');
  })
);

/**
 * POST /api/v1/ward-audit/delegates
 * Assign a delegate to a ward for an assembly
 * SECURITY: Ward must be marked as compliant before delegates can be assigned
 */
router.post('/delegates',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({ body: assignDelegateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      ward_code,
      member_id,
      assembly_code,
      selection_method,
      term_start_date,
      term_end_date,
      notes
    } = req.body;

    // SECURITY CHECK: Verify ward is compliant before allowing delegate assignment
    const wardCompliance = await WardAuditModel.getWardComplianceSummary(ward_code);

    if (!wardCompliance) {
      return sendError(res, 'Ward not found', 404);
    }

    if (!wardCompliance.is_compliant) {
      return sendError(res,
        'Ward must be submitted as compliant before delegates can be assigned. Please complete the ward compliance submission process first.',
        403
      );
    }
    
    // Get user_id from authenticated user. The user object should have user_id from getUserById.
    // If not present, fall back to id field, then to null to avoid FK violation.
    console.log('🔍 DEBUG: req.user object:', JSON.stringify((req as any).user, null, 2));
    const userId = (req as any).user?.user_id ?? (req as any).user?.id ?? null;
    console.log('🔍 DEBUG: Extracted userId:', userId);

    // Validate that userId exists in users table if provided
    let validatedUserId = null;
    if (userId) {
      try {
        const userCheck = await executeQuery('SELECT user_id FROM users WHERE user_id = $1', [userId]);
        console.log('🔍 DEBUG: User check result:', userCheck);
        if (userCheck && userCheck.length > 0) {
          validatedUserId = userId;
          console.log('✅ DEBUG: User validated, using userId:', validatedUserId);
        } else {
          console.warn(`⚠️ DEBUG: User ${userId} not found in database, setting selected_by to null`);
        }
      } catch (error) {
        console.warn('❌ DEBUG: User validation failed, setting selected_by to null:', error);
      }
    } else {
      console.warn('⚠️ DEBUG: No userId found in req.user, setting selected_by to null');
    }
    console.log('🔍 DEBUG: Final validatedUserId to be used:', validatedUserId);

    // Get assembly type ID from code
    const assemblyType = await WardAuditModel.getAssemblyTypeByCode(assembly_code);

    if (!assemblyType) {
      return sendError(res, 'Invalid assembly type', 400);
    }

    // Assign the delegate
    const delegateId = await WardAuditModel.assignDelegate({
      ward_code,
      member_id,
      assembly_type_id: assemblyType.assembly_type_id,
      selection_method,
      term_start_date,
      term_end_date,
      notes,
      selected_by: validatedUserId || undefined
    });

    // Log audit trail for delegate assignment (only if userId is available)
    if (validatedUserId) {
      await logDelegateAssignment(
        validatedUserId,
        delegateId,
        {
          ward_code,
          member_id,
          assembly_code,
          selection_method,
          term_start_date,
          term_end_date,
          notes
        },
        req
      );
    }

    sendSuccess(res, { delegate_id: delegateId }, 'Delegate assigned successfully');
  })
);

/**
 * PUT /api/v1/ward-audit/delegate/:delegateId/replace
 * Replace a delegate assignment with a new member
 * SECURITY: Ward must be compliant to manage delegates
 */
router.put('/delegate/:delegateId/replace',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({
    params: Joi.object({
      delegateId: Joi.number().integer().required()
    }),
    body: Joi.object({
      new_member_id: Joi.number().integer().required(),
      reason: Joi.string().required().min(3).max(500)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { delegateId } = req.params;
    const { new_member_id, reason } = req.body;
    const userId = (req as any).user?.user_id;

    // Get delegate info to find ward_code
    const delegateQuery = `
      SELECT ward_code FROM ward_delegates WHERE delegate_id = $1
    `;
    const delegateResult = await executeQuerySingle<{ ward_code: string }>(delegateQuery, [delegateId]);

    if (!delegateResult) {
      return sendError(res, 'Delegate not found', 404);
    }

    // SECURITY CHECK: Verify ward is compliant before allowing delegate replacement
    const wardCompliance = await WardAuditModel.getWardComplianceSummary(delegateResult.ward_code);

    if (!wardCompliance) {
      return sendError(res, 'Ward not found', 404);
    }

    if (!wardCompliance.is_compliant) {
      return sendError(res,
        'Ward must be submitted as compliant before delegates can be managed. Please complete the ward compliance submission process first.',
        403
      );
    }

    // Replace the delegate
    const newDelegateId = await WardAuditModel.replaceDelegateAssignment(
      Number(delegateId),
      new_member_id,
      reason,
      userId
    );

    sendSuccess(res, { delegate_id: newDelegateId }, 'Delegate replaced successfully');
  })
);

/**
 * DELETE /api/v1/ward-audit/delegate/:delegateId
 * Remove a delegate assignment
 * SECURITY: Ward must be compliant to manage delegates
 */
router.delete('/delegate/:delegateId',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({
    params: Joi.object({
      delegateId: Joi.number().integer().required()
    }),
    body: Joi.object({
      reason: Joi.string().required().min(3).max(500)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { delegateId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.user_id;

    // Get delegate info to find ward_code
    const delegateQuery = `
      SELECT ward_code FROM ward_delegates WHERE delegate_id = $1
    `;
    const delegateResult = await executeQuerySingle<{ ward_code: string }>(delegateQuery, [delegateId]);

    if (!delegateResult) {
      return sendError(res, 'Delegate not found', 404);
    }

    // SECURITY CHECK: Verify ward is compliant before allowing delegate removal
    const wardCompliance = await WardAuditModel.getWardComplianceSummary(delegateResult.ward_code);

    if (!wardCompliance) {
      return sendError(res, 'Ward not found', 404);
    }

    if (!wardCompliance.is_compliant) {
      return sendError(res,
        'Ward must be submitted as compliant before delegates can be managed. Please complete the ward compliance submission process first.',
        403
      );
    }

    // Get delegate details before removal for audit trail
    const delegateDetailsQuery = `
      SELECT
        wd.delegate_id,
        wd.member_id,
        wd.ward_code,
        at.assembly_code,
        CONCAT(m.firstname, ' ', m.surname) as member_name
      FROM ward_delegates wd
      JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
      JOIN members_consolidated m ON wd.member_id = m.member_id
      WHERE wd.delegate_id = $1
    `;
    const delegateDetails = await executeQuerySingle<any>(delegateDetailsQuery, [delegateId]);

    await WardAuditModel.removeDelegateAssignment(
      Number(delegateId),
      reason,
      userId
    );

    // Log audit trail for delegate removal
    if (delegateDetails) {
      await logDelegateRemoval(
        userId,
        Number(delegateId),
        {
          member_id: delegateDetails.member_id,
          member_name: delegateDetails.member_name,
          ward_code: delegateDetails.ward_code,
          assembly_code: delegateDetails.assembly_code
        },
        reason,
        req
      );
    }

    sendSuccess(res, null, 'Delegate removed successfully');
  })
);

// =====================================================
// Municipality Aggregate Reports
// =====================================================

/**
 * GET /api/v1/ward-audit/municipality/:municipality_code/delegates
 * Get aggregate delegate report for a municipality
 */
router.get('/municipality/:municipality_code/delegates',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: municipalityCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { municipality_code } = req.params;
    
    const report = await WardAuditModel.getMunicipalityDelegateReport(municipality_code);
    
    sendSuccess(res, report, 'Municipality delegate report retrieved successfully');
  })
);

/**
 * GET /api/v1/ward-audit/assembly-types
 * Get all assembly types
 */
router.get('/assembly-types',
  authenticate,
  requirePermission('ward_audit.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const assemblyTypes = await WardAuditModel.getAllAssemblyTypes();

    sendSuccess(res, assemblyTypes, 'Assembly types retrieved successfully');
  })
);

/**
 * Refresh materialized views for ward audit system
 * This should be called periodically (e.g., every 15 minutes) or after bulk data changes
 */
router.post('/refresh-materialized-views',
  authenticate,
  requirePermission('ward_audit.admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    // Call the PostgreSQL function to refresh materialized views
    await executeQuery('SELECT refresh_ward_audit_materialized_views()', []);

    const duration = Date.now() - startTime;

    sendSuccess(res, {
      refreshed_at: new Date(),
      duration_ms: duration
    }, `Materialized views refreshed successfully in ${duration}ms`);
  })
);

export default router;

