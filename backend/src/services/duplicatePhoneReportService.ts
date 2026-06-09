import { executeQuery } from '../config/database';
import * as ExcelJS from 'exceljs';

/**
 * Duplicate Phone Number Detection Report Service
 *
 * Identifies cell phone numbers shared by multiple members in the
 * members_consolidated table. Provides summary data, paginated detail,
 * and Excel export capabilities.
 */

// ── Interfaces ──────────────────────────────────────────────────

export interface DuplicatePhoneMember {
    cell_number: string;
    firstname: string;
    surname: string;
    id_number: string;
    province_name: string;
    municipality_name: string;
    ward_code: string;
    membership_status: string;
    expiry_date: string | null;
}

export interface DuplicatePhoneGroup {
    cell_number: string;
    member_count: number;
    members: DuplicatePhoneMember[];
}

export interface DuplicatePhoneFilters {
    province_code?: string;
    municipality_code?: string;
    page?: number;
    limit?: number;
}

// ── Service ─────────────────────────────────────────────────────

export class DuplicatePhoneReportService {

    /**
     * Build geographic WHERE clause fragments and positional params.
     */
    private static buildGeoFilter(
        province_code?: string,
        municipality_code?: string,
        startIdx = 1
    ): { filter: string; params: any[]; nextIdx: number } {
        let filter = '';
        const params: any[] = [];
        let idx = startIdx;

        if (municipality_code) {
            filter = `AND m.municipality_code = $${idx}`;
            params.push(municipality_code);
            idx++;
        } else if (province_code) {
            filter = `AND m.province_code = $${idx}`;
            params.push(province_code);
            idx++;
        }

        return { filter, params, nextIdx: idx };
    }

