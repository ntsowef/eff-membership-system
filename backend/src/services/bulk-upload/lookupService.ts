import { Pool } from 'pg';

/**
 * Special VD Codes that don't require database validation
 * BUSINESS RULE: These codes exist in the voting_districts table and have special meanings
 * All special codes are 8 digits (matching the database schema)
 */
export const SPECIAL_VD_CODES: Record<string, string> = {
  '33333333': 'International Voter',
  '00000000': 'Not Registered Voter',
  '22222222': 'Registered in Different Wards',  // Registered voters without VD code
  '11111111': 'Deceased',
  '99999999': 'NOT REGISTERED VOTER'  // Non-registered voters
};

/**
 * Geographic codes result from ward lookup
 */
export interface GeographicCodes {
  municipality_code: string | null;
  municipality_name: string | null;
  district_code: string | null;
  district_name: string | null;
  province_code: string | null;
  province_name: string | null;
}

/**
 * Lookup Service for resolving lookup table IDs
 * Provides caching and default values matching Python implementation
 */
export class LookupService {
  private pool: Pool;
  private cache: Map<string, Map<string, number>>;
  private initialized: boolean = false;

  // Geographic lookup caches (matching Python: ward_to_municipality, municipality_to_district, etc.)
  private wardToMunicipality: Map<string, { code: string; name: string }> = new Map();
  private municipalityToDistrict: Map<string, { code: string; name: string }> = new Map();
  private districtToProvince: Map<string, { code: string; name: string }> = new Map();
  private municipalityToProvince: Map<string, { code: string; name: string }> = new Map();
  private validVdCodes: Set<string> = new Set();

  constructor(pool: Pool) {
    this.pool = pool;
    this.cache = new Map();
  }

  /**
   * Initialize lookup caches from database
   * Should be called once before processing bulk uploads
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[LookupService] Initializing lookup caches...');

    await Promise.all([
      this.loadLookupTable('genders', 'gender_id', 'gender_name'),
      this.loadLookupTable('races', 'race_id', 'race_name'),
      this.loadLookupTable('citizenships', 'citizenship_id', 'citizenship_name'),
      this.loadLookupTable('languages', 'language_id', 'language_name'),
      this.loadLookupTable('occupations', 'occupation_id', 'occupation_name'),
      this.loadLookupTable('qualifications', 'qualification_id', 'qualification_name'),
      this.loadLookupTable('voter_statuses', 'status_id', 'status_name'),
      this.loadLookupTable('subscription_types', 'subscription_type_id', 'subscription_name'),
      // Load geographic mappings (matching Python implementation)
      this.loadGeographicMappings()
    ]);

    this.initialized = true;
    console.log('[LookupService] Lookup caches initialized successfully');
  }

  /**
   * Load geographic mappings from database
   * Matches Python: ward_to_municipality, municipality_to_district, district_to_province, etc.
   */
  private async loadGeographicMappings(): Promise<void> {
    try {
      // Load ward -> municipality mapping
      const wardResult = await this.pool.query(`
        SELECT w.ward_code, w.municipality_code, m.municipality_name
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        WHERE w.ward_code IS NOT NULL
      `);
      for (const row of wardResult.rows) {
        if (row.ward_code && row.municipality_code) {
          this.wardToMunicipality.set(row.ward_code, {
            code: row.municipality_code,
            name: row.municipality_name || null
          });
        }
      }
      console.log(`[LookupService] ward_to_municipality: ${this.wardToMunicipality.size} mappings`);

      // Load municipality -> district mapping
      const muniDistResult = await this.pool.query(`
        SELECT m.municipality_code, m.district_code, d.district_name
        FROM municipalities m
        LEFT JOIN districts d ON m.district_code = d.district_code
        WHERE m.municipality_code IS NOT NULL AND m.district_code IS NOT NULL
      `);
      for (const row of muniDistResult.rows) {
        if (row.municipality_code && row.district_code) {
          this.municipalityToDistrict.set(row.municipality_code, {
            code: row.district_code,
            name: row.district_name || null
          });
        }
      }
      console.log(`[LookupService] municipality_to_district: ${this.municipalityToDistrict.size} mappings`);

      // Load district -> province mapping
      const distProvResult = await this.pool.query(`
        SELECT d.district_code, d.province_code, p.province_name
        FROM districts d
        JOIN provinces p ON d.province_code = p.province_code
        WHERE d.district_code IS NOT NULL AND d.province_code IS NOT NULL
      `);
      for (const row of distProvResult.rows) {
        if (row.district_code && row.province_code) {
          this.districtToProvince.set(row.district_code, {
            code: row.province_code,
            name: row.province_name || null
          });
        }
      }
      console.log(`[LookupService] district_to_province: ${this.districtToProvince.size} mappings`);

      // Load municipality -> province mapping (for metros without districts)
      const muniProvResult = await this.pool.query(`
        SELECT m.municipality_code,
               COALESCE(d.province_code, parent_d.province_code) as province_code,
               COALESCE(p.province_name, parent_p.province_name) as province_name
        FROM municipalities m
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN municipalities parent_m ON m.parent_municipality_code = parent_m.municipality_code
        LEFT JOIN districts parent_d ON parent_m.district_code = parent_d.district_code
        LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code
        WHERE COALESCE(d.province_code, parent_d.province_code) IS NOT NULL
      `);
      for (const row of muniProvResult.rows) {
        if (row.municipality_code && row.province_code) {
          this.municipalityToProvince.set(row.municipality_code, {
            code: row.province_code,
            name: row.province_name || null
          });
        }
      }
      console.log(`[LookupService] municipality_to_province: ${this.municipalityToProvince.size} mappings`);

      // Load valid VD codes
      const vdResult = await this.pool.query(`
        SELECT voting_district_code FROM voting_districts WHERE voting_district_code IS NOT NULL
      `);
      for (const row of vdResult.rows) {
        this.validVdCodes.add(row.voting_district_code);
      }
      // Add special VD codes to valid set
      Object.keys(SPECIAL_VD_CODES).forEach(code => this.validVdCodes.add(code));
      console.log(`[LookupService] valid_vd_codes: ${this.validVdCodes.size} codes (including ${Object.keys(SPECIAL_VD_CODES).length} special codes)`);

    } catch (error: any) {
      console.error('[LookupService] Error loading geographic mappings:', error.message);
    }
  }

