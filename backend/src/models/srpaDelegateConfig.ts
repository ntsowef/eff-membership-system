import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError, createValidationError } from '../middleware/errorHandler';

// =====================================================
// Type Definitions
// =====================================================

export interface SRPADelegateConfig {
  id: number;
  province_code: string;
  sub_region_code: string;
  max_delegates: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface SRPADelegateConfigView {
  id: number;
  province_code: string;
  province_name: string;
  sub_region_code: string;
  sub_region_name: string;
  municipality_type: string;
  parent_municipality_code: string;
  parent_municipality_name: string;
  max_delegates: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  updated_by_name?: string;
  current_delegates_count: number;
}

// =====================================================
// SRPA Delegate Configuration Model
// =====================================================

export class SRPADelegateConfigModel {
  /**
   * Get delegate configuration for a specific sub-region
   */
  static async getConfigBySubRegion(subRegionCode: string): Promise<SRPADelegateConfig | null> {
    try {
      const query = `
        SELECT *
        FROM srpa_delegate_config
        WHERE sub_region_code = $1
          AND is_active = TRUE
      `;

      return await executeQuerySingle<SRPADelegateConfig>(query, [subRegionCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch SRPA delegate configuration', error);
    }
  }

  /**
   * Get all delegate configurations for a province
   */
  static async getConfigsByProvince(provinceCode: string): Promise<SRPADelegateConfigView[]> {
    try {
      const query = `
        SELECT *
        FROM vw_srpa_delegate_config
        WHERE province_code = $1
        ORDER BY sub_region_name
      `;

      return await executeQuery<SRPADelegateConfigView>(query, [provinceCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch SRPA delegate configurations for province', error);
    }
  }

  /**
   * Get all delegate configurations
   */
  static async getAllConfigs(): Promise<SRPADelegateConfigView[]> {
    try {
      const query = `
        SELECT *
        FROM vw_srpa_delegate_config
        ORDER BY province_name, sub_region_name
      `;

      return await executeQuery<SRPADelegateConfigView>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch all SRPA delegate configurations', error);
    }
  }

  /**
   * Create or update delegate configuration for a municipality (Local or Metro Sub-Region)
   */
  static async upsertConfig(data: {
    sub_region_code: string;
    max_delegates: number;
    notes?: string;
    user_id: number;
  }): Promise<SRPADelegateConfig> {
    try {
      // Validate max_delegates
      if (data.max_delegates < 1) {
        throw createValidationError('Maximum delegates must be at least 1');
      }

      // Get province_code for the municipality
      // For Local municipalities: get province from district
      // For Metro Sub-Regions: get province from parent municipality's district
      const municipalityQuery = `
        SELECT
          m.municipality_code,
          m.municipality_type,
          COALESCE(d.province_code, pd.province_code) as province_code
        FROM municipalities m
        LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN districts pd ON pm.district_code = pd.district_code
        WHERE m.municipality_code = $1
          AND m.municipality_type IN ('Local', 'Local Municipality', 'Metro Sub-Region')
      `;

      const municipality = await executeQuerySingle<{
        municipality_code: string;
        municipality_type: string;
        province_code: string
      }>(
        municipalityQuery,
        [data.sub_region_code]
      );

      if (!municipality) {
        throw createValidationError('Invalid municipality code or municipality is not eligible for SRPA delegate configuration');
      }

      if (!municipality.province_code) {
        throw createValidationError('Cannot determine province for this municipality');
      }

      // Upsert the configuration
      const query = `
        INSERT INTO srpa_delegate_config (
          province_code,
          sub_region_code,
          max_delegates,
          notes,
          created_by,
          updated_by
        ) VALUES ($1, $2, $3, $4, $5, $5)
        ON CONFLICT (sub_region_code)
        DO UPDATE SET
          max_delegates = EXCLUDED.max_delegates,
          notes = EXCLUDED.notes,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await executeQuerySingle<SRPADelegateConfig>(query, [
        municipality.province_code,
        data.sub_region_code,
        data.max_delegates,
        data.notes || null,
        data.user_id
      ]);

      if (!result) {
        throw new Error('Failed to create/update SRPA delegate configuration');
      }

      return result;
    } catch (error) {
      throw createDatabaseError('Failed to upsert SRPA delegate configuration', error);
    }
  }

  /**
   * Delete (deactivate) a delegate configuration
   */
  static async deleteConfig(subRegionCode: string): Promise<void> {
    try {
      const query = `
        UPDATE srpa_delegate_config
        SET is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE sub_region_code = $1
      `;

      await executeQuery(query, [subRegionCode]);
    } catch (error) {
      throw createDatabaseError('Failed to delete SRPA delegate configuration', error);
    }
  }

  /**
   * Get the maximum delegates allowed for a municipality
   * Returns default of 3 if no configuration exists
   */
  static async getMaxDelegates(municipalityCode: string): Promise<number> {
    try {
      const config = await this.getConfigBySubRegion(municipalityCode);
      return config?.max_delegates || 3; // Default to 3 if no config exists
    } catch (error) {
      // If error occurs, return default
      return 3;
    }
  }
}

