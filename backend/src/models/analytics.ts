import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Helper function to convert PostgreSQL bigint strings to numbers
function convertToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// Helper function to convert all numeric fields in an array of objects
function convertArrayNumbers<T extends Record<string, any>>(arr: T[]): T[] {
  return arr.map(obj => {
    const converted: any = {};
    for (const key in obj) {
      const value = obj[key];
      // Convert if it's a number-like string or already a number
      if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
        converted[key] = Number(value);
      } else if (typeof value === 'number' || typeof value === 'bigint') {
        converted[key] = Number(value);
      } else {
        converted[key] = value;
      }
    }
    return converted as T;
  });
}

// Analytics interfaces
export interface DashboardStats {
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
  membership_growth: Array<{
    month: string;
    new_members: number;
    total_members: number;
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
  geographic_performance: {
    best_performing_wards: Array<{
      ward_code: string;
      ward_name: string;
      municipality_name: string;
      province_name: string;
      member_count: number;
      performance_score: number;
    }>;
    improving_areas: Array<{
      area_name: string;
      area_type: string;
      current_members: number;
      growth_rate: number;
      growth_period: string;
    }>;
    poor_performing_areas: Array<{
      area_name: string;
      area_type: string;
      member_count: number;
      target_count: number;
      performance_gap: number;
    }>;
    top_provinces: Array<{
      province_code: string;
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_districts: Array<{
      district_code: string;
      district_name: string;
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_municipalities: Array<{
      municipality_code: string;
      municipality_name: string;
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_wards: Array<{
      ward_code: string;
      ward_name: string;
      municipality_name: string;
      member_count: number;
      percentage: number;
    }>;
    all_districts: Array<{
      district_code: string;
      district_name: string;
      member_count: number;
      percentage: number;
    }>;
  };
}

export interface MeetingAnalytics {
  total_meetings: number;
  completed_meetings: number;
  cancelled_meetings: number;
  upcoming_meetings: number;
  average_attendance: number;
  meetings_by_type: Array<{
    meeting_type: string;
    meeting_count: number;
    percentage: number;
  }>;
  meetings_by_hierarchy: Array<{
    hierarchy_level: string;
    meeting_count: number;
    average_attendance: number;
  }>;
  monthly_meetings: Array<{
    month: string;
    meeting_count: number;
    attendance_rate: number;
  }>;
}

export interface LeadershipAnalytics {
  total_positions: number;
  filled_positions: number;
  vacant_positions: number;
  total_elections: number;
  completed_elections: number;
  upcoming_elections: number;
  organizational_structures: Array<{
    structure_name: string;
    structure_code: string;
    hierarchy_level: string;
    total_positions: number;
    defined_positions: number;
    filled_positions: number;
    vacant_positions: number;
    fill_rate_percentage: number;
  }>;
  positions_by_hierarchy: Array<{
    hierarchy_level: string;
    total_positions: number;
    filled_positions: number;
    vacancy_rate: number;
  }>;
  leadership_tenure: Array<{
    position_name: string;
    average_tenure_months: number;
    current_appointments: number;
  }>;
  election_participation: Array<{
    election_name: string;
    total_eligible: number;
    votes_cast: number;
    turnout_percentage: number;
  }>;
}

export interface ReportFilters {
  hierarchy_level?: string;
  entity_id?: number;
  date_from?: string;
  date_to?: string;
  member_status?: string;
  meeting_status?: string;
  election_status?: string;
  appointment_status?: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
}

export interface CustomReport {
  report_id: number;
  report_name: string;
  report_type: 'membership' | 'meetings' | 'leadership' | 'elections' | 'custom';
  report_config: any;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Analytics Model
export class AnalyticsModel {
  // Get dashboard statistics
  static async getDashboardStats(filters: ReportFilters = {}): Promise<DashboardStats> {
    try {
      // Build WHERE clause for province and municipality filtering
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (filters.province_code) {
        whereConditions.push('m.province_code = ?');
        queryParams.push(filters.province_code);
      }

      if (filters.municipal_code) {
        whereConditions.push('m.municipality_code = ?');
        queryParams.push(filters.municipal_code);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const queries = [
        // Total members with province filtering - FIXED: Use members_consolidated table
        `SELECT COUNT(*) as count FROM members_consolidated m ${whereClause}`,
        // Active members with province filtering - FIXED: Use membership_status_id = 1 (Active/Good Standing)
        `SELECT COUNT(*) as count FROM members_consolidated m ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} m.membership_status_id = 1`,
        // Pending applications with province/municipality filtering - Fixed: membership_applications doesn't have member_id
        filters.municipal_code
          ? `SELECT COUNT(*) as count FROM membership_applications ma
             JOIN wards w ON ma.ward_code = w.ward_code
             WHERE w.municipality_code = ? AND ma.status = 'Submitted'`
          : filters.province_code
          ? `SELECT COUNT(*) as count FROM membership_applications ma
             JOIN wards w ON ma.ward_code = w.ward_code
             JOIN municipalities mu ON w.municipality_code = mu.municipality_code
             JOIN districts d ON mu.district_code = d.district_code
             WHERE d.province_code = ? AND ma.status = 'Submitted'`
          : `SELECT COUNT(*) as count FROM membership_applications WHERE status = 'Submitted'`,
        // Total meetings with province/municipality filtering - Fixed: meetings doesn't have ward_code
        filters.municipal_code
          ? `SELECT COUNT(*) as count FROM meetings me
             WHERE (me.hierarchy_level = 'Municipality' AND me.entity_id = (SELECT municipality_id FROM municipalities WHERE municipality_code = ?))
             OR me.hierarchy_level IN ('Province', 'National')`
          : filters.province_code
          ? `SELECT COUNT(*) as count FROM meetings me
             WHERE (me.hierarchy_level = 'Province' AND me.entity_id = (SELECT province_id FROM provinces WHERE province_code = ?))
             OR me.hierarchy_level = 'National'`
          : `SELECT COUNT(*) as count FROM meetings`,
        // Upcoming meetings with province/municipality filtering - Fixed: meetings uses meeting_date instead of start_datetime
        filters.municipal_code
          ? `SELECT COUNT(*) as count FROM meetings me
             WHERE ((me.hierarchy_level = 'Municipality' AND me.entity_id = (SELECT municipality_id FROM municipalities WHERE municipality_code = ?))
             OR me.hierarchy_level IN ('Province', 'National'))
             AND me.meeting_status = 'Scheduled' AND me.meeting_date >= CURRENT_DATE`
          : filters.province_code
          ? `SELECT COUNT(*) as count FROM meetings me
             WHERE ((me.hierarchy_level = 'Province' AND me.entity_id = (SELECT province_id FROM provinces WHERE province_code = ?))
             OR me.hierarchy_level = 'National')
             AND me.meeting_status = 'Scheduled' AND me.meeting_date >= CURRENT_DATE`
          : `SELECT COUNT(*) as count FROM meetings
             WHERE meeting_status = 'Scheduled' AND meeting_date >= CURRENT_DATE`,
        // Total elections with province/municipality filtering - Fixed schema
        filters.municipal_code
          ? `SELECT COUNT(*) as count FROM leadership_elections le
             WHERE (le.hierarchy_level = 'Municipality' AND le.entity_id = (SELECT municipality_id FROM municipalities WHERE municipality_code = ?))
             OR le.hierarchy_level IN ('Province', 'National')`
          : filters.province_code
          ? `SELECT COUNT(*) as count FROM leadership_elections le
             WHERE (le.hierarchy_level = 'Province' AND le.entity_id = (SELECT province_id FROM provinces WHERE province_code = ?))
             OR le.hierarchy_level = 'National'`
          : `SELECT COUNT(*) as count FROM leadership_elections`,
        // Active elections with province/municipality filtering - Fixed schema
        filters.municipal_code
          ? `SELECT COUNT(*) as count FROM leadership_elections le
             WHERE ((le.hierarchy_level = 'Municipality' AND le.entity_id = (SELECT municipality_id FROM municipalities WHERE municipality_code = ?))
             OR le.hierarchy_level IN ('Province', 'National'))
             AND le.election_status IN ('Nominations Open', 'Voting Open')`
          : filters.province_code
          ? `SELECT COUNT(*) as count FROM leadership_elections le
             WHERE ((le.hierarchy_level = 'Province' AND le.entity_id = (SELECT province_id FROM provinces WHERE province_code = ?))
             OR le.hierarchy_level = 'National')
             AND le.election_status IN ('Nominations Open', 'Voting Open')`
          : `SELECT COUNT(*) as count FROM leadership_elections
             WHERE election_status IN ('Nominations Open', 'Voting Open')`,
        // Leadership positions filled with province/municipality filtering - Fixed schema
        filters.municipal_code
          ? `SELECT COUNT(*) as count FROM leadership_appointments la
             JOIN vw_member_details m ON la.member_id = m.member_id
             WHERE m.municipality_code = ? AND la.appointment_status = 'Active'`
          : filters.province_code
          ? `SELECT COUNT(*) as count FROM leadership_appointments la
             JOIN vw_member_details m ON la.member_id = m.member_id
             WHERE m.province_code = ? AND la.appointment_status = 'Active'`
          : `SELECT COUNT(*) as count FROM leadership_appointments WHERE appointment_status = 'Active'`,
        // Leadership positions vacant with province/municipality filtering - Fixed schema
        filters.municipal_code
          ? `SELECT (
               SELECT COUNT(*) FROM leadership_positions
               WHERE hierarchy_level IN ('Municipality', 'Province', 'National') AND is_active = TRUE
             ) - (
               SELECT COUNT(*) FROM leadership_appointments la
               JOIN vw_member_details m ON la.member_id = m.member_id
               WHERE m.municipality_code = ? AND la.appointment_status = 'Active'
             ) as count`
          : filters.province_code
          ? `SELECT (
               SELECT COUNT(*) FROM leadership_positions
               WHERE hierarchy_level IN ('Province', 'National') AND is_active = TRUE
             ) - (
               SELECT COUNT(*) FROM leadership_appointments la
               JOIN vw_member_details m ON la.member_id = m.member_id
               WHERE m.province_code = ? AND la.appointment_status = 'Active'
             ) as count`
          : `SELECT (
               SELECT COUNT(*) FROM leadership_positions WHERE is_active = TRUE
             ) - (
               SELECT COUNT(*) FROM leadership_appointments WHERE appointment_status = 'Active'
             ) as count`,
        // Recent registrations (last 30 days) with province filtering - FIXED: Use members_consolidated
        `SELECT COUNT(*) as count FROM members_consolidated m ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      ];

      // Prepare parameters for each query
      const queryParamsArray = [
        queryParams, // Total members
        [...queryParams], // Active members (needs separate array because of additional WHERE condition)
        filters.municipal_code ? [filters.municipal_code] : filters.province_code ? [filters.province_code] : [], // Pending applications
        filters.municipal_code ? [filters.municipal_code] : filters.province_code ? [filters.province_code] : [], // Total meetings
        filters.municipal_code ? [filters.municipal_code] : filters.province_code ? [filters.province_code] : [], // Upcoming meetings
        filters.municipal_code ? [filters.municipal_code] : filters.province_code ? [filters.province_code] : [], // Total elections
        filters.municipal_code ? [filters.municipal_code] : filters.province_code ? [filters.province_code] : [], // Active elections
        filters.municipal_code ? [filters.municipal_code] : filters.province_code ? [filters.province_code] : [], // Leadership positions filled
        filters.municipal_code ? [filters.municipal_code] : filters.province_code ? [filters.province_code] : [], // Leadership positions vacant
        [...queryParams] // Recent registrations
      ];

      const results = await Promise.all(
        queries.map((query, index) => executeQuerySingle<{ count: number }>(query, queryParamsArray[index]))
      );

      // Calculate membership growth rate with province filtering - FIXED: Use members_consolidated
      const currentMonth = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM members_consolidated m ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} MONTH(m.created_at) = MONTH(NOW()) AND YEAR(m.created_at) = YEAR(NOW())`,
        queryParams
      );
      const previousMonth = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM members_consolidated m ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} MONTH(m.created_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(m.created_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))`,
        queryParams
      );

      // Convert string counts to numbers (PostgreSQL returns bigint as string)
      const currentMonthCount = Number(currentMonth?.count || 0);
      const previousMonthCount = Number(previousMonth?.count || 0);

      const growthRate = previousMonthCount > 0
        ? Math.round(((currentMonthCount - previousMonthCount) / previousMonthCount) * 100)
        : 0;

      return {
        total_members: Number(results[0]?.count || 0),
        active_members: Number(results[1]?.count || 0),
        pending_applications: Number(results[2]?.count || 0),
        total_meetings: Number(results[3]?.count || 0),
        upcoming_meetings: Number(results[4]?.count || 0),
        total_elections: Number(results[5]?.count || 0),
        active_elections: Number(results[6]?.count || 0),
        leadership_positions_filled: Number(results[7]?.count || 0),
        leadership_positions_vacant: Number(results[8]?.count || 0),
        recent_registrations: Number(results[9]?.count || 0),
        membership_growth_rate: growthRate
      };
    } catch (error) {
      throw createDatabaseError('Failed to get dashboard statistics', error);
    }
  }

  // Get membership analytics
  static async getMembershipAnalytics(filters: ReportFilters = {}): Promise<MembershipAnalytics> {
    try {
      // Build WHERE clause for geographic filtering (province and municipality)
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (filters.province_code) {
        whereConditions.push('m.province_code = ?');
        queryParams.push(filters.province_code);
      }

      if (filters.municipal_code) {
        whereConditions.push('m.municipality_code = ?');
        queryParams.push(filters.municipal_code);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total counts with province filtering - FIXED: Use members_consolidated
      const totalMembers = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM members_consolidated m ${whereClause}`,
        queryParams
      );

      // Count active members: membership_status_id = 1 (Active/Good Standing) - FIXED
      const activeMembersWhereClause = whereClause
        ? `${whereClause} AND m.membership_status_id = 1`
        : 'WHERE m.membership_status_id = 1';

      const activeMembers = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM members_consolidated m ${activeMembersWhereClause}`,
        queryParams
      );
      console.log('🔍 Active Members Query Result:', activeMembers);

      // Count inactive members: membership_status_id IN (2, 3, 4) (Expired, Inactive, Grace Period) - FIXED
      const inactiveMembersWhereClause = whereClause
        ? `${whereClause} AND m.membership_status_id IN (2, 3, 4)`
        : 'WHERE m.membership_status_id IN (2, 3, 4)';

      const inactiveMembers = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM members_consolidated m ${inactiveMembersWhereClause}`,
        queryParams
      );
      console.log('🔍 Inactive Members Query Result:', inactiveMembers);

      // Pending members (applications not yet approved) - set to 0 for now
      const pendingMembers = { count: 0 };

      // Get membership by hierarchy (simplified - just return empty array for now)
      const membershipByHierarchy: Array<{
        hierarchy_level: string;
        member_count: number;
        percentage: number;
      }> = [];

      // Get membership by status - FIXED: Use membership_status_id from members_consolidated
      const membershipByStatus = await executeQuery<{
        membership_status: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          ms.status_name as membership_status,
          COUNT(*) as member_count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause.replace(/m\./g, 'm2.')}), 0)), 2) as percentage
        FROM members_consolidated m
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        ${whereClause}
        GROUP BY ms.status_name, ms.status_id
        ORDER BY ms.status_id`,
        queryParams
      );

      // Get voter registration status breakdown - NEW
      const voterRegistrationStatus = await executeQuery<{
        voter_status: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          vs.status_name as voter_status,
          COUNT(*) as member_count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause.replace(/m\./g, 'm2.')}), 0)), 2) as percentage
        FROM members_consolidated m
        LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
        ${whereClause}
        GROUP BY vs.status_name, vs.status_id
        ORDER BY vs.status_id`,
        queryParams
      );

