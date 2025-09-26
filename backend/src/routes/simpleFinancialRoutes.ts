import express from 'express';
import { authenticate, authorize, requireSpecificPermissions } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { ValidationError } from '../middleware/errorHandler';
import mysql from 'mysql2/promise';
import Joi from 'joi';

const router = express.Router();

// Simple database connection for testing
const getSimpleConnection = async () => {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });
};

// Validation schema
const querySchema = Joi.object({
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  sort_by: Joi.string().valid('created_at', 'amount', 'payment_status', 'financial_status').default('created_at'),
  sort_order: Joi.string().valid('ASC', 'DESC').default('DESC'),
  entity_type: Joi.string().valid('application', 'renewal', 'all').optional(),
  payment_status: Joi.string().valid('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled').optional(),
  financial_status: Joi.string().valid('Pending', 'Under Review', 'Approved', 'Rejected').optional(),
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  member_search: Joi.string().max(255).optional(),
  amount_min: Joi.number().min(0).optional(),
  amount_max: Joi.number().min(0).optional()
});

// Simple financial transactions query endpoint
router.get('/simple-query',
  authenticate,
  authorize('financial_reviewer', 'membership_approver', 'super_admin'),
  requireSpecificPermissions(['financial.view_all_transactions']),
  async (req, res, next) => {
    let connection;
    
    try {
      // Validate query parameters
      const { error, value } = querySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const filters = value;
      
      // Create database connection
      connection = await getSimpleConnection();

      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      // Entity type filter
      if (filters.entity_type && filters.entity_type !== 'all') {
        whereConditions.push('uft.transaction_type = ?');
        queryParams.push(filters.entity_type === 'application' ? 'Application' : 'Renewal');
      }

      // Status filters
      if (filters.payment_status) {
        whereConditions.push('uft.payment_status = ?');
        queryParams.push(filters.payment_status);
      }

      if (filters.financial_status) {
        whereConditions.push('uft.financial_status = ?');
        queryParams.push(filters.financial_status);
      }

      // Date filters
      if (filters.date_from) {
        whereConditions.push('DATE(uft.created_at) >= ?');
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('DATE(uft.created_at) <= ?');
        queryParams.push(filters.date_to);
      }

      // Member search
      if (filters.member_search) {
        whereConditions.push('(uft.first_name LIKE ? OR uft.last_name LIKE ? OR uft.email LIKE ?)');
        const searchTerm = `%${filters.member_search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      // Amount filters
      if (filters.amount_min) {
        whereConditions.push('uft.amount >= ?');
        queryParams.push(filters.amount_min);
      }

      if (filters.amount_max) {
        whereConditions.push('uft.amount <= ?');
        queryParams.push(filters.amount_max);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM unified_financial_transactions uft
        ${whereClause}
      `;
      
      const [countResult] = await connection.execute(countQuery, queryParams);
      const totalCount = (countResult as any)[0].total_count;

      // Get transactions with pagination
      const transactionsQuery = `
        SELECT 
          uft.*,
          CASE 
            WHEN uft.transaction_type = 'Application' THEN 'Application'
            WHEN uft.transaction_type = 'Renewal' THEN 'Renewal'
            ELSE 'Unknown'
          END as entity_type_display,
          CASE 
            WHEN uft.financial_status = 'Approved' AND uft.payment_status = 'Completed' THEN 'Complete'
            WHEN uft.financial_status = 'Rejected' OR uft.payment_status = 'Failed' THEN 'Failed'
            WHEN uft.financial_status IN ('Pending', 'Under Review') THEN 'In Review'
            ELSE 'Processing'
          END as overall_status,
          DATEDIFF(NOW(), uft.created_at) as days_since_created
        FROM unified_financial_transactions uft
        ${whereClause}
        ORDER BY uft.${filters.sort_by} ${filters.sort_order}
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `;

      const [transactions] = await connection.execute(transactionsQuery, queryParams);

      // Get summary data
      const summaryQuery = `
        SELECT
          COUNT(*) as filtered_count,
          COALESCE(SUM(uft.amount), 0) as total_amount,
          COALESCE(AVG(uft.amount), 0) as avg_amount,
          COALESCE(SUM(CASE WHEN uft.payment_status = 'Completed' THEN uft.amount ELSE 0 END), 0) as completed_amount,
          COALESCE(SUM(CASE WHEN uft.payment_status != 'Completed' THEN uft.amount ELSE 0 END), 0) as pending_amount,
          COUNT(CASE WHEN uft.financial_status = 'Pending' THEN 1 END) as status_pending,
          COUNT(CASE WHEN uft.financial_status = 'Under Review' THEN 1 END) as status_under_review,
          COUNT(CASE WHEN uft.financial_status = 'Approved' THEN 1 END) as status_approved,
          COUNT(CASE WHEN uft.financial_status = 'Rejected' THEN 1 END) as status_rejected
        FROM unified_financial_transactions uft
        ${whereClause}
      `;

      const [summaryResult] = await connection.execute(summaryQuery, queryParams);
      const summary = (summaryResult as any)[0];

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / filters.limit);
      const currentPage = Math.floor(filters.offset / filters.limit) + 1;
      const hasMore = filters.offset + filters.limit < totalCount;

      const result = {
        transactions: transactions || [],
        total_count: totalCount,
        filtered_count: summary.filtered_count,
        summary: {
          total_amount: parseFloat(summary.total_amount) || 0,
          avg_amount: parseFloat(summary.avg_amount) || 0,
          completed_amount: parseFloat(summary.completed_amount) || 0,
          pending_amount: parseFloat(summary.pending_amount) || 0,
          status_breakdown: {
            pending: summary.status_pending || 0,
            under_review: summary.status_under_review || 0,
            approved: summary.status_approved || 0,
            rejected: summary.status_rejected || 0
          }
        },
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          has_more: hasMore,
          total_pages: totalPages,
          current_page: currentPage
        },
        query_info: {
          filters_applied: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined),
          execution_time: new Date().toISOString()
        }
      };

      sendSuccess(res, result, 'Financial transactions queried successfully');

    } catch (error) {
      console.error('Simple query error:', error);
      next(error);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
);

export default router;
