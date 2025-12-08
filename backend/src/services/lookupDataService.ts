import { executeQuery } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';

/**
 * Validation patterns to prevent garbage data in lookup tables
 */
const VALIDATION_PATTERNS = {
  // Patterns that indicate garbage data (addresses, phone numbers, dates, etc.)
  GARBAGE_PATTERNS: [
    /^\d{10,}$/,                    // Phone numbers (10+ digits)
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,  // Dates like 11/08/2024 or 2024-08-11
    /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,    // ISO dates like 2024-08-11
    /\d{2}:\d{2}:\d{2}/,            // Time patterns
    /^stand\s+\d+/i,                // Addresses like "Stand 5578"
    /^ny\s+\d+/i,                   // Addresses like "Ny 61"
    /^\d+\s+(st|nd|rd|th)\s+/i,     // Street addresses
    /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,  // Email addresses
    /^[a-zA-Z0-9._%+-]+@gmail\.com$/i,  // Gmail addresses
    /^\d+\s+[a-zA-Z]+\s+(street|road|avenue|ave|drive|lane)/i,  // Street addresses
    /^(good standing|pending|approved|rejected|n\/a|\.+)$/i,  // Status values
  ],

  // Minimum and maximum length for occupation names
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
};

/**
 * Validate occupation name to prevent garbage data
 */
function validateOccupationName(name: string): { valid: boolean; reason?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'Occupation name is required' };
  }

  const trimmedName = name.trim();

  // Check length
  if (trimmedName.length < VALIDATION_PATTERNS.MIN_LENGTH) {
    return { valid: false, reason: `Occupation name must be at least ${VALIDATION_PATTERNS.MIN_LENGTH} characters` };
  }

  if (trimmedName.length > VALIDATION_PATTERNS.MAX_LENGTH) {
    return { valid: false, reason: `Occupation name must not exceed ${VALIDATION_PATTERNS.MAX_LENGTH} characters` };
  }

  // Check against garbage patterns
  for (const pattern of VALIDATION_PATTERNS.GARBAGE_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return { valid: false, reason: `Invalid occupation name: appears to be address, phone number, date, or other non-occupation data` };
    }
  }

  // Check if it's mostly numbers (likely garbage)
  const digitCount = (trimmedName.match(/\d/g) || []).length;
  if (digitCount > trimmedName.length * 0.5) {
    return { valid: false, reason: 'Occupation name should not be mostly numbers' };
  }

  return { valid: true };
}

/**
 * Lookup Data Service
 * Manages all system lookup tables and reference data
 */
export class LookupDataService {
  
  // Define all available lookup tables
  private static readonly LOOKUP_TABLES = {
    provinces: {
      table: 'provinces',
      idColumn: 'province_id',
      nameColumn: 'province_name',
      codeColumn: 'province_code',
      displayName: 'Provinces'
    },
    municipalities: {
      table: 'municipalities',
      idColumn: 'municipality_id',
      nameColumn: 'municipality_name',
      codeColumn: 'municipal_code',
      displayName: 'Municipalities'
    },
    wards: {
      table: 'wards',
      idColumn: 'ward_id',
      nameColumn: 'ward_name',
      codeColumn: 'ward_code',
      displayName: 'Wards'
    },
    voting_districts: {
      table: 'voting_districts',
      idColumn: 'vd_id',
      nameColumn: 'vd_name',
      codeColumn: 'vd_code',
      displayName: 'Voting Districts'
    },
    voting_stations: {
      table: 'voting_stations',
      idColumn: 'vs_id',
      nameColumn: 'vs_name',
      codeColumn: 'vs_code',
      displayName: 'Voting Stations'
    },
    membership_statuses: {
      table: 'membership_statuses',
      idColumn: 'membership_status_id',
      nameColumn: 'status_name',
      codeColumn: null,
      displayName: 'Membership Statuses'
    },
    admin_levels: {
      table: 'admin_levels',
      idColumn: 'admin_level_id',
      nameColumn: 'level_name',
      codeColumn: null,
      displayName: 'Admin Levels'
    },
    roles: {
      table: 'roles',
      idColumn: 'role_id',
      nameColumn: 'role_name',
      codeColumn: null,
      displayName: 'Roles'
    },
    genders: {
      table: 'genders',
      idColumn: 'gender_id',
      nameColumn: 'gender_name',
      codeColumn: 'gender_code',
      displayName: 'Genders'
    },
    races: {
      table: 'races',
      idColumn: 'race_id',
      nameColumn: 'race_name',
      codeColumn: 'race_code',
      displayName: 'Races'
    },
    languages: {
      table: 'languages',
      idColumn: 'language_id',
      nameColumn: 'language_name',
      codeColumn: 'language_code',
      displayName: 'Languages'
    },
    qualifications: {
      table: 'qualifications',
      idColumn: 'qualification_id',
      nameColumn: 'qualification_name',
      codeColumn: 'qualification_code',
      displayName: 'Qualifications'
    },
    occupation_categories: {
      table: 'occupation_categories',
      idColumn: 'category_id',
      nameColumn: 'category_name',
      codeColumn: 'category_code',
      displayName: 'Occupation Categories'
    },
    occupations: {
      table: 'occupations',
      idColumn: 'occupation_id',
      nameColumn: 'occupation_name',
      codeColumn: 'occupation_code',
      displayName: 'Occupations'
    },
    meeting_types: {
      table: 'meeting_types',
      idColumn: 'type_id',
      nameColumn: 'type_name',
      codeColumn: 'type_code',
      displayName: 'Meeting Types'
    }
  };