  /**
   * Get geographic codes from ward code
   * Matches Python: get_geographic_codes_from_ward()
   */
  getGeographicCodesFromWard(wardCode: string | null | undefined): GeographicCodes {
    const result: GeographicCodes = {
      municipality_code: null,
      municipality_name: null,
      district_code: null,
      district_name: null,
      province_code: null,
      province_name: null
    };

    if (!wardCode) {
      return result;
    }

    const wardCodeStr = String(wardCode);

    // Get municipality from ward
    const muniInfo = this.wardToMunicipality.get(wardCodeStr);
    if (!muniInfo) {
      return result;
    }

    result.municipality_code = muniInfo.code;
    result.municipality_name = muniInfo.name;

    // Get district from municipality (if exists - metros don't have districts)
    const distInfo = this.municipalityToDistrict.get(muniInfo.code);
    if (distInfo) {
      result.district_code = distInfo.code;
      result.district_name = distInfo.name;

      // Get province from district
      const provInfo = this.districtToProvince.get(distInfo.code);
      if (provInfo) {
        result.province_code = provInfo.code;
        result.province_name = provInfo.name;
      }
    }

    // Try to get province from municipality_to_province mapping (for metros and sub-regions)
    if (!result.province_code) {
      const provInfo = this.municipalityToProvince.get(muniInfo.code);
      if (provInfo) {
        result.province_code = provInfo.code;
        result.province_name = provInfo.name;
      }
    }

    return result;
  }

  /**
   * Map voting district code based on IEC verification status
   * Matches Python: assign_vd_based_on_iec_status()
   *
   * CRITICAL: This function now compares the ward from the upload file with the ward from IEC
   * to determine if the voter is registered in a DIFFERENT_WARD.
   *
   * @param isRegistered - Whether voter is registered according to IEC
   * @param iecVdCode - The voting district code returned by IEC API
   * @param voterStatus - The voter status string from IEC (e.g., "Active", "Not Registered")
   * @param fileWardCode - The ward code from the upload file (the ward being uploaded for)
   * @param iecWardCode - The ward code returned by IEC API (where voter is actually registered)
   */
  mapVotingDistrictCode(
    isRegistered: boolean,
    iecVdCode: string | null | undefined,
    voterStatus: string | null | undefined,
    fileWardCode?: string | null,
    iecWardCode?: string | null
  ): string | null {
    // Not registered voters get special code
    if (!isRegistered) {
      return '99999999';
    }

    // Check voter status for special cases (deceased, international, etc.)
    const status = voterStatus?.toUpperCase() || '';
    if (status.includes('DECEASED')) {
      return '11111111';
    }
    if (status.includes('INTERNATIONAL')) {
      return '33333333';
    }

    // CRITICAL: Compare ward from file with ward from IEC to determine DIFFERENT_WARD
    // This matches Python logic: assign_vd_based_on_iec_status()
    if (fileWardCode && iecWardCode) {
      const normalizedFileWard = String(fileWardCode).trim();
      const normalizedIecWard = String(iecWardCode).trim();

      // If wards are DIFFERENT, assign special code 22222222
      if (normalizedFileWard !== normalizedIecWard) {
        console.log(`   🔄 DIFFERENT_WARD: File ward ${normalizedFileWard} ≠ IEC ward ${normalizedIecWard} → Using 22222222`);
        return '22222222';
      }
    }

    // If registered with valid VD code from IEC, USE IT (don't validate against DB)
    // This matches Python: "For REGISTERED_IN_WARD or other statuses, keep the original VD"
    if (iecVdCode) {
      // If it's a special code, return it
      if (iecVdCode in SPECIAL_VD_CODES) {
        return iecVdCode;
      }
      // Trust the IEC VD code - return it directly
      // Python doesn't validate VD codes against DB for REGISTERED_IN_WARD status
      console.log(`   ✅ REGISTERED_IN_WARD: Using IEC VD code ${iecVdCode}`);
      return iecVdCode;
    }

    // Registered but no VD code from IEC (shouldn't happen often)
    console.log(`   ⚠️ Registered but no VD code from IEC → Using 22222222`);
    return '22222222';
  }

