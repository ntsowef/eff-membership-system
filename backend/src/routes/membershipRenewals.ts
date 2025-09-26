import { Router, Request, Response, NextFunction } from 'express';
import { MembershipRenewalModel, CreateRenewalData, UpdateRenewalData, RenewalFilters, CreateReminderData, CreatePaymentData } from '../models/membershipRenewals';
import { NotificationModel } from '../models/notifications';
import { RenewalService } from '../services/renewalService';
import { authenticate, requirePermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createRenewalSchema = Joi.object({
  membership_id: Joi.number().integer().positive().required(),
  member_id: Joi.number().integer().positive().required(),
  renewal_year: Joi.number().integer().min(2020).max(2050).required(),
  renewal_type: Joi.string().valid('Annual', 'Partial', 'Grace', 'Late').optional(),
  renewal_due_date: Joi.date().iso().required(),
  renewal_amount: Joi.number().positive().optional(),
  late_fee: Joi.number().min(0).optional(),
  discount_amount: Joi.number().min(0).optional(),
  payment_method: Joi.string().max(50).optional(),
  payment_reference: Joi.string().max(100).optional(),
  auto_renewal: Joi.boolean().optional(),
  renewal_notes: Joi.string().max(1000).optional()
});

const updateRenewalSchema = Joi.object({
  renewal_status: Joi.string().valid('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Expired').optional(),
  payment_status: Joi.string().valid('Pending', 'Processing', 'Completed', 'Failed', 'Refunded').optional(),
  renewal_amount: Joi.number().positive().optional(),
  late_fee: Joi.number().min(0).optional(),
  discount_amount: Joi.number().min(0).optional(),
  payment_method: Joi.string().max(50).optional(),
  payment_reference: Joi.string().max(100).optional(),
  payment_date: Joi.date().iso().optional(),
  renewal_notes: Joi.string().max(1000).optional()
});

const createReminderSchema = Joi.object({
  reminder_type: Joi.string().valid('Email', 'SMS', 'Letter', 'Phone').required(),
  reminder_stage: Joi.string().valid('Early', 'Due', 'Overdue', 'Final', 'Grace').required(),
  scheduled_date: Joi.date().iso().required(),
  subject: Joi.string().max(255).optional(),
  message: Joi.string().max(2000).optional(),
  template_used: Joi.string().max(100).optional(),
  delivery_channel: Joi.string().max(50).optional()
});

const createPaymentSchema = Joi.object({
  payment_amount: Joi.number().positive().required(),
  payment_method: Joi.string().max(50).required(),
  payment_reference: Joi.string().max(100).optional(),
  payment_date: Joi.date().iso().required(),
  external_payment_id: Joi.string().max(100).optional(),
  gateway_response: Joi.string().max(2000).optional(),
  transaction_fee: Joi.number().min(0).optional(),
  payment_notes: Joi.string().max(1000).optional()
});

const bulkCreateRenewalsSchema = Joi.object({
  renewal_year: Joi.number().integer().min(2020).max(2050).required()
});

// Create new renewal
router.post('/', authenticate, requirePermission('renewals.create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createRenewalSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const renewalData: CreateRenewalData = value;
    const renewalId = await MembershipRenewalModel.createRenewal(renewalData);
    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);

    // Log the renewal creation
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      renewalId,
      undefined,
      { member_id: value.member_id, renewal_year: value.renewal_year },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Membership renewal created successfully',
      data: {
        renewal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get all renewals
router.get('/', authenticate, requirePermission('renewals.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: RenewalFilters = {};
    
    if (req.query.member_id) filters.member_id = parseInt(req.query.member_id as string);
    if (req.query.membership_id) filters.membership_id = parseInt(req.query.membership_id as string);
    if (req.query.renewal_year) filters.renewal_year = parseInt(req.query.renewal_year as string);
    if (req.query.renewal_type) filters.renewal_type = req.query.renewal_type as string;
    if (req.query.renewal_status) filters.renewal_status = req.query.renewal_status as string;
    if (req.query.payment_status) filters.payment_status = req.query.payment_status as string;
    if (req.query.processed_by) filters.processed_by = parseInt(req.query.processed_by as string);
    if (req.query.ward_code) filters.ward_code = req.query.ward_code as string;
    if (req.query.municipal_code) filters.municipal_code = req.query.municipal_code as string;
    if (req.query.district_code) filters.district_code = req.query.district_code as string;
    if (req.query.province_code) filters.province_code = req.query.province_code as string;
    if (req.query.due_date_from) filters.due_date_from = req.query.due_date_from as string;
    if (req.query.due_date_to) filters.due_date_to = req.query.due_date_to as string;
    if (req.query.overdue_only === 'true') filters.overdue_only = true;
    if (req.query.grace_period_only === 'true') filters.grace_period_only = true;
    if (req.query.search) filters.search = req.query.search as string;

    // No geographic filtering needed - all admins are national level

    const [renewals, totalCount] = await Promise.all([
      MembershipRenewalModel.getRenewals(limit, offset, filters),
      MembershipRenewalModel.getRenewalCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Membership renewals retrieved successfully',
      data: {
        renewals,
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

// Get renewal by ID
router.get('/:id', authenticate, requirePermission('renewals.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal not found');
    }

    res.json({
      success: true,
      message: 'Renewal retrieved successfully',
      data: {
        renewal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update renewal
router.put('/:id', authenticate, requirePermission('renewals.update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    const { error, value } = updateRenewalSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if renewal exists
    const existingRenewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!existingRenewal) {
      throw new NotFoundError('Renewal not found');
    }

    const updateData: UpdateRenewalData = {
      ...value,
      processed_by: req.user!.id
    };

    const success = await MembershipRenewalModel.updateRenewal(renewalId, updateData);
    if (!success) {
      throw new Error('Failed to update renewal');
    }

    const updatedRenewal = await MembershipRenewalModel.getRenewalById(renewalId);

    // Send notification if renewal status changed to completed
    if (value.renewal_status === 'Completed' && existingRenewal.renewal_status !== 'Completed') {
      try {
        await NotificationModel.createNotification({
          member_id: existingRenewal.member_id,
          recipient_type: 'Member',
          notification_type: 'Renewal',
          delivery_channel: 'Email',
          title: 'Membership Renewal Completed',
          message: `Your membership renewal for ${existingRenewal.renewal_year} has been completed successfully.`,
          template_data: {
            member_name: existingRenewal.member_name,
            renewal_year: existingRenewal.renewal_year,
            amount_paid: existingRenewal.final_amount
          }
        });
      } catch (notificationError) {
        console.error('Failed to send renewal completion notification:', notificationError);
      }
    }

    // Log the renewal update
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      renewalId,
      { status: existingRenewal.renewal_status },
      { status: value.renewal_status },
      req
    );

    res.json({
      success: true,
      message: 'Renewal updated successfully',
      data: {
        renewal: updatedRenewal
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete renewal
router.delete('/:id', authenticate, requirePermission('renewals.delete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    // Check if renewal exists
    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal not found');
    }

    const success = await MembershipRenewalModel.deleteRenewal(renewalId);
    if (!success) {
      throw new Error('Failed to delete renewal');
    }

    // Log the renewal deletion
    await logAudit(
      req.user!.id,
      AuditAction.DELETE,
      EntityType.SYSTEM,
      renewalId,
      { member_id: renewal.member_id, renewal_year: renewal.renewal_year },
      undefined,
      req
    );

    res.json({
      success: true,
      message: 'Renewal deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get renewals due
router.get('/due/list', authenticate, requirePermission('renewals.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const daysAhead = parseInt(req.query.days_ahead as string) || 30;
    
    const renewalsDue = await MembershipRenewalModel.getRenewalsDue(limit, daysAhead);

    res.json({
      success: true,
      message: 'Renewals due retrieved successfully',
      data: {
        renewals_due: renewalsDue,
        count: renewalsDue.length,
        days_ahead: daysAhead
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get overdue renewals
router.get('/overdue/list', authenticate, requirePermission('renewals.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    
    const overdueRenewals = await MembershipRenewalModel.getOverdueRenewals(limit);

    res.json({
      success: true,
      message: 'Overdue renewals retrieved successfully',
      data: {
        overdue_renewals: overdueRenewals,
        count: overdueRenewals.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get renewal statistics
router.get('/stats/overview', authenticate, requirePermission('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};

    if (req.query.year) filters.year = parseInt(req.query.year as string);

    // No geographic filtering needed - all admins are national level

    const statistics = await MembershipRenewalModel.getRenewalStatistics(filters);

    res.json({
      success: true,
      message: 'Renewal statistics retrieved successfully',
      data: {
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Bulk create renewals for a year
router.post('/bulk/create-year', authenticate, requirePermission('renewals.create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = bulkCreateRenewalsSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const result = await MembershipRenewalModel.bulkCreateRenewalsForYear(value.renewal_year, req.user!.id);

    // Log the bulk creation
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      0,
      undefined,
      { bulk_renewal_creation: true, year: value.renewal_year, successful: result.successful, failed: result.failed },
      req
    );

    res.json({
      success: true,
      message: `Bulk renewal creation completed. ${result.successful} successful, ${result.failed} failed.`,
      data: {
        result
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// RENEWAL REMINDERS

// Create renewal reminder
router.post('/:id/reminders', authenticate, requirePermission('renewals.update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    const { error, value } = createReminderSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if renewal exists
    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal not found');
    }

    const reminderData: CreateReminderData = {
      renewal_id: renewalId,
      member_id: renewal.member_id,
      ...value,
      created_by: req.user!.id
    };

    const reminderId = await MembershipRenewalModel.createReminder(reminderData);

    res.status(201).json({
      success: true,
      message: 'Renewal reminder created successfully',
      data: {
        reminder_id: reminderId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get renewal reminders
router.get('/:id/reminders', authenticate, requirePermission('renewals.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    // Check if renewal exists
    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal not found');
    }

    const reminders = await MembershipRenewalModel.getRenewalReminders(renewalId);

    res.json({
      success: true,
      message: 'Renewal reminders retrieved successfully',
      data: {
        renewal: {
          id: renewal.renewal_id,
          member_name: renewal.member_name,
          renewal_year: renewal.renewal_year
        },
        reminders
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// RENEWAL PAYMENTS

// Create renewal payment
router.post('/:id/payments', authenticate, requirePermission('renewals.update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if renewal exists
    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal not found');
    }

    const paymentData: CreatePaymentData = {
      renewal_id: renewalId,
      member_id: renewal.member_id,
      ...value,
      processed_by: req.user!.id
    };

    const paymentId = await MembershipRenewalModel.createPayment(paymentData);

    // Send payment confirmation notification
    try {
      await NotificationModel.createNotification({
        member_id: renewal.member_id,
        recipient_type: 'Member',
        notification_type: 'Payment',
        delivery_channel: 'Email',
        title: 'Payment Received',
        message: `Your payment of R${value.payment_amount} for membership renewal ${renewal.renewal_year} has been received.`,
        template_data: {
          member_name: renewal.member_name,
          payment_amount: value.payment_amount,
          payment_method: value.payment_method,
          payment_reference: value.payment_reference,
          renewal_year: renewal.renewal_year
        }
      });
    } catch (notificationError) {
      console.error('Failed to send payment confirmation notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Renewal payment recorded successfully',
      data: {
        payment_id: paymentId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get renewal payments
router.get('/:id/payments', authenticate, requirePermission('renewals.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    // Check if renewal exists
    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal not found');
    }

    const payments = await MembershipRenewalModel.getRenewalPayments(renewalId);

    res.json({
      success: true,
      message: 'Renewal payments retrieved successfully',
      data: {
        renewal: {
          id: renewal.renewal_id,
          member_name: renewal.member_name,
          renewal_year: renewal.renewal_year,
          final_amount: renewal.final_amount
        },
        payments
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get renewal history
router.get('/:id/history', authenticate, requirePermission('renewals.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      throw new ValidationError('Invalid renewal ID');
    }

    // Check if renewal exists
    const renewal = await MembershipRenewalModel.getRenewalById(renewalId);
    if (!renewal) {
      throw new NotFoundError('Renewal not found');
    }

    const history = await MembershipRenewalModel.getRenewalHistory(renewalId);

    res.json({
      success: true,
      message: 'Renewal history retrieved successfully',
      data: {
        renewal: {
          id: renewal.renewal_id,
          member_name: renewal.member_name,
          renewal_year: renewal.renewal_year
        },
        history
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get renewal dashboard data
router.get('/dashboard/overview', authenticate, requirePermission('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const [
      renewalReport,
      renewalSettings,
      renewalsDue,
      overdueRenewals
    ] = await Promise.all([
      RenewalService.generateRenewalReport(year),
      RenewalService.getRenewalSettings(),
      MembershipRenewalModel.getRenewalsDue(10),
      MembershipRenewalModel.getOverdueRenewals(10)
    ]);

    res.json({
      success: true,
      message: 'Renewal dashboard data retrieved successfully',
      data: {
        report: renewalReport,
        settings: renewalSettings,
        upcoming_renewals: renewalsDue,
        overdue_renewals: overdueRenewals,
        dashboard_generated_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Process auto renewals (admin only)
router.post('/process/auto-renewals', authenticate, requirePermission('renewals.process'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RenewalService.processAutoRenewals();

    // Log the auto renewal processing
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      0,
      undefined,
      { auto_renewal_processing: true, processed: result.processed, failed: result.failed },
      req
    );

    res.json({
      success: true,
      message: `Auto renewal processing completed. ${result.processed} processed, ${result.failed} failed.`,
      data: {
        result
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Send renewal reminders (admin only)
router.post('/process/send-reminders', authenticate, requirePermission('renewals.process'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RenewalService.sendRenewalReminders();

    // Log the reminder sending
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      0,
      undefined,
      { reminder_sending: true, sent: result.sent, failed: result.failed },
      req
    );

    res.json({
      success: true,
      message: `Renewal reminders sent. ${result.sent} sent, ${result.failed} failed.`,
      data: {
        result
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Apply late fees (admin only)
router.post('/process/apply-late-fees', authenticate, requirePermission('renewals.process'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RenewalService.applyLateFees();

    // Log the late fee application
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      0,
      undefined,
      { late_fee_application: true, applied: result.applied },
      req
    );

    res.json({
      success: true,
      message: `Late fees applied to ${result.applied} renewals.`,
      data: {
        result
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
