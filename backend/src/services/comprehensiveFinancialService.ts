import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Interfaces for comprehensive financial service
export interface FinancialTransaction {
  transaction_id: string;
  entity_id: number;
  entity_type: 'application' | 'renewal';
  transaction_type: 'Application' | 'Renewal';
  member_name: string;
  member_email: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  payment_status: string;
  payment_date: Date;
  created_at: Date;
  financial_status?: string;
  workflow_stage?: string;
}

export interface FinancialSummary {
  total_transactions: number;
  total_amount: number;
  completed_transactions: number;
  completed_amount: number;
  pending_transactions: number;
  pending_amount: number;
  failed_transactions: number;
  failed_amount: number;
}

export interface ReviewerPerformance {
  reviewer_id: number;
  reviewer_name: string;
  reviewer_email: string;
  total_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  approval_rate: number;
  avg_review_time_hours: number;
  total_amount_reviewed: number;
  reviews_today: number;
}

export interface FinancialKPI {
  kpi_name: string;
  kpi_category: string;
  current_value: number;
  target_value: number;
  variance_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
  performance_status: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'critical';
  measurement_unit: string;
  measurement_date: Date;
}

export class ComprehensiveFinancialService {

  // =====================================================
  // UNIFIED FINANCIAL TRANSACTIONS
  // =====================================================

