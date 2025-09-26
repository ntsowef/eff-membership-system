import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Geographic data interfaces
export interface Province {
  province_code: string;
  province_name: string;
}

export interface District {
  district_code: string;
  district_name: string;
  province_code: string;
  province_name?: string;
}

export interface Municipality {
  municipality_code: string;
  municipality_name: string;
  district_code: string | null;
  province_code: string;
  municipality_type: 'Local' | 'Metropolitan' | 'District';
  district_name?: string;
  province_name?: string;
}

export interface Ward {
  ward_code: string;
  ward_number: string;
  ward_name: string;
  municipality_code: string;
  district_code: string | null;
  province_code: string;
  municipality_name?: string;
  district_name?: string;
  province_name?: string;
}

// Geographic model class
export class GeographicModel {
  // Province methods
  static async getAllProvinces(): Promise<Province[]> {
    try {
      const query = `
        SELECT
          province_code,
          province_name
        FROM provinces
        ORDER BY province_name
      `;

      return await executeQuery<Province>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch provinces', error);
    }
  }

  static async getProvinceByCode(code: string): Promise<Province | null> {
    try {
      const query = `
        SELECT
          province_code,
          province_name
        FROM provinces
        WHERE province_code = ?
      `;

      return await executeQuerySingle<Province>(query, [code]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch province', error);
    }
  }

  // District methods
  static async getAllDistricts(): Promise<District[]> {
    try {
      const query = `
        SELECT
          d.district_code,
          d.district_name,
          d.province_code,
          p.province_name
        FROM districts d
        LEFT JOIN provinces p ON d.province_code = p.province_code
        ORDER BY p.province_name, d.district_name
      `;

      return await executeQuery<District>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch districts', error);
    }
  }

  static async getDistrictByCode(code: string): Promise<District | null> {
    try {
      const query = `
        SELECT
          d.district_code,
          d.district_name,
          d.province_code,
          p.province_name
        FROM districts d
        LEFT JOIN provinces p ON d.province_code = p.province_code
        WHERE d.district_code = ?
      `;

      return await executeQuerySingle<District>(query, [code]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch district', error);
    }
  }

  static async getDistrictsByProvince(provinceCode: string): Promise<District[]> {
    try {
      const query = `
        SELECT
          d.district_code,
          d.district_name,
          d.province_code,
          p.province_name
        FROM districts d
        LEFT JOIN provinces p ON d.province_code = p.province_code
        WHERE d.province_code = ?
        ORDER BY d.district_name
      `;

      return await executeQuery<District>(query, [provinceCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch districts by province', error);
    }
  }

  // Municipality methods
  static async getAllMunicipalities(): Promise<Municipality[]> {
    try {
      const query = `
        SELECT
          municipality_code,
          municipality_name,
          district_code,
          province_code,
          municipality_type
        FROM municipalities
        ORDER BY province_code, municipality_name
      `;

      return await executeQuery<Municipality>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipalities', error);
    }
  }

  static async getMunicipalityByCode(code: string): Promise<Municipality | null> {
    try {
      const query = `
        SELECT
          municipality_code,
          municipality_name,
          district_code,
          province_code,
          municipality_type
        FROM municipalities
        WHERE municipality_code = ?
      `;

      return await executeQuerySingle<Municipality>(query, [code]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipality', error);
    }
  }

  static async getMunicipalitiesByDistrict(districtCode: string): Promise<Municipality[]> {
    try {
      const query = `
        SELECT
          municipality_code,
          municipality_name,
          district_code,
          province_code,
          municipality_type
        FROM municipalities
        WHERE district_code = ?
        ORDER BY municipality_name
      `;

      return await executeQuery<Municipality>(query, [districtCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipalities by district', error);
    }
  }

  static async getMunicipalitiesByProvince(provinceCode: string): Promise<Municipality[]> {
    try {
      const query = `
        SELECT
          municipality_code,
          municipality_name,
          district_code,
          province_code,
          municipality_type
        FROM municipalities
        WHERE province_code = ?
        ORDER BY municipality_name
      `;

      return await executeQuery<Municipality>(query, [provinceCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipalities by province', error);
    }
  }

  // Ward methods
  static async getAllWards(limit: number = 1000, offset: number = 0): Promise<Ward[]> {
    try {
      const query = `
        SELECT
          w.ward_code,
          w.ward_number,
          w.ward_name,
          w.municipality_code,
          w.district_code,
          w.province_code,
          m.municipality_name,
          d.district_name,
          p.province_name
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        ORDER BY p.province_name, d.district_name, m.municipality_name, w.ward_number
        LIMIT ? OFFSET ?
      `;

      return await executeQuery<Ward>(query, [limit, offset]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch wards', error);
    }
  }

  static async getWardByCode(code: string): Promise<Ward | null> {
    try {
      const query = `
        SELECT 
          w.ward_id,
          w.ward_code,
          w.ward_number,
          w.ward_name,
          w.municipality_code,
          w.district_code,
          w.province_code,
          m.municipality_name,
          d.district_name,
          p.province_name,
          w.created_at,
          w.updated_at
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE w.ward_code = ?
      `;
      
      return await executeQuerySingle<Ward>(query, [code]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch ward', error);
    }
  }

  static async getWardsByMunicipality(municipalityCode: string): Promise<Ward[]> {
    try {
      const query = `
        SELECT
          w.id,
          w.ward_code,
          w.ward_number,
          w.ward_name,
          w.municipality_code,
          w.district_code,
          w.province_code,
          m.municipality_name,
          d.district_name,
          p.province_name,
          w.created_at,
          w.updated_at
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE w.municipality_code = ?
        ORDER BY w.ward_number
      `;
      
      return await executeQuery<Ward>(query, [municipalityCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch wards by municipality', error);
    }
  }

  static async getWardsCount(): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM wards';
      const result = await executeQuerySingle<{ count: number }>(query);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get wards count', error);
    }
  }
}
