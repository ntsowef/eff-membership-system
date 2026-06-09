import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { executeQuery } from '../config/database';
import * as ExcelJS from 'exceljs';

/**
 * Voting District Report Service
 *
 * Memory-efficient implementation:
 *  - Phase 1: One lightweight SQL query → VD metadata (codes, names, counts only)
 *  - Phase 2: Distribute VDs across 5 sheets (in-memory, just metadata objects)
 *  - Phase 3: One SQL query per sheet to load ~1/5 of members at a time
 *  - Phase 4: ExcelJS streaming writer flushes each row to disk immediately
 *             → peak heap stays proportional to a single sheet, not the whole file
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface VDReportMember {
    province_name: string;
    municipality_name: string;
    ward_name: string;
    ward_code: string;
    voting_district_name: string;
    voting_district_code: string;
    firstname: string;
    surname: string;
    full_name: string;
    id_number: string;
    cell_number: string | null;
    email: string | null;
}

interface VDMetadata {
    voting_district_code: string;
    voting_district_name: string;
    member_count: number;
}

interface VDGroup {
    voting_district_code: string;
    voting_district_name: string;
    ward_code: string;
    member_count: number;
    members: VDReportMember[];
}

export interface ReportStats {
    totalVDs: number;
    totalMembers: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NUM_SHEETS = 1;
const MIN_MEMBERS_PER_VD = 5;

const C = {
    effRed: 'FFCC0000',
    effRedDark: 'FF8B0000',
    effRedLight: 'FFFFE8E8',
    white: 'FFFFFFFF',
    offWhite: 'FFFAFAFA',
    lightGray: 'FFF2F2F2',
    mediumGray: 'FFE0E0E0',
    border: 'FFCCCCCC',
    textDark: 'FF222222',
} as const;

// Shared eligibility filter (used in both queries to keep them in sync)
const ELIGIBILITY_WHERE = `
    m.voting_district_code IS NOT NULL
    AND m.voting_district_code NOT IN ('99999999', '22222222')
    AND (
        mst.status_name = 'Active'
        OR (
            mst.is_active = TRUE
            AND m.expiry_date IS NOT NULL
            AND m.expiry_date >= CURRENT_DATE
        )
    )
`;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class VotingDistrictReportService {

    // -----------------------------------------------------------------------
    // 1.  QUERY — lightweight: VD codes + names + counts only
    // -----------------------------------------------------------------------

    private static async getVDMetadata(): Promise<VDMetadata[]> {
        const query = `
            WITH Eligible AS (
                SELECT m.voting_district_code
                FROM   members_consolidated  m
                LEFT   JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
                WHERE  ${ELIGIBILITY_WHERE}
            ),
            Counts AS (
                SELECT   voting_district_code,
                         COUNT(*) AS member_count
                FROM     Eligible
                GROUP BY voting_district_code
                HAVING   COUNT(*) >= ${MIN_MEMBERS_PER_VD}
            )
            SELECT
                c.voting_district_code,
                COALESCE(v.voting_district_name, 'VD-' || c.voting_district_code) AS voting_district_name,
                c.member_count
            FROM   Counts c
            LEFT   JOIN voting_districts v ON c.voting_district_code = v.voting_district_code
            ORDER  BY voting_district_name
        `;

        try {
            const rows = await executeQuery<any>(query, []);
            return rows.map((r: any) => ({
                voting_district_code: r.voting_district_code,
                voting_district_name: r.voting_district_name,
                member_count: Number(r.member_count),
            }));
        } catch (err) {
            console.error('[VDReport] getVDMetadata error:', err);
            throw new Error('Failed to retrieve voting district metadata');
        }
    }

    // -----------------------------------------------------------------------
    // 2.  QUERY — per-sheet: full member rows for a set of VD codes
    // -----------------------------------------------------------------------

    private static async getMembersForVDs(vdCodes: string[]): Promise<VDReportMember[]> {
        if (vdCodes.length === 0) return [];

        const query = `
            SELECT
                COALESCE(m.province_name,     '')                                   AS province_name,
                COALESCE(m.municipality_name, '')                                   AS municipality_name,
                COALESCE(w.ward_name,         '')                                   AS ward_name,
                COALESCE(m.ward_code,         '')                                   AS ward_code,
                COALESCE(v.voting_district_name, 'VD-' || m.voting_district_code)  AS voting_district_name,
                m.voting_district_code,
                COALESCE(m.firstname, '')                                            AS firstname,
                COALESCE(m.surname,   '')                                            AS surname,
                TRIM(COALESCE(m.firstname,'') || ' ' || COALESCE(m.surname,''))    AS full_name,
                COALESCE(m.id_number, '')                                            AS id_number,
                m.cell_number,
                m.email
            FROM   members_consolidated  m
            LEFT   JOIN membership_statuses  mst ON m.membership_status_id  = mst.status_id
            LEFT   JOIN voting_districts     v   ON m.voting_district_code   = v.voting_district_code
            LEFT   JOIN wards                w   ON m.ward_code              = w.ward_code
            WHERE  m.voting_district_code = ANY($1)
            AND    (
                       mst.status_name = 'Active'
                   OR  (
                           mst.is_active = TRUE
                           AND m.expiry_date IS NOT NULL
                           AND m.expiry_date >= CURRENT_DATE
                       )
                   )
            ORDER  BY
                COALESCE(v.voting_district_name, 'VD-' || m.voting_district_code),
                m.surname,
                m.firstname
        `;

        try {
            return await executeQuery<VDReportMember>(query, [vdCodes]);
        } catch (err) {
            console.error('[VDReport] getMembersForVDs error:', err);
            throw new Error('Failed to retrieve members for voting districts');
        }
    }

    // -----------------------------------------------------------------------
    // 3.  DISTRIBUTION — greedy load-balancing by member count
    // -----------------------------------------------------------------------

    private static distributeAcrossSheets(vdMeta: VDMetadata[]): VDMetadata[][] {
        const sheets: VDMetadata[][] = Array.from({ length: NUM_SHEETS }, () => []);
        const totals = new Array<number>(NUM_SHEETS).fill(0);

        // Largest VDs first → tighter balance
        const sorted = [...vdMeta].sort((a, b) => b.member_count - a.member_count);
        for (const meta of sorted) {
            let minIdx = 0;
            for (let i = 1; i < NUM_SHEETS; i++) {
                if (totals[i] < totals[minIdx]) minIdx = i;
            }
            sheets[minIdx].push(meta);
            totals[minIdx] += meta.member_count;
        }

        // Re-sort alphabetically within each sheet
        for (const s of sheets) {
            s.sort((a, b) => a.voting_district_name.localeCompare(b.voting_district_name));
        }
        return sheets;
    }

    // -----------------------------------------------------------------------
    // 4.  GROUP flat member rows into VDGroup[] (preserving vdMeta order)
    // -----------------------------------------------------------------------

    private static groupMembers(members: VDReportMember[], sheetMeta: VDMetadata[]): VDGroup[] {
        const metaMap = new Map(sheetMeta.map(m => [m.voting_district_code, m]));
        const groupMap = new Map<string, VDGroup>();

        for (const member of members) {
            const code = member.voting_district_code;
            if (!groupMap.has(code)) {
                const meta = metaMap.get(code);
                groupMap.set(code, {
                    voting_district_code: code,
                    voting_district_name: member.voting_district_name,
                    ward_code: member.ward_code,
                    member_count: meta?.member_count ?? 0,
                    members: [],
                });
            }
            groupMap.get(code)!.members.push(member);
        }

        // Return in the same order as sheetMeta (alphabetical)
        return sheetMeta
            .filter(m => groupMap.has(m.voting_district_code))
            .map(m => groupMap.get(m.voting_district_code)!);
    }

    // -----------------------------------------------------------------------
    // 5a. STREAMING summary sheet writer
    // -----------------------------------------------------------------------

    private static async writeSummarySheet(
        ws: any,             // ExcelJS.stream.xlsx.WorksheetWriter
        vdMeta: VDMetadata[],
        sheetDist: VDMetadata[][],
    ): Promise<void> {
        const totalVDs = vdMeta.length;
        const totalMembers = vdMeta.reduce((s, v) => s + v.member_count, 0);
        const generatedAt = new Date().toLocaleString('en-ZA', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        ws.columns = [
            { key: 'label', width: 52 },
            { key: 'value', width: 30 },
        ];

        const addTitle = (text: string, bg: string, fontColor: string, size: number, height: number) => {
            const row = ws.addRow({ label: text, value: '' });
            row.height = height;
            const cell = row.getCell(1);
            cell.value = text;
            cell.font = { bold: true, size, color: { argb: fontColor } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            row.commit();
        };

        const addStat = (label: string, value: string | number, rowNum: number) => {
            const row = ws.addRow({ label, value: String(value) });
            row.height = 18;
            const bg = rowNum % 2 === 0 ? C.offWhite : C.white;
            [1, 2].forEach(col => {
                const cell = row.getCell(col);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                cell.alignment = { vertical: 'middle' };
                cell.border = {
                    top: { style: 'hair', color: { argb: C.border } },
                    left: { style: 'thin', color: { argb: C.border } },
                    bottom: { style: 'hair', color: { argb: C.border } },
                    right: { style: 'thin', color: { argb: C.border } },
                };
            });
            row.getCell(1).font = { bold: true, size: 10 };
            row.getCell(2).font = { size: 10 };
            row.commit();
        };

        // Title rows
        addTitle('VOTING DISTRICT MEMBERS REPORT', C.effRed, C.white, 20, 42);
        addTitle(`Active Members in Good Standing  •  Generated: ${generatedAt}`, C.effRedLight, C.effRedDark, 10, 20);

        const blank = ws.addRow({});
        blank.commit();

        // Stats section
        addTitle('REPORT STATISTICS', C.effRed, C.white, 12, 25);
        addStat('Total Qualifying Voting Districts', totalVDs.toLocaleString(), 1);
        addStat('Total Active Members Included', totalMembers.toLocaleString(), 2);
        addStat('Average Members per Voting District', totalVDs > 0 ? (totalMembers / totalVDs).toFixed(1) : '0', 3);
        addStat('Minimum Members per VD Threshold', `${MIN_MEMBERS_PER_VD} or more`, 4);
        addStat('Number of Data Worksheets', NUM_SHEETS, 5);
        addStat('Membership Criteria', "status = 'Active'  OR  (is_active AND expiry ≥ today)", 6);
        addStat('Excluded VD Codes', '99999999, 22222222 (system placeholders)', 7);

        const blank2 = ws.addRow({});
        blank2.commit();

        // Per-sheet distribution table
        addTitle('WORKSHEET DISTRIBUTION', C.effRed, C.white, 12, 25);

        const hdr = ws.addRow({ label: 'Worksheet', value: 'Voting Districts / Members  |  Alphabetical Range' });
        hdr.height = 18;
        hdr.getCell(1).font = { bold: true, size: 10 };
        hdr.getCell(2).font = { bold: true, size: 10 };
        hdr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.mediumGray } };
        hdr.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.mediumGray } };
        hdr.getCell(1).alignment = { vertical: 'middle' };
        hdr.getCell(2).alignment = { vertical: 'middle' };
        hdr.commit();

        sheetDist.forEach((groups, idx) => {
            const sheetMembers = groups.reduce((s, g) => s + g.member_count, 0);
            const first = groups[0]?.voting_district_name ?? '—';
            const last = groups[groups.length - 1]?.voting_district_name ?? '—';
            const range = groups.length > 1 ? `${first}  →  ${last}` : first;
            const row = ws.addRow({
                label: `Sheet ${idx + 1}  —  ${groups.length} VDs, ${sheetMembers.toLocaleString()} members`,
                value: range,
            });
            row.height = 16;
            const bg = idx % 2 === 0 ? C.offWhite : C.white;
            [1, 2].forEach(col => {
                const cell = row.getCell(col);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                cell.alignment = { vertical: 'middle' };
                cell.border = {
                    top: { style: 'hair', color: { argb: C.border } },
                    left: { style: 'thin', color: { argb: C.border } },
                    bottom: { style: 'hair', color: { argb: C.border } },
                    right: { style: 'thin', color: { argb: C.border } },
                };
            });
            row.commit();
        });

        await ws.commit();
    }

    // -----------------------------------------------------------------------
    // 5b. STREAMING data sheet writer (no merged cells — streaming limitation)
    //
    //     VD group header row aligns its values with the actual data columns:
    //       col F = VD name, col G = VD code, col H = member count
    //     This is actually cleaner than merging for data readability.
    // -----------------------------------------------------------------------

    private static async writeDataSheet(
        ws: any,          // ExcelJS.stream.xlsx.WorksheetWriter
        vdGroups: VDGroup[],
    ): Promise<void> {
        // Column layout — must match the order used in addRow() below
        ws.columns = [
            { key: 'row_num', width: 6 },   // A — NO
            { key: 'province_name', width: 22 },   // B — PROVINCE
            { key: 'municipality_name', width: 28 },   // C — MUNICIPALITY
            { key: 'ward_code', width: 15 },   // D — WARD CODE
            { key: 'voting_district_name', width: 38 },   // E — VD NAME
            { key: 'voting_district_code', width: 14 },   // F — VD CODE
            { key: 'surname', width: 20 },   // G — SURNAME
            { key: 'firstname', width: 20 },   // H — FIRST NAME
            { key: 'id_number', width: 16 },   // I — ID NUMBER
            { key: 'cell_number', width: 16 },   // J — CELL NUMBER
            { key: 'email', width: 34 },   // K — EMAIL
        ];

        // Freeze row 1 - This is now handled in addWorksheet options in generateToStream
        // to avoid "Cannot set property views" error in streaming mode.

        // Header row
        const headers = [
            'NO', 'PROVINCE', 'MUNICIPALITY / SUB-REGION',
            'WARD CODE', 'VD NAME', 'VD CODE',
            'SURNAME', 'FIRST NAME', 'ID NUMBER', 'CELL NUMBER', 'EMAIL',
        ];
        const hdrRow = ws.addRow(headers);
        hdrRow.height = 22;
        for (let c = 1; c <= 11; c++) {
            const cell = hdrRow.getCell(c);
            cell.font = { bold: true, size: 10, color: { argb: C.white } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.effRed } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'medium', color: { argb: C.effRedDark } },
                left: { style: 'thin', color: { argb: C.effRedDark } },
                bottom: { style: 'medium', color: { argb: C.effRedDark } },
                right: { style: 'thin', color: { argb: C.effRedDark } },
            };
        }
        hdrRow.commit();

        let memberRowNum = 0;

        for (const vdGroup of vdGroups) {

            // VD group separator row
            // Values placed in their natural column slots (no merging needed)
            const vdRow = ws.addRow([
                '',                                                  // A — NO
                '',                                                  // B — PROVINCE
                '',                                                  // C — MUNICIPALITY
                `  ${vdGroup.ward_code || ''}`,                      // D — WARD CODE
                `  ${vdGroup.voting_district_name}`,                // E — VD NAME
                vdGroup.voting_district_code,                       // F — VD CODE
                `[ ${vdGroup.member_count} active members ]`,       // G — count
                '', '', '', '',
            ]);
            vdRow.height = 18;
            for (let c = 1; c <= 11; c++) {
                const cell = vdRow.getCell(c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.effRedLight } };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FFFFCCCC' } },
                    left: { style: 'thin', color: { argb: C.border } },
                    bottom: { style: 'thin', color: { argb: 'FFFFCCCC' } },
                    right: { style: 'thin', color: { argb: C.border } },
                };
            }
            vdRow.getCell(5).font = { bold: true, size: 10, color: { argb: C.effRedDark } };
            vdRow.getCell(6).font = { bold: false, size: 10, color: { argb: C.effRedDark } };
            vdRow.getCell(7).font = { italic: true, size: 9, color: { argb: C.effRedDark } };
            vdRow.commit();

            // Member data rows
            let altToggle = false;
            for (const member of vdGroup.members) {
                memberRowNum++;
                altToggle = !altToggle;

                const dataRow = ws.addRow({
                    row_num: memberRowNum,
                    province_name: member.province_name,
                    municipality_name: member.municipality_name,
                    ward_code: member.ward_code,
                    voting_district_name: member.voting_district_name,
                    voting_district_code: member.voting_district_code,
                    surname: member.surname,
                    firstname: member.firstname,
                    id_number: member.id_number,
                    cell_number: member.cell_number ?? '',
                    email: member.email ?? '',
                });
                dataRow.height = 15;
                const bg = altToggle ? C.white : C.offWhite;
                for (let c = 1; c <= 11; c++) {
                    const cell = dataRow.getCell(c);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    cell.alignment = { vertical: 'middle' };
                    cell.font = { size: 10, color: { argb: C.textDark } };
                    cell.border = {
                        top: { style: 'hair', color: { argb: C.border } },
                        left: { style: 'thin', color: { argb: C.border } },
                        bottom: { style: 'hair', color: { argb: C.border } },
                        right: { style: 'thin', color: { argb: C.border } },
                    };
                }
                dataRow.commit();
            }
        }

        await ws.commit();
    }

    // -----------------------------------------------------------------------
    // 6.  PUBLIC — stream to any writable stream (file, HTTP response, etc.)
    // -----------------------------------------------------------------------

    public static async generateToStream(
        outputStream: NodeJS.WritableStream,
        onProgress?: (msg: string) => void,
    ): Promise<ReportStats> {
        const log = (msg: string) => onProgress?.(msg);

        // Phase 1: lightweight metadata query
        log('Fetching voting district metadata...');
        const vdMeta = await this.getVDMetadata();
        if (vdMeta.length === 0) {
            throw new Error(
                `No qualifying voting districts found. ` +
                `Ensure active members are assigned to a voting district ` +
                `with ${MIN_MEMBERS_PER_VD}+ members.`,
            );
        }
        const totalVDs = vdMeta.length;
        const totalMembers = vdMeta.reduce((s, v) => s + v.member_count, 0);
        log(`Found ${totalVDs} VDs, ${totalMembers.toLocaleString()} members total`);

        // Phase 2: distribute
        const sheetDist = this.distributeAcrossSheets(vdMeta);

        // Phase 3: streaming workbook
        const StreamWorkbookWriter = (ExcelJS as any).stream.xlsx.WorkbookWriter;
        const workbook = new StreamWorkbookWriter({
            stream: outputStream,
            useStyles: true,
            useSharedStrings: true,
        });

        // Summary sheet
        log('Writing summary sheet...');
        const summaryWS = workbook.addWorksheet('Summary');
        await this.writeSummarySheet(summaryWS, vdMeta, sheetDist);

        // 5 data sheets — one SQL query each
        for (let idx = 0; idx < NUM_SHEETS; idx++) {
            const sheetMeta = sheetDist[idx];
            const memberCount = sheetMeta.reduce((s, m) => s + m.member_count, 0);
            const sheetName = `Sheet ${idx + 1} (${memberCount.toLocaleString()})`;

            log(`Writing ${sheetName} (${sheetMeta.length} VDs)...`);

            const vdCodes = sheetMeta.map(m => m.voting_district_code);
            const members = await this.getMembersForVDs(vdCodes);
            const groups = this.groupMembers(members, sheetMeta);

            const ws = workbook.addWorksheet(sheetName, {
                views: [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2' }]
            });
            await this.writeDataSheet(ws, groups);

            // Explicitly release this sheet's member array
            members.length = 0;
        }

        log('Finalising workbook...');
        await workbook.commit();
        log('Done.');

        return { totalVDs, totalMembers };
    }

    // -----------------------------------------------------------------------
    // 7.  PUBLIC — write directly to a file path (used by the CLI script)
    // -----------------------------------------------------------------------

    public static async generateToFile(
        outputPath: string,
        onProgress?: (msg: string) => void,
    ): Promise<ReportStats> {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const fileStream = fs.createWriteStream(outputPath);

        try {
            return await this.generateToStream(fileStream, onProgress);
        } catch (err) {
            // If generation fails, remove the partial file so callers don't
            // accidentally open a corrupt workbook
            fileStream.destroy();
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            throw err;
        }
    }

    // -----------------------------------------------------------------------
    // 8.  PUBLIC — buffer export for backward-compat (uses temp file)
    //     For large datasets prefer generateToStream(res) in the route instead.
    // -----------------------------------------------------------------------

    public static async exportToExcel(): Promise<Buffer> {
        const tmpPath = path.join(os.tmpdir(), `vd-report-${Date.now()}.xlsx`);
        try {
            await this.generateToFile(tmpPath);
            return fs.readFileSync(tmpPath);
        } finally {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        }
    }
}

export default VotingDistrictReportService;
