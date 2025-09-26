import express from 'express';
import { authenticate, authorize, requireSpecificPermissions } from '../middleware/auth';
import { TwoTierApprovalService } from '../services/twoTierApprovalService';
import { ComprehensiveFinancialService } from '../services/comprehensiveFinancialService';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { ValidationError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const financialReviewSchema = Joi.object({
  financial_status: Joi.string().valid('Approved', 'Rejected').required(),
  financial_rejection_reason: Joi.string().when('financial_status', {
    is: 'Rejected',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  financial_admin_notes: Joi.string().optional()
});

const finalReviewSchema = Joi.object({
  status: Joi.string().valid('Approved', 'Rejected').required(),
  rejection_reason: Joi.string().when('status', {
    is: 'Rejected',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  admin_notes: Joi.string().optional()
});

const renewalFinancialReviewSchema = Joi.object({
  financial_status: Joi.string().valid('Approved', 'Rejected').required(),
  financial_rejection_reason: Joi.string().when('financial_status', {
    is: 'Rejected',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  financial_admin_notes: Joi.string().optional(),
  payment_verified: Joi.boolean().optional(),
  payment_amount: Joi.number().positive().optional(),
  payment_reference: Joi.string().optional()
});

// Financial Reviewer Routes

// Get applications for financial review
router.get('/financial-review/applications',
  authenticate,
  authorize('financial_reviewer'),
  requireSpecificPermissions(['applications.financial_review']),
  async (req, res, next) => {
    try {
      const applications = await TwoTierApprovalService.getApplicationsForFinancialReview(req.user!.id);
      sendSuccess(res, { applications }, 'Applications for financial review retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Start financial review
router.post('/financial-review/:id/start',
  authenticate,
  authorize('financial_reviewer'),
  requireSpecificPermissions(['applications.financial_review']),
  async (req, res, next) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (!applicationId) {
        throw new ValidationError('Invalid application ID');
      }

      await TwoTierApprovalService.startFinancialReview(applicationId, req.user!.id);
      sendSuccess(res, {}, 'Financial review started successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Complete financial review (approve/reject payment)
router.post('/financial-review/:id/complete',
  authenticate,
  authorize('financial_reviewer'),
  requireSpecificPermissions(['payments.approve', 'payments.reject']),
  async (req, res, next) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (!applicationId) {
        throw new ValidationError('Invalid application ID');
      }

      const { error, value } = financialReviewSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      await TwoTierApprovalService.completeFinancialReview(applicationId, req.user!.id, value);
      sendSuccess(res, {}, `Financial review completed: ${value.financial_status}`);
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// RENEWAL FINANCIAL REVIEW ROUTES
// =====================================================

// Get renewals for financial review
router.get('/renewal-review/renewals',
  authenticate,
  authorize('financial_reviewer'),
  requireSpecificPermissions(['renewals.financial_review']),
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const renewals = await TwoTierApprovalService.getRenewalsForFinancialReview(req.user!.id, limit, offset);
      sendSuccess(res, { renewals, pagination: { limit, offset, total: renewals.length } }, 'Renewals for financial review retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Start renewal financial review
router.post('/renewal-review/:id/start',
  authenticate,
  authorize('financial_reviewer'),
  requireSpecificPermissions(['renewals.financial_review']),
  async (req, res, next) => {
    try {
      const renewalId = parseInt(req.params.id);
      if (!renewalId) {
        throw new ValidationError('Invalid renewal ID');
      }

      await TwoTierApprovalService.startRenewalFinancialReview(renewalId, req.user!.id);
      sendSuccess(res, {}, 'Renewal financial review started successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Complete renewal financial review (approve/reject payment)
router.post('/renewal-review/:id/complete',
  authenticate,
  authorize('financial_reviewer'),
  requireSpecificPermissions(['renewals.payment_approve', 'renewals.payment_reject']),
  async (req, res, next) => {
    try {
      const renewalId = parseInt(req.params.id);
      if (!renewalId) {
        throw new ValidationError('Invalid renewal ID');
      }

      const { error, value } = renewalFinancialReviewSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      await TwoTierApprovalService.completeRenewalFinancialReview(renewalId, req.user!.id, value);
      sendSuccess(res, {}, `Renewal financial review completed: ${value.financial_status}`);
    } catch (error) {
      next(error);
    }
  }
);

// Get renewal details with role-based access
router.get('/renewals/:id',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const renewalId = parseInt(req.params.id);
      if (!renewalId) {
        throw new ValidationError('Invalid renewal ID');
      }

      const renewal = await TwoTierApprovalService.getRenewalWithRoleAccess(
        renewalId,
        req.user!.id,
        req.user!.role_name
      );

      if (!renewal) {
        return sendError(res, 'Renewal not found or access denied', 404);
      }

      sendSuccess(res, { renewal }, 'Renewal details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get renewal workflow audit trail
router.get('/renewals/:id/audit-trail',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const renewalId = parseInt(req.params.id);
      if (!renewalId) {
        throw new ValidationError('Invalid renewal ID');
      }

      const auditTrail = await TwoTierApprovalService.getRenewalWorkflowAuditTrail(renewalId);
      sendSuccess(res, { auditTrail }, 'Renewal workflow audit trail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get comprehensive renewal audit trail (includes financial audit)
router.get('/renewals/:id/comprehensive-audit',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const renewalId = parseInt(req.params.id);
      if (!renewalId) {
        throw new ValidationError('Invalid renewal ID');
      }

      const comprehensiveAudit = await TwoTierApprovalService.getRenewalComprehensiveAuditTrail(renewalId);
      sendSuccess(res, { comprehensiveAudit }, 'Renewal comprehensive audit trail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Membership Approver Routes

// Get applications for final review
router.get('/final-review/applications',
  authenticate,
  authorize('membership_approver'),
  requireSpecificPermissions(['applications.final_review']),
  async (req, res, next) => {
    try {
      const applications = await TwoTierApprovalService.getApplicationsForFinalReview(req.user!.id);
      sendSuccess(res, { applications }, 'Applications for final review retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Start final review
router.post('/final-review/:id/start',
  authenticate,
  authorize('membership_approver'),
  requireSpecificPermissions(['applications.final_review']),
  async (req, res, next) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (!applicationId) {
        throw new ValidationError('Invalid application ID');
      }

      await TwoTierApprovalService.startFinalReview(applicationId, req.user!.id);
      sendSuccess(res, {}, 'Final review started successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Complete final review (approve/reject membership)
router.post('/final-review/:id/complete',
  authenticate,
  authorize('membership_approver'),
  requireSpecificPermissions(['applications.approve', 'applications.reject']),
  async (req, res, next) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (!applicationId) {
        throw new ValidationError('Invalid application ID');
      }

      const { error, value } = finalReviewSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      await TwoTierApprovalService.completeFinalReview(applicationId, req.user!.id, value);
      sendSuccess(res, {}, `Final review completed: ${value.status}`);
    } catch (error) {
      next(error);
    }
  }
);

// Shared Routes (accessible by both roles)

// Get workflow audit trail for application
router.get('/applications/:id/audit-trail',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (!applicationId) {
        throw new ValidationError('Invalid application ID');
      }

      const auditTrail = await TwoTierApprovalService.getWorkflowAuditTrail(applicationId);
      sendSuccess(res, { auditTrail }, 'Workflow audit trail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get workflow notifications for current user's role
router.get('/notifications',
  authenticate,
  authorize('financial_reviewer', 'membership_approver'),
  async (req, res, next) => {
    try {
      const isRead = req.query.is_read ? req.query.is_read === 'true' : undefined;
      const notifications = await TwoTierApprovalService.getWorkflowNotifications(req.user!.role_name, isRead);
      sendSuccess(res, { notifications }, 'Workflow notifications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Mark notification as read
router.patch('/notifications/:id/read',
  authenticate,
  authorize('financial_reviewer', 'membership_approver'),
  async (req, res, next) => {
    try {
      const notificationId = parseInt(req.params.id);
      if (!notificationId) {
        throw new ValidationError('Invalid notification ID');
      }

      // Update notification as read
      await TwoTierApprovalService.markNotificationAsRead(notificationId, req.user!.id);
      sendSuccess(res, {}, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }
);

// Get workflow statistics (for dashboards)
router.get('/statistics',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const statistics = await TwoTierApprovalService.getWorkflowStatistics(req.user!.role_name);
      sendSuccess(res, { statistics }, 'Workflow statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get application details with role-based access
router.get('/applications/:id',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (!applicationId) {
        throw new ValidationError('Invalid application ID');
      }

      const application = await TwoTierApprovalService.getApplicationWithRoleAccess(
        applicationId, 
        req.user!.id, 
        req.user!.role_name
      );
      
      if (!application) {
        return sendError(res, 'Application not found or access denied', 404);
      }

      sendSuccess(res, { application }, 'Application details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// COMPREHENSIVE FINANCIAL OVERSIGHT ROUTES
// =====================================================

// Get all financial transactions with filtering
router.get('/financial/transactions',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_all_transactions']),
  async (req, res, next) => {
    try {
      const filters = {
        entity_type: req.query.entity_type as 'application' | 'renewal',
        payment_status: req.query.payment_status as string,
        financial_status: req.query.financial_status as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        member_search: req.query.member_search as string,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0
      };

      const transactions = await ComprehensiveFinancialService.getFinancialTransactions(filters);
      sendSuccess(res, {
        transactions,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: transactions.length
        }
      }, 'Financial transactions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get financial summary statistics
router.get('/financial/summary',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_summary']),
  async (req, res, next) => {
    try {
      const filters = {
        entity_type: req.query.entity_type as 'application' | 'renewal',
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string
      };

      const summary = await ComprehensiveFinancialService.getFinancialSummary(filters);
      sendSuccess(res, { summary }, 'Financial summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get financial reviewer performance metrics
router.get('/financial/reviewer-performance',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_performance']),
  async (req, res, next) => {
    try {
      const reviewerId = req.query.reviewer_id ? parseInt(req.query.reviewer_id as string) : undefined;
      const dateFrom = req.query.date_from as string;
      const dateTo = req.query.date_to as string;

      const performance = await ComprehensiveFinancialService.getReviewerPerformance(reviewerId, dateFrom, dateTo);
      sendSuccess(res, { performance }, 'Reviewer performance metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get financial KPIs
router.get('/financial/kpis',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_kpis']),
  async (req, res, next) => {
    try {
      const category = req.query.category as 'revenue' | 'efficiency' | 'quality' | 'compliance' | 'performance';
      const date = req.query.date as string;

      const kpis = await ComprehensiveFinancialService.getFinancialKPIs(category, date);
      sendSuccess(res, { kpis }, 'Financial KPIs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Update financial KPI value
router.put('/financial/kpis/:kpiName',
  authenticate,
  authorize('super_admin'),
  requireSpecificPermissions(['financial.update_kpis']),
  async (req, res, next) => {
    try {
      const kpiName = req.params.kpiName;
      const { new_value, date } = req.body;

      if (typeof new_value !== 'number') {
        throw new ValidationError('new_value must be a number');
      }

      await ComprehensiveFinancialService.updateFinancialKPI(kpiName, new_value, date);
      sendSuccess(res, {}, 'Financial KPI updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get cached dashboard data
router.get('/financial/dashboard-cache/:cacheKey',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const cacheKey = req.params.cacheKey;
      const cachedData = await ComprehensiveFinancialService.getCachedDashboardData(cacheKey);

      if (cachedData) {
        sendSuccess(res, { data: cachedData, cached: true }, 'Cached dashboard data retrieved successfully');
      } else {
        sendSuccess(res, { data: null, cached: false }, 'No cached data found');
      }
    } catch (error) {
      next(error);
    }
  }
);

// Set dashboard cache data
router.post('/financial/dashboard-cache',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  async (req, res, next) => {
    try {
      const { cache_key, cache_type, data, expiration_minutes } = req.body;

      if (!cache_key || !cache_type || !data) {
        throw new ValidationError('cache_key, cache_type, and data are required');
      }

      await ComprehensiveFinancialService.setCachedDashboardData(
        cache_key,
        cache_type,
        data,
        expiration_minutes || 30
      );
      sendSuccess(res, {}, 'Dashboard data cached successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Invalidate dashboard cache
router.delete('/financial/dashboard-cache',
  authenticate,
  authorize('super_admin'),
  async (req, res, next) => {
    try {
      const cacheKeyPattern = req.query.pattern as string;
      await ComprehensiveFinancialService.invalidateDashboardCache(cacheKeyPattern);
      sendSuccess(res, {}, 'Dashboard cache invalidated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
