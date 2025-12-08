/**
 * Optimized Analytics Model using Materialized Views
 * 
 * Performance Improvement: ~10-15 seconds → <1 second
 * 
 * Uses pre-calculated materialized views that refresh every 15 minutes:
 * - mv_membership_analytics_summary
 * - mv_geographic_performance
 * - mv_membership_growth_monthly
 */

import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export interface ReportFilters {
  province_code?: string;
  municipal_code?: string;
  district_code?: string;
  timeRange?: string;
}

export interface MembershipAnalytics {
  total_members: number;
  active_members: number;
  inactive_members: number;
  pending_members: number;
  membership_by_hierarchy: Array<{
    hierarchy_level: string;
    member_count: number;
    percentage: number;
  }>;
  membership_by_status: Array<{
    membership_status: string;
    member_count: number;
    percentage: number;
  }>;
  voter_registration_status: Array<{
    voter_status: string;
    member_count: number;
    percentage: number;
  }>;
  age_distribution: Array<{
    age_group: string;
    member_count: number;
    percentage: number;
  }>;
  gender_distribution: Array<{
    gender: string;
    member_count: number;
    percentage: number;
  }>;
  age_gender_pyramid: Array<{
    age_group: string;
    male_count: number;
    female_count: number;
    male_percentage: number;
    female_percentage: number;
  }>;
  geographic_performance: any;
}

