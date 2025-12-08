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
 * Language name variations mapping
 * Maps common variations to official database language names
 * Handles: simplified names, uppercase, common misspellings
 */
const LANGUAGE_VARIATIONS: Record<string, string> = {
  // Setswana variations
  'tswana': 'setswana',
  'setswana': 'setswana',
  'botswana': 'setswana',

  // isiZulu variations
  'zulu': 'isizulu',
  'isizulu': 'isizulu',

  // isiXhosa variations
  'xhosa': 'isixhosa',
  'isixhosa': 'isixhosa',

  // isiNdebele variations
  'ndebele': 'isindebele',
  'isindebele': 'isindebele',

  // Sesotho variations
  'sotho': 'sesotho',
  'sesotho': 'sesotho',
  'south sotho': 'sesotho',
  'southern sotho': 'sesotho',

  // Sepedi variations (Northern Sotho)
  'pedi': 'sepedi',
  'sepedi': 'sepedi',
  'north sotho': 'sepedi',
  'northern sotho': 'sepedi',

  // siSwati variations
  'swati': 'siswati',
  'siswati': 'siswati',
  'swazi': 'siswati',

  // Tshivenda variations
  'venda': 'tshivenda',
  'tshivenda': 'tshivenda',

  // Xitsonga variations
  'tsonga': 'xitsonga',
  'xitsonga': 'xitsonga',
  'shangaan': 'xitsonga',

  // English and Afrikaans
  'english': 'english',
  'eng': 'english',
  'afrikaans': 'afrikaans',
  'afr': 'afrikaans',

  // Other
  'other': 'other',
  'unknown': 'other',
  'n/a': 'other'
};

/**
 * Gender variations mapping
 * Maps common variations to official database gender names
 */
const GENDER_VARIATIONS: Record<string, string> = {
  // Male variations
  'm': 'male',
  'male': 'male',
  'man': 'male',
  'boy': 'male',
  'mr': 'male',

  // Female variations
  'f': 'female',
  'female': 'female',
  'woman': 'female',
  'girl': 'female',
  'mrs': 'female',
  'ms': 'female',
  'miss': 'female',

  // Other
  'other': 'other',
  'o': 'other',
  'x': 'other',
  'non-binary': 'other',
  'nonbinary': 'other',

  // Prefer not to say
  'prefer not to say': 'prefer not to say',
  'not specified': 'prefer not to say',
  'unknown': 'prefer not to say',
  'n/a': 'prefer not to say'
};

/**
 * Race variations mapping
 * Maps common variations to official database race names
 */
const RACE_VARIATIONS: Record<string, string> = {
  // African variations
  'african': 'african',
  'black': 'african',
  'black african': 'african',
  'a': 'african',

  // Coloured variations
  'coloured': 'coloured',
  'colored': 'coloured',
  'c': 'coloured',
  'cape coloured': 'coloured',

  // Indian variations
  'indian': 'indian',
  'asian': 'indian',
  'i': 'indian',
  'south asian': 'indian',

  // White variations
  'white': 'white',
  'w': 'white',
  'caucasian': 'white',
  'european': 'white',

  // Other
  'other': 'other',
  'o': 'other',
  'mixed': 'other',

  // Prefer not to say
  'prefer not to say': 'prefer not to say',
  'not specified': 'prefer not to say',
  'unknown': 'prefer not to say',
  'n/a': 'prefer not to say'
};

/**
 * Citizenship variations mapping
 */
const CITIZENSHIP_VARIATIONS: Record<string, string> = {
  // South African Citizen
  'south african citizen': 'south african citizen',
  'south african': 'south african citizen',
  'sa citizen': 'south african citizen',
  'sa': 'south african citizen',
  'citizen': 'south african citizen',
  'rsa': 'south african citizen',

  // Permanent Resident
  'permanent resident': 'permanent resident',
  'pr': 'permanent resident',
  'permanent': 'permanent resident',

  // Temporary Resident
  'temporary resident': 'temporary resident',
  'temp resident': 'temporary resident',
  'temporary': 'temporary resident',

  // Refugee
  'refugee': 'refugee',
  'asylum': 'refugee',
  'asylum seeker': 'refugee',

  // Other
  'other': 'other',
  'foreign': 'other',
  'foreigner': 'other',
  'n/a': 'other'
};

