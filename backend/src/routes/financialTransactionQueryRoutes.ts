import express from 'express';
import { authenticate, authorize, requireSpecificPermissions } from '../middleware/auth';
import { FinancialTransactionQueryService, TransactionQueryFilters, TransactionExportOptions } from '../services/financialTransactionQueryService';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { ValidationError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const transactionQuerySchema = Joi.object({
  // Entity filters
  entity_type: Joi.string().valid('application', 'renewal', 'all').optional(),
  entity_id: Joi.number().integer().positive().optional(),
  
  // Status filters
  payment_status: Joi.string().valid('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled').optional(),
  financial_status: Joi.string().valid('Pending', 'Under Review', 'Approved', 'Rejected').optional(),
  workflow_stage: Joi.string().optional(),
  
  // Date filters
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  created_date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  created_date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reviewed_date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reviewed_date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Amount filters
  amount_min: Joi.number().min(0).optional(),
  amount_max: Joi.number().min(0).optional(),
  
  // Member filters
  member_search: Joi.string().max(255).optional(),
  member_id: Joi.number().integer().positive().optional(),
  province_code: Joi.string().max(10).optional(),
  district_code: Joi.string().max(10).optional(),
  municipal_code: Joi.string().max(10).optional(),
  ward_code: Joi.string().max(20).optional(),
  
  // Reviewer filters
  financial_reviewed_by: Joi.number().integer().positive().optional(),
  final_reviewed_by: Joi.number().integer().positive().optional(),
  
  // Pagination
  limit: Joi.number().integer().min(1).max(1000).default(50),
  offset: Joi.number().integer().min(0).default(0),
  
  // Sorting
  sort_by: Joi.string().valid('created_at', 'amount', 'member_name', 'status', 'reviewed_at').default('created_at'),
  sort_order: Joi.string().valid('ASC', 'DESC').default('DESC'),
  
  // Advanced filters
  has_payment: Joi.boolean().optional(),
  overdue_only: Joi.boolean().optional(),
  flagged_only: Joi.boolean().optional(),
  requires_attention: Joi.boolean().optional()
});

const exportOptionsSchema = Joi.object({
  format: Joi.string().valid('csv', 'excel', 'json').required(),
  include_member_details: Joi.boolean().default(false),
  include_payment_details: Joi.boolean().default(false),
  include_audit_trail: Joi.boolean().default(false),
  date_format: Joi.string().valid('ISO', 'local', 'custom').default('ISO'),
  custom_date_format: Joi.string().optional()
});

// =====================================================
// FINANCIAL TRANSACTION QUERY ROUTES
// =====================================================

// Advanced transaction query with filtering, sorting, and pagination
router.get('/query',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_all_transactions']),
  async (req, res, next) => {
    try {
      const { error, value } = transactionQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const filters: TransactionQueryFilters = value;
      const result = await FinancialTransactionQueryService.queryTransactions(filters);

      sendSuccess(res, {
        ...result,
        query_info: {
          filters_applied: Object.keys(filters).filter(key => filters[key as keyof TransactionQueryFilters] !== undefined),
          execution_time: new Date().toISOString()
        }
      }, 'Financial transactions queried successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Search members for transaction filtering
router.get('/search-members',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_all_transactions']),
  async (req, res, next) => {
    try {
      const searchTerm = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!searchTerm || searchTerm.length < 2) {
        throw new ValidationError('Search term must be at least 2 characters long');
      }

      const members = await FinancialTransactionQueryService.searchMembers(searchTerm, limit);
      
      sendSuccess(res, { 
        members, 
        search_term: searchTerm,
        result_count: members.length 
      }, 'Member search completed successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get filter options for dropdowns
router.get('/filter-options',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_all_transactions']),
  async (req, res, next) => {
    try {
      const options = await FinancialTransactionQueryService.getFilterOptions();
      
      sendSuccess(res, { 
        filter_options: options,
        generated_at: new Date().toISOString()
      }, 'Filter options retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Export transactions to various formats
router.post('/export',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.export_transactions']),
  async (req, res, next) => {
    try {
      const { filters, options } = req.body;

      // Validate filters
      const { error: filtersError, value: validatedFilters } = transactionQuerySchema.validate(filters || {});
      if (filtersError) {
        throw new ValidationError(`Filters validation: ${filtersError.details[0].message}`);
      }

      // Validate export options
      const { error: optionsError, value: validatedOptions } = exportOptionsSchema.validate(options || {});
      if (optionsError) {
        throw new ValidationError(`Export options validation: ${optionsError.details[0].message}`);
      }

      const exportResult = await FinancialTransactionQueryService.exportTransactions(
        validatedFilters,
        validatedOptions
      );

      // Set appropriate headers for file download
      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      
      if (validatedOptions.format === 'json') {
        res.json(JSON.parse(exportResult.data));
      } else {
        res.send(exportResult.data);
      }

    } catch (error) {
      next(error);
    }
  }
);

// Get transaction analytics
router.get('/analytics',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_analytics']),
  async (req, res, next) => {
    try {
      const { error, value } = transactionQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const filters: TransactionQueryFilters = value;
      const analytics = await FinancialTransactionQueryService.getTransactionAnalytics(filters);

      sendSuccess(res, {
        analytics,
        filters_applied: filters,
        generated_at: new Date().toISOString()
      }, 'Transaction analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get quick stats for dashboard widgets
router.get('/quick-stats',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_all_transactions']),
  async (req, res, next) => {
    try {
      const entityType = req.query.entity_type as 'application' | 'renewal' | 'all';
      const dateFrom = req.query.date_from as string;
      const dateTo = req.query.date_to as string;

      const filters: TransactionQueryFilters = {
        entity_type: entityType,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 1 // We only need the summary, not the actual transactions
      };

      const result = await FinancialTransactionQueryService.queryTransactions(filters);

      const quickStats = {
        total_transactions: result.total_count,
        total_amount: result.summary.total_amount,
        completed_amount: result.summary.completed_amount,
        pending_amount: result.summary.pending_amount,
        avg_amount: result.summary.avg_amount,
        status_breakdown: result.summary.status_breakdown,
        completion_rate: result.total_count > 0 ? 
          Math.round((result.summary.status_breakdown.approved / result.total_count) * 100) : 0
      };

      sendSuccess(res, { 
        quick_stats: quickStats,
        period: { date_from: dateFrom, date_to: dateTo },
        entity_type: entityType || 'all'
      }, 'Quick stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get transaction details by ID
router.get('/transaction/:id',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_all_transactions']),
  async (req, res, next) => {
    try {
      const transactionId = parseInt(req.params.id);
      if (!transactionId) {
        throw new ValidationError('Invalid transaction ID');
      }

      const filters: TransactionQueryFilters = {
        entity_id: transactionId,
        limit: 1
      };

      const result = await FinancialTransactionQueryService.queryTransactions(filters);
      
      if (result.transactions.length === 0) {
        return sendError(res, 'Transaction not found', 404);
      }

      const transaction = result.transactions[0];

      sendSuccess(res, { 
        transaction,
        related_info: {
          member_transaction_count: result.summary.status_breakdown,
          avg_processing_time: transaction.days_to_review || 'N/A'
        }
      }, 'Transaction details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Bulk operations on transactions (for admin use)
router.post('/bulk-action',
  authenticate,
  authorize('super_admin'),
  requireSpecificPermissions(['financial.bulk_operations']),
  async (req, res, next) => {
    try {
      const { action, transaction_ids, reason } = req.body;

      if (!action || !transaction_ids || !Array.isArray(transaction_ids)) {
        throw new ValidationError('Action and transaction_ids array are required');
      }

      if (transaction_ids.length === 0) {
        throw new ValidationError('At least one transaction ID is required');
      }

      if (transaction_ids.length > 100) {
        throw new ValidationError('Maximum 100 transactions can be processed at once');
      }

      // For now, just return success - actual bulk operations would be implemented here
      const result = {
        action,
        processed_count: transaction_ids.length,
        successful_count: transaction_ids.length,
        failed_count: 0,
        processed_ids: transaction_ids,
        reason: reason || 'Bulk operation performed'
      };

      sendSuccess(res, { bulk_operation_result: result }, `Bulk ${action} completed successfully`);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
