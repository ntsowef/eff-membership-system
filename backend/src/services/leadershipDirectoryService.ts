import ExcelJS from 'exceljs';
import { executeQuery, executeQuerySingle } from '../config/database-hybrid';
import { createDatabaseError, NotFoundError } from '../middleware/errorHandler';

// Leadership Directory interfaces
export interface RosterRow {
  position_id: number;
  position_name: string;
  position_code: string;
  position_order: number;
  position_category: string | null;
  section: string;
  member_id: number;
  member_name: string;
  id_number: string | null;
  membership_number: string;
  cell_number: string | null;
  email: string | null;
  start_date: string;
  appointment_status: string;
  province_name: string | null;
  municipality_name: string | null;
  ward_code: string | null;
  ward_name: string | null;
}

export interface DirectoryProvince {
  province_id: number;
  province_code: string;
  province_name: string;
}

export interface DirectoryMunicipality {
  municipality_id: number;
  municipality_code: string;
  municipality_name: string;
  municipality_type: string;
}

export interface BCTWardRoster {
  ward_id: number;
  ward_code: string;
  ward_number: string;
  ward_name: string;
  roster: RosterRow[];
}

// Shared roster column list used by all directory queries
const ROSTER_COLUMNS = `
  lp.id as position_id,
  lp.position_name,
  lp.position_code,
  lp.position_order,
  lp.position_category,
  la.member_id,
  TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')) as member_name,
  m.id_number,
  'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
  m.cell_number,
  m.email,
  la.start_date,
  la.appointment_status
`;

const ROSTER_BASE_JOINS = `
  FROM leadership_appointments la
  JOIN leadership_positions lp ON la.position_id = lp.id AND lp.is_active = TRUE
  LEFT JOIN members_consolidated m ON la.member_id = m.member_id
`;

// Leadership Directory Service
export class LeadershipDirectoryService {
  // Get province by ID (throws NotFoundError if missing)
  static async getProvince(provinceId: number): Promise<DirectoryProvince> {
    const province = await executeQuerySingle<DirectoryProvince>(
      'SELECT province_id, province_code, province_name FROM provinces WHERE province_id = ?',
      [provinceId]
    );
    if (!province) {
      throw new NotFoundError('Province not found');
    }
    return province;
  }

  // Get municipality by ID (throws NotFoundError if missing)
  static async getMunicipality(municipalityId: number): Promise<DirectoryMunicipality> {
    const municipality = await executeQuerySingle<DirectoryMunicipality>(
      'SELECT municipality_id, municipality_code, municipality_name, municipality_type FROM municipalities WHERE municipality_id = ?',
      [municipalityId]
    );
    if (!municipality) {
      throw new NotFoundError('Municipality not found');
    }
    return municipality;
  }

  // CCT (Central Command Team) roster: National Top 6, National Youth Leadership,
  // and Provincial Chairpersons & Secretaries
  static async getCCTRoster(): Promise<RosterRow[]> {
    try {
      const query = `
        SELECT
          position_id, position_name, position_code, position_order, position_category,
          member_id, member_name, id_number, membership_number, cell_number, email,
          start_date, appointment_status, section,
          province_name, municipality_name, ward_code, ward_name
        FROM (
          SELECT
            1 as section_order,
            ${ROSTER_COLUMNS},
            'National Top 6' as section,
            NULL::TEXT as province_name,
            NULL::TEXT as municipality_name,
            NULL::TEXT as ward_code,
            NULL::TEXT as ward_name
          ${ROSTER_BASE_JOINS}
          WHERE la.appointment_status = 'Active'
            AND la.hierarchy_level = 'National'
            AND lp.position_code IN ('PRES', 'DPRES', 'SG', 'DSG', 'NCHAIR', 'TG')
          UNION ALL
          SELECT
            2 as section_order,
            ${ROSTER_COLUMNS},
            'National Youth Leadership' as section,
            NULL::TEXT as province_name,
            NULL::TEXT as municipality_name,
            NULL::TEXT as ward_code,
            NULL::TEXT as ward_name
          ${ROSTER_BASE_JOINS}
          WHERE la.appointment_status = 'Active'
            AND la.hierarchy_level = 'National'
            AND (
              lp.position_code = 'PYOUTH'
              OR (lp.hierarchy_level = 'National' AND (
                lp.position_name ILIKE '%youth%conven%'
                OR lp.position_name ILIKE '%youth%coordinat%'
              ))
            )
          UNION ALL
          SELECT
            3 as section_order,
            ${ROSTER_COLUMNS},
            'Provincial Chairpersons & Secretaries' as section,
            p.province_name,
            NULL::TEXT as municipality_name,
            NULL::TEXT as ward_code,
            NULL::TEXT as ward_name
          ${ROSTER_BASE_JOINS}
          JOIN provinces p ON p.province_id = la.entity_id
          WHERE la.appointment_status = 'Active'
            AND la.hierarchy_level = 'Province'
            AND (lp.position_code LIKE 'PCHAIR\\_%' OR lp.position_code LIKE 'PSEC\\_%')
        ) roster
        ORDER BY section_order, province_name, position_order
      `;
      return await executeQuery<RosterRow>(query, []);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw createDatabaseError('Failed to get CCT roster', error);
    }
  }

