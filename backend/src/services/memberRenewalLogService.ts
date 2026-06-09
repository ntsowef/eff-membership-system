import { executeQuery, executeQuerySingle } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';

export interface RenewalLogEntry {
  member_id: number;
  renewal_year: number;
  renewal_type?: string;
  previous_expiry_date?: string;
  new_expiry_date: string;
  amount_paid?: number;
  payment_method?: string;
  payment_reference?: string;
  payment_status?: string;
  processed_by?: number;
  province_code?: string;
  province_name?: string;
  district_code?: string;
  municipality_code?: string;
  ward_code?: string;
  source?: string;
  source_reference?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface RenewalLogFilters {
  member_id?: number;
  province_code?: string;
  renewal_year?: number;
  renewal_type?: string;
  source?: string;
  processed_by?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export class MemberRenewalLogService {

  /**
   * Log a renewal event to the member_renewal_log table
   */
  static async logRenewal(entry: RenewalLogEntry): Promise<{ log_id: number }> {
    try {
      const result = await executeQuery<{ log_id: number }>(
        `INSERT INTO member_renewal_log (
          member_id, renewal_year, renewal_type, previous_expiry_date, new_expiry_date,
          amount_paid, payment_method, payment_reference, payment_status,
          processed_by, province_code, province_name, district_code,
          municipality_code, ward_code, source, source_reference, notes, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING log_id`,
        [
          entry.member_id,
          entry.renewal_year,
          entry.renewal_type || 'Annual',
          entry.previous_expiry_date || null,
          entry.new_expiry_date,
          entry.amount_paid || 0,
          entry.payment_method || null,
          entry.payment_reference || null,
          entry.payment_status || 'Completed',
          entry.processed_by || null,
          entry.province_code || null,
          entry.province_name || null,
          entry.district_code || null,
          entry.municipality_code || null,
          entry.ward_code || null,
          entry.source || 'manual',
          entry.source_reference || null,
          entry.notes || null,
          entry.metadata ? JSON.stringify(entry.metadata) : null
        ]
      );
      return result[0];
    } catch (error) {
      throw createDatabaseError('Failed to log renewal event', error);
    }
  }

  /**
   * Get renewal logs with filtering and pagination
   */
  static async getRenewalLogs(filters: RenewalLogFilters): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 200);
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.member_id) {
        conditions.push(`rl.member_id = $${paramIndex++}`);
        params.push(filters.member_id);
      }
      if (filters.province_code) {
        conditions.push(`rl.province_code = $${paramIndex++}`);
        params.push(filters.province_code);
      }
      if (filters.renewal_year) {
        conditions.push(`rl.renewal_year = $${paramIndex++}`);
        params.push(filters.renewal_year);
      }
      if (filters.renewal_type) {
        conditions.push(`rl.renewal_type = $${paramIndex++}`);
        params.push(filters.renewal_type);
      }
      if (filters.source) {
        conditions.push(`rl.source = $${paramIndex++}`);
        params.push(filters.source);
      }
      if (filters.processed_by) {
        conditions.push(`rl.processed_by = $${paramIndex++}`);
        params.push(filters.processed_by);
      }
      if (filters.date_from) {
        conditions.push(`rl.renewal_date >= $${paramIndex++}`);
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        conditions.push(`rl.renewal_date <= $${paramIndex++}`);
        params.push(filters.date_to);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await executeQuerySingle<{ total: string }>(
        `SELECT COUNT(*) as total FROM member_renewal_log rl ${whereClause}`,
        params
      );
      const total = parseInt(countResult?.total || '0', 10);

      // Get paginated data
      const dataParams = [...params, limit, offset];
      const data = await executeQuery(
        `SELECT
          rl.*,
          mc.firstname, mc.surname, mc.membership_number, mc.id_number
        FROM member_renewal_log rl
        LEFT JOIN members_consolidated mc ON rl.member_id = mc.member_id
        ${whereClause}
        ORDER BY rl.renewal_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        dataParams
      );

      return { data, total, page, limit };
    } catch (error) {
      throw createDatabaseError('Failed to get renewal logs', error);
    }
  }

  /**
   * Get renewal logs for a specific member
   */
  static async getRenewalLogsByMember(memberId: number): Promise<any[]> {
    try {
      return await executeQuery(
        `SELECT * FROM member_renewal_log
         WHERE member_id = $1
         ORDER BY renewal_date DESC`,
        [memberId]
      );
    } catch (error) {
      throw createDatabaseError('Failed to get member renewal logs', error);
    }
  }

  /**
   * Get renewal growth metrics - accurate renewal counts by period
   */
  static async getRenewalGrowthMetrics(filters: {
    province_code?: string;
    date_from?: string;
    date_to?: string;
    group_by?: 'day' | 'week' | 'month' | 'year';
  }): Promise<any[]> {
    try {
      const groupBy = filters.group_by || 'month';
      let dateFormat: string;
      switch (groupBy) {
        case 'day': dateFormat = 'YYYY-MM-DD'; break;
        case 'week': dateFormat = 'IYYY-IW'; break;
        case 'month': dateFormat = 'YYYY-MM'; break;
        case 'year': dateFormat = 'YYYY'; break;
        default: dateFormat = 'YYYY-MM';
      }

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.province_code) {
        conditions.push(`province_code = $${paramIndex++}`);
        params.push(filters.province_code);
      }
      if (filters.date_from) {
        conditions.push(`renewal_date >= $${paramIndex++}`);
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        conditions.push(`renewal_date <= $${paramIndex++}`);
        params.push(filters.date_to);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      return await executeQuery(
        `SELECT
          TO_CHAR(renewal_date, '${dateFormat}') as period,
          COUNT(*) as total_renewals,
          COUNT(DISTINCT member_id) as unique_members_renewed,
          SUM(COALESCE(amount_paid, 0)) as total_revenue,
          COUNT(CASE WHEN renewal_type = 'Annual' THEN 1 END) as annual_renewals,
          COUNT(CASE WHEN renewal_type = 'Late' THEN 1 END) as late_renewals,
          COUNT(CASE WHEN renewal_type = 'Grace' THEN 1 END) as grace_renewals,
          AVG(COALESCE(amount_paid, 0)) as avg_amount
        FROM member_renewal_log
        ${whereClause}
        GROUP BY TO_CHAR(renewal_date, '${dateFormat}')
        ORDER BY period DESC`,
        params
      );
    } catch (error) {
      throw createDatabaseError('Failed to get renewal growth metrics', error);
    }
  }

  /**
   * Get renewals breakdown by province
   */
  static async getRenewalsByProvince(filters: {
    renewal_year?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<any[]> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.renewal_year) {
        conditions.push(`renewal_year = $${paramIndex++}`);
        params.push(filters.renewal_year);
      }
      if (filters.date_from) {
        conditions.push(`renewal_date >= $${paramIndex++}`);
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        conditions.push(`renewal_date <= $${paramIndex++}`);
        params.push(filters.date_to);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      return await executeQuery(
        `SELECT
          COALESCE(province_code, 'Unknown') as province_code,
          COALESCE(province_name, 'Unknown') as province_name,
          COUNT(*) as total_renewals,
          COUNT(DISTINCT member_id) as unique_members,
          SUM(COALESCE(amount_paid, 0)) as total_revenue,
          AVG(COALESCE(amount_paid, 0)) as avg_amount,
          COUNT(CASE WHEN renewal_type = 'Annual' THEN 1 END) as annual_count,
          COUNT(CASE WHEN renewal_type = 'Late' THEN 1 END) as late_count,
          COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_count,
          COUNT(CASE WHEN source = 'bulk_upload' THEN 1 END) as bulk_count,
          COUNT(CASE WHEN source = 'online' THEN 1 END) as online_count
        FROM member_renewal_log
        ${whereClause}
        GROUP BY province_code, province_name
        ORDER BY total_renewals DESC`,
        params
      );
    } catch (error) {
      throw createDatabaseError('Failed to get renewals by province', error);
    }
  }

  /**
   * Get renewal trends - compare current period vs previous period
   */
  static async getRenewalTrends(): Promise<{
    today: any;
    this_week: any;
    this_month: any;
    this_year: any;
  }> {
    try {
      const todayResult = await executeQuerySingle<any>(
        `SELECT
          COUNT(*) as renewals,
          SUM(COALESCE(amount_paid, 0)) as revenue
        FROM member_renewal_log
        WHERE renewal_date::date = CURRENT_DATE`
      );

      const thisWeekResult = await executeQuerySingle<any>(
        `SELECT
          COUNT(*) as renewals,
          SUM(COALESCE(amount_paid, 0)) as revenue
        FROM member_renewal_log
        WHERE renewal_date >= date_trunc('week', CURRENT_DATE)`
      );

      const thisMonthResult = await executeQuerySingle<any>(
        `SELECT
          COUNT(*) as renewals,
          SUM(COALESCE(amount_paid, 0)) as revenue
        FROM member_renewal_log
        WHERE renewal_date >= date_trunc('month', CURRENT_DATE)`
      );

      const thisYearResult = await executeQuerySingle<any>(
        `SELECT
          COUNT(*) as renewals,
          SUM(COALESCE(amount_paid, 0)) as revenue
        FROM member_renewal_log
        WHERE renewal_year = EXTRACT(YEAR FROM CURRENT_DATE)`
      );

      return {
        today: todayResult || { renewals: 0, revenue: 0 },
        this_week: thisWeekResult || { renewals: 0, revenue: 0 },
        this_month: thisMonthResult || { renewals: 0, revenue: 0 },
        this_year: thisYearResult || { renewals: 0, revenue: 0 }
      };
    } catch (error) {
      throw createDatabaseError('Failed to get renewal trends', error);
    }
  }
}