    /**
     * Get paginated duplicate-phone groups with member details.
     */
    static async getSummary(filters: DuplicatePhoneFilters = {}): Promise<{
        groups: DuplicatePhoneGroup[];
        pagination: { page: number; limit: number; total: number; total_pages: number };
        total_duplicate_numbers: number;
        total_affected_members: number;
    }> {
        const { province_code, municipality_code, page = 1, limit = 50 } = filters;
        const { filter: geoFilter, params: geoParams, nextIdx } =
            this.buildGeoFilter(province_code, municipality_code);

        // ── 1. Count how many distinct duplicate numbers exist ──
        const countQuery = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT TRIM(m.cell_number) AS cn
        FROM members_consolidated m
        WHERE m.cell_number IS NOT NULL
          AND m.cell_number != ''
          AND LENGTH(TRIM(m.cell_number)) >= 10
          ${geoFilter}
        GROUP BY TRIM(m.cell_number)
        HAVING COUNT(*) >= 2
      ) AS dup
    `;
        const countResult = await executeQuery<any>(countQuery, geoParams);
        const total = parseInt(countResult[0]?.total) || 0;

        // ── 2. Count total affected members ──
        const affectedQuery = `
      SELECT COALESCE(SUM(cnt), 0) AS total_affected
      FROM (
        SELECT COUNT(*) AS cnt
        FROM members_consolidated m
        WHERE m.cell_number IS NOT NULL
          AND m.cell_number != ''
          AND LENGTH(TRIM(m.cell_number)) >= 10
          ${geoFilter}
        GROUP BY TRIM(m.cell_number)
        HAVING COUNT(*) >= 2
      ) AS dup
    `;
        const affectedResult = await executeQuery<any>(affectedQuery, geoParams);
        const totalAffected = parseInt(affectedResult[0]?.total_affected) || 0;

        // ── 3. Get paginated list of duplicate numbers ──
        const offset = (page - 1) * limit;
        const numbersParams = [...geoParams, limit, offset];

        const numbersQuery = `
      SELECT TRIM(m.cell_number) AS cell_number, COUNT(*) AS member_count
      FROM members_consolidated m
      WHERE m.cell_number IS NOT NULL
        AND m.cell_number != ''
        AND LENGTH(TRIM(m.cell_number)) >= 10
        ${geoFilter}
      GROUP BY TRIM(m.cell_number)
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC, TRIM(m.cell_number)
      LIMIT $${nextIdx} OFFSET $${nextIdx + 1}
    `;

        const dupNumbers = await executeQuery<{ cell_number: string; member_count: number }>(
            numbersQuery,
            numbersParams
        );

        if (dupNumbers.length === 0) {
            return {
                groups: [],
                pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
                total_duplicate_numbers: total,
                total_affected_members: totalAffected,
            };
        }

        // ── 4. Fetch member details for the current page of numbers ──
        const phoneValues = dupNumbers.map(d => d.cell_number);
        const placeholders = phoneValues.map((_, i) => `$${i + 1}`).join(', ');

        const membersQuery = `
      SELECT
        TRIM(m.cell_number) AS cell_number,
        COALESCE(m.firstname, '') AS firstname,
        COALESCE(m.surname, '') AS surname,
        COALESCE(m.id_number, '') AS id_number,
        COALESCE(m.province_name, '') AS province_name,
        COALESCE(m.municipality_name, '') AS municipality_name,
        COALESCE(m.ward_code, '') AS ward_code,
        COALESCE(mst.status_name, 'Unknown') AS membership_status,
        m.expiry_date
      FROM members_consolidated m
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE TRIM(m.cell_number) IN (${placeholders})
      ORDER BY TRIM(m.cell_number), m.surname, m.firstname
    `;
        const allMembers = await executeQuery<DuplicatePhoneMember>(membersQuery, phoneValues);

        // ── 5. Group members by phone number ──
        const membersByPhone = new Map<string, DuplicatePhoneMember[]>();
        for (const m of allMembers) {
            const arr = membersByPhone.get(m.cell_number) || [];
            arr.push(m);
            membersByPhone.set(m.cell_number, arr);
        }

        const groups: DuplicatePhoneGroup[] = dupNumbers.map(d => ({
            cell_number: d.cell_number,
            member_count: parseInt(String(d.member_count)),
            members: membersByPhone.get(d.cell_number) || [],
        }));

        return {
            groups,
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
            total_duplicate_numbers: total,
            total_affected_members: totalAffected,
        };
    }

    /**
     * Export the full duplicate-phone report as an Excel stream chunk by chunk.
     */
    static async generateToStream(res: any, filters: DuplicatePhoneFilters = {}): Promise<void> {
        const { province_code, municipality_code } = filters;
        const { filter: geoFilter, params: geoParams } =
            this.buildGeoFilter(province_code, municipality_code);

        // ── 1. Create Stream Workbook ──
        const options = {
            stream: res,
            useStyles: true,
            useSharedStrings: true
        };
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);
        workbook.creator = 'EFF Membership System';

        // ── 2. Get ALL duplicate numbers (no pagination) ──
        console.log('[DuplicatePhoneReport] Fetching duplicate number aggregates...');
        const numbersQuery = `
      SELECT TRIM(m.cell_number) AS cell_number, COUNT(*) AS member_count
      FROM members_consolidated m
      WHERE m.cell_number IS NOT NULL
        AND m.cell_number != ''
        AND LENGTH(TRIM(m.cell_number)) >= 10
        ${geoFilter}
      GROUP BY TRIM(m.cell_number)
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC, TRIM(m.cell_number)
    `;
        const dupNumbers = await executeQuery<{ cell_number: string; member_count: number }>(
            numbersQuery,
            geoParams
        );
        console.log(`[DuplicatePhoneReport] Found ${dupNumbers.length} duplicate groups.`);

        // ── 3. Write Summary Sheet ──
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: '#', key: 'row_num', width: 6 },
            { header: 'Cell Number', key: 'cell_number', width: 18 },
            { header: 'Members Sharing', key: 'member_count', width: 16 },
        ];

        summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        summarySheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

        dupNumbers.forEach((d, i) => {
            const row = summarySheet.addRow({
                row_num: i + 1,
                cell_number: d.cell_number,
                member_count: parseInt(String(d.member_count)),
            });
            row.commit();
        });

        // Totals row
        const totalRow = summarySheet.addRow({
            row_num: '',
            cell_number: 'TOTAL DUPLICATE NUMBERS',
            member_count: dupNumbers.length,
        });
        totalRow.font = { bold: true };
        totalRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        totalRow.commit();

        summarySheet.commit(); // Finish summary sheet

        // ── 4. Write Detailed Members Sheet in Chunks ──
        const detailSheet = workbook.addWorksheet('Member Details');
        detailSheet.columns = [
            { header: '#', key: 'row_num', width: 6 },
            { header: 'Cell Number', key: 'cell_number', width: 18 },
            { header: 'First Name', key: 'firstname', width: 18 },
            { header: 'Surname', key: 'surname', width: 18 },
            { header: 'ID Number', key: 'id_number', width: 16 },
            { header: 'Province', key: 'province_name', width: 20 },
            { header: 'Municipality', key: 'municipality_name', width: 25 },
            { header: 'Ward Code', key: 'ward_code', width: 12 },
            { header: 'Membership Status', key: 'membership_status', width: 18 },
            { header: 'Expiry Date', key: 'expiry_date', width: 14 },
        ];
        detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        detailSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

        const chunkSize = 1000;
        let globalRowIndex = 1;

        console.log(`[DuplicatePhoneReport] Fetching member details in chunks of ${chunkSize}...`);
        for (let i = 0; i < dupNumbers.length; i += chunkSize) {
            const chunk = dupNumbers.slice(i, i + chunkSize);
            const phoneValues = chunk.map(d => d.cell_number);
            const placeholders = phoneValues.map((_, idx) => `$${idx + 1}`).join(', ');

            const membersQuery = `
                SELECT
                  TRIM(m.cell_number) AS cell_number,
                  COALESCE(m.firstname, '') AS firstname,
                  COALESCE(m.surname, '') AS surname,
                  COALESCE(m.id_number, '') AS id_number,
                  COALESCE(m.province_name, '') AS province_name,
                  COALESCE(m.municipality_name, '') AS municipality_name,
                  COALESCE(m.ward_code, '') AS ward_code,
                  COALESCE(mst.status_name, 'Unknown') AS membership_status,
                  m.expiry_date
                FROM members_consolidated m
                LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
                WHERE TRIM(m.cell_number) IN (${placeholders})
                ORDER BY TRIM(m.cell_number), m.surname, m.firstname
            `;
            const members = await executeQuery<DuplicatePhoneMember>(membersQuery, phoneValues);

            members.forEach(m => {
                const row = detailSheet.addRow({
                    row_num: globalRowIndex++,
                    cell_number: m.cell_number,
                    firstname: m.firstname,
                    surname: m.surname,
                    id_number: m.id_number,
                    province_name: m.province_name,
                    municipality_name: m.municipality_name,
                    ward_code: m.ward_code,
                    membership_status: m.membership_status,
                    expiry_date: m.expiry_date
                        ? new Date(m.expiry_date).toLocaleDateString('en-ZA')
                        : '',
                });
                row.commit();
            });
            console.log(`[DuplicatePhoneReport] Processed chunk ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(dupNumbers.length / chunkSize)}`);
        }

        detailSheet.commit();
        await workbook.commit();
        console.log('[DuplicatePhoneReport] Streaming done.');
    }
}

export default DuplicatePhoneReportService;