  /**
   * Check if VD code is a special code
   */
  isSpecialVdCode(vdCode: string | null | undefined): boolean {
    if (!vdCode) return false;
    return vdCode in SPECIAL_VD_CODES;
  }

  /**
   * Check if VD code is valid (exists in DB or is special)
   */
  isValidVdCode(vdCode: string | null | undefined): boolean {
    if (!vdCode) return false;
    return this.validVdCodes.has(vdCode);
  }

  /**
   * Load a lookup table into cache
   */
  private async loadLookupTable(
    tableName: string,
    idColumn: string,
    nameColumn: string
  ): Promise<void> {
    try {
      const query = `SELECT ${idColumn}, ${nameColumn} FROM ${tableName} WHERE is_active = true`;
      const result = await this.pool.query(query);

      const tableCache = new Map<string, number>();
      for (const row of result.rows) {
        const name = String(row[nameColumn]).trim().toLowerCase();
        const id = row[idColumn];
        tableCache.set(name, id);
      }

      this.cache.set(tableName, tableCache);
      console.log(`[LookupService] Loaded ${tableCache.size} entries for ${tableName}`);
    } catch (error: any) {
      console.error(`[LookupService] Error loading ${tableName}:`, error.message);
      // Initialize empty cache to prevent errors
      this.cache.set(tableName, new Map());
    }
  }

  /**
   * Lookup ID from cache with default value
   * Matches Python implementation: lookup_id(table, value, default)
   */
  lookupId(tableName: string, value: string | null | undefined, defaultValue: number = 1): number {
    if (!value || value === 'N/A' || value === 'n/a' || value.trim() === '') {
      return defaultValue;
    }

    const valueLower = String(value).trim().toLowerCase();
    const tableCache = this.cache.get(tableName);

    if (!tableCache) {
      console.warn(`[LookupService] Table ${tableName} not found in cache, using default: ${defaultValue}`);
      return defaultValue;
    }

    const id = tableCache.get(valueLower);
    if (id !== undefined) {
      return id;
    }

    // Try partial matching for common variations
    if (tableName === 'citizenships') {
      // "South Africa" -> "South African Citizen"
      if (valueLower.includes('south africa') || valueLower.includes('sa citizen')) {
        return tableCache.get('south african citizen') || defaultValue;
      }
    }

    if (tableName === 'races') {
      // "BLACK" -> "African"
      if (valueLower === 'black') {
        return tableCache.get('african') || defaultValue;
      }
    }

    console.warn(`[LookupService] Value "${value}" not found in ${tableName}, using default: ${defaultValue}`);
    return defaultValue;
  }

  /**
   * Normalize voter status values to match database values
   * Matches Python implementation: normalize_voter_status()
   */
  normalizeVoterStatus(value: string | null | undefined): string {
    if (!value || value === 'N/A' || value === 'n/a' || value.trim() === '') {
      return 'Registered'; // Default
    }

    const valueLower = String(value).trim().toLowerCase();

    // Map common variations to database values
    if (valueLower.includes('registered in ward') || valueLower.includes('registered')) {
      return 'Registered';
    }
    if (valueLower.includes('not registered') || valueLower.includes('unregistered')) {
      return 'Not Registered';
    }
    if (valueLower.includes('deceased')) {
      return 'Deceased';
    }
    if (valueLower.includes('pending')) {
      return 'Pending Verification';
    }

    return 'Registered'; // Default
  }

  /**
   * Get gender ID from value
   */
  getGenderId(value: string | null | undefined): number {
    return this.lookupId('genders', value, 1);
  }

  /**
   * Get race ID from value
   */
  getRaceId(value: string | null | undefined): number {
    return this.lookupId('races', value, 1);
  }

  /**
   * Get citizenship ID from value
   */
  getCitizenshipId(value: string | null | undefined): number {
    return this.lookupId('citizenships', value, 1);
  }

  /**
   * Get language ID from value
   */
  getLanguageId(value: string | null | undefined): number {
    return this.lookupId('languages', value, 1);
  }

  /**
   * Get occupation ID from value
   */
  getOccupationId(value: string | null | undefined): number {
    return this.lookupId('occupations', value, 1);
  }

  /**
   * Get qualification ID from value
   */
  getQualificationId(value: string | null | undefined): number {
    return this.lookupId('qualifications', value, 1);
  }

  /**
   * Get voter status ID from value
   */
  getVoterStatusId(value: string | null | undefined): number {
    const normalized = this.normalizeVoterStatus(value);
    return this.lookupId('voter_statuses', normalized, 1);
  }

  /**
   * Get subscription type ID from value
   */
  getSubscriptionTypeId(value: string | null | undefined): number {
    return this.lookupId('subscription_types', value, 1);
  }
}