  // PCT (Provincial Command Team) roster for a province
  static async getPCTRoster(provinceId: number): Promise<{ province: DirectoryProvince; roster: RosterRow[] }> {
    try {
      const province = await this.getProvince(provinceId);

      const query = `
        SELECT
          ${ROSTER_COLUMNS},
          CASE
            WHEN lp.position_category = 'Executive' AND lp.position_order BETWEEN 10 AND 14
            THEN 'Top 5 Executive'
            ELSE 'Additional Members'
          END as section,
          p.province_name,
          NULL::TEXT as municipality_name,
          NULL::TEXT as ward_code,
          NULL::TEXT as ward_name
        ${ROSTER_BASE_JOINS}
        JOIN provinces p ON p.province_id = la.entity_id
        WHERE la.appointment_status = 'Active'
          AND la.hierarchy_level = 'Province'
          AND la.entity_id = ?
          AND lp.position_category IN ('Executive', 'PCT')
        ORDER BY lp.position_order
      `;
      const roster = await executeQuery<RosterRow>(query, [provinceId]);

      return { province, roster };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw createDatabaseError('Failed to get PCT roster', error);
    }
  }

  // SRCT (Sub-Regional Command Team) roster for a municipality
  static async getSRCTRoster(municipalityId: number): Promise<{ municipality: DirectoryMunicipality; roster: RosterRow[] }> {
    try {
      const municipality = await this.getMunicipality(municipalityId);

      const query = `
        SELECT
          ${ROSTER_COLUMNS},
          COALESCE(lp.position_category, 'SRCT') as section,
          NULL::TEXT as province_name,
          mun.municipality_name,
          NULL::TEXT as ward_code,
          NULL::TEXT as ward_name
        ${ROSTER_BASE_JOINS}
        JOIN municipalities mun ON mun.municipality_id = la.entity_id
        WHERE la.appointment_status = 'Active'
          AND la.hierarchy_level = 'Municipality'
          AND la.entity_id = ?
        ORDER BY lp.position_order
      `;
      const roster = await executeQuery<RosterRow>(query, [municipalityId]);

      return { municipality, roster };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw createDatabaseError('Failed to get SRCT roster', error);
    }
  }