      // Get membership growth (last 12 months) with province filtering
      const membershipGrowth = await executeQuery<{
        month: string;
        new_members: number;
        total_members: number;
      }>(
        `SELECT
          DATE_FORMAT(m.created_at, '%Y-%m') as month,
          COUNT(*) as new_members,
          COUNT(*) as total_members
        FROM members_consolidated m
        ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} m.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(m.created_at, '%Y-%m')
        ORDER BY month`,
        queryParams
      );

      // Get age distribution with province filtering - FIXED: Use members_consolidated
      const ageWhereClause = whereClause ? `${whereClause} AND m.age IS NOT NULL` : 'WHERE m.age IS NOT NULL';

      const ageDistribution = await executeQuery<{
        age_group: string;
        member_count: number;
        percentage: number;
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
          COUNT(*) as member_count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${ageWhereClause.replace(/m\./g, 'm2.')}), 0)), 2) as percentage
        FROM members_consolidated m
        ${ageWhereClause}
        GROUP BY age_group
        ORDER BY MIN(m.age)`,
        queryParams
      );

      // Get gender distribution with province filtering - FIXED: Use members_consolidated
      const genderWhereClause = whereClause ? `${whereClause} AND g.gender_name IS NOT NULL` : 'WHERE g.gender_name IS NOT NULL';

      const genderDistribution = await executeQuery<{
        gender: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          g.gender_name as gender,
          COUNT(*) as member_count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 LEFT JOIN genders g2 ON m2.gender_id = g2.gender_id ${genderWhereClause.replace(/g\./g, 'g2.')}), 0)), 2) as percentage
        FROM members_consolidated m
        LEFT JOIN genders g ON m.gender_id = g.gender_id
        ${genderWhereClause}
        GROUP BY g.gender_name
        ORDER BY member_count DESC`,
        queryParams
      );

      // Get age-gender pyramid data (population pyramid) - Optimized
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

      // Get geographic performance data with province filtering
      const geographicPerformance = await this.getGeographicPerformance(filters);

      return {
        total_members: Number(totalMembers?.count || 0),
        active_members: Number(activeMembers?.count || 0),
        inactive_members: Number(inactiveMembers?.count || 0),
        pending_members: Number(pendingMembers?.count || 0),
        membership_by_hierarchy: convertArrayNumbers(membershipByHierarchy || []),
        membership_by_status: convertArrayNumbers(membershipByStatus || []),
        voter_registration_status: convertArrayNumbers(voterRegistrationStatus || []),
        membership_growth: convertArrayNumbers(membershipGrowth || []),
        age_distribution: convertArrayNumbers(ageDistribution || []),
        gender_distribution: convertArrayNumbers(genderDistribution || []),
        age_gender_pyramid: ageGenderPyramid || [],
        geographic_performance: geographicPerformance
      };
    } catch (error) {
      throw createDatabaseError('Failed to get membership analytics', error);
    }
  }

  // Get meeting analytics
  static async getMeetingAnalytics(filters: ReportFilters = {}): Promise<MeetingAnalytics> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.hierarchy_level) {
        whereClause += ' AND hierarchy_level = ?';
        params.push(filters.hierarchy_level);
      }
      if (filters.entity_id) {
        whereClause += ' AND entity_id = ?';
        params.push(filters.entity_id);
      }
      if (filters.date_from) {
        whereClause += ' AND meeting_date >= ?';
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        whereClause += ' AND meeting_date <= ?';
        params.push(filters.date_to);
      }

      // Get total counts
      const totalMeetings = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM meetings ${whereClause}`,
        params
      );

      const completedMeetings = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM meetings ${whereClause} AND meeting_status = ?`,
        [...params, 'Completed']
      );

      const cancelledMeetings = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM meetings ${whereClause} AND meeting_status = ?`,
        [...params, 'Cancelled']
      );

      const upcomingMeetings = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM meetings ${whereClause} AND meeting_status = ? AND meeting_date >= CURRENT_DATE`,
        [...params, 'Scheduled']
      );

      // Get average attendance (set to 0 since meetings table doesn't have attendance data)
      const avgAttendance = { avg_attendance: 0 };

      // Get meetings by type
      const meetingsByType = await executeQuery<{
        meeting_type: string;
        meeting_count: number;
        percentage: number;
      }>(
        `SELECT
          mt.type_name as meeting_type,
          COUNT(*) as meeting_count,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM meetings)), 2) as percentage
        FROM meetings m
        LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
        WHERE 1=1
        GROUP BY mt.type_name
        ORDER BY meeting_count DESC`,
        []
      );

      // Get meetings by hierarchy
      const meetingsByHierarchy = await executeQuery<{
        hierarchy_level: string;
        meeting_count: number;
        average_attendance: number;
      }>(
        `SELECT
          hierarchy_level,
          COUNT(*) as meeting_count,
          0 as average_attendance
        FROM meetings
        WHERE 1=1
        GROUP BY hierarchy_level
        ORDER BY meeting_count DESC`,
        []
      );

      // Get monthly meetings (last 12 months)
      const monthlyMeetings = await executeQuery<{
        month: string;
        meeting_count: number;
        attendance_rate: number;
      }>(
        `SELECT
          TO_CHAR(meeting_date, 'YYYY-MM') as month,
          COUNT(*) as meeting_count,
          0 as attendance_rate
        FROM meetings
        ${whereClause}
        AND meeting_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(meeting_date, 'YYYY-MM')
        ORDER BY month`,
        params
      );

      return {
        total_meetings: Number(totalMeetings?.count || 0),
        completed_meetings: Number(completedMeetings?.count || 0),
        cancelled_meetings: Number(cancelledMeetings?.count || 0),
        upcoming_meetings: Number(upcomingMeetings?.count || 0),
        average_attendance: Math.round(Number(avgAttendance?.avg_attendance || 0)),
        meetings_by_type: convertArrayNumbers(meetingsByType || []),
        meetings_by_hierarchy: convertArrayNumbers(meetingsByHierarchy || []),
        monthly_meetings: convertArrayNumbers(monthlyMeetings || [])
      };
    } catch (error) {
      throw createDatabaseError('Failed to get meeting analytics', error);
    }
  }

  // Get leadership analytics
  static async getLeadershipAnalytics(filters: ReportFilters = {}): Promise<LeadershipAnalytics> {
    try {
      // For province filtering, we need to handle different logic for different tables
      const isProvinceFiltered = !!filters.province_code;

      // Get province_id from province_code if filtering by province
      let provinceId: number | null = null;
      if (isProvinceFiltered && filters.province_code) {
        const provinceResult = await executeQuerySingle<{ province_id: number }>(
          `SELECT province_id FROM provinces WHERE province_code = ?`,
          [filters.province_code]
        );
        provinceId = provinceResult?.province_id || null;
      }

      // Get total positions - filter by hierarchy level for province
      const totalPositions = await executeQuerySingle<{ count: number }>(
        isProvinceFiltered
          ? `SELECT COUNT(*) as count FROM leadership_positions
             WHERE hierarchy_level IN ('Province', 'National') AND is_active = TRUE`
          : `SELECT COUNT(*) as count FROM leadership_positions WHERE is_active = TRUE`,
        []
      );

      // Get filled positions - filter by member's province
      const filledPositions = await executeQuerySingle<{ count: number }>(
        isProvinceFiltered
          ? `SELECT COUNT(DISTINCT la.position_id) as count
             FROM leadership_appointments la
             JOIN leadership_positions lp ON la.position_id = lp.id
             JOIN vw_member_details m ON la.member_id = m.member_id
             WHERE la.appointment_status = 'Active' AND lp.is_active = TRUE AND m.province_code = ?`
          : `SELECT COUNT(DISTINCT la.position_id) as count
             FROM leadership_appointments la
             JOIN leadership_positions lp ON la.position_id = lp.id
             WHERE la.appointment_status = 'Active' AND lp.is_active = TRUE`,
        isProvinceFiltered ? [filters.province_code] : []
      );

      // Get total elections - filter by hierarchy level and entity_id
      const totalElections = await executeQuerySingle<{ count: number }>(
        isProvinceFiltered
          ? `SELECT COUNT(*) as count FROM leadership_elections
             WHERE (hierarchy_level = 'Province' AND entity_id = ?) OR hierarchy_level = 'National'`
          : `SELECT COUNT(*) as count FROM leadership_elections`,
        isProvinceFiltered ? [provinceId] : []
      );

      // Get completed elections - filter by hierarchy level and entity_id
      const completedElections = await executeQuerySingle<{ count: number }>(
        isProvinceFiltered
          ? `SELECT COUNT(*) as count FROM leadership_elections
             WHERE ((hierarchy_level = 'Province' AND entity_id = ?) OR hierarchy_level = 'National')
             AND election_status = 'Completed'`
          : `SELECT COUNT(*) as count FROM leadership_elections WHERE election_status = 'Completed'`,
        isProvinceFiltered ? [provinceId] : []
      );

      // Get upcoming elections - filter by hierarchy level and entity_id
      const upcomingElections = await executeQuerySingle<{ count: number }>(
        isProvinceFiltered
          ? `SELECT COUNT(*) as count FROM leadership_elections
             WHERE ((hierarchy_level = 'Province' AND entity_id = ?) OR hierarchy_level = 'National')
             AND election_status IN ('Planned', 'Nominations Open', 'Voting Open')`
          : `SELECT COUNT(*) as count FROM leadership_elections
             WHERE election_status IN ('Planned', 'Nominations Open', 'Voting Open')`,
        isProvinceFiltered ? [provinceId] : []
      );

      // Get positions by hierarchy - filter for province
      const positionsByHierarchy = await executeQuery<{
        hierarchy_level: string;
        total_positions: number;
        filled_positions: number;
        vacancy_rate: number;
      }>(
        isProvinceFiltered
          ? `SELECT
              lp.hierarchy_level,
              COUNT(lp.id) as total_positions,
              COUNT(CASE WHEN la.id IS NOT NULL AND m.province_code = ? THEN la.id END) as filled_positions,
              ROUND((COUNT(lp.id) - COUNT(CASE WHEN la.id IS NOT NULL AND m.province_code = ? THEN la.id END)) * 100.0 / COUNT(lp.id), 2) as vacancy_rate
            FROM leadership_positions lp
            LEFT JOIN leadership_appointments la ON lp.id = la.position_id AND la.appointment_status = 'Active'
            LEFT JOIN vw_member_details m ON la.member_id = m.member_id
            WHERE lp.is_active = TRUE AND lp.hierarchy_level IN ('Province', 'National')
            GROUP BY lp.hierarchy_level
            ORDER BY total_positions DESC`
          : `SELECT
              lp.hierarchy_level,
              COUNT(lp.id) as total_positions,
              COUNT(la.id) as filled_positions,
              ROUND((COUNT(lp.id) - COUNT(la.id)) * 100.0 / COUNT(lp.id), 2) as vacancy_rate
            FROM leadership_positions lp
            LEFT JOIN leadership_appointments la ON lp.id = la.position_id AND la.appointment_status = 'Active'
            WHERE lp.is_active = TRUE
            GROUP BY lp.hierarchy_level
            ORDER BY total_positions DESC`,
        isProvinceFiltered ? [filters.province_code, filters.province_code] : []
      );

      // Get leadership tenure - filter for province
      const leadershipTenure = await executeQuery<{
        position_name: string;
        average_tenure_months: number;
        current_appointments: number;
      }>(
        isProvinceFiltered
          ? `SELECT
              lp.position_name,
              AVG(TIMESTAMPDIFF(MONTH, la.start_date, COALESCE(la.end_date, NOW()))) as average_tenure_months,
              COUNT(CASE WHEN la.appointment_status = 'Active' AND m.province_code = ? THEN 1 END) as current_appointments
            FROM leadership_positions lp
            LEFT JOIN leadership_appointments la ON lp.id = la.position_id
            LEFT JOIN vw_member_details m ON la.member_id = m.member_id
            WHERE lp.is_active = TRUE AND lp.hierarchy_level IN ('Province', 'National')
            GROUP BY lp.id, lp.position_name
            ORDER BY average_tenure_months DESC`
          : `SELECT
              lp.position_name,
              AVG(TIMESTAMPDIFF(MONTH, la.start_date, COALESCE(la.end_date, NOW()))) as average_tenure_months,
              COUNT(CASE WHEN la.appointment_status = 'Active' THEN 1 END) as current_appointments
            FROM leadership_positions lp
            LEFT JOIN leadership_appointments la ON lp.id = la.position_id
            WHERE lp.is_active = TRUE
            GROUP BY lp.id, lp.position_name
            ORDER BY average_tenure_months DESC`,
        isProvinceFiltered ? [filters.province_code] : []
      );

      // Get election participation - filter for province
      const electionParticipation = await executeQuery<{
        election_name: string;
        total_eligible: number;
        votes_cast: number;
        turnout_percentage: number;
      }>(
        isProvinceFiltered
          ? `SELECT
              le.election_name,
              le.total_eligible_voters as total_eligible,
              le.total_votes_cast as votes_cast,
              ROUND((le.total_votes_cast * 100.0 / NULLIF(le.total_eligible_voters, 0)), 2) as turnout_percentage
            FROM leadership_elections le
            WHERE ((le.hierarchy_level = 'Province' AND le.entity_id = ?) OR le.hierarchy_level = 'National')
            AND le.election_status = 'Completed'
            ORDER BY le.voting_end_date DESC
            LIMIT 10`
          : `SELECT
              le.election_name,
              le.total_eligible_voters as total_eligible,
              le.total_votes_cast as votes_cast,
              ROUND((le.total_votes_cast * 100.0 / NULLIF(le.total_eligible_voters, 0)), 2) as turnout_percentage
            FROM leadership_elections le
            WHERE le.election_status = 'Completed'
            ORDER BY le.voting_end_date DESC
            LIMIT 10`,
        isProvinceFiltered ? [provinceId] : []
      );

      // Get organizational structures analytics
      const organizationalStructures = await executeQuery<{
        structure_name: string;
        structure_code: string;
        hierarchy_level: string;
        total_positions: number;
        defined_positions: number;
        filled_positions: number;
        vacant_positions: number;
        fill_rate_percentage: number;
      }>(
        `SELECT
          ls.structure_name,
          ls.structure_code,
          ls.hierarchy_level,
          ls.total_positions,
          COUNT(lp.id) as defined_positions,
          COUNT(la.id) as filled_positions,
          (ls.total_positions - COUNT(la.id)) as vacant_positions,
          ROUND((COUNT(la.id) * 100.0 / ls.total_positions), 2) as fill_rate_percentage
        FROM leadership_structures ls
        LEFT JOIN leadership_positions lp ON ls.hierarchy_level = lp.hierarchy_level AND lp.is_active = TRUE
        LEFT JOIN leadership_appointments la ON lp.id = la.position_id AND la.appointment_status = 'Active'
        WHERE ls.is_active = TRUE
        GROUP BY ls.id, ls.structure_name, ls.structure_code, ls.hierarchy_level, ls.total_positions
        ORDER BY
          CASE ls.hierarchy_level
            WHEN 'National' THEN 1
            WHEN 'Province' THEN 2
            WHEN 'Municipality' THEN 3
            WHEN 'Ward' THEN 4
          END`,
        []
      );

      return {
        total_positions: Number(totalPositions?.count || 0),
        filled_positions: Number(filledPositions?.count || 0),
        vacant_positions: Number(totalPositions?.count || 0) - Number(filledPositions?.count || 0),
        total_elections: Number(totalElections?.count || 0),
        completed_elections: Number(completedElections?.count || 0),
        upcoming_elections: Number(upcomingElections?.count || 0),
        organizational_structures: convertArrayNumbers(organizationalStructures || []),
        positions_by_hierarchy: convertArrayNumbers(positionsByHierarchy || []),
        leadership_tenure: convertArrayNumbers(leadershipTenure || []),
        election_participation: convertArrayNumbers(electionParticipation || [])
      };
    } catch (error) {
      throw createDatabaseError('Failed to get leadership analytics', error);
    }
  }

  // Get geographic performance analytics
  static async getGeographicPerformance(filters: ReportFilters = {}): Promise<{
    best_performing_wards: Array<{
      ward_name: string;
      ward_code: string;
      municipality_name: string;
      province_name: string;
      member_count: number;
      performance_score: number;
    }>;
    improving_areas: Array<{
      area_name: string;
      area_type: string;
      current_members: number;
      growth_rate: number;
      growth_period: string;
    }>;
    poor_performing_areas: Array<{
      area_name: string;
      area_type: string;
      member_count: number;
      target_count: number;
      performance_gap: number;
    }>;
    top_provinces: Array<{
      province_code: string;
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_districts: Array<{
      district_code: string;
      district_name: string;
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_municipalities: Array<{
      municipality_code: string;
      municipality_name: string;
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_wards: Array<{
      ward_code: string;
      ward_name: string;
      municipality_name: string;
      member_count: number;
      percentage: number;
    }>;
    all_districts: Array<{
      district_code: string;
      district_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_performing_districts: Array<{
      district_name: string;
      province_name: string;
      member_count: number;
      municipality_count: number;
      performance_score: number;
      growth_rate: number;
      compliance_rate: number;
    }>;
    worst_performing_municipalities: Array<{
      municipality_name: string;
      district_name: string;
      province_name: string;
      member_count: number;
      target_count: number;
      performance_gap: number;
      compliance_rate: number;
      recommendations: string[];
    }>;
  }> {
    try {
      // Build WHERE clause for geographic filtering (province and municipality)
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (filters.province_code) {
        whereConditions.push('p.province_code = ?');
        queryParams.push(filters.province_code);
      }

      if (filters.municipal_code) {
        whereConditions.push('m.municipality_code = ?');
        queryParams.push(filters.municipal_code);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get best performing wards (top 10 by Good Standing member count) with geographic filtering
      // Only count members with membership_status_id = 1 (Good Standing)
      const bestPerformingWards = await executeQuery<{
        ward_code: string;
        ward_name: string;
        municipality_name: string;
        province_name: string;
        member_count: number;
        performance_score: number;
      }>(
        `SELECT
          w.ward_code,
          w.ward_name,
          m.municipality_name,
          p.province_name,
          COUNT(CASE WHEN mem.membership_status_id = 1 THEN 1 END) as member_count,
          ROUND((COUNT(CASE WHEN mem.membership_status_id = 1 THEN 1 END) / 200.0) * 100, 1) as performance_score
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN members mem ON w.ward_code = mem.ward_code
        ${whereClause}
        GROUP BY w.ward_code, w.ward_name, m.municipality_name, p.province_name
        HAVING COUNT(CASE WHEN mem.membership_status_id = 1 THEN 1 END) > 0
        ORDER BY member_count DESC
        LIMIT 10`,
        queryParams
      );

      // Get improving areas (wards with recent growth) with geographic filtering
      const improvingAreas = await executeQuery<{
        area_name: string;
        area_type: string;
        current_members: number;
        growth_rate: number;
        growth_period: string;
      }>(
        `SELECT
          w.ward_name as area_name,
          'Ward' as area_type,
          COUNT(mem.member_id) as current_members,
          COALESCE(
            ROUND(
              ((COUNT(mem.member_id) - COUNT(CASE WHEN mem.created_at < CURRENT_DATE - INTERVAL '3 months' THEN 1 END)) /
               NULLIF(COUNT(CASE WHEN mem.created_at < CURRENT_DATE - INTERVAL '3 months' THEN 1 END), 0)) * 100, 1
            ), 0
          ) as growth_rate,
          'Last 3 months' as growth_period
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
        ${whereClause}
        GROUP BY w.ward_code, w.ward_name
        HAVING COUNT(mem.member_id) > 0 AND COALESCE(
            ROUND(
              ((COUNT(mem.member_id) - COUNT(CASE WHEN mem.created_at < CURRENT_DATE - INTERVAL '3 months' THEN 1 END)) /
               NULLIF(COUNT(CASE WHEN mem.created_at < CURRENT_DATE - INTERVAL '3 months' THEN 1 END), 0)) * 100, 1
            ), 0
          ) > 10
        ORDER BY COALESCE(
            ROUND(
              ((COUNT(mem.member_id) - COUNT(CASE WHEN mem.created_at < CURRENT_DATE - INTERVAL '3 months' THEN 1 END)) /
               NULLIF(COUNT(CASE WHEN mem.created_at < CURRENT_DATE - INTERVAL '3 months' THEN 1 END), 0)) * 100, 1
            ), 0
          ) DESC
        LIMIT 5`,
        queryParams
      );

      // Get poor performing areas (wards with low member counts) with geographic filtering
      const poorPerformingAreas = await executeQuery<{
        area_name: string;
        area_type: string;
        member_count: number;
        target_count: number;
        performance_gap: number;
      }>(
        `SELECT
          w.ward_name as area_name,
          'Ward' as area_type,
          COUNT(mem.member_id) as member_count,
          200 as target_count,
          (200 - COUNT(mem.member_id)) as performance_gap
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
        ${whereClause}
        GROUP BY w.ward_code, w.ward_name
        HAVING member_count < 200
        ORDER BY member_count ASC
        LIMIT 5`,
        queryParams
      );

      // Get total member count for percentage calculations
      const totalMembersResult = await executeQuerySingle<{ total: number }>(
        `SELECT COUNT(*) as total FROM members_consolidated`,
        []
      );
      const totalMembers = totalMembersResult?.total || 1;

      // Get top 3 provinces by membership count (only for National Admin - exclude for Provincial Admin)
      const topProvinces = filters.province_code ? [] : await executeQuery<{
        province_code: string;
        province_name: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          p.province_code,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          ROUND((COUNT(DISTINCT m.member_id) * 100.0 / $1), 2) as percentage
        FROM provinces p
        LEFT JOIN districts d ON p.province_code = d.province_code
        LEFT JOIN municipalities mun ON d.district_code = mun.district_code
        LEFT JOIN wards w ON mun.municipality_code = w.municipality_code
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        GROUP BY p.province_code, p.province_name
        HAVING COUNT(DISTINCT m.member_id) > 0
        ORDER BY member_count DESC
        LIMIT 3`,
        [totalMembers]
      );

      // Get top 5 districts by membership count (National level only)
      const topDistricts = filters.province_code || filters.municipal_code ? [] : await executeQuery<{
        district_code: string;
        district_name: string;
        province_name: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          d.district_code,
          d.district_name,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          ROUND((COUNT(DISTINCT m.member_id) * 100.0 / $1), 2) as percentage
        FROM districts d
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN municipalities mun ON d.district_code = mun.district_code
        LEFT JOIN wards w ON mun.municipality_code = w.municipality_code
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        GROUP BY d.district_code, d.district_name, p.province_name
        HAVING COUNT(DISTINCT m.member_id) > 0
        ORDER BY member_count DESC
        LIMIT 5`,
        [totalMembers]
      );

      // Get all districts within a province (Provincial level only)
      const allDistricts = filters.province_code && !filters.municipal_code ? await executeQuery<{
        district_code: string;
        district_name: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          d.district_code,
          d.district_name,
          COUNT(DISTINCT m.member_id) as member_count,
          ROUND((COUNT(DISTINCT m.member_id) * 100.0 / $1), 2) as percentage
        FROM districts d
        LEFT JOIN municipalities mun ON d.district_code = mun.district_code
        LEFT JOIN wards w ON mun.municipality_code = w.municipality_code
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        WHERE d.province_code = $2
        GROUP BY d.district_code, d.district_name
        ORDER BY member_count DESC`,
        [totalMembers, filters.province_code]
      ) : [];

      // Get top 10 municipalities by membership count
      // Build WHERE clause with adjusted parameter numbers (starting from $2 since $1 is totalMembers)
      const municipalityWhereConditions: string[] = [];
      const municipalityParams: any[] = [totalMembers];
      let paramIndex = 2;

      if (filters.province_code) {
        municipalityWhereConditions.push(`p.province_code = $${paramIndex}`);
        municipalityParams.push(filters.province_code);
        paramIndex++;
      }

      if (filters.municipal_code) {
        municipalityWhereConditions.push(`mun.municipality_code = $${paramIndex}`);
        municipalityParams.push(filters.municipal_code);
        paramIndex++;
      }

      const municipalityWhereClause = municipalityWhereConditions.length > 0
        ? `WHERE ${municipalityWhereConditions.join(' AND ')}`
        : '';

      const topMunicipalities = filters.municipal_code ? [] : await executeQuery<{
        municipality_code: string;
        municipality_name: string;
        province_name: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          mun.municipality_code,
          mun.municipality_name,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          ROUND((COUNT(DISTINCT m.member_id) * 100.0 / $1), 2) as percentage
        FROM municipalities mun
        LEFT JOIN districts d ON mun.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN wards w ON mun.municipality_code = w.municipality_code
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        ${municipalityWhereClause}
        GROUP BY mun.municipality_code, mun.municipality_name, p.province_name
        HAVING COUNT(DISTINCT m.member_id) > 0
        ORDER BY member_count DESC
        LIMIT 10`,
        municipalityParams
      );

      // Get top 10 wards by active membership count (Municipal level only)
      // Active = not expired OR in grace period (expired < 90 days)
      const topWards = filters.municipal_code ? await executeQuery<{
        ward_code: string;
        ward_name: string;
        municipality_name: string;
        member_count: number;
        percentage: number;
      }>(
        `SELECT
          w.ward_code,
          w.ward_name,
          mun.municipality_name,
          COUNT(CASE WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as member_count,
          ROUND((COUNT(CASE WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) * 100.0 / $1), 2) as percentage
        FROM wards w
        LEFT JOIN municipalities mun ON w.municipality_code = mun.municipality_code
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        WHERE w.municipality_code = $2
        GROUP BY w.ward_code, w.ward_name, mun.municipality_name
        HAVING COUNT(CASE WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) > 0
        ORDER BY member_count DESC
        LIMIT 10`,
        [totalMembers, filters.municipal_code]
      ) : [];

      // Get top performing districts with real data (simplified version without growth/compliance rates)
      const topPerformingDistricts = filters.municipal_code ? [] : await executeQuery<{
        district_name: string;
        province_name: string;
        member_count: number;
        municipality_count: number;
        performance_score: number;
        growth_rate: number;
        compliance_rate: number;
      }>(
        `SELECT
          d.district_name,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          COUNT(DISTINCT mun.municipality_code) as municipality_count,
          ROUND((COUNT(DISTINCT m.member_id) / 1000.0) * 100, 1) as performance_score,
          0 as growth_rate,
          0 as compliance_rate
        FROM districts d
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN municipalities mun ON d.district_code = mun.district_code
        LEFT JOIN wards w ON mun.municipality_code = w.municipality_code
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        ${whereClause}
        GROUP BY d.district_code, d.district_name, p.province_name
        HAVING COUNT(DISTINCT m.member_id) > 0
        ORDER BY member_count DESC
        LIMIT 5`,
        queryParams
      );

      // Get worst 5 performing municipalities (province-specific mock data)
      const allWorstMunicipalities = [
        // Gauteng worst performing municipalities
        {
          municipality_name: "Merafong City",
          district_name: "West Rand",
          province_name: "Gauteng",
          member_count: 1245,
          target_count: 3000,
          performance_gap: 1755,
          compliance_rate: 42
        },
        {
          municipality_name: "Rand West City",
          district_name: "West Rand",
          province_name: "Gauteng",
          member_count: 1567,
          target_count: 3500,
          performance_gap: 1933,
          compliance_rate: 45
        },
        {
          municipality_name: "Mogale City",
          district_name: "West Rand",
          province_name: "Gauteng",
          member_count: 1890,
          target_count: 4000,
          performance_gap: 2110,
          compliance_rate: 47
        },
        {
          municipality_name: "Lesedi",
          district_name: "Sedibeng",
          province_name: "Gauteng",
          member_count: 2134,
          target_count: 4500,
          performance_gap: 2366,
          compliance_rate: 48
        },
        {
          municipality_name: "Midvaal",
          district_name: "Sedibeng",
          province_name: "Gauteng",
          member_count: 2456,
          target_count: 5000,
          performance_gap: 2544,
          compliance_rate: 49
        },
        // Other provinces (for National Admin)
        {
          municipality_name: "Matatiele Local Municipality",
          district_name: "Alfred Nzo District",
          province_name: "Eastern Cape",
          member_count: 45,
          target_count: 1000,
          performance_gap: 955,
          compliance_rate: 25
        }
      ];

      // Filter worst performing municipalities by province if specified
      const filteredWorstMunicipalities = filters.municipal_code ? [] : filters.province_code
        ? allWorstMunicipalities.filter(m => {
            if (filters.province_code === 'GP') return m.province_name === 'Gauteng';
            if (filters.province_code === 'WC') return m.province_name === 'Western Cape';
            if (filters.province_code === 'KZN') return m.province_name === 'KwaZulu-Natal';
            // Add other province mappings as needed
            return true;
          }).slice(0, 5)
        : allWorstMunicipalities.slice(0, 5);

      // Add recommendations for worst performing municipalities (exclude for Municipality Admin)
      const worstPerformingMunicipalitiesWithRecommendations = filteredWorstMunicipalities.map(municipality => ({
        ...municipality,
        recommendations: [
          municipality.member_count < 100 ? 'Urgent: Launch intensive recruitment campaign' : 'Increase membership outreach programs',
          municipality.compliance_rate < 50 ? 'Critical: Improve ward organization structure' : 'Strengthen ward-level engagement',
          'Implement targeted community engagement initiatives',
          'Establish local leadership development programs',
          'Create partnerships with community organizations'
        ]
      }));

      return {
        best_performing_wards: bestPerformingWards || [],
        improving_areas: improvingAreas || [],
        poor_performing_areas: poorPerformingAreas || [],
        top_provinces: topProvinces || [],
        top_districts: topDistricts || [],
        top_municipalities: topMunicipalities || [],
        top_wards: topWards || [],
        all_districts: allDistricts || [],
        top_performing_districts: topPerformingDistricts || [],
        worst_performing_municipalities: worstPerformingMunicipalitiesWithRecommendations || []
      };
    } catch (error) {
      throw createDatabaseError('Failed to get geographic performance analytics', error);
    }
  }

  // Get strategic insights data
  static async getStrategicInsights(): Promise<any> {
    try {
      // Get current membership statistics
      const memberStats = await executeQuerySingle(`
        SELECT
          COUNT(*) as total_members,
          COUNT(CASE WHEN DATE(created_at) >= CURRENT_DATE - INTERVAL '12 months' THEN 1 END) as new_members_12m,
          COUNT(CASE WHEN DATE(created_at) >= CURRENT_DATE - INTERVAL '24 months'
                     AND DATE(created_at) < CURRENT_DATE - INTERVAL '12 months' THEN 1 END) as new_members_prev_12m
        FROM members_consolidated
      `);

      // Calculate growth rate
      const growthRate = memberStats.new_members_prev_12m > 0
        ? ((memberStats.new_members_12m - memberStats.new_members_prev_12m) / memberStats.new_members_prev_12m) * 100
        : 0;

      // Generate growth projections (next 12 months)
      const currentMembers = memberStats.total_members;
      const monthlyGrowth = growthRate / 12;
      const growthProjections: Array<{
        period: string;
        conservative: number;
        projected: number;
        optimistic: number;
      }> = [];

      for (let i = 1; i <= 12; i++) {
        const month = new Date();
        month.setMonth(month.getMonth() + i);
        const conservative = Math.floor(currentMembers * (1 + (monthlyGrowth * 0.5 / 100) * i));
        const projected = Math.floor(currentMembers * (1 + (monthlyGrowth / 100) * i));
        const optimistic = Math.floor(currentMembers * (1 + (monthlyGrowth * 1.5 / 100) * i));

        growthProjections.push({
          period: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          conservative,
          projected,
          optimistic
        });
      }

      // Risk assessment
      const riskLevel = growthRate < 5 ? 'High' : growthRate < 15 ? 'Medium' : 'Low';
      const overallScore = Math.min(100, Math.max(0, 50 + (growthRate * 2)));

      return {
        executiveSummary: {
          totalMembers: memberStats.total_members,
          growthRate: growthRate,
          marketPenetration: 12.5, // Placeholder - would need market data
          riskLevel: riskLevel,
          overallScore: overallScore
        },
        growthProjections: growthProjections.slice(0, 6), // Next 6 months
        riskAssessment: {
          risks: [
            {
              category: 'Membership Growth',
              level: growthRate < 10 ? 'High' : 'Medium',
              impact: 8,
              probability: 6,
              description: 'Declining or slow membership growth could impact organizational sustainability'
            },
            {
              category: 'Geographic Concentration',
              level: 'Medium',
              impact: 6,
              probability: 7,
              description: 'Over-reliance on specific geographic areas for membership'
            },
            {
              category: 'Member Retention',
              level: 'Medium',
              impact: 7,
              probability: 5,
              description: 'Risk of member attrition due to engagement or satisfaction issues'
            }
          ],
          mitigationStrategies: [
            {
              risk: 'Membership Growth',
              strategy: 'Implement targeted recruitment campaigns in underperforming areas',
              priority: 'High'
            },
            {
              risk: 'Geographic Concentration',
              strategy: 'Develop expansion strategies for new geographic markets',
              priority: 'Medium'
            },
            {
              risk: 'Member Retention',
              strategy: 'Enhance member engagement programs and feedback mechanisms',
              priority: 'High'
            }
          ]
        },
        marketAnalysis: {
          competitivePosition: 75,
          marketShare: 12.5,
          growthOpportunities: [
            {
              area: 'Rural Expansion',
              potential: 85,
              difficulty: 60,
              timeframe: '12-18 months'
            },
            {
              area: 'Youth Engagement',
              potential: 90,
              difficulty: 40,
              timeframe: '6-12 months'
            },
            {
              area: 'Digital Transformation',
              potential: 80,
              difficulty: 50,
              timeframe: '9-15 months'
            }
          ]
        },
        recommendations: [
          {
            category: 'Growth Strategy',
            priority: 'Critical',
            recommendation: 'Implement aggressive recruitment campaign targeting underrepresented demographics and geographic areas',
            expectedImpact: '25-40% membership increase',
            timeframe: '6-12 months',
            resources: 'Marketing budget, field staff, digital platforms'
          },
          {
            category: 'Technology Enhancement',
            priority: 'High',
            recommendation: 'Develop mobile app and digital engagement platform to improve member experience',
            expectedImpact: '15-25% engagement increase',
            timeframe: '9-12 months',
            resources: 'Development team, UX/UI design, infrastructure'
          },
          {
            category: 'Geographic Expansion',
            priority: 'High',
            recommendation: 'Establish regional offices in high-potential, underserved areas',
            expectedImpact: '30-50% geographic coverage increase',
            timeframe: '12-18 months',
            resources: 'Office space, regional staff, operational budget'
          },
          {
            category: 'Member Retention',
            priority: 'Medium',
            recommendation: 'Implement comprehensive member feedback system and loyalty programs',
            expectedImpact: '10-20% retention improvement',
            timeframe: '3-6 months',
            resources: 'Survey platform, incentive budget, staff training'
          }
        ],
        performanceMetrics: {
          membershipEfficiency: 78.5,
          retentionRate: 85.2,
          acquisitionCost: 125.50,
          lifetimeValue: 2450.00,
          engagementScore: 72.3
        }
      };
    } catch (error) {
      throw createDatabaseError('Failed to get strategic insights', error);
    }
  }
}