/**
 * Occupation variations mapping
 * Maps common variations to normalized occupation names
 */
const OCCUPATION_VARIATIONS: Record<string, string> = {
  // Unemployed variations
  'unemployed': 'unemployed',
  'not employed': 'unemployed',
  'none': 'unemployed',
  'n/a': 'unemployed',
  'jobless': 'unemployed',

  // Student variations
  'student': 'student',
  'learner': 'student',
  'scholar': 'student',
  'pupil': 'student',

  // Self-employed variations
  'self employed': 'self-employed',
  'self-employed': 'self-employed',
  'business owner': 'self-employed',
  'entrepreneur': 'self-employed',

  // Pensioner variations
  'pensioner': 'pensioner',
  'retired': 'pensioner',
  'retiree': 'pensioner'
};

/**
 * Qualification variations mapping
 */
const QUALIFICATION_VARIATIONS: Record<string, string> = {
  // No formal education
  'none': 'no formal education',
  'no formal education': 'no formal education',
  'no education': 'no formal education',
  'n/a': 'no formal education',

  // Primary
  'primary': 'primary school',
  'primary school': 'primary school',
  'grade 7': 'primary school',

  // Secondary
  'secondary': 'secondary school',
  'secondary school': 'secondary school',
  'high school': 'secondary school',
  'matric': 'matric',
  'grade 12': 'matric',

  // Tertiary
  'diploma': 'diploma',
  'certificate': 'certificate',
  'degree': 'degree',
  'bachelor': 'degree',
  'bachelors': 'degree',
  "bachelor's": 'degree',
  'honours': 'honours',
  'honors': 'honours',
  'master': 'masters',
  'masters': 'masters',
  "master's": 'masters',
  'doctorate': 'doctorate',
  'phd': 'doctorate',
  'dr': 'doctorate'
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
      // Load voter registration statuses (migration 011)
      this.loadVoterRegistrationStatuses(),
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
   * Load voter registration statuses lookup table
   * Migration 011: voter_registration_statuses table
   */
  private async loadVoterRegistrationStatuses(): Promise<void> {
    try {
      const query = `SELECT registration_status_id, status_name FROM voter_registration_statuses`;
      const result = await this.pool.query(query);

      const tableCache = new Map<string, number>();
      for (const row of result.rows) {
        const name = String(row.status_name).trim().toLowerCase();
        const id = row.registration_status_id;
        tableCache.set(name, id);
      }

      this.cache.set('voter_registration_statuses', tableCache);
      console.log(`[LookupService] Loaded ${tableCache.size} entries for voter_registration_statuses`);
    } catch (error: any) {
      console.error(`[LookupService] Error loading voter_registration_statuses:`, error.message);
      // Initialize empty cache to prevent errors
      this.cache.set('voter_registration_statuses', new Map());
    }
  }

  /**
   * Determine voter registration status based on VD code
   *
   * Business Logic (all VD codes are 8 digits):
   * - '22222222', '33333333': Registered to vote, but not in that ward → Registered (1)
   * - '99999999': NOT registered to vote → Not Registered (2)
   * - '00000000': NOT registered to vote → Not Registered (2)
   * - Empty/NULL VD code: Unknown (3)
   * - Any other valid VD code: Registered (1)
   *
   * @param vdCode - Voting District code from IEC verification
   * @returns Object with voter_registration_id and is_registered_voter
   */
  getVoterRegistrationStatus(vdCode: string | number | null | undefined): { voterRegistrationId: number; isRegisteredVoter: boolean | null } {
    // VD codes for non-registered voters (8 digits to match SPECIAL_VD_CODES)
    const NOT_REGISTERED_CODES = new Set(['99999999', '00000000']);

    // Handle null, undefined, empty values
    if (vdCode === null || vdCode === undefined) {
      // Unknown - no VD code available
      return { voterRegistrationId: 3, isRegisteredVoter: null };
    }

    // Convert to string first to safely use trim()
    const vdCodeStr = String(vdCode).trim();

    if (vdCodeStr === '') {
      // Unknown - empty VD code
      return { voterRegistrationId: 3, isRegisteredVoter: null };
    }

    if (NOT_REGISTERED_CODES.has(vdCodeStr)) {
      // Not Registered to vote
      return { voterRegistrationId: 2, isRegisteredVoter: false };
    }

    // All other codes (including 22222222, 33333333) are registered voters
    // 22222222 and 33333333 are registered but not in that ward
    return { voterRegistrationId: 1, isRegisteredVoter: true };
  }

  /**
   * Normalize a value using a variation mapping
   * @param value - The input value to normalize
   * @param variationMap - The mapping of variations to canonical values
   * @returns The normalized value or the original lowercase value if not found
   */
  private normalizeWithVariations(value: string, variationMap: Record<string, string>): string {
    const valueLower = value.trim().toLowerCase();

    // First try direct match in variation map
    if (variationMap[valueLower]) {
      return variationMap[valueLower];
    }

    // Try partial matching - check if any key is contained in the value
    for (const [key, canonical] of Object.entries(variationMap)) {
      if (valueLower.includes(key) || key.includes(valueLower)) {
        return canonical;
      }
    }

    return valueLower;
  }

  /**
   * Lookup ID from cache with default value
   * Uses fuzzy matching and variation mappings for intelligent lookups
   * Matches Python implementation: lookup_id(table, value, default)
   */
  lookupId(tableName: string, value: string | number | null | undefined, defaultValue: number = 1): number {
    // Handle null, undefined, empty values
    if (value === null || value === undefined) {
      return defaultValue;
    }

    // Convert to string first to safely use trim()
    const valueStr = String(value);

    if (valueStr === '' || valueStr === 'N/A' || valueStr === 'n/a' || valueStr.trim() === '') {
      return defaultValue;
    }

    const tableCache = this.cache.get(tableName);

    if (!tableCache) {
      console.warn(`[LookupService] Table ${tableName} not found in cache, using default: ${defaultValue}`);
      return defaultValue;
    }

    const valueLower = valueStr.trim().toLowerCase();

    // Try direct match first
    let id = tableCache.get(valueLower);
    if (id !== undefined) {
      return id;
    }

    // Apply table-specific variation mapping
    let normalizedValue = valueLower;

    switch (tableName) {
      case 'languages':
        normalizedValue = this.normalizeWithVariations(valueLower, LANGUAGE_VARIATIONS);
        break;
      case 'genders':
        normalizedValue = this.normalizeWithVariations(valueLower, GENDER_VARIATIONS);
        break;
      case 'races':
        normalizedValue = this.normalizeWithVariations(valueLower, RACE_VARIATIONS);
        break;
      case 'citizenships':
        normalizedValue = this.normalizeWithVariations(valueLower, CITIZENSHIP_VARIATIONS);
        break;
      case 'occupations':
        normalizedValue = this.normalizeWithVariations(valueLower, OCCUPATION_VARIATIONS);
        break;
      case 'qualifications':
        normalizedValue = this.normalizeWithVariations(valueLower, QUALIFICATION_VARIATIONS);
        break;
    }

    // Try lookup with normalized value
    if (normalizedValue !== valueLower) {
      id = tableCache.get(normalizedValue);
      if (id !== undefined) {
        // Log successful fuzzy match for debugging
        console.log(`[LookupService] Fuzzy match: "${value}" → "${normalizedValue}" in ${tableName}`);
        return id;
      }
    }

    // Try partial matching against cache keys as last resort
    for (const [cacheKey, cacheId] of tableCache.entries()) {
      // Check if cache key contains the value or vice versa
      if (cacheKey.includes(valueLower) || valueLower.includes(cacheKey)) {
        console.log(`[LookupService] Partial match: "${value}" ≈ "${cacheKey}" in ${tableName}`);
        return cacheId;
      }
    }

    console.warn(`[LookupService] Value "${value}" not found in ${tableName}, using default: ${defaultValue}`);
    return defaultValue;
  }

  /**
   * Normalize voter status values to match database values
   * Matches Python implementation: normalize_voter_status()
   */
  normalizeVoterStatus(value: string | number | null | undefined): string {
    // Handle null, undefined, empty values
    if (value === null || value === undefined) {
      return 'Registered'; // Default
    }

    // Convert to string first to safely use trim()
    const valueStr = String(value);

    if (valueStr === '' || valueStr === 'N/A' || valueStr === 'n/a' || valueStr.trim() === '') {
      return 'Registered'; // Default
    }

    const valueLower = valueStr.trim().toLowerCase();

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

