import { Router, Request, Response, NextFunction } from 'express';
import { BulkOperationsModel, BulkMemberUpdate, BulkMemberTransfer, BulkNotificationSend, BulkOperationFilters } from '../models/bulkOperations';
import { NotificationModel } from '../models/notifications';
import { authenticate, requirePermission, requireAdminLevel } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import Joi from 'joi';

const router = Router();

// Validation schemas
const bulkMemberUpdateSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(1000).required(),
  update_data: Joi.object({
    membership_status: Joi.string().valid('Active', 'Inactive', 'Suspended', 'Pending').optional(),
    hierarchy_level: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').optional(),
    entity_id: Joi.number().integer().positive().optional(),
    membership_type: Joi.string().max(50).optional(),
    notes: Joi.string().max(1000).optional()
  }).min(1).required(),
  reason: Joi.string().max(500).optional()
});

const bulkMemberTransferSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(500).required(),
  target_hierarchy_level: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').required(),
  target_entity_id: Joi.number().integer().positive().required(),
  transfer_reason: Joi.string().min(10).max(1000).required(),
  effective_date: Joi.date().iso().optional()
});

const bulkNotificationSchema = Joi.object({
  recipient_type: Joi.string().valid('all_members', 'specific_members', 'hierarchy_level', 'membership_status').required(),
  recipient_criteria: Joi.object({
    member_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
    hierarchy_level: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').optional(),
    entity_id: Joi.number().integer().positive().optional(),
    membership_status: Joi.string().valid('Active', 'Inactive', 'Suspended', 'Pending').optional()
  }).optional(),
  notification_data: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    message: Joi.string().min(10).max(2000).required(),
    notification_type: Joi.string().valid('info', 'warning', 'success', 'error').required(),
    channels: Joi.array().items(Joi.string().valid('email', 'sms', 'in_app')).min(1).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required()
  }).required(),
  schedule_for: Joi.date().iso().min('now').optional()
});

