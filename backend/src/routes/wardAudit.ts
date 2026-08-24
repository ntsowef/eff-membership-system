import { Router, Request, Response } from 'express';
import { WardAuditModel } from '../models/wardAudit';
import { GeographicModel } from '../models/geographic';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requirePermission } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { executeQuery } from '../config/database';
import Joi from 'joi';
import { validate } from '../middleware/validation';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// =====================================================
// Meeting Package Upload Configuration
// =====================================================
const MEETING_PACKAGE_DIR = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, 'meeting-packages')
  : path.join('uploads', 'meeting-packages');

// Ensure meeting-packages directory exists
if (!fs.existsSync(MEETING_PACKAGE_DIR)) {
  fs.mkdirSync(MEETING_PACKAGE_DIR, { recursive: true });
}

const meetingPackageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MEETING_PACKAGE_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    cb(null, `meeting_pkg_${timestamp}_${random}${ext}`);
  },
});

const meetingPackageUpload = multer({
  storage: meetingPackageStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Accepted: PDF, JPEG, PNG, DOC, DOCX, XLS, XLSX, ZIP`));
    }
  },
});

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
  presiding_officer_name: Joi.string().allow('').optional(),
  secretary_name: Joi.string().allow('').optional(),
  quorum_required: Joi.number().integer().required().min(0),
  quorum_achieved: Joi.number().integer().required().min(0),
  total_attendees: Joi.number().integer().required().min(0),
  quorum_verified_manually: Joi.boolean().optional(),
  quorum_verification_notes: Joi.string().allow('').optional(),
  meeting_took_place_verified: Joi.boolean().optional(),
  meeting_verification_notes: Joi.string().allow('').optional(),
  meeting_outcome: Joi.string().allow('').optional(),
  next_meeting_date: Joi.date().optional()
});

const updateMeetingSchema = Joi.object({
  presiding_officer_name: Joi.string().allow('').optional(),
  secretary_name: Joi.string().allow('').optional(),
  quorum_required: Joi.number().integer().optional().min(0),
  quorum_achieved: Joi.number().integer().optional().min(0),
  total_attendees: Joi.number().integer().optional().min(0),
  meeting_outcome: Joi.string().optional(),
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
 * POST /api/v1/ward-audit/ward/:ward_code/approve
 * Approve ward compliance
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
    
    // First check if ward meets compliance criteria
    const complianceSummary = await WardAuditModel.getWardComplianceSummary(ward_code);
    
    if (!complianceSummary) {
      return sendError(res, 'Ward not found', 404);
    }
    
    // Check criterion 1: >= 200 members AND all VDs have >= 5 members
    if (!complianceSummary.criterion_1_compliant) {
      return sendError(res, 
        'Ward does not meet compliance criteria. Must have 200+ members and all voting districts must have 5+ members each.',
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
 * GET /api/v1/ward-audit/members/province/:province_code/search
 * Search members by province with autocomplete (for presiding officer selection)
 * Query params: q (search term), limit (max results, default 50)
 */
router.get('/members/province/:province_code/search',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: provinceCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code } = req.params;
    const searchTerm = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 50;

    if (!searchTerm || searchTerm.length < 2) {
      return sendSuccess(res, [], 'Search term must be at least 2 characters');
    }

    const members = await WardAuditModel.searchMembersByProvince(province_code, searchTerm, limit);

    sendSuccess(res, members, `Found ${members.length} members matching "${searchTerm}" in province ${province_code}`);
  })
);

/**
 * GET /api/v1/ward-audit/members/province/:province_code
 * Get members filtered by province for presiding officer selection (Criterion 4)
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

// =====================================================
// Meeting Management Routes
// =====================================================

/**
 * POST /api/v1/ward-audit/ward/:ward_code/meeting
 * Create a new ward meeting record (supports optional meeting_package file upload)
 */
router.post('/ward/:ward_code/meeting',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  meetingPackageUpload.single('meeting_package'),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const userId = (req as any).user?.user_id;

    // Parse numeric fields that arrive as strings when sent via FormData
    const body = req.body;
    const parsedBody = {
      ...body,
      quorum_required: parseInt(body.quorum_required) || 0,
      quorum_achieved: parseInt(body.quorum_achieved) || 0,
      total_attendees: parseInt(body.total_attendees) || 0,
      presiding_officer_name: body.presiding_officer_name && body.presiding_officer_name !== '' ? body.presiding_officer_name : null,
      secretary_name: body.secretary_name && body.secretary_name !== '' ? body.secretary_name : null,
      quorum_verified_manually: body.quorum_verified_manually === 'true' || body.quorum_verified_manually === true,
      meeting_took_place_verified: body.meeting_took_place_verified === 'true' || body.meeting_took_place_verified === true,
    };

    // Build file metadata if a meeting package was uploaded
    let meetingPackagePath: string | null = null;
    let meetingPackageOriginalName: string | null = null;
    if (req.file) {
      meetingPackagePath = req.file.filename;
      meetingPackageOriginalName = req.file.originalname;
    }

    // Convert empty strings to null for optional fields
    const meetingData = {
      ...parsedBody,
      ward_code,
      meeting_outcome: parsedBody.meeting_outcome === '' ? null : parsedBody.meeting_outcome,
      quorum_verified_by: parsedBody.quorum_verified_manually ? userId : null,
      meeting_verified_by: parsedBody.meeting_took_place_verified ? userId : null,
      meeting_package_path: meetingPackagePath,
      meeting_package_original_name: meetingPackageOriginalName,
    };

    const meeting = await WardAuditModel.createMeetingRecord(meetingData);

    sendSuccess(res, meeting, 'Meeting record created successfully');
  })
);

/**
 * GET /api/v1/ward-audit/meeting/:record_id/package
 * Download the meeting package file for a meeting record
 * Accessible by national admin for dispute review
 */
router.get('/meeting/:record_id/package',
  authenticate,
  requirePermission('ward_audit.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { record_id } = req.params;

    const meeting = await WardAuditModel.getMeetingRecordById(parseInt(record_id));
    if (!meeting) {
      return sendError(res, 'Meeting record not found', 404);
    }

    if (!meeting.meeting_package_path) {
      return sendError(res, 'No meeting package uploaded for this meeting', 404);
    }

    const filePath = path.join(MEETING_PACKAGE_DIR, meeting.meeting_package_path);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'Meeting package file not found on server', 404);
    }

    const downloadName = meeting.meeting_package_original_name || meeting.meeting_package_path;
    res.download(filePath, downloadName);
  })
);

/**
 * DELETE /api/v1/ward-audit/meeting/:record_id
 * Delete a meeting record and its associated meeting package file
 */
router.delete('/meeting/:record_id',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  asyncHandler(async (req: Request, res: Response) => {
    const { record_id } = req.params;

    // Get meeting record to clean up file if exists
    const meeting = await WardAuditModel.getMeetingRecordById(parseInt(record_id));
    if (!meeting) {
      return sendError(res, 'Meeting record not found', 404);
    }

    // Delete the meeting record from DB
    await WardAuditModel.deleteMeetingRecord(parseInt(record_id));

    // Clean up uploaded file if one exists
    if (meeting.meeting_package_path) {
      const filePath = path.join(MEETING_PACKAGE_DIR, meeting.meeting_package_path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn('Could not delete meeting package file:', err);
      }
    }

    sendSuccess(res, null, 'Meeting record deleted successfully');
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
 * GET /api/v1/ward-audit/ward/:ward_code/members/search
 * Search members by ward with autocomplete (for secretary selection)
 * Query params: q (search term), limit (max results, default 50)
 */
router.get('/ward/:ward_code/members/search',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const searchTerm = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 50;

    if (!searchTerm || searchTerm.length < 2) {
      return sendSuccess(res, [], 'Search term must be at least 2 characters');
    }

    const members = await WardAuditModel.searchMembersByWard(ward_code, searchTerm, limit);

    sendSuccess(res, members, `Found ${members.length} members matching "${searchTerm}" in ward ${ward_code}`);
  })
);

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
    
    sendSuccess(res, { delegate_id: delegateId }, 'Delegate assigned successfully');
  })
);

/**
 * DELETE /api/v1/ward-audit/delegate/:delegateId
 * Remove a delegate assignment
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

    await WardAuditModel.removeDelegateAssignment(
      Number(delegateId),
      reason,
      userId
    );

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

export default router;

