import { executeQuery, executeQuerySingle } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';

export interface LeaderboardEntry {
  user_id: number;
  full_name: string;
  email: string;
  province_code: string;
  province_name: string;
  new_registrations_count: number;
  registrations_approved: number;
  registrations_rejected: number;
  registrations_pending: number;
  renewals_processed: number;
  renewals_completed: number;
  renewal_revenue: number;
  total_members_managed: number;
  active_members_count: number;
  expired_members_count: number;
  total_actions_count: number;
  login_count: number;
  score: number;
}

export interface LeaderboardFilters {
  province_code?: string;
  date_from?: string;
  date_to?: string;
  metric_period?: 'daily' | 'weekly' | 'monthly';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
}

export class ProvincialAdminPerformanceService {

  /**
   * Get the provincial admin leaderboard with real-time aggregated metrics
   * Uses CTEs instead of LATERAL JOINs for performance on large tables
   */
  static async getLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardEntry[]> {
    try {
      const dateFrom = filters.date_from || new Date().toISOString().split('T')[0];
      const dateTo = filters.date_to || new Date().toISOString().split('T')[0];
      const limit = Math.min(filters.limit || 50, 100);

      const conditions: string[] = [`u.admin_level = 'province'`, `u.is_active = true`];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.province_code) {
        conditions.push(`u.province_code = $${paramIndex++}`);
        params.push(filters.province_code);
      }

      const whereClause = conditions.join(' AND ');

      // Add date params
      params.push(dateFrom, dateTo, limit);
      const dateFromIdx = paramIndex++;
      const dateToIdx = paramIndex++;
      const limitIdx = paramIndex++;

      const sortBy = filters.sort_by || 'score';
      const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';

      // Use CTEs to pre-aggregate data ONCE, then join - much faster than LATERAL JOINs
      // reg_metrics: Count from members_consolidated (bulk uploads insert here with created_at)
      // ren_metrics: Count from member_renewal_log matched by province_code (processed_by may be NULL for bulk uploads)
      const query = `
        WITH reg_metrics AS (
          SELECT
            u2.user_id,
            COUNT(*) as new_registrations_count,
            COUNT(*) as registrations_approved,
            0::bigint as registrations_rejected
          FROM members_consolidated mc
          INNER JOIN users u2 ON u2.province_code = mc.province_code AND u2.admin_level = 'province' AND u2.is_active = true
          WHERE mc.created_at::date BETWEEN $${dateFromIdx}::date AND $${dateToIdx}::date
          GROUP BY u2.user_id
        ),
        ren_metrics AS (
          SELECT
            u2.user_id,
            COUNT(*) as renewals_processed,
            COUNT(CASE WHEN mrl.payment_status = 'Completed' THEN 1 END) as renewals_completed,
            SUM(COALESCE(mrl.amount_paid, 0)) as renewal_revenue
          FROM member_renewal_log mrl
          INNER JOIN users u2 ON u2.province_code = mrl.province_code AND u2.admin_level = 'province' AND u2.is_active = true
          WHERE mrl.renewal_date::date BETWEEN $${dateFromIdx}::date AND $${dateToIdx}::date
          GROUP BY u2.user_id
        ),
        act_metrics AS (
          SELECT
            al2.user_id,
            COUNT(*) as total_actions_count,
            COUNT(CASE WHEN al2.action = 'login' THEN 1 END) as login_count
          FROM audit_logs al2
          WHERE al2.created_at::date BETWEEN $${dateFromIdx}::date AND $${dateToIdx}::date
          GROUP BY al2.user_id
        )
        SELECT
          u.user_id,
          COALESCE(u.name, u.email) as full_name,
          u.email,
          COALESCE(u.province_code, '') as province_code,
          COALESCE(p.province_name, '') as province_name,
          COALESCE(reg.registrations_approved, 0) as registrations_approved,
          COALESCE(reg.registrations_rejected, 0) as registrations_rejected,
          COALESCE(reg.new_registrations_count, 0) as new_registrations_count,
          0 as registrations_pending,
          COALESCE(ren.renewals_processed, 0) as renewals_processed,
          COALESCE(ren.renewals_completed, 0) as renewals_completed,
          COALESCE(ren.renewal_revenue, 0) as renewal_revenue,
          0 as total_members_managed,
          0 as active_members_count,
          0 as expired_members_count,
          COALESCE(act.total_actions_count, 0) as total_actions_count,
          COALESCE(act.login_count, 0) as login_count,
          (
            COALESCE(reg.registrations_approved, 0) * 3 +
            COALESCE(ren.renewals_completed, 0) * 5 +
            COALESCE(act.total_actions_count, 0) * 1 +
            COALESCE(act.login_count, 0) * 2
          ) as score
        FROM users u
        LEFT JOIN provinces p ON u.province_code = p.province_code
        LEFT JOIN reg_metrics reg ON reg.user_id = u.user_id
        LEFT JOIN ren_metrics ren ON ren.user_id = u.user_id
        LEFT JOIN act_metrics act ON act.user_id = u.user_id
        WHERE ${whereClause}
        ORDER BY ${sortBy === 'score' ? 'score' : 'total_actions_count'} ${sortOrder}
        LIMIT $${limitIdx}
      `;

      return await executeQuery<LeaderboardEntry>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get admin leaderboard', error);
    }
  }

  /**
   * Get performance details for a specific admin user
   * Supports period parameter: 'hourly', 'daily', 'weekly', 'monthly'
   */
  static async getAdminPerformance(userId: number, dateFrom?: string, dateTo?: string, period?: string): Promise<any> {
    try {
      const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = dateTo || new Date().toISOString().split('T')[0];

      const userInfo = await executeQuerySingle<any>(
        `SELECT u.user_id, u.name as full_name, u.email, u.admin_level, u.province_code,
                COALESCE(p.province_name, '') as province_name
         FROM users u
         LEFT JOIN provinces p ON u.province_code = p.province_code
         WHERE u.user_id = $1`,
        [userId]
      );

      if (!userInfo) {
        return null;
      }

      // If period is specified, return detailed period-based data with rank tracking
      if (period && ['hourly', 'daily', 'weekly', 'monthly'].includes(period)) {
        return await this.getAdminPerformanceByPeriod(userId, userInfo, period, from, to);
      }

      const dailyActions = await executeQuery<any>(
        `SELECT
          al.created_at::date as action_date,
          COUNT(*) as total_actions,
          COUNT(CASE WHEN al.action = 'login' THEN 1 END) as logins,
          COUNT(CASE WHEN al.entity_type = 'membership_application' AND al.action IN ('approve', 'create') THEN 1 END) as registrations,
          COUNT(CASE WHEN al.entity_type = 'member' AND al.action = 'update' THEN 1 END) as member_updates
        FROM audit_logs al
        WHERE al.user_id = $1
          AND al.created_at::date BETWEEN $2::date AND $3::date
        GROUP BY al.created_at::date
        ORDER BY action_date DESC`,
        [userId, from, to]
      );

      const renewalStats = await executeQuerySingle<any>(
        `SELECT
          COUNT(*) as total_renewals_processed,
          COUNT(CASE WHEN payment_status = 'Completed' THEN 1 END) as completed,
          COUNT(CASE WHEN payment_status != 'Completed' THEN 1 END) as failed,
          SUM(COALESCE(amount_paid, 0)) as total_revenue
        FROM member_renewal_log
        WHERE processed_by = $1
          AND renewal_date::date BETWEEN $2::date AND $3::date`,
        [userId, from, to]
      );

      return {
        user: userInfo,
        period: { from, to },
        daily_actions: dailyActions,
        renewal_stats: renewalStats || { total_renewals_processed: 0, completed: 0, failed: 0, total_revenue: 0 }
      };
    } catch (error) {
      throw createDatabaseError('Failed to get admin performance', error);
    }
  }

  /**
   * Get detailed period-based performance data with rank tracking
   */
  private static async getAdminPerformanceByPeriod(
    userId: number,
    userInfo: any,
    period: string,
    _dateFrom: string,
    _dateTo: string
  ): Promise<any> {
    // Determine date ranges and grouping based on period
    let currentFrom: string;
    let currentTo: string;
    let previousFrom: string;
    let previousTo: string;
    let truncExpr: string;
    let intervalLabel: string;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    switch (period) {
      case 'hourly':
        currentFrom = todayStr;
        currentTo = todayStr;
        // Previous period = yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        previousFrom = yesterday.toISOString().split('T')[0];
        previousTo = previousFrom;
        truncExpr = `date_trunc('hour', al.created_at)`;
        intervalLabel = 'hour';
        break;
      case 'daily':
        // Last 7 days
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        currentFrom = sevenDaysAgo.toISOString().split('T')[0];
        currentTo = todayStr;
        // Previous 7 days
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        previousFrom = fourteenDaysAgo.toISOString().split('T')[0];
        const eightDaysAgo = new Date(now);
        eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
        previousTo = eightDaysAgo.toISOString().split('T')[0];
        truncExpr = `al.created_at::date`;
        intervalLabel = 'day';
        break;
      case 'weekly':
        // Last 4 weeks
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        currentFrom = fourWeeksAgo.toISOString().split('T')[0];
        currentTo = todayStr;
        // Previous 4 weeks
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        previousFrom = eightWeeksAgo.toISOString().split('T')[0];
        const fiveWeeksAgo = new Date(now);
        fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 29);
        previousTo = fiveWeeksAgo.toISOString().split('T')[0];
        truncExpr = `date_trunc('week', al.created_at)`;
        intervalLabel = 'week';
        break;
      case 'monthly':
      default:
        // Last 6 months
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        currentFrom = sixMonthsAgo.toISOString().split('T')[0];
        currentTo = todayStr;
        // Previous 6 months
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        previousFrom = twelveMonthsAgo.toISOString().split('T')[0];
        const sevenMonthsAgo = new Date(now);
        sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
        previousTo = sevenMonthsAgo.toISOString().split('T')[0];
        truncExpr = `date_trunc('month', al.created_at)`;
        intervalLabel = 'month';
        break;
    }

    // 1. Get time-series metrics for this admin (actions from audit_logs)
    const timeSeriesQuery = `
      SELECT
        ${truncExpr} as period_start,
        0::bigint as registrations,
        COUNT(CASE WHEN al.action = 'login' THEN 1 END) as logins,
        COUNT(*) as total_actions,
        (COUNT(*) * 1 +
         COUNT(CASE WHEN al.action = 'login' THEN 1 END) * 2) as score
      FROM audit_logs al
      WHERE al.user_id = $1
        AND al.created_at::date BETWEEN $2::date AND $3::date
      GROUP BY ${truncExpr}
      ORDER BY period_start ASC
    `;
    const timeSeries = await executeQuery<any>(timeSeriesQuery, [userId, currentFrom, currentTo]);

    // Also get renewal counts per period (matched by province_code via user lookup)
    const renewalTruncExpr = truncExpr.replace(/al\./g, 'mrl.');
    const renewalTimeSeriesQuery = `
      SELECT
        ${renewalTruncExpr.replace('al.created_at', 'mrl.renewal_date')} as period_start,
        COUNT(*) as renewals,
        COUNT(CASE WHEN mrl.payment_status = 'Completed' THEN 1 END) as renewals_completed,
        SUM(COALESCE(mrl.amount_paid, 0)) as revenue
      FROM member_renewal_log mrl
      INNER JOIN users u_ren ON u_ren.province_code = mrl.province_code AND u_ren.user_id = $1
      WHERE mrl.renewal_date::date BETWEEN $2::date AND $3::date
      GROUP BY ${renewalTruncExpr.replace('al.created_at', 'mrl.renewal_date')}
      ORDER BY period_start ASC
    `;
    const renewalTimeSeries = await executeQuery<any>(renewalTimeSeriesQuery, [userId, currentFrom, currentTo]);

    // Merge audit and renewal time series
    const mergedMap = new Map<string, any>();
    for (const row of timeSeries) {
      const key = new Date(row.period_start).toISOString();
      mergedMap.set(key, {
        period_start: row.period_start,
        registrations: parseInt(row.registrations) || 0,
        renewals: 0,
        logins: parseInt(row.logins) || 0,
        total_actions: parseInt(row.total_actions) || 0,
        score: parseInt(row.score) || 0,
      });
    }
    for (const row of renewalTimeSeries) {
      const key = new Date(row.period_start).toISOString();
      if (mergedMap.has(key)) {
        mergedMap.get(key).renewals = parseInt(row.renewals_completed) || 0;
        mergedMap.get(key).score += (parseInt(row.renewals_completed) || 0) * 5;
      } else {
        mergedMap.set(key, {
          period_start: row.period_start,
          registrations: 0,
          renewals: parseInt(row.renewals_completed) || 0,
          logins: 0,
          total_actions: 0,
          score: (parseInt(row.renewals_completed) || 0) * 5,
        });
      }
    }
    const mergedTimeSeries = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
    );

    // 2. Compute current rank among all provincial admins
    const currentRankData = await this.computeRankForAdmin(userId, currentFrom, currentTo);
    // 3. Compute previous rank
    const previousRankData = await this.computeRankForAdmin(userId, previousFrom, previousTo);

    // 4. Summary totals for current period
    // Actions & logins from audit_logs
    const summaryQuery = await executeQuerySingle<any>(
      `SELECT
        COUNT(CASE WHEN al.action = 'login' THEN 1 END) as logins,
        COUNT(*) as total_actions
      FROM audit_logs al
      WHERE al.user_id = $1
        AND al.created_at::date BETWEEN $2::date AND $3::date`,
      [userId, currentFrom, currentTo]
    );

    // Registrations from members_consolidated (bulk uploads create rows here)
    const regSummary = await executeQuerySingle<any>(
      `SELECT COUNT(*) as registrations
       FROM members_consolidated mc
       INNER JOIN users u_reg ON u_reg.province_code = mc.province_code AND u_reg.user_id = $1
       WHERE mc.created_at::date BETWEEN $2::date AND $3::date`,
      [userId, currentFrom, currentTo]
    );

    // Renewals from member_renewal_log (matched by province_code)
    const renewalSummary = await executeQuerySingle<any>(
      `SELECT
        COUNT(CASE WHEN payment_status = 'Completed' THEN 1 END) as renewals_completed,
        SUM(COALESCE(amount_paid, 0)) as total_revenue
      FROM member_renewal_log mrl
      INNER JOIN users u_ren ON u_ren.province_code = mrl.province_code AND u_ren.user_id = $1
      WHERE mrl.renewal_date::date BETWEEN $2::date AND $3::date`,
      [userId, currentFrom, currentTo]
    );

    const totalRegistrations = parseInt(regSummary?.registrations) || 0;
    const totalScore = totalRegistrations * 3 +
      (parseInt(renewalSummary?.renewals_completed) || 0) * 5 +
      (parseInt(summaryQuery?.total_actions) || 0) * 1 +
      (parseInt(summaryQuery?.logins) || 0) * 2;

    return {
      user: userInfo,
      period: {
        type: period,
        label: intervalLabel,
        current: { from: currentFrom, to: currentTo },
        previous: { from: previousFrom, to: previousTo },
      },
      rank: {
        current: currentRankData.rank,
        previous: previousRankData.rank,
        total_admins: currentRankData.total,
        movement: previousRankData.rank === 0 ? 0 : previousRankData.rank - currentRankData.rank,
      },
      summary: {
        registrations: totalRegistrations,
        renewals: parseInt(renewalSummary?.renewals_completed) || 0,
        logins: parseInt(summaryQuery?.logins) || 0,
        total_actions: parseInt(summaryQuery?.total_actions) || 0,
        score: totalScore,
        revenue: parseFloat(renewalSummary?.total_revenue) || 0,
      },
      time_series: mergedTimeSeries,
    };
  }

  /**
   * Compute rank position for a specific admin among all provincial admins for a date range
   */
  private static async computeRankForAdmin(
    userId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<{ rank: number; total: number }> {
    try {
      const rows = await executeQuery<any>(
        `SELECT
          u.user_id,
          (
            COALESCE(reg.approved, 0) * 3 +
            COALESCE(ren.completed, 0) * 5 +
            COALESCE(act.total_actions, 0) * 1 +
            COALESCE(act.logins, 0) * 2
          ) as score
        FROM users u
        LEFT JOIN (
          SELECT u2.user_id, COUNT(*) as approved
          FROM members_consolidated mc
          INNER JOIN users u2 ON u2.province_code = mc.province_code AND u2.admin_level = 'province' AND u2.is_active = true
          WHERE mc.created_at::date BETWEEN $1::date AND $2::date
          GROUP BY u2.user_id
        ) reg ON reg.user_id = u.user_id
        LEFT JOIN (
          SELECT u2.user_id,
            COUNT(CASE WHEN mrl.payment_status = 'Completed' THEN 1 END) as completed
          FROM member_renewal_log mrl
          INNER JOIN users u2 ON u2.province_code = mrl.province_code AND u2.admin_level = 'province' AND u2.is_active = true
          WHERE mrl.renewal_date::date BETWEEN $1::date AND $2::date
          GROUP BY u2.user_id
        ) ren ON ren.user_id = u.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_actions,
            COUNT(CASE WHEN action = 'login' THEN 1 END) as logins
          FROM audit_logs WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY user_id
        ) act ON act.user_id = u.user_id
        WHERE u.admin_level = 'province' AND u.is_active = true
        ORDER BY score DESC`,
        [dateFrom, dateTo]
      );

      const total = rows.length;
      const rankIndex = rows.findIndex((r: any) => r.user_id === userId);
      const rank = rankIndex >= 0 ? rankIndex + 1 : 0;

      return { rank, total };
    } catch {
      return { rank: 0, total: 0 };
    }
  }


  /**
   * Aggregate daily metrics and store in the performance metrics table
   */
  static async aggregateDailyMetrics(targetDate?: string): Promise<{ aggregated: number }> {
    try {
      const date = targetDate || new Date().toISOString().split('T')[0];
      const admins = await executeQuery<any>(
        `SELECT user_id, province_code, name as full_name
         FROM users WHERE admin_level = 'province' AND is_active = true`
      );

      let aggregated = 0;
      for (const admin of admins) {
        const province = await executeQuerySingle<any>(
          `SELECT province_name FROM provinces WHERE province_code = $1`,
          [admin.province_code]
        );
        const regMetrics = await executeQuerySingle<any>(
          `SELECT
            COUNT(*) as approved,
            0::bigint as rejected,
            COUNT(*) as total_reg
          FROM members_consolidated WHERE province_code = $1 AND created_at::date = $2::date`,
          [admin.province_code, date]
        );
        const renMetrics = await executeQuerySingle<any>(
          `SELECT COUNT(*) as processed, COUNT(CASE WHEN payment_status = 'Completed' THEN 1 END) as completed,
            COUNT(CASE WHEN payment_status != 'Completed' THEN 1 END) as failed,
            SUM(COALESCE(amount_paid, 0)) as revenue
          FROM member_renewal_log WHERE province_code = $1 AND renewal_date::date = $2::date`,
          [admin.province_code, date]
        );
        const memCounts = await executeQuerySingle<any>(
          `SELECT COUNT(*) as total,
            COUNT(CASE WHEN membership_status_id = 1 THEN 1 END) as active,
            COUNT(CASE WHEN membership_status_id != 1 THEN 1 END) as expired
          FROM members_consolidated WHERE province_code = $1`,
          [admin.province_code]
        );
        const actMetrics = await executeQuerySingle<any>(
          `SELECT COUNT(*) as total_actions, COUNT(CASE WHEN action = 'login' THEN 1 END) as logins
          FROM audit_logs WHERE user_id = $1 AND created_at::date = $2::date`,
          [admin.user_id, date]
        );

        await executeQuery(
          `INSERT INTO provincial_admin_performance_metrics (
            user_id, province_code, province_name, metric_date, metric_period,
            new_registrations_count, registrations_approved, registrations_rejected,
            renewals_processed, renewals_completed, renewals_failed, renewal_revenue,
            total_members_managed, active_members_count, expired_members_count,
            total_actions_count, login_count
          ) VALUES ($1,$2,$3,$4,'daily',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          ON CONFLICT (user_id, metric_date, metric_period) DO UPDATE SET
            new_registrations_count = EXCLUDED.new_registrations_count,
            registrations_approved = EXCLUDED.registrations_approved,
            registrations_rejected = EXCLUDED.registrations_rejected,
            renewals_processed = EXCLUDED.renewals_processed,
            renewals_completed = EXCLUDED.renewals_completed,
            renewals_failed = EXCLUDED.renewals_failed,
            renewal_revenue = EXCLUDED.renewal_revenue,
            total_members_managed = EXCLUDED.total_members_managed,
            active_members_count = EXCLUDED.active_members_count,
            expired_members_count = EXCLUDED.expired_members_count,
            total_actions_count = EXCLUDED.total_actions_count,
            login_count = EXCLUDED.login_count,
            updated_at = CURRENT_TIMESTAMP`,
          [
            admin.user_id, admin.province_code, province?.province_name || '', date,
            regMetrics?.total_reg || 0, regMetrics?.approved || 0, regMetrics?.rejected || 0,
            renMetrics?.processed || 0, renMetrics?.completed || 0, renMetrics?.failed || 0,
            renMetrics?.revenue || 0, memCounts?.total || 0, memCounts?.active || 0,
            memCounts?.expired || 0, actMetrics?.total_actions || 0, actMetrics?.logins || 0
          ]
        );
        aggregated++;
      }
      return { aggregated };
    } catch (error) {
      throw createDatabaseError('Failed to aggregate daily metrics', error);
    }
  }

  /**
   * Get historical performance metrics from the cached table
   */
  static async getHistoricalMetrics(filters: {
    user_id?: number;
    province_code?: string;
    metric_period?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<any[]> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.user_id) {
        conditions.push(`pm.user_id = $${paramIndex++}`);
        params.push(filters.user_id);
      }
      if (filters.province_code) {
        conditions.push(`pm.province_code = $${paramIndex++}`);
        params.push(filters.province_code);
      }
      if (filters.metric_period) {
        conditions.push(`pm.metric_period = $${paramIndex++}`);
        params.push(filters.metric_period);
      }
      if (filters.date_from) {
        conditions.push(`pm.metric_date >= $${paramIndex++}::date`);
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        conditions.push(`pm.metric_date <= $${paramIndex++}::date`);
        params.push(filters.date_to);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      return await executeQuery(
        `SELECT pm.*, u.name as full_name, u.email
         FROM provincial_admin_performance_metrics pm
         LEFT JOIN users u ON pm.user_id = u.user_id
         ${whereClause}
         ORDER BY pm.metric_date DESC, pm.province_code`,
        params
      );
    } catch (error) {
      throw createDatabaseError('Failed to get historical metrics', error);
    }
  }
}