  /**
   * Get list of all available lookup tables
   */
  static getLookupTables(): any[] {
    return Object.entries(this.LOOKUP_TABLES).map(([key, config]) => ({
      key,
      table: config.table,
      display_name: config.displayName,
      id_column: config.idColumn,
      name_column: config.nameColumn,
      code_column: config.codeColumn
    }));
  }

  /**
   * Get entries for a specific lookup table
   */
  static async getLookupEntries(tableName: string, filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      const tableConfig = this.LOOKUP_TABLES[tableName as keyof typeof this.LOOKUP_TABLES];
      
      if (!tableConfig) {
        throw new Error(`Invalid lookup table: ${tableName}`);
      }

      const { table, idColumn, nameColumn, codeColumn } = tableConfig;
      const { search, limit = 100, offset = 0 } = filters || {};

      let whereConditions: string[] = ['1=1'];
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        const searchConditions: string[] = [];
        searchConditions.push(`${nameColumn} ILIKE $${paramIndex}`);
        if (codeColumn) {
          searchConditions.push(`${codeColumn} ILIKE $${paramIndex}`);
        }
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Build column list
      const columns = [idColumn, nameColumn];
      if (codeColumn) columns.push(codeColumn);
      
      // Add common columns if they exist
      const commonColumns = ['is_active', 'created_at', 'updated_at'];
      
      const query = `
        SELECT ${columns.join(', ')}
        ${commonColumns.map(col => `, CASE WHEN EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${table}' AND column_name = '${col}'
        ) THEN ${col} ELSE NULL END as ${col}`).join('')}
        FROM ${table}
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${nameColumn}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);

      const entries = await executeQuery(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${table}
        WHERE ${whereConditions.join(' AND ')}
      `;

      const countResult = await executeQuery(countQuery, params.slice(0, -2));
      const total = parseInt(countResult[0]?.total || '0');