// Get bulk operations with filtering and pagination
router.get('/', authenticate, requirePermission('bulk_operations.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: BulkOperationFilters = {};
    if (req.query.operation_type) filters.operation_type = req.query.operation_type as string;
    if (req.query.operation_status) filters.operation_status = req.query.operation_status as string;
    if (req.query.created_by) filters.created_by = parseInt(req.query.created_by as string);
    if (req.query.date_from) filters.date_from = req.query.date_from as string;
    if (req.query.date_to) filters.date_to = req.query.date_to as string;

    const [operations, totalCount] = await Promise.all([
      BulkOperationsModel.getBulkOperations(limit, offset, filters),
      BulkOperationsModel.getBulkOperationsCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Bulk operations retrieved successfully',
      data: {
        operations,
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

// Get bulk operation by ID
router.get('/:id', authenticate, requirePermission('bulk_operations.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operationId = parseInt(req.params.id);
    if (isNaN(operationId)) {
      throw new ValidationError('Invalid operation ID');
    }

    const operation = await BulkOperationsModel.getBulkOperationById(operationId);
    if (!operation) {
      throw new NotFoundError('Bulk operation not found');
    }

    res.json({
      success: true,
      message: 'Bulk operation retrieved successfully',
      data: {
        operation
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Bulk update members
router.post('/members/update', authenticate, requireAdminLevel(3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = bulkMemberUpdateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const updateData: BulkMemberUpdate = value;

    // Create bulk operation record
    const operationId = await BulkOperationsModel.createBulkOperation(
      'member_update',
      updateData.member_ids.length,
      {
        update_data: updateData.update_data,
        reason: updateData.reason,
        member_ids: updateData.member_ids
      },
      req.user!.id
    );

    // Start the bulk update process
    BulkOperationsModel.updateBulkOperationProgress(operationId, 0, 0, 0, 'In Progress')
      .then(async () => {
        try {
          const result = await BulkOperationsModel.bulkUpdateMembers(
            updateData.member_ids,
            updateData.update_data,
            req.user!.id
          );

          await BulkOperationsModel.updateBulkOperationProgress(
            operationId,
            updateData.member_ids.length,
            result.successful,
            result.failed,
            result.failed > 0 ? 'Completed' : 'Completed',
            result.errors.length > 0 ? result.errors : undefined
          );
        } catch (processError) {
          await BulkOperationsModel.updateBulkOperationProgress(
            operationId,
            0,
            0,
            updateData.member_ids.length,
            'Failed',
            [{ error_message: (processError as Error).message }]
          );
        }
      })
      .catch(console.error);

    // Log the bulk update initiation
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      operationId,
      undefined,
      {
        action: 'initiate_bulk_member_update',
        member_count: updateData.member_ids.length,
        update_fields: Object.keys(updateData.update_data)
      },
      req
    );

    res.status(202).json({
      success: true,
      message: 'Bulk member update initiated successfully',
      data: {
        operation_id: operationId,
        total_members: updateData.member_ids.length,
        status: 'In Progress'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Bulk transfer members
router.post('/members/transfer', authenticate, requireAdminLevel(2), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = bulkMemberTransferSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const transferData: BulkMemberTransfer = value;

    // Create bulk operation record
    const operationId = await BulkOperationsModel.createBulkOperation(
      'member_transfer',
      transferData.member_ids.length,
      {
        target_hierarchy_level: transferData.target_hierarchy_level,
        target_entity_id: transferData.target_entity_id,
        transfer_reason: transferData.transfer_reason,
        effective_date: transferData.effective_date,
        member_ids: transferData.member_ids
      },
      req.user!.id
    );

    // Start the bulk transfer process
    BulkOperationsModel.updateBulkOperationProgress(operationId, 0, 0, 0, 'In Progress')
      .then(async () => {
        try {
          const result = await BulkOperationsModel.bulkTransferMembers(
            transferData.member_ids,
            transferData.target_hierarchy_level,
            transferData.target_entity_id,
            transferData.transfer_reason,
            req.user!.id,
            transferData.effective_date
          );

          await BulkOperationsModel.updateBulkOperationProgress(
            operationId,
            transferData.member_ids.length,
            result.successful,
            result.failed,
            'Completed',
            result.errors.length > 0 ? result.errors : undefined
          );
        } catch (processError) {
          await BulkOperationsModel.updateBulkOperationProgress(
            operationId,
            0,
            0,
            transferData.member_ids.length,
            'Failed',
            [{ error_message: (processError as Error).message }]
          );
        }
      })
      .catch(console.error);

    // Log the bulk transfer initiation
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      operationId,
      undefined,
      {
        action: 'initiate_bulk_member_transfer',
        member_count: transferData.member_ids.length,
        target_hierarchy: transferData.target_hierarchy_level,
        target_entity: transferData.target_entity_id
      },
      req
    );

    res.status(202).json({
      success: true,
      message: 'Bulk member transfer initiated successfully',
      data: {
        operation_id: operationId,
        total_members: transferData.member_ids.length,
        status: 'In Progress'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Bulk send notifications
router.post('/notifications/send', authenticate, requirePermission('notifications.send'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = bulkNotificationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const notificationData: BulkNotificationSend = value;

    // Determine recipients based on criteria
    let recipientQuery = 'SELECT member_id FROM members_consolidated WHERE 1=1';
    const queryParams: any[] = [];

    if (notificationData.recipient_type === 'specific_members' && notificationData.recipient_criteria?.member_ids) {
      const placeholders = notificationData.recipient_criteria.member_ids.map(() => '?').join(',');
      recipientQuery += ` AND member_id IN (${placeholders})`;
      queryParams.push(...notificationData.recipient_criteria.member_ids);
    } else if (notificationData.recipient_type === 'hierarchy_level' && notificationData.recipient_criteria?.hierarchy_level) {
      recipientQuery += ' AND hierarchy_level = ?';
      queryParams.push(notificationData.recipient_criteria.hierarchy_level);
      
      if (notificationData.recipient_criteria.entity_id) {
        recipientQuery += ' AND entity_id = ?';
        queryParams.push(notificationData.recipient_criteria.entity_id);
      }
    } else if (notificationData.recipient_type === 'membership_status' && notificationData.recipient_criteria?.membership_status) {
      recipientQuery += ' AND membership_status = ?';
      queryParams.push(notificationData.recipient_criteria.membership_status);
    }

    // Get recipient count
    const countQuery = recipientQuery.replace('SELECT member_id', 'SELECT COUNT(*) as count');
    const countResult = await require('../config/database').executeQuerySingle(countQuery, queryParams);
    const recipientCount = countResult?.count || 0;

    if (recipientCount === 0) {
      throw new ValidationError('No recipients found matching the specified criteria');
    }

    // Create bulk operation record
    const operationId = await BulkOperationsModel.createBulkOperation(
      'notification_send',
      recipientCount,
      {
        recipient_type: notificationData.recipient_type,
        recipient_criteria: notificationData.recipient_criteria,
        notification_data: notificationData.notification_data,
        schedule_for: notificationData.schedule_for
      },
      req.user!.id
    );

    // Log the bulk notification initiation
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      operationId,
      undefined,
      {
        action: 'initiate_bulk_notification',
        recipient_count: recipientCount,
        notification_type: notificationData.notification_data.notification_type,
        channels: notificationData.notification_data.channels
      },
      req
    );

    res.status(202).json({
      success: true,
      message: 'Bulk notification initiated successfully',
      data: {
        operation_id: operationId,
        recipient_count: recipientCount,
        status: 'Pending',
        scheduled_for: notificationData.schedule_for || 'Immediate'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Cancel bulk operation
router.post('/:id/cancel', authenticate, requireAdminLevel(3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operationId = parseInt(req.params.id);
    if (isNaN(operationId)) {
      throw new ValidationError('Invalid operation ID');
    }

    const success = await BulkOperationsModel.cancelBulkOperation(operationId);
    if (!success) {
      throw new NotFoundError('Bulk operation not found or cannot be cancelled');
    }

    // Log the cancellation
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      operationId,
      undefined,
      {
        action: 'cancel_bulk_operation'
      },
      req
    );

    res.json({
      success: true,
      message: 'Bulk operation cancelled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