  // BCT (Branch Command Team) rosters for all wards in a municipality
  // (including wards of child municipalities, e.g. metro sub-regions)
  static async getBCTRostersByMunicipality(municipalityId: number): Promise<{
    municipality: DirectoryMunicipality;
    wards: BCTWardRoster[];
  }> {
    try {
      const municipality = await this.getMunicipality(municipalityId);

      const query = `
        SELECT
          ${ROSTER_COLUMNS},
          COALESCE(lp.position_category, 'BCT') as section,
          NULL::TEXT as province_name,
          NULL::TEXT as municipality_name,
          w.ward_id,
          w.ward_code,
          w.ward_number,
          w.ward_name
        ${ROSTER_BASE_JOINS}
        JOIN wards w ON w.ward_id = la.entity_id
        WHERE la.appointment_status = 'Active'
          AND la.hierarchy_level = 'Ward'
          AND w.municipality_code IN (
            SELECT municipality_code FROM municipalities WHERE municipality_id = ?
            UNION
            SELECT municipality_code FROM municipalities WHERE parent_municipality_id = ?
          )
        ORDER BY w.ward_code, lp.position_order
      `;
      const rows = await executeQuery<RosterRow & { ward_id: number; ward_number: string }>(
        query,
        [municipalityId, municipalityId]
      );

      // Group rows by ward
      const wardMap = new Map<number, BCTWardRoster>();
      for (const row of rows) {
        if (!wardMap.has(row.ward_id)) {
          wardMap.set(row.ward_id, {
            ward_id: row.ward_id,
            ward_code: row.ward_code || '',
            ward_number: row.ward_number,
            ward_name: row.ward_name || '',
            roster: []
          });
        }
        wardMap.get(row.ward_id)!.roster.push(row);
      }

      return { municipality, wards: Array.from(wardMap.values()) };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw createDatabaseError('Failed to get BCT rosters', error);
    }
  }

  // Municipalities in a province that have at least one active Municipality-level appointment
  static async getMunicipalitiesWithSRCT(provinceId: number, includeWardLevel = false): Promise<DirectoryMunicipality[]> {
    try {
      await this.getProvince(provinceId);

      const wardExistsClause = includeWardLevel
        ? `
          OR EXISTS (
            SELECT 1
            FROM wards w2
            JOIN leadership_appointments la2 ON la2.entity_id = w2.ward_id
            JOIN leadership_positions lp2 ON la2.position_id = lp2.id AND lp2.is_active = TRUE
            WHERE w2.municipality_code = mun.municipality_code
              AND la2.hierarchy_level = 'Ward'
              AND la2.appointment_status = 'Active'
          )
        `
        : '';

      const query = `
        SELECT
          mun.municipality_id,
          mun.municipality_code,
          mun.municipality_name,
          mun.municipality_type
        FROM municipalities mun
        LEFT JOIN districts d ON mun.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN municipalities parent_mun ON mun.parent_municipality_id = parent_mun.municipality_id
        LEFT JOIN districts pd ON parent_mun.district_code = pd.district_code
        LEFT JOIN provinces pp ON pd.province_code = pp.province_code
        WHERE COALESCE(p.province_id, pp.province_id) = ?
          AND (
            EXISTS (
              SELECT 1
              FROM leadership_appointments la
              JOIN leadership_positions lp ON la.position_id = lp.id AND lp.is_active = TRUE
              WHERE la.hierarchy_level = 'Municipality'
                AND la.entity_id = mun.municipality_id
                AND la.appointment_status = 'Active'
            )
            ${wardExistsClause}
          )
        ORDER BY mun.municipality_name
      `;
      return await executeQuery<DirectoryMunicipality>(query, [provinceId]);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw createDatabaseError('Failed to get municipalities with SRCT appointments', error);
    }
  }

  // ==================== EXCEL EXPORT BUILDERS ====================

  // Sanitize a worksheet name (max 31 chars, no []:*?/\) and dedupe collisions
  private static sanitizeSheetName(name: string, used: Set<string>): string {
    let base = name.replace(/[\[\]:*?/\\]/g, '').trim() || 'Sheet';
    base = base.substring(0, 31);

    let candidate = base;
    let counter = 2;
    while (used.has(candidate)) {
      const suffix = ` (${counter})`;
      candidate = base.substring(0, 31 - suffix.length) + suffix;
      counter++;
    }

    used.add(candidate);
    return candidate;
  }

