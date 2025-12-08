import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// =====================================================
// Type Definitions
// =====================================================

export interface DelegateOverview {
  delegate_id: number;
  ward_code: string;
  ward_name: string;
  member_id: number;
  member_name: string;
  id_number: string;
  cell_number?: string;
  email?: string;
  assembly_type_id: number;
  assembly_code: string;
  assembly_name: string;
  assembly_level: string;
  selection_date: string;
  selection_method?: string;
  delegate_status: string;
  term_start_date?: string;
  term_end_date?: string;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  district_name: string;
  province_code: string;
  province_name: string;
}

export interface DelegateSummary {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  municipality_code: string;
  municipality_name: string;
  total_wards: number;
  compliant_wards: number;
  total_srpa_delegates: number;
  total_ppa_delegates: number;
  total_npa_delegates: number;
  total_delegates: number;
}

export interface ConferenceDelegateList {
  assembly_code: string;
  assembly_name: string;
  assembly_level: string;
  total_delegates: number;
  delegates: DelegateOverview[];
}

// =====================================================
// Delegates Management Model
// =====================================================

export class DelegatesManagementModel {
  
  /**
   * Get all delegates across the organization with hierarchical filtering
   */
  static async getAllDelegates(filters?: {
    province_code?: string;
    district_code?: string;
    municipality_code?: string;
    assembly_code?: string;
    delegate_status?: string;
  }): Promise<DelegateOverview[]> {
    try {
      let query = `
        SELECT
          wd.delegate_id,
          wd.ward_code,
          w.ward_name,
          wd.member_id,
          CONCAT(m.firstname, ' ', m.surname) as member_name,
          m.id_number,
          m.cell_number,
          m.email,
          wd.assembly_type_id,
          at.assembly_code,
          at.assembly_name,
          at.assembly_level,
          wd.selection_date,
          wd.selection_method,
          wd.delegate_status,
          wd.term_start_date,
          wd.term_end_date,
          mu.municipality_code,
          COALESCE(mu.municipality_name, d.district_name) as municipality_name,
          d.district_code,
          d.district_name,
          p.province_code,
          p.province_name
        FROM ward_delegates wd
        JOIN wards w ON wd.ward_code = w.ward_code
        JOIN members_consolidated m ON wd.member_id = m.member_id
        JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.province_code && filters.province_code.trim() !== '') {
        query += ` AND p.province_code = $${paramIndex}`;
        params.push(filters.province_code);
        paramIndex++;
      }

      if (filters?.district_code && filters.district_code.trim() !== '') {
        query += ` AND d.district_code = $${paramIndex}`;
        params.push(filters.district_code);
        paramIndex++;
      }

      if (filters?.municipality_code && filters.municipality_code.trim() !== '') {
        query += ` AND mu.municipality_code = $${paramIndex}`;
        params.push(filters.municipality_code);
        paramIndex++;
      }

      if (filters?.assembly_code && filters.assembly_code.trim() !== '') {
        query += ` AND at.assembly_code = $${paramIndex}`;
        params.push(filters.assembly_code);
        paramIndex++;
      }

      if (filters?.delegate_status && filters.delegate_status.trim() !== '') {
        query += ` AND wd.delegate_status = $${paramIndex}`;
        params.push(filters.delegate_status);
        paramIndex++;
      }

      query += `
        ORDER BY
          p.province_name,
          d.district_name,
          mu.municipality_name,
          w.ward_name,
          at.assembly_level,
          wd.selection_date DESC
      `;

      return await executeQuery<DelegateOverview>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch all delegates', error);
    }
  }

  /**
   * Get delegate summary by geographic hierarchy
   */
  static async getDelegateSummary(filters?: {
    province_code?: string;
    district_code?: string;
  }): Promise<DelegateSummary[]> {
    try {
      let query = `
        SELECT
          p.province_code,
          p.province_name,
          d.district_code,
          d.district_name,
          mu.municipality_code,
          COALESCE(mu.municipality_name, d.district_name) as municipality_name,
          COUNT(DISTINCT w.ward_code) as total_wards,
          COUNT(DISTINCT CASE WHEN w.is_compliant = TRUE THEN w.ward_code END) as compliant_wards,
          COUNT(DISTINCT CASE WHEN at.assembly_code = 'SRPA' AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as total_srpa_delegates,
          COUNT(DISTINCT CASE WHEN at.assembly_code = 'PPA' AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as total_ppa_delegates,
          COUNT(DISTINCT CASE WHEN at.assembly_code = 'NPA' AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as total_npa_delegates,
          COUNT(DISTINCT CASE WHEN wd.delegate_status = 'Active' THEN wd.delegate_id END) as total_delegates
        FROM wards w
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
        LEFT JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
        WHERE COALESCE(w.is_active, TRUE) = TRUE
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.province_code && filters.province_code.trim() !== '') {
        query += ` AND p.province_code = $${paramIndex}`;
        params.push(filters.province_code);
        paramIndex++;
      }

      if (filters?.district_code && filters.district_code.trim() !== '') {
        query += ` AND d.district_code = $${paramIndex}`;
        params.push(filters.district_code);
        paramIndex++;
      }

      query += `
        GROUP BY
          p.province_code,
          p.province_name,
          d.district_code,
          d.district_name,
          mu.municipality_code,
          mu.municipality_name
        ORDER BY
          p.province_name,
          d.district_name,
          mu.municipality_name
      `;

      return await executeQuery<DelegateSummary>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch delegate summary', error);
    }
  }

  /**
   * Get delegates grouped by conference/assembly type
   */
  static async getDelegatesByConference(assemblyCode: string): Promise<ConferenceDelegateList> {
    try {
      const delegates = await this.getAllDelegates({
        assembly_code: assemblyCode,
        delegate_status: 'Active'
      });

      if (delegates.length === 0) {
        return {
          assembly_code: assemblyCode,
          assembly_name: '',
          assembly_level: '',
          total_delegates: 0,
          delegates: []
        };
      }

      return {
        assembly_code: assemblyCode,
        assembly_name: delegates[0].assembly_name,
        assembly_level: delegates[0].assembly_level,
        total_delegates: delegates.length,
        delegates
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch delegates by conference', error);
    }
  }

  /**
   * Get delegate statistics
   */
  static async getDelegateStatistics(): Promise<{
    total_delegates: number;
    active_delegates: number;
    inactive_delegates: number;
    srpa_delegates: number;
    ppa_delegates: number;
    npa_delegates: number;
    total_compliant_wards: number;
    total_wards: number;
    provinces_with_delegates: number;
  }> {
    try {
      const query = `
        SELECT
          COUNT(DISTINCT wd.delegate_id) as total_delegates,
          COUNT(DISTINCT CASE WHEN wd.delegate_status = 'Active' THEN wd.delegate_id END) as active_delegates,
          COUNT(DISTINCT CASE WHEN wd.delegate_status != 'Active' THEN wd.delegate_id END) as inactive_delegates,
          COUNT(DISTINCT CASE WHEN at.assembly_code = 'SRPA' AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as srpa_delegates,
          COUNT(DISTINCT CASE WHEN at.assembly_code = 'PPA' AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as ppa_delegates,
          COUNT(DISTINCT CASE WHEN at.assembly_code = 'NPA' AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as npa_delegates,
          COUNT(DISTINCT CASE WHEN w.is_compliant = TRUE THEN w.ward_code END) as total_compliant_wards,
          COUNT(DISTINCT w.ward_code) as total_wards,
          COUNT(DISTINCT p.province_code) as provinces_with_delegates
        FROM wards w
        LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
        LEFT JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        WHERE COALESCE(w.is_active, TRUE) = TRUE
      `;

      const result = await executeQuery<any>(query);
      return result[0] || {
        total_delegates: 0,
        active_delegates: 0,
        inactive_delegates: 0,
        srpa_delegates: 0,
        ppa_delegates: 0,
        npa_delegates: 0,
        total_compliant_wards: 0,
        total_wards: 0,
        provinces_with_delegates: 0
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch delegate statistics', error);
    }
  }
}
