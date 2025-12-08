import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export interface MemberAuditResult {
  member_id: number;
  membership_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_status: string;
  is_active: boolean;
  ward_code: string;
  ward_name: string;
  voting_district_code?: string;
  voting_district_name?: string;
  residential_address?: string;
  issue_type: string;
  issue_description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WardAuditSummary {
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  municipality_name: string;
  total_members: number;
  active_members: number;
  registered_voters: number;
  unregistered_voters: number;
  incorrect_ward_assignments: number;
  membership_threshold_met: boolean;
  threshold_percentage: number;
  issues_count: number;
}

export interface MunicipalityAuditSummary {
  municipality_code: string;
  municipality_name: string;
  province_code: string;
  province_name: string;
  total_wards: number;
  wards_meeting_threshold: number;
  threshold_compliance_percentage: number;
  total_members: number;
  total_registered_voters: number;
  wards_over_101_members: number;
  high_priority_issues: number;
  last_audit_date: string;
}

export class MemberAuditService {
  
  // Individual Member Status Validation
  static async validateMemberStatus(filters: {
    province_code?: string;
    municipality_code?: string;
    ward_code?: string;
    membership_status?: string;
  } = {}): Promise<MemberAuditResult[]> {
    try {
      let query = `
        SELECT 
          m.member_id,
          m.membership_number,
          m.first_name,
          m.last_name,
          m.email,
          m.phone,
          ms.status_name as membership_status,
          ms.is_active,
          m.ward_code,
          w.ward_name,
          m.voting_district_code,
          vd.vd_name as voting_district_name,
          m.street_address || ' || ' || m.suburb || ' || ' || m.city as residential_address,
          CASE 
            WHEN ms.is_active = FALSE THEN 'inactive_membership'
            WHEN m.voting_district_code IS NULL THEN 'no_voting_registration'
            WHEN m.ward_code != vd.ward_code THEN 'incorrect_ward_assignment'
            ELSE 'valid'
          END as issue_type,
          CASE 
            WHEN ms.is_active = FALSE THEN 'Member has inactive membership status'
            WHEN m.voting_district_code IS NULL THEN 'Member not registered to vote'
            WHEN m.ward_code != vd.ward_code THEN 'Member assigned to incorrect ward'
            ELSE 'No issues found'
          END as issue_description,
          CASE 
            WHEN ms.is_active = FALSE THEN 'high'
            WHEN m.voting_district_code IS NULL THEN 'medium'
            WHEN m.ward_code != vd.ward_code THEN 'critical'
            ELSE 'low'
          END as severity
        FROM members m
        JOIN membership_statuses ms ON m.status_id = ms.status_id
        JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.vd_code
        WHERE 1= TRUE
      `;

      const params: any[] = [];

      if (filters.province_code) {
        query += ' AND w.province_code = ? ';
        params.push(filters.province_code);
      }

      if (filters.municipality_code) {
        query += ' AND w.municipal_code = $1';
        params.push(filters.municipality_code);
      }

      if (filters.ward_code) {
        query += ' AND m.ward_code = $1';
        params.push(filters.ward_code);
      }

      if (filters.membership_status) {
        query += ' AND ms.status_name = $1';
        params.push(filters.membership_status);
      }

      query += ' ORDER BY severity DESC, m.last_name, m.first_name';

      const results = await executeQuery(query, params);
      return results;
    } catch (error) {
      throw createDatabaseError('Failed to validate member status', error);
    }
  }

  // Ward-Level Analysis
  static async generateWardAuditSummary(filters : {
    province_code?: string;
    municipality_code?: string;
    ward_code?: string;
  } = {}): Promise<WardAuditSummary[]> {
    try {
      let query = `
        SELECT 
          w.ward_code,
          w.ward_name,
          w.municipal_code as municipality_code,
          mu.municipal_name as municipality_name,
          COUNT(DISTINCT m.member_id) as total_members,
          COUNT(DISTINCT CASE WHEN ms.is_active = TRUE THEN m.member_id END) as active_members,
          COUNT(DISTINCT CASE WHEN m.voting_district_code IS NOT NULL THEN m.member_id END) as registered_voters,
          COUNT(DISTINCT CASE WHEN m.voting_district_code IS NULL THEN m.member_id END) as unregistered_voters,
          COUNT(DISTINCT CASE WHEN m.ward_code != vd.ward_code THEN m.member_id END) as incorrect_ward_assignments,
          CASE WHEN COUNT(DISTINCT m.member_id) >= 101 THEN TRUE ELSE FALSE END as membership_threshold_met,
          ROUND((COUNT(DISTINCT m.member_id) / 101.0) * 100, 2) as threshold_percentage,
          COUNT(DISTINCT CASE 
            WHEN ms.is_active = FALSE OR m.voting_district_code IS NULL OR m.ward_code != vd.ward_code 
            THEN m.member_id 
          END) as issues_count
        FROM wards w
        LEFT JOIN members m ON w.ward_code = m.ward_code
        LEFT JOIN membership_statuses ms ON m.status_id = ms.status_id
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.vd_code
        LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
        WHERE 1= TRUE
      `;

      const params: any[] = [];

      if (filters.province_code) {
        query += ' AND w.province_code = ? ';
        params.push(filters.province_code);
      }

      if (filters.municipality_code) {
        query += ' AND w.municipal_code = $1';
        params.push(filters.municipality_code);
      }

      if (filters.ward_code) {
        query += ' AND w.ward_code = $1';
        params.push(filters.ward_code);
      }

      query += `
        GROUP BY w.ward_code, w.ward_name, w.municipal_code, mu.municipal_name
        ORDER BY issues_count DESC, total_members DESC
      `;

      const results = await executeQuery(query, params);
      return results;
    } catch (error) {
      throw createDatabaseError('Failed to generate ward audit summary', error);
    }
  }

  // Municipality Threshold Monitoring
  static async generateMunicipalityAuditSummary(filters : {
    province_code?: string;
  } = {}): Promise<MunicipalityAuditSummary[]> {
    try {
      let query = `
        SELECT 
          mu.municipal_code as municipality_code,
          mu.municipal_name as municipality_name,
          mu.province_code,
          p.province_name,
          COUNT(DISTINCT w.ward_code) as total_wards,
          COUNT(DISTINCT CASE WHEN ward_stats.total_members >= 101 THEN w.ward_code END) as wards_meeting_threshold,
          ROUND(
            (COUNT(DISTINCT CASE WHEN ward_stats.total_members >= 101 THEN w.ward_code END) / 
             COUNT(DISTINCT w.ward_code)) * 100, 2
          ) as threshold_compliance_percentage,
          COALESCE(SUM(ward_stats.total_members), 0) as total_members,
          COALESCE(SUM(ward_stats.registered_voters), 0) as total_registered_voters,
          COUNT(DISTINCT CASE WHEN ward_stats.total_members > 101 THEN w.ward_code END) as wards_over_101_members,
          COALESCE(SUM(ward_stats.issues_count), 0) as high_priority_issues,
          CURRENT_TIMESTAMP as last_audit_date
        FROM municipalities mu
        JOIN provinces p ON mu.province_code = p.province_code
        LEFT JOIN wards w ON mu.municipal_code = w.municipal_code
        LEFT JOIN (
          SELECT 
            w2.ward_code,
            COUNT(DISTINCT m.member_id) as total_members,
            COUNT(DISTINCT CASE WHEN m.voting_district_code IS NOT NULL THEN m.member_id END) as registered_voters,
            COUNT(DISTINCT CASE 
              WHEN ms.is_active = FALSE OR m.voting_district_code IS NULL OR m.ward_code != vd.ward_code 
              THEN m.member_id 
            END) as issues_count
          FROM wards w2
          LEFT JOIN members m ON w2.ward_code = m.ward_code
          LEFT JOIN membership_statuses ms ON m.status_id = ms.status_id
          LEFT JOIN voting_districts vd ON m.voting_district_code = vd.vd_code
          GROUP BY w2.ward_code
        ) ward_stats ON w.ward_code = ward_stats.ward_code
        WHERE 1= TRUE
      `;

      const params: any[] = [];

      if (filters.province_code) {
        query += ' AND mu.province_code = ? ';
        params.push(filters.province_code);
      }

      query += `
        GROUP BY mu.municipal_code, mu.municipal_name, mu.province_code, p.province_name
        ORDER BY threshold_compliance_percentage DESC, total_members DESC
      `;

      const results = await executeQuery(query, params);
      return results;
    } catch (error) {
      throw createDatabaseError('Failed to generate municipality audit summary', error);
    }
  }

  // Get Audit Statistics Overview
  static async getAuditOverview(filters : {
    province_code?: string;
    municipality_code?: string;
  } = {}): Promise<{
    total_members: number;
    active_members: number;
    inactive_members: number;
    registered_voters: number;
    unregistered_voters: number;
    incorrect_ward_assignments: number;
    wards_meeting_threshold: number;
    total_wards: number;
    municipalities_compliant: number;
    total_municipalities: number;
    critical_issues: number;
    high_issues: number;
    medium_issues: number;
    low_issues: number;
  }> {
    try {
      let query = `
        SELECT 
          COUNT(DISTINCT m.member_id) as total_members,
          COUNT(DISTINCT CASE WHEN ms.is_active = TRUE THEN m.member_id END) as active_members,
          COUNT(DISTINCT CASE WHEN ms.is_active = FALSE THEN m.member_id END) as inactive_members,
          COUNT(DISTINCT CASE WHEN m.voting_district_code IS NOT NULL THEN m.member_id END) as registered_voters,
          COUNT(DISTINCT CASE WHEN m.voting_district_code IS NULL THEN m.member_id END) as unregistered_voters,
          COUNT(DISTINCT CASE WHEN m.ward_code != vd.ward_code THEN m.member_id END) as incorrect_ward_assignments,
          COUNT(DISTINCT CASE WHEN ward_members.member_count >= 101 THEN w.ward_code END) as wards_meeting_threshold,
          COUNT(DISTINCT w.ward_code) as total_wards,
          COUNT(DISTINCT CASE WHEN muni_compliance.compliance_rate >= 70 THEN mu.municipal_code END) as municipalities_compliant,
          COUNT(DISTINCT mu.municipal_code) as total_municipalities,
          COUNT(DISTINCT CASE WHEN m.ward_code != vd.ward_code THEN m.member_id END) as critical_issues,
          COUNT(DISTINCT CASE WHEN ms.is_active = FALSE THEN m.member_id END) as high_issues,
          COUNT(DISTINCT CASE WHEN m.voting_district_code IS NULL THEN m.member_id END) as medium_issues,
          0 as low_issues
        FROM members m
        JOIN membership_statuses ms ON m.status_id = ms.status_id
        JOIN wards w ON m.ward_code = w.ward_code
        JOIN municipalities mu ON w.municipal_code = mu.municipal_code
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.vd_code
        LEFT JOIN (
          SELECT ward_code, COUNT(*) as member_count
          FROM members
          GROUP BY ward_code
        ) ward_members ON w.ward_code = ward_members.ward_code
        LEFT JOIN (
          SELECT 
            municipal_code,
            (COUNT(CASE WHEN member_count >= 101 THEN 1 END) / COUNT(*)) * 100 as compliance_rate
          FROM (
            SELECT w2.municipal_code, w2.ward_code, COUNT(m2.member_id) as member_count
            FROM wards w2
            LEFT JOIN members m2 ON w2.ward_code = m2.ward_code
            GROUP BY w2.municipal_code, w2.ward_code
          ) ward_stats
          GROUP BY municipal_code
        ) muni_compliance ON mu.municipal_code = muni_compliance.municipal_code
        WHERE 1= TRUE
      `;

      const params: any[] = [];

      if (filters.province_code) {
        query += ' AND mu.province_code = ? ';
        params.push(filters.province_code);
      }

      if (filters.municipality_code) {
        query += ' AND mu.municipal_code = $1';
        params.push(filters.municipality_code);
      }

      const result = await executeQuerySingle(query, params);
      return result || {
        total_members : 0,
        active_members: 0,
        inactive_members: 0,
        registered_voters: 0,
        unregistered_voters: 0,
        incorrect_ward_assignments: 0,
        wards_meeting_threshold: 0,
        total_wards: 0,
        municipalities_compliant: 0,
        total_municipalities: 0,
        critical_issues: 0,
        high_issues: 0,
        medium_issues: 0,
        low_issues: 0
      };
    } catch (error) {
      throw createDatabaseError('Failed to get audit overview', error);
    }
  }
}
