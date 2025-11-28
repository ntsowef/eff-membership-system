import express, { Request, Response } from 'express';
import { RenewalAdministrativeService } from '../services/renewalAdministrativeService';
import { asyncHandler, sendSuccess, ValidationError, AuthenticationError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
// TEMPORARILY DISABLED FOR TESTING
// router.use(authenticate);

// =====================================================================================
// APPROVAL WORKFLOW ROUTES
// =====================================================================================

/**
 * @route   GET /api/v1/renewal-admin/approvals/pending
 * @desc    Get renewals pending approval
 * @access  Private (Admin)
 */
router.get('/approvals/pending',
  asyncHandler(async (req: Request, res: Response) => {
    const { priority, level, assignedTo, limit } = req.query;

    const filters = {
      priority: priority as string,
      level: level as string,
      assignedTo: assignedTo ? parseInt(assignedTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50
    };

    const renewals = await RenewalAdministrativeService.getRenewalsPendingApproval(filters);

    sendSuccess(res, {
      renewals,
      total: renewals.length
    }, 'Renewals pending approval retrieved successfully');
  })
);

/**
 * @route   POST /api/v1/renewal-admin/approvals/create
 * @desc    Create approval request for a renewal
 * @access  Private (Admin)
 */
router.post('/approvals/create',
  asyncHandler(async (req: Request, res: Response) => {
    const { renewal_id, member_id, review_reason, review_priority, assigned_to } = req.body;

    if (!renewal_id || !member_id) {
      throw new ValidationError('Renewal ID and Member ID are required');
    }

    const approvalId = await RenewalAdministrativeService.createApprovalRequest({
      renewal_id,
      member_id,
      review_reason,
      review_priority,
      assigned_to
    });

    sendSuccess(res, {
      approval_id: approvalId
    }, 'Approval request created successfully', 201);
  })
);

/**
 * @route   POST /api/v1/renewal-admin/approvals/:approvalId/approve
 * @desc    Approve a renewal
 * @access  Private (Admin)
 */
router.post('/approvals/:approvalId/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { approvalId } = req.params;
    const { approval_notes } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    await RenewalAdministrativeService.approveRenewal({
      approval_id: parseInt(approvalId),
      approved_by: userId,
      approval_notes
    });

    sendSuccess(res, null, 'Renewal approved successfully');
  })
);

/**
 * @route   POST /api/v1/renewal-admin/approvals/:approvalId/reject
 * @desc    Reject a renewal
 * @access  Private (Admin)
 */
router.post('/approvals/:approvalId/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const { approvalId } = req.params;
    const { rejection_reason } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!rejection_reason) {
      throw new ValidationError('Rejection reason is required');
    }

    await RenewalAdministrativeService.rejectRenewal({
      approval_id: parseInt(approvalId),
      rejected_by: userId,
      rejection_reason
    });

    sendSuccess(res, null, 'Renewal rejected successfully');
  })
);

// =====================================================================================
// AUDIT TRAIL ROUTES
// =====================================================================================

/**
 * @route   GET /api/v1/renewal-admin/audit
 * @desc    Get all audit trail entries with filters
 * @access  Private (Admin)
 */