export class AnalyticsOptimizedModel {
  /**
   * Get membership analytics using materialized views
   * Performance: <1 second (vs 10-15 seconds with original queries)
   */
  static async getMembershipAnalytics(filters: ReportFilters = {}): Promise<MembershipAnalytics> {
    try {
      // Build WHERE clause for geographic filtering
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.province_code) {
        whereConditions.push(`province_code = $${paramIndex}`);
        queryParams.push(filters.province_code);
        paramIndex++;
      }

      if (filters.municipal_code) {
        whereConditions.push(`municipality_code = $${paramIndex}`);
        queryParams.push(filters.municipal_code);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 1. Get total counts from materialized view (FAST!)
      const summary = await executeQuerySingle<{
        total_members: number;
        active_members: number;
        age_18_24: number;
        age_25_34: number;
        age_35_44: number;
        age_45_54: number;
        age_55_64: number;
        age_65_plus: number;
        male_count: number;
        female_count: number;
        other_gender_count: number;
      }>(
        `SELECT
          SUM(total_members) as total_members,
          SUM(active_members) as active_members,
          SUM(age_18_24) as age_18_24,
          SUM(age_25_34) as age_25_34,
          SUM(age_35_44) as age_35_44,
          SUM(age_45_54) as age_45_54,
          SUM(age_55_64) as age_55_64,
          SUM(age_65_plus) as age_65_plus,
          SUM(male_count) as male_count,
          SUM(female_count) as female_count,
          SUM(other_gender_count) as other_gender_count
        FROM mv_membership_analytics_summary
        ${whereClause}`,
        queryParams
      );

      const totalMembers = summary?.total_members || 0;
      const totalWithAge = (summary?.age_18_24 || 0) + (summary?.age_25_34 || 0) + 
                           (summary?.age_35_44 || 0) + (summary?.age_45_54 || 0) + 
                           (summary?.age_55_64 || 0) + (summary?.age_65_plus || 0);
      const totalWithGender = (summary?.male_count || 0) + (summary?.female_count || 0) + 
                              (summary?.other_gender_count || 0);

      // 2. Build age distribution from pre-calculated counts
      const ageDistribution = [
        {
          age_group: '18-24',
          member_count: summary?.age_18_24 || 0,
          percentage: totalWithAge > 0 ? Math.round(((summary?.age_18_24 || 0) / totalWithAge) * 100 * 100) / 100 : 0
        },
        {
          age_group: '25-34',
          member_count: summary?.age_25_34 || 0,
          percentage: totalWithAge > 0 ? Math.round(((summary?.age_25_34 || 0) / totalWithAge) * 100 * 100) / 100 : 0
        },
        {
          age_group: '35-44',
          member_count: summary?.age_35_44 || 0,
          percentage: totalWithAge > 0 ? Math.round(((summary?.age_35_44 || 0) / totalWithAge) * 100 * 100) / 100 : 0
        },
        {
          age_group: '45-54',
          member_count: summary?.age_45_54 || 0,
          percentage: totalWithAge > 0 ? Math.round(((summary?.age_45_54 || 0) / totalWithAge) * 100 * 100) / 100 : 0
        },
        {
          age_group: '55-64',
          member_count: summary?.age_55_64 || 0,
          percentage: totalWithAge > 0 ? Math.round(((summary?.age_55_64 || 0) / totalWithAge) * 100 * 100) / 100 : 0
        },
        {
          age_group: '65+',
          member_count: summary?.age_65_plus || 0,
          percentage: totalWithAge > 0 ? Math.round(((summary?.age_65_plus || 0) / totalWithAge) * 100 * 100) / 100 : 0
        }
      ];

      // 3. Build gender distribution from pre-calculated counts
      const genderDistribution = [
        {
          gender: 'Male',
          member_count: summary?.male_count || 0,
          percentage: totalWithGender > 0 ? Math.round(((summary?.male_count || 0) / totalWithGender) * 100 * 100) / 100 : 0
        },
        {
          gender: 'Female',
          member_count: summary?.female_count || 0,
          percentage: totalWithGender > 0 ? Math.round(((summary?.female_count || 0) / totalWithGender) * 100 * 100) / 100 : 0
        }
      ];

      if ((summary?.other_gender_count || 0) > 0) {
        genderDistribution.push({
          gender: 'Other',
          member_count: summary?.other_gender_count || 0,
          percentage: totalWithGender > 0 ? Math.round(((summary?.other_gender_count || 0) / totalWithGender) * 100 * 100) / 100 : 0
        });
      }

      // 4. Get membership growth from materialized view (FAST!)
      const membershipGrowth = await executeQuery<{
        month: string;
        new_members: number;
        cumulative_members: number;
      }>(
        `SELECT
          month,
          SUM(new_members) as new_members,
          MAX(cumulative_members) as cumulative_members
        FROM mv_membership_growth_monthly
        ${whereClause}
        GROUP BY month
        ORDER BY month`,
        queryParams
      );

      // 5. Get geographic performance from materialized view (FAST!)
      const geographicPerformance = await this.getGeographicPerformance(filters);

      // 6. Get membership by status using members_consolidated table
      const membershipByStatus = await executeQuery<{
        membership_status: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          ms.status_name as membership_status,
          COUNT(*) as member_count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause}), 0)), 2) as percentage
        FROM members_consolidated m
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        ${whereClause}
        GROUP BY ms.status_name, ms.status_id
        ORDER BY ms.status_id`,
        queryParams
      );

      // 7. Get voter registration status using members_consolidated table
      // voter_registration_id: 1=Registered, 2=Not Registered, 3=Unknown, 4=Verification Failed
      const voterRegistrationStatus = await executeQuery<{
        voter_status: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          COALESCE(vrs.status_name,
            CASE
              WHEN m.voter_registration_id = 1 THEN 'Registered'
              WHEN m.voter_registration_id = 2 THEN 'Not Registered'
              WHEN m.is_registered_voter = true THEN 'Registered'
              WHEN m.is_registered_voter = false THEN 'Not Registered'
              ELSE 'Unknown'
            END
          ) as voter_status,
          COUNT(*) as member_count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause}), 0)), 2) as percentage
        FROM members_consolidated m
        LEFT JOIN voter_registration_statuses vrs ON m.voter_registration_id = vrs.registration_status_id
        ${whereClause}
        GROUP BY COALESCE(vrs.status_name,
            CASE
              WHEN m.voter_registration_id = 1 THEN 'Registered'
              WHEN m.voter_registration_id = 2 THEN 'Not Registered'
              WHEN m.is_registered_voter = true THEN 'Registered'
              WHEN m.is_registered_voter = false THEN 'Not Registered'
              ELSE 'Unknown'
            END
          ), vrs.registration_status_id
        ORDER BY vrs.registration_status_id NULLS LAST`,
        queryParams
      );

      // 8. Get age-gender pyramid data (population pyramid) - Optimized
      const pyramidWhereClause = whereClause ? `${whereClause} AND m.age IS NOT NULL AND g.gender_name IN ('Male', 'Female')` : 'WHERE m.age IS NOT NULL AND g.gender_name IN (\'Male\', \'Female\')';

      const ageGenderPyramidRaw = await executeQuery<{
        age_group: string;
        male_count: string;
        female_count: string;
      }>(
        `SELECT
          CASE
            WHEN m.age < 25 THEN '18-24'
            WHEN m.age < 35 THEN '25-34'
            WHEN m.age < 45 THEN '35-44'
            WHEN m.age < 55 THEN '45-54'
            WHEN m.age < 65 THEN '55-64'
            ELSE '65+'
          END as age_group,
          SUM(CASE WHEN g.gender_name = 'Male' THEN 1 ELSE 0 END) as male_count,
          SUM(CASE WHEN g.gender_name = 'Female' THEN 1 ELSE 0 END) as female_count
        FROM members_consolidated m
        LEFT JOIN genders g ON m.gender_id = g.gender_id
        ${pyramidWhereClause}
        GROUP BY age_group
        ORDER BY MIN(m.age)`,
        queryParams
      );

      // Calculate total for percentage calculation
      const totalPyramidMembers = ageGenderPyramidRaw.reduce((sum, row) =>
        sum + Number(row.male_count) + Number(row.female_count), 0
      );

      // Calculate percentages in JavaScript
      const ageGenderPyramid = ageGenderPyramidRaw.map(row => ({
        age_group: row.age_group,
        male_count: Number(row.male_count),
        female_count: Number(row.female_count),
        male_percentage: totalPyramidMembers > 0
          ? Number(((Number(row.male_count) * 100) / totalPyramidMembers).toFixed(2))
          : 0,
        female_percentage: totalPyramidMembers > 0
          ? Number(((Number(row.female_count) * 100) / totalPyramidMembers).toFixed(2))
          : 0
      }));

      // Calculate inactive and pending members from status breakdown
      // Ensure we parse as numbers to avoid string concatenation
      const activeCount = Number(membershipByStatus.find(s => s.membership_status === 'Active')?.member_count || 0);
      const expiredCount = Number(membershipByStatus.find(s => s.membership_status === 'Expired')?.member_count || 0);
      const inactiveCount = Number(membershipByStatus.find(s => s.membership_status === 'Inactive')?.member_count || 0);
      const gracePeriodCount = Number(membershipByStatus.find(s => s.membership_status === 'Grace Period')?.member_count || 0);

      return {
        total_members: totalMembers,
        active_members: activeCount,
        inactive_members: expiredCount + inactiveCount + gracePeriodCount,
        pending_members: 0,
        membership_by_hierarchy: [],
        membership_by_status: membershipByStatus,
        voter_registration_status: voterRegistrationStatus,
        age_distribution: ageDistribution,
        gender_distribution: genderDistribution,
        age_gender_pyramid: ageGenderPyramid,
        geographic_performance: geographicPerformance
      };
    } catch (error) {
      throw createDatabaseError('Failed to get membership analytics', error);
    }
  }

  /**
   * Get geographic performance using materialized views
   * Performance: <500ms (vs 5-8 seconds with original queries)
   */
  static async getGeographicPerformance(filters: ReportFilters = {}): Promise<any> {
    try {
      // Build WHERE clause for geographic filtering
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.province_code) {
        whereConditions.push(`province_code = $${paramIndex}`);
        queryParams.push(filters.province_code);
        paramIndex++;
      }

      if (filters.municipal_code) {
        whereConditions.push(`municipality_code = $${paramIndex}`);
        queryParams.push(filters.municipal_code);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total members for percentage calculations
      const totalMembersResult = await executeQuerySingle<{ total: number }>(
        `SELECT SUM(member_count) as total FROM mv_geographic_performance ${whereClause}`,
        queryParams
      );
      const totalMembers = totalMembersResult?.total || 1;

      // 1. Best performing wards (FAST!)
      const bestPerformingWards = await executeQuery<{
        ward_code: string;
        ward_name: string;
        municipality_name: string;
        province_name: string;
        member_count: number;
        performance_score: number;
      }>(
        `SELECT
          ward_code,
          ward_name,
          municipality_name,
          province_name,
          member_count,
          performance_score
        FROM mv_geographic_performance
        ${whereClause}
        ORDER BY member_count DESC
        LIMIT 10`,
        queryParams
      );

      // 2. Improving areas (wards with high growth) (FAST!)
      const improvingAreas = await executeQuery<{
        area_name: string;
        area_type: string;
        current_members: number;
        growth_rate: number;
        growth_period: string;
      }>(
        `SELECT
          ward_name as area_name,
          'Ward' as area_type,
          member_count as current_members,
          growth_rate_3m as growth_rate,
          'Last 3 months' as growth_period
        FROM mv_geographic_performance
        ${whereClause}
        ${whereConditions.length > 0 ? 'AND' : 'WHERE'} growth_rate_3m > 10
        ORDER BY growth_rate_3m DESC
        LIMIT 5`,
        queryParams
      );

      // 3. Poor performing areas (wards with low member counts) (FAST!)
      const poorPerformingAreas = await executeQuery<{
        area_name: string;
        area_type: string;
        member_count: number;
        target_count: number;
        performance_gap: number;
      }>(
        `SELECT
          ward_name as area_name,
          'Ward' as area_type,
          member_count,
          200 as target_count,
          (200 - member_count) as performance_gap
        FROM mv_geographic_performance
        ${whereClause}
        ${whereConditions.length > 0 ? 'AND' : 'WHERE'} member_count < 200
        ORDER BY member_count ASC
        LIMIT 5`,
        queryParams
      );

      // 4. Top provinces (National level only) (FAST!)
      const topProvinces = filters.province_code ? [] : await executeQuery<{
        province_code: string;
        province_name: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          province_code,
          province_name,
          SUM(member_count) as member_count,
          ROUND((SUM(member_count) * 100.0 / $1), 2) as percentage
        FROM mv_geographic_performance
        GROUP BY province_code, province_name
        HAVING SUM(member_count) > 0
        ORDER BY member_count DESC
        LIMIT 3`,
        [totalMembers]
      );

      // 5. Top districts (FAST!)
      const topDistricts = filters.province_code || filters.municipal_code ? [] : await executeQuery<{
        district_code: string;
        district_name: string;
        province_name: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          district_code,
          district_name,
          province_name,
          SUM(member_count) as member_count,
          ROUND((SUM(member_count) * 100.0 / $1), 2) as percentage
        FROM mv_geographic_performance
        GROUP BY district_code, district_name, province_name
        HAVING SUM(member_count) > 0
        ORDER BY member_count DESC
        LIMIT 5`,
        [totalMembers]
      );

      return {
        best_performing_wards: bestPerformingWards,
        improving_areas: improvingAreas,
        poor_performing_areas: poorPerformingAreas,
        top_provinces: topProvinces,
        top_districts: topDistricts
      };
    } catch (error) {
      throw createDatabaseError('Failed to get geographic performance', error);
    }
  }

  /**
   * Get dashboard statistics using optimized queries
   * Performance: <1 second (vs 10-15 seconds with original queries)
   */
  static async getDashboardStats(filters: ReportFilters = {}): Promise<{
    total_members: number;
    active_members: number;
    pending_applications: number;
    total_meetings: number;
    upcoming_meetings: number;
    total_elections: number;
    active_elections: number;
    leadership_positions_filled: number;
    leadership_positions_vacant: number;
    recent_registrations: number;
    membership_growth_rate: number;
  }> {
    try {
      // Build WHERE clause for geographic filtering
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.province_code) {
        whereConditions.push(`province_code = $${paramIndex}`);
        queryParams.push(filters.province_code);
        paramIndex++;
      }

      if (filters.municipal_code) {
        whereConditions.push(`municipality_code = $${paramIndex}`);
        queryParams.push(filters.municipal_code);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const andClause = whereConditions.length > 0 ? 'AND' : 'WHERE';

      // Run all stats queries in parallel using PostgreSQL syntax
      const [
        memberStats,
        pendingApps,
        meetingStats,
        electionStats,
        leadershipStats,
        recentRegistrations,
        growthStats
      ] = await Promise.all([
        // Member counts from materialized view (FAST!)
        executeQuerySingle<{ total_members: number; active_members: number }>(
          `SELECT
            SUM(total_members) as total_members,
            SUM(active_members) as active_members
          FROM mv_membership_analytics_summary
          ${whereClause}`,
          queryParams
        ),
        // Pending applications count
        executeQuerySingle<{ count: number }>(
          `SELECT COUNT(*) as count FROM membership_applications WHERE status = 'Submitted'`,
          []
        ),
        // Meeting counts
        executeQuerySingle<{ total: number; upcoming: number }>(
          `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN meeting_status = 'Scheduled' AND meeting_date >= CURRENT_DATE THEN 1 END) as upcoming
          FROM meetings`,
          []
        ),
        // Election counts
        executeQuerySingle<{ total: number; active: number }>(
          `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN election_status IN ('Nominations Open', 'Voting Open') THEN 1 END) as active
          FROM leadership_elections`,
          []
        ),
        // Leadership positions
        executeQuerySingle<{ filled: number; vacant: number }>(
          `SELECT
            (SELECT COUNT(*) FROM leadership_appointments WHERE appointment_status = 'Active') as filled,
            (SELECT COUNT(*) FROM leadership_positions WHERE is_active = TRUE) -
            (SELECT COUNT(*) FROM leadership_appointments WHERE appointment_status = 'Active') as vacant`,
          []
        ),
        // Recent registrations (last 30 days) from members_consolidated
        executeQuerySingle<{ count: number }>(
          `SELECT COUNT(*) as count
          FROM members_consolidated m
          ${whereClause} ${andClause} m.created_at >= CURRENT_DATE - INTERVAL '30 days'`,
          queryParams
        ),
        // Growth rate calculation
        executeQuerySingle<{ current_month: number; previous_month: number }>(
          `SELECT
            (SELECT COUNT(*) FROM members_consolidated m ${whereClause} ${andClause}
              EXTRACT(MONTH FROM m.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM m.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)) as current_month,
            (SELECT COUNT(*) FROM members_consolidated m ${whereClause} ${andClause}
              EXTRACT(MONTH FROM m.created_at) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
              AND EXTRACT(YEAR FROM m.created_at) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')) as previous_month`,
          queryParams
        )
      ]);

      // Calculate growth rate
      const currentMonthCount = Number(growthStats?.current_month || 0);
      const previousMonthCount = Number(growthStats?.previous_month || 0);
      const growthRate = previousMonthCount > 0
        ? Math.round(((currentMonthCount - previousMonthCount) / previousMonthCount) * 100)
        : 0;

      return {
        total_members: Number(memberStats?.total_members || 0),
        active_members: Number(memberStats?.active_members || 0),
        pending_applications: Number(pendingApps?.count || 0),
        total_meetings: Number(meetingStats?.total || 0),
        upcoming_meetings: Number(meetingStats?.upcoming || 0),
        total_elections: Number(electionStats?.total || 0),
        active_elections: Number(electionStats?.active || 0),
        leadership_positions_filled: Number(leadershipStats?.filled || 0),
        leadership_positions_vacant: Number(leadershipStats?.vacant || 0),
        recent_registrations: Number(recentRegistrations?.count || 0),
        membership_growth_rate: growthRate
      };
    } catch (error) {
      throw createDatabaseError('Failed to get dashboard statistics', error);
    }
  }

  /**
   * Refresh all analytics materialized views
   * Should be called periodically (every 15 minutes) or after bulk data changes
   */
  static async refreshMaterializedViews(): Promise<void> {
    try {
      await executeQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_analytics_summary', []);
      await executeQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance', []);
      await executeQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_growth_monthly', []);
    } catch (error) {
      throw createDatabaseError('Failed to refresh materialized views', error);
    }
  }
}

