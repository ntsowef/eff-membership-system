import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { getConnection } from '../config/database-hybrid';

// TypeScript interfaces for the database views
export interface ExpiringSoonMember {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  cell_number?: string;
  email?: string;
  ward_number?: number;
  municipality_name?: string;
  expiry_date: string;
  membership_amount: number;
  days_until_expiry: number;
  renewal_priority: 'Urgent (1 Week)' | 'High Priority (2 Weeks)' | 'Medium Priority (1 Month)';
}

export interface ExpiredMember {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  cell_number?: string;
  email?: string;
  ward_number?: number;
  municipality_name?: string;
  expiry_date: string;
  membership_amount: number;
  days_expired: number;
  expiry_category: 'Recently Expired' | 'Expired 1-3 Months' | 'Expired 3-12 Months' | 'Expired Over 1 Year';
}

export class MembershipExpirationModel {

  // Helper method to execute PostgreSQL queries directly
  static async executePostgreSQLQuery(query: string, params: any[] = []): Promise<any[]> {
    const client = await getConnection();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Helper method to execute PostgreSQL queries and return single result
  static async executePostgreSQLQuerySingle(query: string, params: any[] = []): Promise<any> {
    const client = await getConnection();
    try {
      const result = await client.query(query, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Get members expiring soon using the database view
  static async getExpiringSoonMembers(options: {
    priority?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
    province_code?: string;
    municipality_code?: string;
  } = {}): Promise<{
    members: ExpiringSoonMember[];
    total_count: number;
    priority_summary: any;
  }> {
    try {
      const {
        priority = 'all',
        page = 1,
        limit = 50,
        sort_by = 'days_until_expiry',
        sort_order = 'asc',
        province_code,
        municipality_code
      } = options;

      const offset = (page - 1) * limit;

      // Build WHERE clause for priority and geographic filters
      const whereConditions: string[] = [];

      if (priority !== 'all') {
        whereConditions.push(`renewal_priority = '${priority}'`);
      }

      // Apply geographic filtering
      if (province_code) {
        whereConditions.push(`province_code = '${province_code}'`);
      }

      if (municipality_code) {
        whereConditions.push(`municipality_code = '${municipality_code}'`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const validSortFields = ['days_until_expiry', 'expiry_date', 'full_name', 'municipality_name'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'days_until_expiry';
      const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      const orderByClause = `ORDER BY ${sortField} ${sortDirection}`;

      // Get members
      const membersQuery = `
        SELECT
          member_id,
          id_number,
          firstname,
          surname,
          full_name,
          cell_number,
          email,
          ward_number,
          municipality_name,
          expiry_date,
          membership_amount,
          days_until_expiry,
          renewal_priority
        FROM vw_expiring_soon
        ${whereClause}
        ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const members = await this.executePostgreSQLQuery(membersQuery);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM vw_expiring_soon
        ${whereClause}
      `;
      const countResult = await this.executePostgreSQLQuerySingle(countQuery);

      // Get priority summary with geographic filtering
      const prioritySummaryQuery = `
        SELECT
          renewal_priority,
          COUNT(*) as count
        FROM vw_expiring_soon
        ${whereClause}
        GROUP BY renewal_priority
        ORDER BY
          CASE renewal_priority
            WHEN 'Urgent (1 Week)' THEN 1
            WHEN 'High Priority (2 Weeks)' THEN 2
            WHEN 'Medium Priority (1 Month)' THEN 3
          END
      `;
      const prioritySummary = await this.executePostgreSQLQuery(prioritySummaryQuery);

      return {
        members,
        total_count: countResult?.total_count || 0,
        priority_summary: prioritySummary
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch expiring soon members', error);
    }
  }

  // Get expired members using the database view
  static async getExpiredMembers(options: {
    category?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
    province_code?: string;
    municipality_code?: string;
  } = {}): Promise<{
    members: ExpiredMember[];
    total_count: number;
    category_summary: any;
  }> {
    try {
      const {
        category = 'all',
        page = 1,
        limit = 50,
        sort_by = 'days_expired',
        sort_order = 'asc',
        province_code,
        municipality_code
      } = options;

      const offset = (page - 1) * limit;

      // Build WHERE clause for category and geographic filters
      const whereConditions: string[] = [];

      if (category !== 'all') {
        whereConditions.push(`expiry_category = '${category}'`);
      }

      // Apply geographic filtering
      if (province_code) {
        whereConditions.push(`province_code = '${province_code}'`);
      }

      if (municipality_code) {
        whereConditions.push(`municipality_code = '${municipality_code}'`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const validSortFields = ['days_expired', 'expiry_date', 'full_name', 'municipality_name'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'days_expired';
      const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      const orderByClause = `ORDER BY ${sortField} ${sortDirection}`;

      // Get members
      const membersQuery = `
        SELECT
          member_id,
          id_number,
          firstname,
          surname,
          full_name,
          cell_number,
          email,
          ward_number,
          municipality_name,
          expiry_date,
          membership_amount,
          days_expired,
          expiry_category
        FROM vw_expired_memberships
        ${whereClause}
        ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const members = await this.executePostgreSQLQuery(membersQuery);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM vw_expired_memberships
        ${whereClause}
      `;
      const countResult = await this.executePostgreSQLQuerySingle(countQuery);

      // Get category summary with geographic filtering
      const categorySummaryQuery = `
        SELECT
          expiry_category,
          COUNT(*) as count
        FROM vw_expired_memberships
        ${whereClause}
        GROUP BY expiry_category
        ORDER BY
          CASE expiry_category
            WHEN 'Recently Expired' THEN 1
            WHEN 'Expired 1-3 Months' THEN 2
            WHEN 'Expired 3-12 Months' THEN 3
            WHEN 'Expired Over 1 Year' THEN 4
          END
      `;
      const categorySummary = await this.executePostgreSQLQuery(categorySummaryQuery);

      return {
        members,
        total_count: countResult?.total_count || 0,
        category_summary: categorySummary
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch expired members', error);
    }
  }

  // Get enhanced status overview using both views
  static async getEnhancedStatusOverview(options: {
    province_code?: string;
    municipality_code?: string;
  } = {}): Promise<{
    expiring_soon_summary: any;
    expired_summary: any;
    total_expiring_soon: number;
    total_expired: number;
    urgent_renewals: number;
    recently_expired: number;
  }> {
    try {
      // Build WHERE clause for geographic filtering
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (options.province_code) {
        whereConditions.push(`province_code = $${paramIndex++}`);
        params.push(options.province_code);
      }

      if (options.municipality_code) {
        whereConditions.push(`municipality_code = $${paramIndex++}`);
        params.push(options.municipality_code);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get expiring soon summary
      const expiringSoonSummaryQuery = `
        SELECT
          renewal_priority,
          COUNT(*) as count
        FROM vw_expiring_soon
        ${whereClause}
        GROUP BY renewal_priority
        ORDER BY
          CASE renewal_priority
            WHEN 'Urgent (1 Week)' THEN 1
            WHEN 'High Priority (2 Weeks)' THEN 2
            WHEN 'Medium Priority (1 Month)' THEN 3
          END
      `;
      const expiringSoonSummary = await this.executePostgreSQLQuery(expiringSoonSummaryQuery, params);

      // Get expired summary
      const expiredSummaryQuery = `
        SELECT
          expiry_category,
          COUNT(*) as count
        FROM vw_expired_memberships
        ${whereClause}
        GROUP BY expiry_category
        ORDER BY
          CASE expiry_category
            WHEN 'Recently Expired' THEN 1
            WHEN 'Expired 1-3 Months' THEN 2
            WHEN 'Expired 3-12 Months' THEN 3
            WHEN 'Expired Over 1 Year' THEN 4
          END
      `;
      const expiredSummary = await this.executePostgreSQLQuery(expiredSummaryQuery, params);

      // Get totals with geographic filtering
      const totalExpiringSoonQuery = `SELECT COUNT(*) as total FROM vw_expiring_soon ${whereClause}`;
      const totalExpiredQuery = `SELECT COUNT(*) as total FROM vw_expired_memberships ${whereClause}`;

      // For urgent renewals and recently expired, we need to combine WHERE clauses
      const urgentWhereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')} AND renewal_priority = 'Urgent (1 Week)'`
        : `WHERE renewal_priority = 'Urgent (1 Week)'`;
      const recentlyExpiredWhereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')} AND expiry_category = 'Recently Expired'`
        : `WHERE expiry_category = 'Recently Expired'`;

      const urgentRenewalsQuery = `SELECT COUNT(*) as total FROM vw_expiring_soon ${urgentWhereClause}`;
      const recentlyExpiredQuery = `SELECT COUNT(*) as total FROM vw_expired_memberships ${recentlyExpiredWhereClause}`;

      // For urgent and recently expired queries, we need to add the additional parameter
      const urgentParams = [...params];
      const recentlyExpiredParams = [...params];

      const [totalExpiringSoon, totalExpired, urgentRenewals, recentlyExpired] = await Promise.all([
        this.executePostgreSQLQuerySingle(totalExpiringSoonQuery, params),
        this.executePostgreSQLQuerySingle(totalExpiredQuery, params),
        this.executePostgreSQLQuerySingle(urgentRenewalsQuery, urgentParams),
        this.executePostgreSQLQuerySingle(recentlyExpiredQuery, recentlyExpiredParams)
      ]);

      return {
        expiring_soon_summary: expiringSoonSummary,
        expired_summary: expiredSummary,
        total_expiring_soon: totalExpiringSoon?.total || 0,
        total_expired: totalExpired?.total || 0,
        urgent_renewals: urgentRenewals?.total || 0,
        recently_expired: recentlyExpired?.total || 0
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch enhanced status overview', error);
    }
  }
  // Get comprehensive membership status overview for dashboard
  static async getStatusOverview(): Promise<{
    active_members: number;
    expiring_within_30_days: any[];
    expiring_within_7_days: any[];
    recently_expired: any[];
    inactive_members: any[];
    renewal_statistics: any;
  }> {
    try {
      // Get current date for calculations
      const currentDate = new Date();
      const date30DaysFromNow = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      const date7DaysFromNow = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
      const date30DaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      const date90DaysAgo = new Date(currentDate.getTime() - (90 * 24 * 60 * 60 * 1000));

      // Get total active members
      const activeCountQuery = `
        SELECT COUNT(*) as active_count
        FROM vw_member_details 
        WHERE membership_expiry_date > CURDATE()
      `;
      const activeResult = await executeQuerySingle<{ active_count: number }>(activeCountQuery);
      const activeMembers = activeResult?.active_count || 0;

      // Get members expiring within 30 days
      const expiring30Query = `
        SELECT
          member_id,
          firstname,
          surname,
          email,
          cell_number as phone_number,
          membership_expiry_date,
          DATEDIFF(membership_expiry_date, CURDATE()) as days_until_expiration
        FROM vw_member_details
        WHERE membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY membership_expiry_date ASC
        LIMIT 100
      `;
      const expiring30Days = await executeQuery<{
        member_id: string;
        firstname: string;
        surname: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        days_until_expiration: number;
      }>(expiring30Query);

      // Get members expiring within 7 days (urgent)
      const expiring7Query = `
        SELECT
          member_id,
          firstname,
          surname,
          email,
          cell_number as phone_number,
          membership_expiry_date,
          DATEDIFF(membership_expiry_date, CURDATE()) as days_until_expiration
        FROM vw_member_details
        WHERE membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY membership_expiry_date ASC
        LIMIT 50
      `;
      const expiring7Days = await executeQuery<{
        member_id: string;
        firstname: string;
        surname: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        days_until_expiration: number;
      }>(expiring7Query);

      // Get recently expired members (within last 30 days)
      const recentlyExpiredQuery = `
        SELECT
          member_id,
          firstname,
          surname,
          email,
          cell_number as phone_number,
          membership_expiry_date,
          ABS(DATEDIFF(CURDATE(), membership_expiry_date)) as days_since_expiration
        FROM vw_member_details
        WHERE membership_expiry_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND CURDATE()
        ORDER BY membership_expiry_date DESC
        LIMIT 100
      `;
      const recentlyExpired = await executeQuery<{
        member_id: string;
        firstname: string;
        surname: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        days_since_expiration: number;
      }>(recentlyExpiredQuery);

      // Get inactive members (no activity for 90+ days) - simplified version
      const inactiveMembersQuery = `
        SELECT
          member_id,
          firstname,
          surname,
          email,
          cell_number as phone_number,
          membership_expiry_date,
          created_at as last_activity_date,
          DATEDIFF(CURDATE(), created_at) as days_since_activity
        FROM vw_member_details
        WHERE created_at < DATE_SUB(CURDATE(), INTERVAL 90 DAY)
          AND membership_expiry_date > CURDATE()
        ORDER BY created_at ASC
        LIMIT 100
      `;
      const inactiveMembers = await executeQuery<{
        member_id: string;
        firstname: string;
        surname: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        last_activity_date: string;
        days_since_activity: number;
      }>(inactiveMembersQuery);

      // Get renewal statistics
      const renewalStatsQuery = `
        SELECT 
          COUNT(*) as total_renewals_last_30_days,
          AVG(DATEDIFF(membership_expiry_date, created_at)) as avg_membership_duration_days
        FROM vw_member_details 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `;
      const renewalStats = await executeQuerySingle<{
        total_renewals_last_30_days: number;
        avg_membership_duration_days: number;
      }>(renewalStatsQuery);

      return {
        active_members: activeMembers,
        expiring_within_30_days: expiring30Days,
        expiring_within_7_days: expiring7Days,
        recently_expired: recentlyExpired,
        inactive_members: inactiveMembers,
        renewal_statistics: {
          renewals_last_30_days: renewalStats?.total_renewals_last_30_days || 0,
          average_membership_duration: Math.round(renewalStats?.avg_membership_duration_days || 0),
          renewal_rate: recentlyExpired.length > 0 ? 
            ((renewalStats?.total_renewals_last_30_days || 0) / recentlyExpired.length * 100).toFixed(1) : '0'
        }
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch membership status overview', error);
    }
  }

  // Get detailed expiration report with pagination and filtering
  static async getExpirationReport(options: {
    status: string;
    page: number;
    limit: number;
    sort_by: string;
    sort_order: string;
  }): Promise<{
    members: any[];
    total_count: number;
    status_summary: any;
  }> {
    try {
      const { status, page, limit, sort_by, sort_order } = options;
      const offset = (page - 1) * limit;

      // Build WHERE clause based on status
      let whereClause = '';
      let statusDescription = '';
      
      switch (status) {
        case 'expiring_30':
          whereClause = 'WHERE membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
          statusDescription = 'Members expiring within 30 days';
          break;
        case 'expiring_7':
          whereClause = 'WHERE membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
          statusDescription = 'Members expiring within 7 days';
          break;
        case 'expired':
          whereClause = 'WHERE membership_expiry_date < CURDATE()';
          statusDescription = 'Expired members';
          break;
        case 'inactive':
          whereClause = 'WHERE created_at < DATE_SUB(CURDATE(), INTERVAL 90 DAY) AND membership_expiry_date > CURDATE()';
          statusDescription = 'Inactive members (90+ days)';
          break;
        default:
          whereClause = 'WHERE 1=1';
          statusDescription = 'All members';
      }

      // Build ORDER BY clause
      let orderByClause = '';
      switch (sort_by) {
        case 'member_name':
          orderByClause = `ORDER BY firstname ${sort_order.toUpperCase()}, surname ${sort_order.toUpperCase()}`;
          break;
        case 'days_until_expiration':
          orderByClause = `ORDER BY DATEDIFF(membership_expiry_date, CURDATE()) ${sort_order.toUpperCase()}`;
          break;
        default:
          orderByClause = `ORDER BY membership_expiry_date ${sort_order.toUpperCase()}`;
      }

      // Get members with expiration details
      const membersQuery = `
        SELECT
          member_id,
          firstname,
          surname,
          email,
          cell_number as phone_number,
          membership_expiry_date,
          created_at,
          province_name,
          CASE
            WHEN membership_expiry_date < CURDATE() THEN 'Expired'
            WHEN membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Urgent'
            WHEN membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Expiring Soon'
            ELSE 'Active'
          END as status,
          CASE
            WHEN membership_expiry_date < CURDATE() THEN ABS(DATEDIFF(CURDATE(), membership_expiry_date))
            ELSE DATEDIFF(membership_expiry_date, CURDATE())
          END as days_until_expiration,
          DATEDIFF(CURDATE(), created_at) as days_since_activity
        FROM vw_member_details
        ${whereClause}
        ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const members = await executeQuery<{
        member_id: string;
        firstname: string;
        surname: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        created_at: string;
        province_name: string;
        status: string;
        days_until_expiration: number;
        days_since_activity: number;
      }>(membersQuery);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM vw_member_details 
        ${whereClause}
      `;
      const countResult = await executeQuerySingle<{ total_count: number }>(countQuery);
      const totalCount = countResult?.total_count || 0;

      // Get status summary
      const statusSummary = {
        status_filter: status,
        status_description: statusDescription,
        total_records: totalCount,
        page_info: {
          current_page: page,
          records_per_page: limit,
          total_pages: Math.ceil(totalCount / limit)
        }
      };

      return {
        members,
        total_count: totalCount,
        status_summary: statusSummary
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch expiration report', error);
    }
  }

  // Bulk membership renewal
  static async bulkRenewal(options: {
    member_ids: string[];
    renewal_period_months: number;
    send_confirmation_sms: boolean;
  }): Promise<{
    successful_renewals: number;
    failed_renewals: number;
    renewal_details: any[];
  }> {
    try {
      const { member_ids, renewal_period_months, send_confirmation_sms } = options;
      
      // For now, return mock data since we don't have actual membership table
      const renewalDetails = member_ids.map(memberId => ({
        member_id: memberId,
        old_expiry_date: new Date().toISOString().split('T')[0],
        new_expiry_date: new Date(Date.now() + (renewal_period_months * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        renewal_status: 'success',
        sms_sent: send_confirmation_sms
      }));

      return {
        successful_renewals: member_ids.length,
        failed_renewals: 0,
        renewal_details: renewalDetails
      };
    } catch (error) {
      throw createDatabaseError('Failed to perform bulk renewal', error);
    }
  }

  // Get trends and analytics
  static async getTrendsAnalytics(options: {
    period: string;
    include_renewal_rates: boolean;
  }): Promise<{
    total_expirations: number;
    renewal_rate: string;
    trend_direction: string;
    expiration_patterns: any[];
    renewal_statistics: any;
  }> {
    try {
      const { period, include_renewal_rates } = options;
      
      // Calculate date range based on period
      let daysBack = 90;
      switch (period) {
        case 'last_30_days':
          daysBack = 30;
          break;
        case 'last_year':
          daysBack = 365;
          break;
        default:
          daysBack = 90;
      }

      // Get expiration trends
      const trendsQuery = `
        SELECT 
          DATE(membership_expiry_date) as expiry_date,
          COUNT(*) as expiration_count
        FROM vw_member_details 
        WHERE membership_expiry_date BETWEEN DATE_SUB(CURDATE(), INTERVAL ${daysBack} DAY) AND CURDATE()
        GROUP BY DATE(membership_expiry_date)
        ORDER BY expiry_date DESC
        LIMIT 30
      `;
      
      const expirationPatterns = await executeQuery<{
        expiry_date: string;
        expiration_count: number;
      }>(trendsQuery);

      const totalExpirations = expirationPatterns.reduce((sum: number, pattern: any) => sum + pattern.expiration_count, 0);
      
      // Mock renewal rate calculation
      const renewalRate = include_renewal_rates ? '75.5' : '0';
      const trendDirection = totalExpirations > 50 ? 'Increasing' : 'Stable';

      return {
        total_expirations: totalExpirations,
        renewal_rate: renewalRate,
        trend_direction: trendDirection,
        expiration_patterns: expirationPatterns,
        renewal_statistics: {
          period: period,
          analysis_date: new Date().toISOString().split('T')[0],
          average_daily_expirations: Math.round(totalExpirations / daysBack)
        }
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch trends analytics', error);
    }
  }

  // Update member activity
  static async updateMemberActivity(options: {
    member_id: string;
    activity_type: string;
    activity_date: Date;
  }): Promise<{
    member_id: string;
    activity_updated: boolean;
    last_activity_date: string;
  }> {
    try {
      const { member_id, activity_type, activity_date } = options;
      
      // For now, return mock data since we don't have actual activity tracking table
      return {
        member_id: member_id,
        activity_updated: true,
        last_activity_date: activity_date.toISOString().split('T')[0]
      };
    } catch (error) {
      throw createDatabaseError('Failed to update member activity', error);
    }
  }
}