router.get('/audit',
  asyncHandler(async (req: Request, res: Response) => {
    const { action_category, search, limit, page } = req.query;

    const query = `
      SELECT
        rat.*,
        m.firstname || ' ' || m.surname as member_name,
        m.id_number as member_id_number,
        u.name as performed_by_name
      FROM renewal_audit_trail rat
      LEFT JOIN membership_renewals r ON rat.renewal_id = r.renewal_id
      LEFT JOIN members m ON r.member_id = m.member_id
      LEFT JOIN users u ON rat.performed_by = u.user_id
      WHERE 1=1
        ${action_category ? 'AND rat.action_category = $1' : ''}
        ${search ? `AND (rat.action_description ILIKE $${action_category ? 2 : 1} OR m.firstname ILIKE $${action_category ? 2 : 1} OR m.surname ILIKE $${action_category ? 2 : 1} OR u.name ILIKE $${action_category ? 2 : 1})` : ''}
      ORDER BY rat.created_at DESC
      LIMIT $${[action_category, search].filter(Boolean).length + 1}
      OFFSET $${[action_category, search].filter(Boolean).length + 2}
    `;

    const params: any[] = [];
    if (action_category) params.push(action_category);
    if (search) params.push(`%${search}%`);

    const limitValue = limit ? parseInt(limit as string) : 50;
    const pageValue = page ? parseInt(page as string) : 1;
    const offset = (pageValue - 1) * limitValue;

    params.push(limitValue);
    params.push(offset);

    const { executeQuery } = require('../config/database-hybrid');
    const auditTrail = await executeQuery(query, params);

    sendSuccess(res, {
      audit_trail: auditTrail,
      total: auditTrail.length,
      page: pageValue,
      limit: limitValue
    }, 'Audit trail retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-admin/audit/:renewalId
 * @desc    Get audit trail for a specific renewal
 * @access  Private (Admin)
 */
router.get('/audit/:renewalId',
  asyncHandler(async (req: Request, res: Response) => {
    const { renewalId } = req.params;
    const { limit } = req.query;

    const auditTrail = await RenewalAdministrativeService.getRenewalAuditTrail(
      parseInt(renewalId),
      limit ? parseInt(limit as string) : 100
    );

    sendSuccess(res, {
      audit_trail: auditTrail,
      total: auditTrail.length
    }, 'Audit trail retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-admin/audit/stats
 * @desc    Get audit trail statistics
 * @access  Private (Admin)
 */
router.get('/audit/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, actionCategory } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      actionCategory: actionCategory as string
    };

    const stats = await RenewalAdministrativeService.getAuditTrailStats(filters);

    sendSuccess(res, {
      statistics: stats
    }, 'Audit trail statistics retrieved successfully');
  })
);

// =====================================================================================
// BULK OPERATIONS ROUTES
// =====================================================================================

/**
 * @route   POST /api/v1/renewal-admin/bulk/create
 * @desc    Create bulk operation
 * @access  Private (Admin)
 */
router.post('/bulk/create',
  asyncHandler(async (req: Request, res: Response) => {
    const { operation_type, total_items, filter_criteria, selected_renewal_ids } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!operation_type || !total_items) {
      throw new ValidationError('Operation type and total items are required');
    }

    const operationUuid = await RenewalAdministrativeService.createBulkOperation({
      operation_type,
      total_items,
      filter_criteria,
      selected_renewal_ids,
      initiated_by: userId,
      user_role: userRole
    });

    sendSuccess(res, {
      operation_uuid: operationUuid
    }, 'Bulk operation created successfully', 201);
  })
);

/**
 * @route   GET /api/v1/renewal-admin/bulk/:operationUuid/status
 * @desc    Get bulk operation status
 * @access  Private (Admin)
 */
router.get('/bulk/:operationUuid/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { operationUuid } = req.params;

    const operation = await RenewalAdministrativeService.getBulkOperationStatus(operationUuid);

    sendSuccess(res, {
      operation
    }, 'Bulk operation status retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-admin/bulk/recent
 * @desc    Get recent bulk operations
 * @access  Private (Admin)
 */
router.get('/bulk/recent',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { limit } = req.query;

    const operations = await RenewalAdministrativeService.getRecentBulkOperations(
      userId,
      limit ? parseInt(limit as string) : 20
    );

    sendSuccess(res, {
      operations,
      total: operations.length
    }, 'Recent bulk operations retrieved successfully');
  })
);

/**
 * @route   PUT /api/v1/renewal-admin/bulk/:operationUuid/progress
 * @desc    Update bulk operation progress
 * @access  Private (Admin)
 */
router.put('/bulk/:operationUuid/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const { operationUuid } = req.params;
    const { processed_items, successful_items, failed_items, operation_status } = req.body;

    await RenewalAdministrativeService.updateBulkOperationProgress({
      operation_uuid: operationUuid,
      processed_items,
      successful_items,
      failed_items,
      operation_status
    });

    sendSuccess(res, null, 'Bulk operation progress updated successfully');
  })
);

/**
 * @route   POST /api/v1/renewal-admin/bulk/:operationUuid/complete
 * @desc    Complete bulk operation
 * @access  Private (Admin)
 */
router.post('/bulk/:operationUuid/complete',
  asyncHandler(async (req: Request, res: Response) => {
    const { operationUuid } = req.params;
    const { operation_result, error_log } = req.body;

    await RenewalAdministrativeService.completeBulkOperation({
      operation_uuid: operationUuid,
      operation_result,
      error_log
    });

    sendSuccess(res, null, 'Bulk operation completed successfully');
  })
);

// =====================================================================================
// MANUAL NOTES ROUTES
// =====================================================================================

/**
 * @route   POST /api/v1/renewal-admin/notes/add
 * @desc    Add manual note to renewal
 * @access  Private (Admin)
 */
router.post('/notes/add',
  asyncHandler(async (req: Request, res: Response) => {
    const { renewal_id, member_id, note_type, note_priority, note_content, is_internal, requires_follow_up, follow_up_date } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!renewal_id || !member_id || !note_content) {
      throw new ValidationError('Renewal ID, Member ID, and note content are required');
    }

    const noteId = await RenewalAdministrativeService.addManualNote({
      renewal_id,
      member_id,
      note_type: note_type || 'General',
      note_priority: note_priority || 'Normal',
      note_content,
      is_internal,
      requires_follow_up,
      follow_up_date: follow_up_date ? new Date(follow_up_date) : undefined,
      created_by: userId,
      user_role: userRole
    });

    sendSuccess(res, {
      note_id: noteId
    }, 'Manual note added successfully', 201);
  })
);

/**
 * @route   GET /api/v1/renewal-admin/notes/:renewalId
 * @desc    Get manual notes for renewal
 * @access  Private (Admin)
 */
router.get('/notes/:renewalId',
  asyncHandler(async (req: Request, res: Response) => {
    const { renewalId } = req.params;

    const notes = await RenewalAdministrativeService.getRenewalManualNotes(parseInt(renewalId));

    sendSuccess(res, {
      notes,
      total: notes.length
    }, 'Manual notes retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-admin/notes/follow-up/pending
 * @desc    Get notes requiring follow-up
 * @access  Private (Admin)
 */
router.get('/notes/follow-up/pending',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    const notes = await RenewalAdministrativeService.getNotesRequiringFollowUp(userId);

    sendSuccess(res, {
      notes,
      total: notes.length
    }, 'Notes requiring follow-up retrieved successfully');
  })
);

/**
 * @route   PUT /api/v1/renewal-admin/notes/:noteId/complete-follow-up
 * @desc    Mark follow-up as completed
 * @access  Private (Admin)
 */
router.put('/notes/:noteId/complete-follow-up',
  asyncHandler(async (req: Request, res: Response) => {
    const { noteId } = req.params;

    await RenewalAdministrativeService.completeFollowUp(parseInt(noteId));

    sendSuccess(res, null, 'Follow-up marked as completed');
  })
);

// =====================================================================================
// EXPORT ROUTES
// =====================================================================================

/**
 * @route   POST /api/v1/renewal-admin/export/create
 * @desc    Create export job
 * @access  Private (Admin)
 */
router.post('/export/create',
  asyncHandler(async (req: Request, res: Response) => {
    const { export_type, export_format, filter_criteria } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!export_type || !export_format) {
      throw new ValidationError('Export type and format are required');
    }

    const exportUuid = await RenewalAdministrativeService.createExportJob({
      export_type,
      export_format,
      filter_criteria,
      requested_by: userId,
      user_role: userRole
    });

    sendSuccess(res, {
      export_uuid: exportUuid
    }, 'Export job created successfully', 201);
  })
);

/**
 * @route   GET /api/v1/renewal-admin/export/:exportUuid/status
 * @desc    Get export job status
 * @access  Private (Admin)
 */
router.get('/export/:exportUuid/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { exportUuid } = req.params;

    const exportJob = await RenewalAdministrativeService.getExportJobStatus(exportUuid);

    sendSuccess(res, {
      export_job: exportJob
    }, 'Export job status retrieved successfully');
  })
);

export default router;