  // Add a styled roster sheet to a workbook
  private static addRosterSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    rows: RosterRow[],
    locationColumns: Array<'province' | 'municipality' | 'ward'>
  ): void {
    const columns: Array<{ header: string; key: string; width: number }> = [
      { header: 'Section', key: 'section', width: 32 },
      { header: 'Position', key: 'position_name', width: 35 },
      { header: 'Position Code', key: 'position_code', width: 16 },
      { header: 'Member Name', key: 'member_name', width: 30 },
      { header: 'ID Number', key: 'id_number', width: 16 },
      { header: 'SMS/Cell Number', key: 'cell_number', width: 18 },
      { header: 'WhatsApp Number', key: 'whatsapp_number', width: 18 },
      { header: 'Email', key: 'email', width: 30 }
    ];

    if (locationColumns.includes('province')) {
      columns.push({ header: 'Province', key: 'province_name', width: 18 });
    }
    if (locationColumns.includes('municipality')) {
      columns.push({ header: 'Municipality', key: 'municipality_name', width: 28 });
    }
    if (locationColumns.includes('ward')) {
      columns.push({ header: 'Ward Code', key: 'ward_code', width: 14 });
      columns.push({ header: 'Ward Name', key: 'ward_name', width: 24 });
    }

    columns.push({ header: 'Start Date', key: 'start_date', width: 14 });
    columns.push({ header: 'Status', key: 'appointment_status', width: 12 });

    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    for (const row of rows) {
      sheet.addRow({
        section: row.section ?? '',
        position_name: row.position_name ?? '',
        position_code: row.position_code ?? '',
        member_name: row.member_name ?? '',
        id_number: row.id_number ?? '',
        cell_number: row.cell_number ?? '',
        whatsapp_number: row.cell_number ?? '',
        email: row.email ?? '',
        province_name: row.province_name ?? '',
        municipality_name: row.municipality_name ?? '',
        ward_code: row.ward_code ?? '',
        ward_name: row.ward_name ?? '',
        start_date: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : '',
        appointment_status: row.appointment_status ?? ''
      });
    }
  }

  private static createWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EFF Membership System';
    workbook.created = new Date();
    return workbook;
  }

  // Build CCT export workbook (single sheet)
  static async buildCCTWorkbook(): Promise<Buffer> {
    const roster = await this.getCCTRoster();

    const workbook = this.createWorkbook();
    this.addRosterSheet(workbook, 'CCT - Central Command Team', roster, ['province']);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Build provincial export workbook: PCT sheet + one SRCT sheet per municipality
  static async buildProvincialWorkbook(provinceId: number): Promise<Buffer> {
    const { province, roster } = await this.getPCTRoster(provinceId);
    const municipalities = await this.getMunicipalitiesWithSRCT(provinceId);

    const workbook = this.createWorkbook();
    const usedNames = new Set<string>();

    const pctSheetName = this.sanitizeSheetName(`PCT - ${province.province_name}`, usedNames);
    this.addRosterSheet(workbook, pctSheetName, roster, ['province']);

    for (const municipality of municipalities) {
      const { roster: srctRoster } = await this.getSRCTRoster(municipality.municipality_id);
      const sheetName = this.sanitizeSheetName(`SRCT - ${municipality.municipality_name}`, usedNames);
      this.addRosterSheet(workbook, sheetName, srctRoster, ['municipality']);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Build SRCT export workbook (single sheet)
  static async buildSRCTWorkbook(municipalityId: number): Promise<Buffer> {
    const { municipality, roster } = await this.getSRCTRoster(municipalityId);

    const workbook = this.createWorkbook();
    const usedNames = new Set<string>();

    const sheetName = this.sanitizeSheetName(`SRCT - ${municipality.municipality_name}`, usedNames);
    this.addRosterSheet(workbook, sheetName, roster, ['municipality']);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Build BCT export workbook (one sheet per ward)
  static async buildBCTWorkbook(municipalityId: number): Promise<Buffer> {
    const { wards } = await this.getBCTRostersByMunicipality(municipalityId);

    const workbook = this.createWorkbook();
    const usedNames = new Set<string>();

    if (wards.length === 0) {
      const sheet = workbook.addWorksheet('No Data');
      sheet.addRow(['No active ward-level (BCT) appointments found for this municipality']);
    } else {
      for (const ward of wards) {
        const sheetName = this.sanitizeSheetName(ward.ward_code || `Ward ${ward.ward_id}`, usedNames);
        this.addRosterSheet(workbook, sheetName, ward.roster, ['ward']);
      }
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