      return {
        table_name: tableName,
        display_name: tableConfig.displayName,
        id_column: idColumn,
        name_column: nameColumn,
        code_column: codeColumn,
        entries,
        total,
        limit,
        offset,
        has_more: offset + limit < total
      };
    } catch (error) {
      throw createDatabaseError(`Failed to fetch lookup entries for ${tableName}`, error);
    }
  }

  /**
   * Add new lookup entry
   */
  static async addLookupEntry(tableName: string, data: any): Promise<any> {
    try {
      const tableConfig = this.LOOKUP_TABLES[tableName as keyof typeof this.LOOKUP_TABLES];

      if (!tableConfig) {
        throw new Error(`Invalid lookup table: ${tableName}`);
      }

      const { table, idColumn, nameColumn, codeColumn } = tableConfig;

      // VALIDATION: Prevent garbage data in occupation table
      if (tableName === 'occupations' && data[nameColumn]) {
        const validation = validateOccupationName(data[nameColumn]);
        if (!validation.valid) {
          throw new Error(`Invalid occupation entry: ${validation.reason}`);
        }
      }

      // Build insert query dynamically based on provided data
      const columns: string[] = [];
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      if (data[nameColumn]) {
        columns.push(nameColumn);
        values.push(data[nameColumn]);
        placeholders.push(`$${paramIndex++}`);
      }

      if (codeColumn && data[codeColumn]) {
        columns.push(codeColumn);
        values.push(data[codeColumn]);
        placeholders.push(`$${paramIndex++}`);
      }

      // Add other fields if provided
      const additionalFields = ['is_active', 'description', 'province_code', 'municipal_code', 'ward_code'];
      for (const field of additionalFields) {
        if (data[field] !== undefined) {
          columns.push(field);
          values.push(data[field]);
          placeholders.push(`$${paramIndex++}`);
        }
      }

      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await executeQuery(query, values);

      return {
        success: true,
        message: `Lookup entry added successfully`,
        entry: result[0]
      };
    } catch (error) {
      throw createDatabaseError(`Failed to add lookup entry to ${tableName}`, error);
    }
  }

  /**
   * Update lookup entry
   */
  static async updateLookupEntry(tableName: string, id: number, data: any): Promise<any> {
    try {
      const tableConfig = this.LOOKUP_TABLES[tableName as keyof typeof this.LOOKUP_TABLES];

      if (!tableConfig) {
        throw new Error(`Invalid lookup table: ${tableName}`);
      }

      const { table, idColumn, nameColumn, codeColumn } = tableConfig;

      // VALIDATION: Prevent garbage data in occupation table
      if (tableName === 'occupations' && data[nameColumn]) {
        const validation = validateOccupationName(data[nameColumn]);
        if (!validation.valid) {
          throw new Error(`Invalid occupation entry: ${validation.reason}`);
        }
      }

      // Build update query dynamically based on provided data
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data[nameColumn] !== undefined) {
        updates.push(`${nameColumn} = $${paramIndex++}`);
        values.push(data[nameColumn]);
      }

      if (codeColumn && data[codeColumn] !== undefined) {
        updates.push(`${codeColumn} = $${paramIndex++}`);
        values.push(data[codeColumn]);
      }

      // Add other fields if provided
      const additionalFields = ['is_active', 'description', 'province_code', 'municipal_code', 'ward_code'];
      for (const field of additionalFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(data[field]);
        }
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_at if column exists
      updates.push(`updated_at = NOW()`);

      values.push(id);

      const query = `
        UPDATE ${table}
        SET ${updates.join(', ')}
        WHERE ${idColumn} = $${paramIndex}
        RETURNING *
      `;

      const result = await executeQuery(query, values);

      if (result.length === 0) {
        throw new Error(`Lookup entry with ID ${id} not found`);
      }

      return {
        success: true,
        message: `Lookup entry updated successfully`,
        entry: result[0]
      };
    } catch (error) {
      throw createDatabaseError(`Failed to update lookup entry in ${tableName}`, error);
    }
  }

  /**
   * Delete/deactivate lookup entry
   */
  static async deleteLookupEntry(tableName: string, id: number): Promise<any> {
    try {
      const tableConfig = this.LOOKUP_TABLES[tableName as keyof typeof this.LOOKUP_TABLES];

      if (!tableConfig) {
        throw new Error(`Invalid lookup table: ${tableName}`);
      }

      const { table, idColumn } = tableConfig;

      // Check if table has is_active column
      const checkColumnQuery = `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'is_active'
        ) as has_is_active
      `;

      const checkResult = await executeQuery(checkColumnQuery, [table]);
      const hasIsActive = checkResult[0]?.has_is_active;

      let query: string;

      if (hasIsActive) {
        // Soft delete by setting is_active to false
        query = `
          UPDATE ${table}
          SET is_active = false, updated_at = NOW()
          WHERE ${idColumn} = $1
          RETURNING *
        `;
      } else {
        // Hard delete
        query = `
          DELETE FROM ${table}
          WHERE ${idColumn} = $1
          RETURNING *
        `;
      }

      const result = await executeQuery(query, [id]);

      if (result.length === 0) {
        throw new Error(`Lookup entry with ID ${id} not found`);
      }

      return {
        success: true,
        message: hasIsActive ? `Lookup entry deactivated successfully` : `Lookup entry deleted successfully`,
        entry: result[0],
        action: hasIsActive ? 'deactivated' : 'deleted'
      };
    } catch (error) {
      throw createDatabaseError(`Failed to delete lookup entry from ${tableName}`, error);
    }
  }

  /**
   * Bulk import lookup data
   */
  static async bulkImportLookupData(tableName: string, entries: any[]): Promise<any> {
    try {
      const tableConfig = this.LOOKUP_TABLES[tableName as keyof typeof this.LOOKUP_TABLES];

      if (!tableConfig) {
        throw new Error(`Invalid lookup table: ${tableName}`);
      }

      if (!entries || entries.length === 0) {
        throw new Error('No entries provided for import');
      }

      const { table, nameColumn, codeColumn } = tableConfig;

      let successCount = 0;
      let failureCount = 0;
      const errors: any[] = [];

      for (const entry of entries) {
        try {
          await this.addLookupEntry(tableName, entry);
          successCount++;
        } catch (error) {
          failureCount++;
          errors.push({
            entry,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: true,
        message: `Bulk import completed`,
        total: entries.length,
        success_count: successCount,
        failure_count: failureCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      throw createDatabaseError(`Failed to bulk import lookup data to ${tableName}`, error);
    }
  }

  /**
   * Export lookup data
   */
  static async exportLookupData(tableName: string): Promise<any[]> {
    try {
      const result = await this.getLookupEntries(tableName, { limit: 10000, offset: 0 });
      return result.entries;
    } catch (error) {
      throw createDatabaseError(`Failed to export lookup data from ${tableName}`, error);
    }
  }
}

