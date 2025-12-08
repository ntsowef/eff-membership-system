import express, { Request, Response } from 'express';
import Joi from 'joi';
import { DelegatesManagementModel } from '../models/delegatesManagement';
import { WardAuditModel } from '../models/wardAudit';
import { asyncHandler, sendSuccess, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import { executeQuery } from '../config/database';

const router = express.Router();

// =====================================================
// Validation Schemas
// =====================================================

const delegateFiltersSchema = Joi.object({
  province_code: Joi.string().allow('').optional(),
  district_code: Joi.string().allow('').optional(),
  municipality_code: Joi.string().allow('').optional(),
  assembly_code: Joi.string().valid('SRPA', 'PPA', 'NPA', 'BPA', 'BGA').allow('').optional(),
  delegate_status: Joi.string().valid('Active', 'Inactive', 'Replaced').allow('').optional()
});

const summaryFiltersSchema = Joi.object({
  province_code: Joi.string().allow('').optional(),
  district_code: Joi.string().allow('').optional()
});

const assemblyCodeSchema = Joi.object({
  assembly_code: Joi.string().valid('SRPA', 'PPA', 'NPA', 'BPA', 'BGA').required()
});

const updateDelegateSchema = Joi.object({
  delegate_status: Joi.string().valid('Active', 'Inactive', 'Replaced').optional(),
  term_end_date: Joi.date().optional(),
  notes: Joi.string().max(500).optional(),
  replacement_reason: Joi.string().max(500).optional()
});

// =====================================================
// Routes
// =====================================================

/**
 * GET /api/v1/delegates-management/delegates
 * Get all delegates with optional hierarchical filtering
 */
router.get('/delegates',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ query: delegateFiltersSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query;

    const delegates = await DelegatesManagementModel.getAllDelegates(filters as any);

    sendSuccess(res, delegates, 'Delegates retrieved successfully');
  })
);

/**
 * GET /api/v1/delegates-management/summary
 * Get delegate summary by geographic hierarchy
 */
router.get('/summary',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ query: summaryFiltersSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query;

    const summary = await DelegatesManagementModel.getDelegateSummary(filters as any);

    sendSuccess(res, summary, 'Delegate summary retrieved successfully');
  })
);

/**
 * GET /api/v1/delegates-management/conference/:assembly_code
 * Get delegates for a specific conference/assembly
 */
router.get('/conference/:assembly_code',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: assemblyCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { assembly_code } = req.params;

    const conferenceData = await DelegatesManagementModel.getDelegatesByConference(assembly_code);

    sendSuccess(res, conferenceData, `${assembly_code} delegates retrieved successfully`);
  })
);

/**
 * GET /api/v1/delegates-management/statistics
 * Get overall delegate statistics
 */
router.get('/statistics',
  authenticate,
  requirePermission('ward_audit.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const statistics = await DelegatesManagementModel.getDelegateStatistics();

    sendSuccess(res, statistics, 'Delegate statistics retrieved successfully');
  })
);

/**
 * PUT /api/v1/delegates-management/delegate/:delegate_id
 * Update delegate information (status, term dates, notes)
 */
router.put('/delegate/:delegate_id',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({
    params: Joi.object({
      delegate_id: Joi.number().integer().required()
    }),
    body: updateDelegateSchema
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { delegate_id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id;

    // Get current delegate data before update for audit trail
    const delegates = await DelegatesManagementModel.getAllDelegates({});
    const currentDelegate = delegates.find(d => d.delegate_id === parseInt(delegate_id));

    // Update delegate directly in database
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updateData.delegate_status !== undefined) {
      updates.push(`delegate_status = $${paramIndex++}`);
      params.push(updateData.delegate_status);
    }
    if (updateData.term_start_date !== undefined) {
      updates.push(`term_start_date = $${paramIndex++}`);
      params.push(updateData.term_start_date);
    }
    if (updateData.term_end_date !== undefined) {
      updates.push(`term_end_date = $${paramIndex++}`);
      params.push(updateData.term_end_date);
    }
    if (updateData.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(updateData.notes);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(parseInt(delegate_id));

    const updateQuery = `
      UPDATE ward_delegates
      SET ${updates.join(', ')}
      WHERE delegate_id = $${paramIndex}
    `;

    await executeQuery(updateQuery, params);

    // Log audit trail
    await logAudit(
      userId,
      AuditAction.DELEGATE_UPDATED,
      EntityType.DELEGATE,
      parseInt(delegate_id),
      currentDelegate ? {
        delegate_status: currentDelegate.delegate_status,
        term_start_date: currentDelegate.term_start_date,
        term_end_date: currentDelegate.term_end_date
      } : undefined,
      {
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      },
      req
    );

    sendSuccess(res, { delegate_id }, 'Delegate updated successfully');
  })
);

/**
 * DELETE /api/v1/delegates-management/delegate/:delegate_id
 * Remove a delegate (uses existing ward audit endpoint)
 */
router.delete('/delegate/:delegate_id',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({
    params: Joi.object({
      delegate_id: Joi.number().integer().required()
    }),
    body: Joi.object({
      reason: Joi.string().required().min(3).max(500)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { delegate_id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Get delegate data before removal for audit trail
    const delegates = await DelegatesManagementModel.getAllDelegates({});
    const delegateToRemove = delegates.find(d => d.delegate_id === parseInt(delegate_id));

    if (!delegateToRemove) {
      throw new NotFoundError('Delegate not found');
    }

    // Use existing WardAuditModel method to remove delegate
    await WardAuditModel.removeDelegateAssignment(parseInt(delegate_id), reason, userId);

    // Log audit trail
    await logAudit(
      userId,
      AuditAction.DELEGATE_REMOVED,
      EntityType.DELEGATE,
      parseInt(delegate_id),
      {
        member_id: delegateToRemove.member_id,
        member_name: delegateToRemove.member_name,
        assembly_code: delegateToRemove.assembly_code,
        ward_code: delegateToRemove.ward_code,
        municipality_name: delegateToRemove.municipality_name,
        province_name: delegateToRemove.province_name,
        delegate_status: delegateToRemove.delegate_status,
        selection_date: delegateToRemove.selection_date
      },
      {
        removed_by: userId,
        removed_at: new Date().toISOString(),
        reason: reason
      },
      req
    );

    sendSuccess(res, { delegate_id }, 'Delegate removed successfully');
  })
);

export default router;