  // Get all financial transactions with filtering and pagination
  static async getFinancialTransactions(
    filters: {
      entity_type?: 'application' | 'renewal';
      payment_status?: string;
      financial_status?: string;
      date_from?: string;
      date_to?: string;
      member_search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<FinancialTransaction[]> {
    try {
      let query = `
        SELECT 
          uft.*,
          CASE 
            WHEN uft.transaction_type = 'Application' THEN uft.first_name || ' ' || uft.last_name
            WHEN uft.transaction_type = 'Renewal' THEN uft.firstname || ' ' || uft.surname
            ELSE 'Unknown'
          END as member_name,
          CASE 
            WHEN uft.transaction_type = 'Application' THEN uft.email
            WHEN uft.transaction_type = 'Renewal' THEN uft.email
            ELSE NULL
          END as member_email
        FROM unified_financial_transactions uft
        WHERE 1= TRUE
      `;

      const params: any[] = [];

      // Apply filters
      if (filters.entity_type) {
        query += ` AND uft.entity_type = $${params.length + 1} `;
        params.push(filters.entity_type);
      }

      if (filters.payment_status) {
        query += ` AND uft.payment_status = $${params.length + 1}`;
        params.push(filters.payment_status);
      }

      if (filters.financial_status) {
        query += ` AND uft.financial_status = $${params.length + 1}`;
        params.push(filters.financial_status);
      }

      if (filters.date_from) {
        query += ` AND uft.created_at::DATE >= $${params.length + 1}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ` AND uft.created_at::DATE <= $${params.length + 1} `;
        params.push(filters.date_to);
      }

      if (filters.member_search) {
        query += ` AND (
          uft.first_name || ' ' || uft.last_name LIKE $${params.length + 1} OR
          uft.firstname || ' ' || uft.surname LIKE $${params.length + 2} OR
          uft.email LIKE $${params.length + 3} OR
          uft.payment_reference LIKE $${params.length + 4}
        )`;
        const searchTerm = `%${filters.member_search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY uft.created_at DESC';

      // Apply pagination
      if (filters.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);

        if (filters.offset) {
          query += ` OFFSET $${params.length + 1}`;
          params.push(filters.offset);
        }
      }

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get financial transactions', error);
    }
  }

  // Get financial summary statistics
  static async getFinancialSummary(
    filters: {
      entity_type?: 'application' | 'renewal';
      date_from?: string;
      date_to?: string;
    } = {}
  ): Promise<FinancialSummary> {
    try {
      let query = `
        SELECT
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN payment_status = 'Completed' THEN 1 END) as completed_transactions,
          COALESCE(SUM(CASE WHEN payment_status = 'Completed' THEN amount END), 0) as completed_amount,
          COUNT(CASE WHEN payment_status IN ('Pending', 'Processing') THEN 1 END) as pending_transactions,
          COALESCE(SUM(CASE WHEN payment_status IN ('Pending', 'Processing') THEN amount END), 0) as pending_amount,
          COUNT(CASE WHEN payment_status = 'Failed' THEN 1 END) as failed_transactions,
          COALESCE(SUM(CASE WHEN payment_status = 'Failed' THEN amount END), 0) as failed_amount
        FROM unified_financial_transactions
        WHERE 1 = 1
      `;

      const params: any[] = [];

      if (filters.entity_type) {
        query += ` AND entity_type = $${params.length + 1} `;
        params.push(filters.entity_type);
      }

      if (filters.date_from) {
        query += ` AND created_at::DATE >= $${params.length + 1}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ` AND created_at::DATE <= $${params.length + 1} `;
        params.push(filters.date_to);
      }

      const result = await executeQuerySingle(query, params);
      return result || {
        total_transactions : 0,
        total_amount: 0,
        completed_transactions: 0,
        completed_amount: 0,
        pending_transactions: 0,
        pending_amount: 0,
        failed_transactions: 0,
        failed_amount: 0
      };
    } catch (error) {
      throw createDatabaseError('Failed to get financial summary', error);
    }
  }

  // =====================================================
  // FINANCIAL REVIEWER PERFORMANCE
  // =====================================================

  // Get financial reviewer performance metrics
  static async getReviewerPerformance(
    reviewerId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ReviewerPerformance[]> {
    try {
      let query = `
        SELECT 
          u.id as reviewer_id,
          u.name as reviewer_name,
          u.email as reviewer_email,
          
          -- Overall review metrics
          COUNT(DISTINCT COALESCE(ma.id, mr.renewal_id)) as total_reviews,
          COUNT(DISTINCT CASE WHEN COALESCE(ma.financial_status, mr.financial_status) = 'Approved' THEN COALESCE(ma.id, mr.renewal_id) END) as approved_reviews,
          COUNT(DISTINCT CASE WHEN COALESCE(ma.financial_status, mr.financial_status) = 'Rejected' THEN COALESCE(ma.id, mr.renewal_id) END) as rejected_reviews,
          
          -- Calculate approval rate
          CASE 
            WHEN COUNT(DISTINCT COALESCE(ma.id, mr.renewal_id)) > 0 THEN
              ROUND((COUNT(DISTINCT CASE WHEN COALESCE(ma.financial_status, mr.financial_status) = 'Approved' THEN COALESCE(ma.id, mr.renewal_id) END) * 100.0) / COUNT(DISTINCT COALESCE(ma.id, mr.renewal_id)), 2)
            ELSE 0
          END as approval_rate,
          
          -- Average review time (placeholder - would need more detailed tracking)
          24.0 as avg_review_time_hours,
          
          -- Total amount reviewed
          COALESCE(SUM(DISTINCT COALESCE(ap.amount, rp.amount)), 0) as total_amount_reviewed,
          
          -- Reviews today
          COUNT(DISTINCT CASE WHEN COALESCE(ma.financial_reviewed_at, mr.financial_reviewed_at::DATE) = CURRENT_DATE THEN COALESCE(ma.id, mr.renewal_id) END) as reviews_today
          
        FROM users u
        LEFT JOIN membership_applications ma ON u.id = ma.financial_reviewed_by
        LEFT JOIN membership_renewals mr ON u.id = mr.financial_reviewed_by
        LEFT JOIN application_payments ap ON ma.id = ap.application_id
        LEFT JOIN renewal_payments rp ON mr.renewal_id = rp.renewal_id
        WHERE u.role_id = (SELECT id FROM roles WHERE name = 'financial_reviewer')
      `;

      const params: any[] = [];

      if (reviewerId) {
        query += ` AND u.id = $${params.length + 1} `;
        params.push(reviewerId);
      }

      if (dateFrom) {
        query += ` AND COALESCE(ma.financial_reviewed_at, mr.financial_reviewed_at)::DATE >= $${params.length + 1}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ` AND COALESCE(ma.financial_reviewed_at, mr.financial_reviewed_at)::DATE <= $${params.length + 1} `;
        params.push(dateTo);
      }

      query += ' GROUP BY u.id, u.name, u.email ORDER BY total_reviews DESC';

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get reviewer performance', error);
    }
  }

  // =====================================================
  // FINANCIAL KPI TRACKING
  // =====================================================

  // Get current financial KPIs
  static async getFinancialKPIs(
    category: 'revenue' | 'efficiency' | 'quality' | 'compliance' | 'performance',
    date?: string
  ): Promise<FinancialKPI[]> {
    try {
      let query = `
        SELECT 
          kpi_name,
          kpi_category,
          current_value,
          target_value,
          variance_percentage,
          trend_direction,
          performance_status,
          measurement_unit,
          measurement_date
        FROM financial_kpi_tracking
        WHERE 1= TRUE
      `;

      const params: any[] = [];

      if (category) {
        query += ` AND kpi_category = $${params.length + 1} `;
        params.push(category);
      }

      if (date) {
        query += ` AND measurement_date = $${params.length + 1}`;
        params.push(date);
      } else {
        query += ' AND measurement_date = CURRENT_DATE';
      }

      query += ' ORDER BY kpi_category, kpi_name';

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get financial KPIs', error);
    }
  }

  // Update financial KPI value
  static async updateFinancialKPI(
    kpiName : string,
    newValue: number,
    date?: string
  ): Promise<void> {
    try {
      const measurementDate = date || new Date().toISOString().split('T')[0];

      // Get current KPI to calculate variance
      const currentKPI = await executeQuerySingle(`
        SELECT current_value, target_value 
        FROM financial_kpi_tracking 
        WHERE kpi_name = ? AND measurement_date = 
      `, [kpiName, measurementDate]);

      let variancePercentage = 0;
      let trendDirection : 'up' | 'down' | 'stable' = 'stable';
      let performanceStatus: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'critical' = 'acceptable';

      if (currentKPI) {
        // Calculate variance from target
        if (currentKPI.target_value > 0) {
          variancePercentage = ((newValue - currentKPI.target_value) / currentKPI.target_value) * 100;
        }

        // Determine trend direction
        if (newValue > currentKPI.current_value) {
          trendDirection = 'up';
        } else if (newValue < currentKPI.current_value) {
          trendDirection = 'down';
        }

        // Determine performance status based on variance
        if (variancePercentage >= 10) {
          performanceStatus = 'excellent';
        } else if (variancePercentage >= 0) {
          performanceStatus = 'good';
        } else if (variancePercentage >= -10) {
          performanceStatus = 'acceptable';
        } else if (variancePercentage >= -25) {
          performanceStatus = 'needs_improvement';
        } else {
          performanceStatus = 'critical';
        }
      }

      // Update or insert KPI value
      await executeQuery(`
        INSERT INTO financial_kpi_tracking (
          kpi_name, measurement_date, current_value, previous_value,
          variance_percentage, trend_direction, performance_status
        ) EXCLUDED.?, ?, ?, ?, ?, ?, ?
        ON CONFLICT DO UPDATE SET
          previous_value = current_value,
          current_value = EXCLUDED.current_value,
          variance_percentage = EXCLUDED.variance_percentage,
          trend_direction = EXCLUDED.trend_direction,
          performance_status = EXCLUDED.performance_status
      `, [
        kpiName,
        measurementDate,
        newValue,
        currentKPI?.current_value || 0,
        variancePercentage,
        trendDirection,
        performanceStatus
      ]);

    } catch (error) {
      throw createDatabaseError('Failed to update financial KPI', error);
    }
  }

  // =====================================================
  // DASHBOARD CACHE MANAGEMENT
  // =====================================================

  // Get cached dashboard data
  static async getCachedDashboardData(cacheKey: string): Promise<any> {
    try {
      const cached = await executeQuerySingle(`
        SELECT cache_data, expires_at, is_valid
        FROM financial_dashboard_cache
        WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP AND is_valid = TRUE
      `, [cacheKey]);

      if (cached) {
        return JSON.parse(cached.cache_data);
      }

      return null;
    } catch (error) {
      throw createDatabaseError('Failed to get cached dashboard data', error);
    }
  }

  // Set dashboard cache data
  static async setCachedDashboardData(
    cacheKey : string,
    cacheType: 'daily_stats' | 'monthly_trends' | 'reviewer_performance' | 'transaction_summary' | 'pending_reviews',
    data: any,
    expirationMinutes: number = 30
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

      const cacheData = JSON.stringify(data);
      const dataSizeBytes = Buffer.byteLength(cacheData, 'utf8');

      await executeQuery(`
        INSERT INTO financial_dashboard_cache (
          cache_key, cache_data, cache_type, expires_at, data_size_bytes
        ) EXCLUDED.?, ?, ?, ?, ?
        ON CONFLICT DO UPDATE SET
          cache_data = EXCLUDED.cache_data,
          cache_type = EXCLUDED.cache_type,
          expires_at = EXCLUDED.expires_at,
          data_size_bytes = EXCLUDED.data_size_bytes,
          generated_at = CURRENT_TIMESTAMP,
          is_valid = TRUE
      `, [cacheKey, cacheData, cacheType, expiresAt, dataSizeBytes]);

    } catch (error) {
      throw createDatabaseError('Failed to set cached dashboard data', error);
    }
  }

  // Invalidate dashboard cache
  static async invalidateDashboardCache(cacheKeyPattern?: string): Promise<void> {
    try {
      let query = 'UPDATE financial_dashboard_cache SET is_valid = FALSE';
      const params: any[] = [];

      if (cacheKeyPattern) {
        query += ` WHERE cache_key LIKE $${params.length + 1}`;
        params.push(cacheKeyPattern);
      }

      await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to invalidate dashboard cache', error);
    }
  }
}
