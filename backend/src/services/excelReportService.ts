import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { executeQuery, executeQuerySingle } from '../config/database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Municipality Combination Mapping
 * Defines which municipalities should be combined into single rows on reports.
 * Each entry has: codes (municipality_code values to combine), label (display name),
 * and optionally targetDistrict (district_code where this combined row should appear
 * if municipalities come from different districts).
 */
interface MunicipalityCombination {
  codes: string[];
  label: string;
  targetDistrict?: string; // Only needed for cross-district combinations
}

const MUNICIPALITY_COMBINATIONS: MunicipalityCombination[] = [
  // === Eastern Cape ===
  { codes: ['EC101', 'EC102'], label: 'Dr. Beyers Naude / Blue Crane Route' },
  { codes: ['EC108', 'EC109'], label: 'Kouga / Kou-Kamma' },
  { codes: ['EC124', 'EC123'], label: 'Amahlathi / Great Kei' },
  // === Free State ===
  { codes: ['FS161', 'FS163'], label: 'Letsemeng / Mohokare' },
  { codes: ['FS183', 'FS182'], label: 'Tswelopele / Tokologo' },
  { codes: ['MAN002', 'MAN004', 'MAN003'], label: 'MAN-Botshabelo / MAN-Thaba Nchu / MAN-Naledi' },
  // === Gauteng ===
  { codes: ['TSH005', 'TSH006'], label: 'TSH - 5 / TSH - 6' },
  // === KwaZulu-Natal ===
  { codes: ['ETH009', 'ETH010'], label: 'ETH - South Central / ETH - South West' },
  { codes: ['KZN252', 'KZN253'], label: 'Newcastle / eMadlangeni' },
  { codes: ['KZN436', 'KZN224'], label: 'Dr. Nkosazana Dlamini Zuma / Impendle', targetDistrict: 'DC43' },
  { codes: ['KZN225', 'KZN223'], label: 'Msunduzi / Mpofana' },
  { codes: ['KZN227', 'KZN226'], label: 'Richmond / Mkhambathini' },
  { codes: ['KZN242', 'KZN241'], label: 'Nqutu / Endumeni' },
  // === Mpumalanga ===
  { codes: ['MP305', 'MP306'], label: 'Lekwa / Dipaleseng' },
  // === North West ===
  { codes: ['NW373', 'NW374'], label: 'Rustenburg / Kgetlengrivier' },
  { codes: ['NW393', 'NW396'], label: 'Mamusa / Lekwa-Teemane' },
  // === Northern Cape ===
  { codes: ['NC085', 'NC086'], label: 'Tsantsabane / Kgatelopele' },
  { codes: ['NC073', 'NC076', 'NC075'], label: 'Emthanjeni / Thembelihle / Renosterberg' },
  { codes: ['NC071', 'NC074'], label: 'Ubuntu / Kareeberg' },
  { codes: ['NC078', 'NC077'], label: 'Siyancuma / Siyathemba' },
  { codes: ['NC094', 'NC093'], label: 'Phokwane / Magareng' },
  { codes: ['NC065', 'NC084', 'NC066'], label: 'Hantam / !Kheis / Karoo Hoogland', targetDistrict: 'DC6' },
  { codes: ['NC064', 'NC067'], label: 'Kamiesberg / Khâi-Ma' },
  { codes: ['NC062', 'NC061'], label: 'Nama Khoi / Richtersveld' },
  // === Western Cape ===
  { codes: ['CPT006', 'CPT010'], label: 'CPT - Zone 5/9' },
  { codes: ['WC013', 'WC012'], label: 'Bergrivier / Cederberg' },
  { codes: ['WC033', 'WC034'], label: 'Cape Agulhas / Swellendam' },
  { codes: ['WC026', 'WC051'], label: 'Langeberg / Laingsburg', targetDistrict: 'DC2' },
  { codes: ['WC048', 'WC047'], label: 'Knysna / Bitou' },
  { codes: ['WC045', 'WC052'], label: 'Oudtshoorn / Prince Albert', targetDistrict: 'DC4' },
];

// Build a quick lookup: municipality_code → combination info
const MUNI_CODE_TO_COMBINATION = new Map<string, MunicipalityCombination>();
MUNICIPALITY_COMBINATIONS.forEach(combo => {
  combo.codes.forEach(code => MUNI_CODE_TO_COMBINATION.set(code, combo));
});

/**
 * Excel Report Generation Service
 * Handles generation of Excel reports for ward audits, daily reports, and SRPA delegates
 */
export class ExcelReportService {

  /**
   * Apply borders and styling to ExcelJS worksheet
   */
  private static styleExcelJSSheet(worksheet: ExcelJS.Worksheet, dataRowCount: number, colCount: number): void {
    // Style header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // Check if cell contains a number
          if (typeof cell.value === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            // Check if it's a percentage (between 0 and 1)
            if (cell.value < 1 && cell.value > 0 && cell.value.toString().includes('.')) {
              cell.numFmt = '0.00%';
            } else {
              cell.numFmt = '#,##0';
            }
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      }
    });
  }

  /**
   * Apply borders and styling to a worksheet (legacy XLSX library - not used anymore)
   */
  private static applyBordersAndStyling(worksheet: XLSX.WorkSheet, dataRowCount: number, colCount: number): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // Define border style
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    // Define header style (bold + borders + background)
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: borderStyle
    };

    // Define data cell style (borders + alignment)
    const dataCellStyle = {
      alignment: { horizontal: 'left', vertical: 'center' },
      border: borderStyle
    };

    // Define number cell style (right-aligned for numbers)
    const numberCellStyle = {
      alignment: { horizontal: 'right', vertical: 'center' },
      border: borderStyle,
      numFmt: '#,##0'
    };

    // Define percentage cell style
    const percentCellStyle = {
      alignment: { horizontal: 'right', vertical: 'center' },
      border: borderStyle,
      numFmt: '0.00%'
    };

    // Apply styles to all cells
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

        if (!worksheet[cellAddress]) continue;

        // Header row (first row)
        if (R === 0) {
          worksheet[cellAddress].s = headerStyle;
        }
        // Data rows
        else {
          const cellValue = worksheet[cellAddress].v;

          // Check if cell contains percentage
          if (typeof cellValue === 'number' && cellValue < 1 && cellValue > 0) {
            worksheet[cellAddress].s = percentCellStyle;
          }
          // Check if cell contains number
          else if (typeof cellValue === 'number') {
            worksheet[cellAddress].s = numberCellStyle;
          }
          // Text cells
          else {
            worksheet[cellAddress].s = dataCellStyle;
          }
        }
      }
    }
  }
  
  /**
   * Generate Ward Audit Report matching Audit.xlsx format exactly.
   * Sheet4: Municipality/District Detail with Excel formulas
   * Sheet1: Provincial Summary referencing Sheet4
   */
  static async generateWardAuditReport(filters: {
    standing?: string;
    municipality_code?: string;
    district_code?: string;
    province_code?: string;
    search?: string;
    limit?: number;
  } = {}): Promise<Buffer> {
    try {
      const { province_code } = filters;

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EFF Membership System';
      workbook.created = new Date();

      // ===== DATA QUERY =====
      const muniQuery = `
        SELECT
          COALESCE(p.province_name, parent_p.province_name) as province_name,
          COALESCE(d.district_name, parent_d.district_name) as district_name,
          COALESCE(d.district_code, parent_d.district_code) as district_code,
          mu.municipality_code,
          COALESCE(mu.municipality_name, d.district_name) as municipality_name,
          mu.municipality_type,
          COUNT(DISTINCT w.ward_code) as ward_count,
          COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as convened,
          COUNT(DISTINCT w.ward_code) - COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as not_convened,
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Good Standing', 'Excellent Standing') THEN w.ward_code END) as passed,
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Poor Standing', 'Critical Standing', 'Fair Standing') THEN w.ward_code END) as failed
        FROM wards w
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN districts parent_d ON parent_mu.district_code = parent_d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code
        LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
        LEFT JOIN vw_ward_membership_audit wma ON w.ward_code = wma.ward_code
        WHERE COALESCE(mu.municipality_type, 'Local') != 'Metropolitan'
        ${province_code ? 'AND COALESCE(p.province_code, parent_p.province_code) = $1' : ''}
        GROUP BY COALESCE(p.province_name, parent_p.province_name),
                 COALESCE(d.district_name, parent_d.district_name),
                 COALESCE(d.district_code, parent_d.district_code),
                 mu.municipality_code, mu.municipality_name, mu.municipality_type, d.district_name
        ORDER BY COALESCE(p.province_name, parent_p.province_name),
                 COALESCE(d.district_name, parent_d.district_name),
                 COALESCE(mu.municipality_name, d.district_name)
      `;

      const muniParams = province_code ? [province_code] : [];
      const muniDataRaw = await executeQuery(muniQuery, muniParams);

      // Build lookup: municipality_code -> raw data row
      const muniLookup = new Map<string, any>();
      muniDataRaw.forEach((row: any) => {
        if (row.municipality_code) muniLookup.set(row.municipality_code, row);
      });

      // Process combinations and build grouped structure
      const processedComboCodes = new Set<string>();
      const grouped: Record<string, Record<string, { districtCode: string; rows: any[] }>> = {};
      const combinedRows: Array<{ targetProvince: string; targetDistrict: string; targetDistrictCode: string; row: any }> = [];

      for (const combo of MUNICIPALITY_COMBINATIONS) {
        const parts: Array<{ code: string; data: any }> = [];
        for (const code of combo.codes) {
          const data = muniLookup.get(code);
          if (data) parts.push({ code, data });
        }
        if (parts.length === 0) continue;
        combo.codes.forEach(code => processedComboCodes.add(code));

        let targetDistrictCode = combo.targetDistrict || parts[0].data.district_code;
        let targetDistrictName = parts[0].data.district_name;
        let targetProvince = parts[0].data.province_name;
        if (combo.targetDistrict) {
          const mp = parts.find(p => p.data.district_code === combo.targetDistrict);
          if (mp) { targetDistrictName = mp.data.district_name; targetProvince = mp.data.province_name; }
        }

        const wardParts: number[] = [];
        let totalPassed = 0, totalFailed = 0;
        parts.forEach(p => {
          wardParts.push(Number(p.data.ward_count) || 0);
          totalPassed += Number(p.data.passed) || 0;
          totalFailed += Number(p.data.failed) || 0;
        });
        const totalWards = wardParts.reduce((a, b) => a + b, 0);

        combinedRows.push({
          targetProvince: targetProvince || 'Unknown Province',
          targetDistrict: targetDistrictName || 'Unknown District',
          targetDistrictCode: targetDistrictCode || '',
          row: {
            label: combo.label,
            wardParts,
            wardTotal: totalWards,
            passed: totalPassed,
            failed: totalFailed,
            _isCombined: true,
          }
        });
      }

      // Process regular (non-combined) municipalities
      muniDataRaw.forEach((row: any) => {
        const code = row.municipality_code;
        if (!code || processedComboCodes.has(code)) return;
        const pn = row.province_name || 'Unknown Province';
        const dn = row.district_name || 'Unknown District';
        const dc = row.district_code || '';
        if (!grouped[pn]) grouped[pn] = {};
        if (!grouped[pn][dn]) grouped[pn][dn] = { districtCode: dc, rows: [] };
        grouped[pn][dn].rows.push({
          label: row.municipality_name || dn,
          wardTotal: Number(row.ward_count) || 0,
          passed: Number(row.passed) || 0,
          failed: Number(row.failed) || 0,
          _isCombined: false,
        });
      });

      // Insert combined rows into grouped structure
      combinedRows.forEach(cr => {
        if (!grouped[cr.targetProvince]) grouped[cr.targetProvince] = {};
        if (!grouped[cr.targetProvince][cr.targetDistrict]) {
          grouped[cr.targetProvince][cr.targetDistrict] = { districtCode: cr.targetDistrictCode, rows: [] };
        }
        grouped[cr.targetProvince][cr.targetDistrict].rows.push(cr.row);
      });

      // ===== BUILD SHEET4: MUNICIPALITY/DISTRICT DETAIL =====
      const sheet4 = workbook.addWorksheet('Sheet4');

      // Column widths matching example
      sheet4.getColumn(1).width = 26.7;
      sheet4.getColumn(2).width = 12.5;
      sheet4.getColumn(3).width = 3.5;
      sheet4.getColumn(4).width = 15.3;
      sheet4.getColumn(5).width = 18.6;
      sheet4.getColumn(6).width = 15.9;
      sheet4.getColumn(7).width = 13.5;
      sheet4.getColumn(8).width = 16;

      // Header row (row 1)
      const headerRow = sheet4.getRow(1);
      const headers = [
        'MUNICIPALITY',
        'NUMBER OF IEC WARDS',
        '',
        'NUMBER OF BRANCHES CONVENED',
        'NUMBER OF BRANCHES NOT CONVENED',
        'NUMBER OF BRANCHES PASSED AUDIT',
        'NUMBER OF BRANCHES FAILED AUDIT',
        '' // Will use rich text
      ];
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        if (i === 7) {
          // Rich text for column H with superscript ST
          cell.value = {
            richText: [
              { text: 'PERCENTAGE % TOWARDS 1', font: { name: 'Arial', size: 9, bold: true } },
              { text: 'ST', font: { name: 'Arial', size: 9, bold: true, vertAlign: 'superscript' } },
              { text: ' SRPA', font: { name: 'Arial', size: 9, bold: true } }
            ]
          };
        } else {
          cell.value = h;
        }
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      headerRow.height = 40;

      // Track Excel row numbers for formulas
      let currentRow = 2; // Data starts at row 2
      const districtTotalRows: number[] = []; // All district TOTAL row numbers
      const provinceTotalRows: number[] = []; // All province total row numbers
      const provinceData: Array<{ name: string; totalRow: number }> = [];

      // Helper: style a cell
      const styleCell = (cell: any, opts: { bold?: boolean; grey?: boolean; pct?: boolean; numFmt?: string } = {}) => {
        cell.font = { name: 'Arial', size: 9, bold: opts.bold || false };
        if (opts.grey) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        }
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        if (opts.pct) {
          cell.numFmt = '0%';
        }
      };

      // Helper: write a municipality data row
      const writeMuniRow = (row: number, label: string, isCombined: boolean, wardParts: number[], wardTotal: number, passed: number, failed: number) => {
        const r = sheet4.getRow(row);
        // Col A: label
        const cellA = r.getCell(1);
        cellA.value = label;
        styleCell(cellA);

        // Col B: ward count or "X + Y = Z" text
        const cellB = r.getCell(2);
        if (isCombined && wardParts && wardParts.length > 1) {
          cellB.value = wardParts.join(' + ') + ' = ' + wardTotal;
        } else {
          cellB.value = wardTotal;
        }
        styleCell(cellB);
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col C: combined total number (only for combined rows)
        const cellC = r.getCell(3);
        if (isCombined) {
          cellC.value = wardTotal;
        }
        styleCell(cellC);
        cellC.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col F: passed (value)
        const cellF = r.getCell(6);
        cellF.value = passed;
        styleCell(cellF);
        cellF.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col G: failed (value)
        const cellG = r.getCell(7);
        cellG.value = failed;
        styleCell(cellG);
        cellG.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col D: convened = F + G (formula)
        const cellD = r.getCell(4);
        cellD.value = { formula: `F${row}+G${row}` };
        styleCell(cellD);
        cellD.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col E: not convened = B - D (or C - D for combined)
        const cellE = r.getCell(5);
        if (isCombined) {
          cellE.value = { formula: `C${row}-D${row}` };
        } else {
          cellE.value = { formula: `B${row}-D${row}` };
        }
        styleCell(cellE);
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col H: percentage = F / B (or F / C for combined)
        const cellH = r.getCell(8);
        if (isCombined) {
          cellH.value = { formula: `F${row}/C${row}` };
        } else {
          cellH.value = { formula: `F${row}/B${row}` };
        }
        styleCell(cellH, { pct: true });
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      };

      // Helper: write a TOTAL row (district or province or grand)
      const writeTotalRow = (row: number, label: string, sumRowNumbers: number[], hasCombinedInRange: boolean, combinedWardParts: number[]) => {
        const r = sheet4.getRow(row);

        // Col A
        const cellA = r.getCell(1);
        cellA.value = label;
        styleCell(cellA, { bold: true, grey: true });

        // Col B: SUM of ward counts - but if combined rows exist, can't just SUM (text cells)
        // For district totals: SUM the range but handle combined rows specially
        const cellB = r.getCell(2);
        if (hasCombinedInRange && combinedWardParts.length > 0) {
          // Build formula: SUM of non-combined B cells + explicit combined ward totals
          const nonCombinedRows = sumRowNumbers.filter((_, i) => !combinedWardParts[i]);
          // Actually simpler: just use C column for combined, B for non-combined
          // Or just compute the value since formulas get complex
          let totalWards = 0;
          // We'll compute it from the data we have
          cellB.value = { formula: `SUM(C${sumRowNumbers[0]}:C${sumRowNumbers[sumRowNumbers.length - 1]})` };
        } else {
          cellB.value = { formula: `SUM(B${sumRowNumbers[0]}:B${sumRowNumbers[sumRowNumbers.length - 1]})` };
        }
        styleCell(cellB, { bold: true, grey: true });
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col C
        const cellC = r.getCell(3);
        styleCell(cellC, { bold: true, grey: true });

        // Col D: SUM
        const cellD = r.getCell(4);
        cellD.value = { formula: `SUM(D${sumRowNumbers[0]}:D${sumRowNumbers[sumRowNumbers.length - 1]})` };
        styleCell(cellD, { bold: true, grey: true });
        cellD.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col E: SUM
        const cellE = r.getCell(5);
        cellE.value = { formula: `SUM(E${sumRowNumbers[0]}:E${sumRowNumbers[sumRowNumbers.length - 1]})` };
        styleCell(cellE, { bold: true, grey: true });
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col F: SUM
        const cellF = r.getCell(6);
        cellF.value = { formula: `SUM(F${sumRowNumbers[0]}:F${sumRowNumbers[sumRowNumbers.length - 1]})` };
        styleCell(cellF, { bold: true, grey: true });
        cellF.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col G: SUM
        const cellG = r.getCell(7);
        cellG.value = { formula: `SUM(G${sumRowNumbers[0]}:G${sumRowNumbers[sumRowNumbers.length - 1]})` };
        styleCell(cellG, { bold: true, grey: true });
        cellG.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col H: F/B
        const cellH = r.getCell(8);
        cellH.value = { formula: `F${row}/B${row}` };
        styleCell(cellH, { bold: true, grey: true, pct: true });
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      };

      // Helper: write province/grand total referencing specific rows
      const writeRefTotalRow = (row: number, label: string, refRows: number[]) => {
        const r = sheet4.getRow(row);
        const refList = refRows.map(rr => `B${rr}`).join(',');

        const cellA = r.getCell(1);
        cellA.value = label;
        styleCell(cellA, { bold: true, grey: true });

        ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, idx) => {
          const cell = r.getCell(idx + 2);
          if (col === 'C') {
            styleCell(cell, { bold: true, grey: true });
            return;
          }
          cell.value = { formula: `SUM(${refRows.map(rr => `${col}${rr}`).join(',')})` };
          styleCell(cell, { bold: true, grey: true });
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const cellH = r.getCell(8);
        cellH.value = { formula: `F${row}/B${row}` };
        styleCell(cellH, { bold: true, grey: true, pct: true });
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      };

      // ===== POPULATE SHEET4 DATA =====
      const sortedProvinces = Object.keys(grouped).sort();

      // Ehlanzeni special handling
      const EHLANZENI_CITY_MUNIS = ['City of Mbombela', 'Nkomazi'];
      const EHLANZENI_BUSH_MUNIS = ['Bushbuckridge', 'Thaba Chweu'];

      for (const provinceName of sortedProvinces) {
        const districts = grouped[provinceName];
        const sortedDistricts = Object.keys(districts).sort();
        const distTotalRowsForProvince: number[] = [];

        for (const districtName of sortedDistricts) {
          const { rows } = districts[districtName];
          rows.sort((a: any, b: any) => (a.label || '').localeCompare(b.label || ''));

          // Check if this is Ehlanzeni - split into sub-groups
          const isEhlanzeni = districtName.toLowerCase().includes('ehlanzeni');

          if (isEhlanzeni) {
            // Split into City of Mbombela group and Bushbuckridge group
            const cityGroup = rows.filter((r: any) => EHLANZENI_CITY_MUNIS.some(m => r.label.includes(m)));
            const bushGroup = rows.filter((r: any) => EHLANZENI_BUSH_MUNIS.some(m => r.label.includes(m)));
            const otherGroup = rows.filter((r: any) =>
              !EHLANZENI_CITY_MUNIS.some(m => r.label.includes(m)) &&
              !EHLANZENI_BUSH_MUNIS.some(m => r.label.includes(m))
            );

            // Ehlanzeni-City of Mbombela sub-group
            if (cityGroup.length > 0) {
              const startRow = currentRow;
              const muniRowNums: number[] = [];
              const hasCombined = cityGroup.some((m: any) => m._isCombined);
              cityGroup.forEach((muni: any) => {
                writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
                muniRowNums.push(currentRow);
                currentRow++;
              });
              // TOTAL row
              writeTotalRow(currentRow, 'TOTAL', muniRowNums, hasCombined, []);
              distTotalRowsForProvince.push(currentRow);
              districtTotalRows.push(currentRow);
              currentRow++;
            }

            // Ehlanzeni-Bushbuckridge sub-group
            if (bushGroup.length > 0) {
              const muniRowNums: number[] = [];
              const hasCombined = bushGroup.some((m: any) => m._isCombined);
              bushGroup.forEach((muni: any) => {
                writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
                muniRowNums.push(currentRow);
                currentRow++;
              });
              writeTotalRow(currentRow, 'TOTAL', muniRowNums, hasCombined, []);
              distTotalRowsForProvince.push(currentRow);
              districtTotalRows.push(currentRow);
              currentRow++;
            }

            // Any other munis in Ehlanzeni
            if (otherGroup.length > 0) {
              const muniRowNums: number[] = [];
              otherGroup.forEach((muni: any) => {
                writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
                muniRowNums.push(currentRow);
                currentRow++;
              });
              writeTotalRow(currentRow, 'TOTAL', muniRowNums, false, []);
              distTotalRowsForProvince.push(currentRow);
              districtTotalRows.push(currentRow);
              currentRow++;
            }
          } else {
            // Normal district processing
            const muniRowNums: number[] = [];
            const hasCombined = rows.some((m: any) => m._isCombined);
            rows.forEach((muni: any) => {
              writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
              muniRowNums.push(currentRow);
              currentRow++;
            });
            // District TOTAL row
            writeTotalRow(currentRow, 'TOTAL', muniRowNums, hasCombined, []);
            distTotalRowsForProvince.push(currentRow);
            districtTotalRows.push(currentRow);
            currentRow++;
          }
        }

        // Province total row - references district TOTAL rows
        writeRefTotalRow(currentRow, provinceName.toUpperCase(), distTotalRowsForProvince);
        provinceTotalRows.push(currentRow);
        provinceData.push({ name: provinceName, totalRow: currentRow });
        currentRow++;
      }

      // Grand total row - references all province total rows
      writeRefTotalRow(currentRow, 'TOTAL', provinceTotalRows);
      const grandTotalRow = currentRow;

      // ===== BUILD SHEET1: PROVINCIAL SUMMARY =====
      const sheet1 = workbook.addWorksheet('Sheet1');

      // Sheet1 column widths
      sheet1.getColumn(1).width = 4;   // #
      sheet1.getColumn(2).width = 18;  // Province
      sheet1.getColumn(3).width = 14;  // IEC Wards
      sheet1.getColumn(4).width = 18;  // Registers Issued
      sheet1.getColumn(5).width = 18;  // Convened
      sheet1.getColumn(6).width = 18;  // Not Convened
      sheet1.getColumn(7).width = 18;  // Passed
      sheet1.getColumn(8).width = 18;  // Failed
      sheet1.getColumn(9).width = 18;  // In Audit
      sheet1.getColumn(10).width = 4;  // spacer
      sheet1.getColumn(11).width = 22; // Previous War Council
      sheet1.getColumn(12).width = 16; // Percentage

      // Sheet1 Header row
      const s1Header = sheet1.getRow(1);
      const s1Headers = [
        '#', 'PROVINCE', 'NUMBER OF IEC WARDS', 'TOTAL NUMBER OF REGISTERS ISSUED',
        'NUMBER OF BRANCHES CONVENED BPA/BGA', 'NUMBER OF BRANCHES NOT CONVENED BPA/BGA',
        'NUMBER OF BRANCHES PASSED AUDIT', 'NUMBER OF BRANCHES FAILED AUDIT',
        'NUMBER OF BRANCHES CURRENTLY IN AUDIT', '',
        'NUMBER OF BRANCHES CONVENED BPA/BGA FROM PREVIOUS WAR COUNCIL',
        '' // Rich text percentage header
      ];
      s1Headers.forEach((h, i) => {
        const cell = s1Header.getCell(i + 1);
        if (i === 11) {
          cell.value = {
            richText: [
              { text: 'PERCENTAGE % TOWARDS 1', font: { name: 'Arial', size: 9, bold: true } },
              { text: 'ST', font: { name: 'Arial', size: 9, bold: true, vertAlign: 'superscript' } },
              { text: ' SRPA', font: { name: 'Arial', size: 9, bold: true } }
            ]
          };
        } else {
          cell.value = h;
        }
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      s1Header.height = 45;

      // Sheet1 data rows - one per province
      provinceData.forEach((prov, idx) => {
        const s1Row = idx + 2;
        const r = sheet1.getRow(s1Row);
        const s4Ref = prov.totalRow; // Sheet4 province total row

        r.getCell(1).value = idx + 1; // #
        r.getCell(2).value = prov.name; // Province name
        r.getCell(3).value = { formula: `Sheet4!B${s4Ref}` }; // IEC Wards
        r.getCell(4).value = 0; // Registers issued (placeholder)
        r.getCell(5).value = { formula: `Sheet4!D${s4Ref}` }; // Convened
        r.getCell(6).value = { formula: `Sheet4!E${s4Ref}` }; // Not Convened
        r.getCell(7).value = { formula: `Sheet4!F${s4Ref}` }; // Passed
        r.getCell(8).value = { formula: `Sheet4!G${s4Ref}` }; // Failed
        r.getCell(9).value = 0; // In Audit (placeholder)
        r.getCell(10).value = null; // spacer
        r.getCell(11).value = 0; // Previous War Council (placeholder)
        r.getCell(12).value = { formula: `Sheet4!H${s4Ref}` }; // Percentage

        // Style all cells
        for (let c = 1; c <= 12; c++) {
          const cell = r.getCell(c);
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (c === 12) cell.numFmt = '0%';
        }
      });

      // Sheet1 total row
      const s1TotalRow = provinceData.length + 2;
      const s1r = sheet1.getRow(s1TotalRow);
      s1r.getCell(1).value = '';
      s1r.getCell(2).value = 'TOTAL';
      for (let c = 3; c <= 12; c++) {
        if (c === 10) continue; // spacer
        const colLetter = String.fromCharCode(64 + c); // C, D, E, ...
        s1r.getCell(c).value = { formula: `SUM(${colLetter}2:${colLetter}${s1TotalRow - 1})` };
      }
      // Override percentage: F total / B total from Sheet4
      s1r.getCell(12).value = { formula: `Sheet4!H${grandTotalRow}` };

      // Style total row
      for (let c = 1; c <= 12; c++) {
        const cell = s1r.getCell(c);
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (c === 12) cell.numFmt = '0%';
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error: any) {
      throw new Error(`Failed to generate ward audit Excel report: ${error.message}`);
    }
  }

  /**
   * Generate Daily Report Excel with 4 sheets
   * Uses ExcelJS for full styling support
   */
  static async generateDailyReport(reportDate?: string): Promise<Buffer> {
    try {
      // ===== SHEET 1: Municipality/District Analysis =====
      // FIXED: Use members_consolidated directly with membership_status_id to avoid missing data
      // Issue: Mpumalanga and other provinces had 0 members due to missing memberships table records
      const municipalityAnalysisQuery = `
        WITH ward_member_counts AS (
          SELECT
            w.ward_code,
            w.municipality_code,
            d.district_name,
            mu.municipality_name,
            mu.municipality_type,
            -- Handle Metro Sub-Regions: get province from parent municipality
            COALESCE(p.province_code, parent_p.province_code) as province_code,
            COALESCE(p.province_name, parent_p.province_name) as province_name,
            COUNT(DISTINCT m.member_id) FILTER (
              WHERE m.membership_status_id IN (1, 7, 8)
                AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE)
            ) AS valid_members
          FROM wards w
          LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
          LEFT JOIN districts d ON mu.district_code = d.district_code
          LEFT JOIN provinces p ON d.province_code = p.province_code
          -- Join parent municipality for Metro Sub-Regions
          LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id
          LEFT JOIN districts parent_d ON parent_mu.district_code = parent_d.district_code
          LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code
          LEFT JOIN members_consolidated m ON m.ward_code = w.ward_code
          WHERE COALESCE(w.is_active, TRUE) = TRUE
            -- Exclude Metropolitan municipalities (only show sub-regions)
            AND COALESCE(mu.municipality_type, 'Local') != 'Metropolitan'
          GROUP BY w.ward_code, w.municipality_code, d.district_name, mu.municipality_name, mu.municipality_type,
                   COALESCE(p.province_code, parent_p.province_code), COALESCE(p.province_name, parent_p.province_name)
        )
        SELECT
          wmc.province_name,
          COALESCE(wmc.municipality_name, wmc.district_name) AS "MUNICIPALITY/ DISTRICTS",
          COUNT(*) AS "NUMBER OF IEC WARDS",
          COUNT(*) FILTER (WHERE wmc.valid_members >= 200) AS "TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP",
          COUNT(*) FILTER (WHERE wmc.valid_members < 200) AS "TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP",
          ROUND(
            (COUNT(*) FILTER (WHERE wmc.valid_members >= 200))::numeric
            / NULLIF(COUNT(*), 0) * 100, 2
          ) AS "PERCENTAGE % TOWARDS BPA/BGA"
        FROM ward_member_counts wmc
        WHERE wmc.province_name IS NOT NULL
        GROUP BY wmc.province_name, COALESCE(wmc.municipality_name, wmc.district_name)
        ORDER BY wmc.province_name, "MUNICIPALITY/ DISTRICTS"
      `;

      const municipalityAnalysisDataRaw = await executeQuery(municipalityAnalysisQuery, []);

      // Group municipalities by province for hierarchical display
      const groupedByProvince: Record<string, any[]> = {};
      municipalityAnalysisDataRaw.forEach((row: any) => {
        const provinceName = row.province_name || 'Unknown Province';
        if (!groupedByProvince[provinceName]) {
          groupedByProvince[provinceName] = [];
        }
        groupedByProvince[provinceName].push(row);
      });

      // Prepare data with province headers and totals rows
      const municipalityAnalysisData: any[] = [];
      const totalsRowInfo: Array<{ rowNumber: number; startRow: number; endRow: number }> = [];

      Object.entries(groupedByProvince).forEach(([provinceName, municipalities]) => {
        // Add province header row
        municipalityAnalysisData.push({
          'MUNICIPALITY/ DISTRICTS': provinceName,
          'NUMBER OF IEC WARDS': '',
          'TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP': '',
          'TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP': '',
          'PERCENTAGE % TOWARDS BPA/BGA': '',
          _isProvinceHeader: true
        });

        // Track start row for formulas (add 2 for header row + 1-based indexing)
        const startRow = municipalityAnalysisData.length + 2;

        // Add municipality rows
        municipalities.forEach(muni => {
          municipalityAnalysisData.push({
            'MUNICIPALITY/ DISTRICTS': muni['MUNICIPALITY/ DISTRICTS'],
            'NUMBER OF IEC WARDS': muni['NUMBER OF IEC WARDS'],
            'TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP': muni['TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP'],
            'TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP': muni['TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP'],
            'PERCENTAGE % TOWARDS BPA/BGA': muni['PERCENTAGE % TOWARDS BPA/BGA']
          });
        });

        // Track end row for formulas
        const endRow = municipalityAnalysisData.length + 1;

        // Add totals row (empty for now, will be populated with formulas later)
        municipalityAnalysisData.push({
          'MUNICIPALITY/ DISTRICTS': `${provinceName} - Total`,
          'NUMBER OF IEC WARDS': '',
          'TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP': '',
          'TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP': '',
          'PERCENTAGE % TOWARDS BPA/BGA': '',
          _isProvinceTotals: true
        });

        // Store row info for formula generation
        totalsRowInfo.push({
          rowNumber: municipalityAnalysisData.length + 1, // +1 for header row
          startRow,
          endRow
        });
      });

      // ===== SHEET 2: IEC Wards Master List =====
      // FIXED: Use members_consolidated directly to avoid missing data
      const iecWardsQuery = `
        SELECT
          p.province_name,
          d.district_name,
          COALESCE(mu.municipality_name, pm.municipality_name) AS municipality_name,
          w.ward_code,
          w.ward_number,
          w.ward_name,
          COUNT(DISTINCT m.member_id) FILTER (
            WHERE m.membership_status_id IN (1, 7, 8)
              AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE)
          ) AS valid_members
        FROM wards w
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
        LEFT JOIN districts d ON COALESCE(mu.district_code, pm.district_code) = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN members_consolidated m ON m.ward_code = w.ward_code
        WHERE COALESCE(w.is_active, TRUE) = TRUE
        GROUP BY p.province_name, d.district_name, mu.municipality_name, pm.municipality_name, w.ward_code, w.ward_number, w.ward_name
        ORDER BY p.province_name, d.district_name, COALESCE(mu.municipality_name, pm.municipality_name), w.ward_number, w.ward_name
      `;

      const iecWardsData = await executeQuery(iecWardsQuery, []);

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EFF Membership System';
      workbook.created = new Date();

      // ===== SHEET 1: Municipality/District Analysis =====
      // FIXED: Column order - NUMBER OF IEC WARDS moved to column B (position 2)
      const municipalitySheet = workbook.addWorksheet('Municipality-District Analysis');
      municipalitySheet.columns = [
        { header: 'MUNICIPALITY/ DISTRICTS', key: 'MUNICIPALITY/ DISTRICTS', width: 40 },
        { header: 'NUMBER OF IEC WARDS', key: 'NUMBER OF IEC WARDS', width: 20 },
        { header: 'TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP', key: 'TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP', width: 25 },
        { header: 'TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP', key: 'TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP', width: 25 },
        { header: 'PERCENTAGE % TOWARDS BPA/BGA', key: 'PERCENTAGE % TOWARDS BPA/BGA', width: 20 }
      ];

      // Add data rows
      municipalityAnalysisData.forEach((row: any) => municipalitySheet.addRow(row));

      // Apply basic styling
      this.styleExcelJSSheet(municipalitySheet, municipalityAnalysisData.length, 5);

      // Apply special styling for province headers and totals rows
      municipalitySheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const dataIndex = rowNumber - 2; // -2 for header row
          const rowData = municipalityAnalysisData[dataIndex];

          // Province header styling (light blue background)
          if (rowData?._isProvinceHeader) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE3F2FD' } // Light blue
              };
              cell.font = {
                bold: true,
                size: 11
              };
            });
          }

          // Province totals styling (light grey background)
          if (rowData?._isProvinceTotals) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF5F5F5' } // Light grey
              };
              cell.font = {
                bold: true,
                size: 10
              };
            });
          }

          // Apply percentage formatting to the last column (column E, index 5)
          const percentCell = row.getCell(5);
          if (typeof percentCell.value === 'number') {
            percentCell.numFmt = '0.00"%"';
          }
        }
      });

      // Add Excel SUM formulas to totals rows
      totalsRowInfo.forEach((info) => {
        const totalsRow = municipalitySheet.getRow(info.rowNumber);

        // Column B (2): NUMBER OF IEC WARDS
        totalsRow.getCell(2).value = { formula: `SUM(B${info.startRow}:B${info.endRow})` };

        // Column C (3): TOTAL NUMBER OF WARDS WITH 200 OR MORE VALID MEMBERSHIP
        totalsRow.getCell(3).value = { formula: `SUM(C${info.startRow}:C${info.endRow})` };

        // Column D (4): TOTAL NUMBER OF WARDS WITH LESS THAN 200 VALID MEMBERSHIP
        totalsRow.getCell(4).value = { formula: `SUM(D${info.startRow}:D${info.endRow})` };

        // Column E (5): PERCENTAGE % TOWARDS BPA/BGA (calculated from totals)
        totalsRow.getCell(5).value = { formula: `IF(B${info.rowNumber}=0,0,C${info.rowNumber}/B${info.rowNumber}*100)` };
      });

      // ===== SHEET 2: IEC Wards Master List =====
      const iecWardsSheet = workbook.addWorksheet('IEC Wards');
      iecWardsSheet.columns = [
        { header: '#', key: '#', width: 8 },
        { header: 'Province', key: 'Province', width: 20 },
        { header: 'District', key: 'District', width: 30 },
        { header: 'Municipality', key: 'Municipality', width: 35 },
        { header: 'Ward Code', key: 'Ward Code', width: 15 },
        { header: 'Ward Number', key: 'Ward Number', width: 15 },
        { header: 'Valid Members', key: 'Valid Members', width: 18 },
        { header: '200+ Compliance', key: '200+ Compliance', width: 18 }
      ];

      // Add data rows with row numbers and compliance status
      iecWardsData.forEach((row: any, index: number) => {
        const compliance = (row.valid_members >= 200) ? 'Yes' : 'No';
        iecWardsSheet.addRow({
          '#': index + 1,
          'Province': row.province_name,
          'District': row.district_name,
          'Municipality': row.municipality_name,
          'Ward Code': row.ward_code,
          'Ward Number': row.ward_number,
          'Valid Members': row.valid_members,
          '200+ Compliance': compliance
        });
      });

      this.styleExcelJSSheet(iecWardsSheet, iecWardsData.length, 9);

      // Generate buffer with ExcelJS
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error: any) {
      throw new Error(`Failed to generate daily Excel report: ${error.message}`);
    }
  }

  /**
   * Generate SRPA Delegates Excel Report with 10 worksheets (9 provinces + 1 summary)
   */
  static async generateSRPADelegatesReport(filters: {
    province_code?: string;
    municipality_code?: string;
    ward_code?: string;
  } = {}): Promise<Buffer> {
    try {
      const { province_code, municipality_code, ward_code } = filters;

      // Create workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Get all 9 provinces
      const provincesQuery = `
        SELECT DISTINCT province_code, province_name
        FROM provinces
        WHERE is_active = TRUE
        ORDER BY province_name
      `;
      const provinces = await executeQuery(provincesQuery, []);

      // For each province, create a worksheet with SRPA delegates grouped by municipality/district
      for (const province of provinces) {
        const provinceCode = province.province_code;
        const provinceName = province.province_name;

        // Get SRPA delegates for this province grouped by municipality/district
        const delegatesQuery = `
          SELECT
            COALESCE(m.municipality_name, m.district_name) as "MUNICIPALITY/ DISTRICTS",
            wd.ward_code as "WARD CODE",
            m.membership_number as "MEMBERSHIP NUMBER",
            m.firstname || ' ' || m.surname as "FULL NAME",
            m.id_number as "ID NUMBER",
            m.cell_number as "CELL NUMBER",
            wd.selection_method as "SELECTION METHOD",
            wd.selection_date as "SELECTION DATE",
            wd.delegate_status as "STATUS"
          FROM ward_delegates wd
          JOIN members_consolidated m ON wd.member_id = m.member_id
          JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
          WHERE at.assembly_code = 'SRPA'
            AND m.province_code = $1
          ORDER BY
            COALESCE(m.municipality_name, m.district_name),
            wd.ward_code,
            wd.selection_date DESC
        `;

        const delegates = await executeQuery(delegatesQuery, [provinceCode]);

        // Create worksheet for this province
        const worksheet = workbook.addWorksheet(provinceName);

        // Set column definitions
        worksheet.columns = [
          { header: 'MUNICIPALITY/ DISTRICTS', key: 'MUNICIPALITY/ DISTRICTS', width: 35 },
          { header: 'WARD CODE', key: 'WARD CODE', width: 15 },
          { header: 'MEMBERSHIP NUMBER', key: 'MEMBERSHIP NUMBER', width: 20 },
          { header: 'FULL NAME', key: 'FULL NAME', width: 30 },
          { header: 'ID NUMBER', key: 'ID NUMBER', width: 15 },
          { header: 'CELL NUMBER', key: 'CELL NUMBER', width: 15 },
          { header: 'SELECTION METHOD', key: 'SELECTION METHOD', width: 20 },
          { header: 'SELECTION DATE', key: 'SELECTION DATE', width: 20 },
          { header: 'STATUS', key: 'STATUS', width: 15 }
        ];

        // Add data rows
        delegates.forEach((row: any) => worksheet.addRow(row));

        // Apply styling
        this.styleExcelJSSheet(worksheet, delegates.length, 9);
      }

      // Create final summary worksheet
      const summarySheet = workbook.addWorksheet('NATIONAL SUMMARY');

      const summaryQuery = `
        SELECT
          m.province_name as "PROVINCE",
          COUNT(DISTINCT COALESCE(m.municipality_code, m.district_code)) as "MUNICIPALITIES/DISTRICTS",
          COUNT(DISTINCT wd.ward_code) as "WARDS WITH DELEGATES",
          COUNT(*) as "TOTAL DELEGATES",
          COUNT(DISTINCT CASE WHEN wd.delegate_status = 'Active' THEN wd.delegate_id END) as "ACTIVE DELEGATES",
          COUNT(DISTINCT CASE WHEN wd.delegate_status != 'Active' THEN wd.delegate_id END) as "INACTIVE DELEGATES"
        FROM ward_delegates wd
        JOIN members_consolidated m ON wd.member_id = m.member_id
        JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
        WHERE at.assembly_code = 'SRPA'
        GROUP BY m.province_name
        ORDER BY m.province_name
      `;

      const summaryData = await executeQuery(summaryQuery, []);

      summarySheet.columns = [
        { header: 'PROVINCE', key: 'PROVINCE', width: 25 },
        { header: 'MUNICIPALITIES/DISTRICTS', key: 'MUNICIPALITIES/DISTRICTS', width: 30 },
        { header: 'WARDS WITH DELEGATES', key: 'WARDS WITH DELEGATES', width: 25 },
        { header: 'TOTAL DELEGATES', key: 'TOTAL DELEGATES', width: 20 },
        { header: 'ACTIVE DELEGATES', key: 'ACTIVE DELEGATES', width: 20 },
        { header: 'INACTIVE DELEGATES', key: 'INACTIVE DELEGATES', width: 20 }
      ];

      summaryData.forEach((row: any) => summarySheet.addRow(row));
      this.styleExcelJSSheet(summarySheet, summaryData.length, 6);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error: any) {
      throw new Error(`Failed to generate SRPA delegates Excel report: ${error.message}`);
    }
  }

  /**
   * Shared helper: build and execute the expiry status query, then render to Excel or CSV.
   * type='expired'  → expiry_date < CURRENT_DATE (past membership)
   * type='expiring' → expiry_date >= CURRENT_DATE (future / upcoming)
   */
  private static async generateExpiryStatusReport(
    type: 'expired' | 'expiring',
    filters: {
      province_code?: string;
      municipality_code?: string;
      expiry_date_from?: string;
      expiry_date_to?: string;
    } = {},
    format: 'excel' | 'csv' = 'excel'
  ): Promise<Buffer> {
    try {
      const { province_code, municipality_code, expiry_date_from, expiry_date_to } = filters;

      const conditions: string[] = ['m.expiry_date IS NOT NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      if (type === 'expired') {
        // Always restrict to past dates
        conditions.push('m.expiry_date::DATE < CURRENT_DATE');
        if (expiry_date_from) {
          conditions.push(`m.expiry_date::DATE >= $${paramIndex}::DATE`);
          params.push(expiry_date_from);
          paramIndex++;
        }
        if (expiry_date_to) {
          conditions.push(`m.expiry_date::DATE <= $${paramIndex}::DATE`);
          params.push(expiry_date_to);
          paramIndex++;
        }
      } else {
        // Always restrict to present / future dates
        conditions.push('m.expiry_date::DATE >= CURRENT_DATE');
        if (expiry_date_from) {
          conditions.push(`m.expiry_date::DATE >= $${paramIndex}::DATE`);
          params.push(expiry_date_from);
          paramIndex++;
        }
        if (expiry_date_to) {
          conditions.push(`m.expiry_date::DATE <= $${paramIndex}::DATE`);
          params.push(expiry_date_to);
          paramIndex++;
        }
      }

      if (province_code) {
        conditions.push(`m.province_code = $${paramIndex}`);
        params.push(province_code);
        paramIndex++;
      }
      if (municipality_code) {
        conditions.push(`m.municipality_code = $${paramIndex}`);
        params.push(municipality_code);
        paramIndex++;
      }

      const query = `
        SELECT
          CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', m.surname) AS "Full Name",
          m.id_number AS "ID Number",
          COALESCE(m.cell_number, '') AS "Cell Number",
          m.ward_code AS "Ward Code",
          m.municipality_code AS "Municipality Code",
          m.municipality_name AS "Municipality Name",
          m.voting_district_code AS "Voting District Code",
          m.province_code AS "Province Code",
          m.province_name AS "Province Name",
          m.district_code AS "District Code",
          m.district_name AS "District Name",
          m.expiry_date AS "Expiry Date"
        FROM members_consolidated m
        WHERE ${conditions.join(' AND ')}
        ORDER BY m.province_name, m.municipality_name, m.ward_code,
                 CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', m.surname)
      `;

      const members = await executeQuery(query, params);

      const sheetName = type === 'expired' ? 'Expired Members' : 'Expiring Members';
      const columnHeaders = [
        'Full Name', 'ID Number', 'Cell Number', 'Ward Code',
        'Municipality Code', 'Municipality Name', 'Voting District Code',
        'Province Code', 'Province Name', 'District Code', 'District Name', 'Expiry Date'
      ];

      // CSV format
      if (format === 'csv') {
        const csvRows = [columnHeaders.join(',')];
        members.forEach((row: any) => {
          const values = columnHeaders.map(h => {
            let val = row[h] ?? '';
            if (h === 'Expiry Date' && val) {
              val = new Date(val).toISOString().split('T')[0];
            }
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          });
          csvRows.push(values.join(','));
        });
        return Buffer.from(csvRows.join('\n'), 'utf-8');
      }

      // Excel format
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EFF Membership System';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = [
        { header: 'Full Name', key: 'Full Name', width: 35 },
        { header: 'ID Number', key: 'ID Number', width: 18 },
        { header: 'Cell Number', key: 'Cell Number', width: 18 },
        { header: 'Ward Code', key: 'Ward Code', width: 15 },
        { header: 'Municipality Code', key: 'Municipality Code', width: 20 },
        { header: 'Municipality Name', key: 'Municipality Name', width: 30 },
        { header: 'Voting District Code', key: 'Voting District Code', width: 22 },
        { header: 'Province Code', key: 'Province Code', width: 16 },
        { header: 'Province Name', key: 'Province Name', width: 20 },
        { header: 'District Code', key: 'District Code', width: 16 },
        { header: 'District Name', key: 'District Name', width: 25 },
        { header: 'Expiry Date', key: 'Expiry Date', width: 15 },
      ];

      members.forEach((row: any) => {
        worksheet.addRow({
          'Full Name': row['Full Name'],
          'ID Number': row['ID Number'],
          'Cell Number': row['Cell Number'],
          'Ward Code': row['Ward Code'],
          'Municipality Code': row['Municipality Code'],
          'Municipality Name': row['Municipality Name'],
          'Voting District Code': row['Voting District Code'],
          'Province Code': row['Province Code'],
          'Province Name': row['Province Name'],
          'District Code': row['District Code'],
          'District Name': row['District Name'],
          'Expiry Date': row['Expiry Date'] ? new Date(row['Expiry Date']).toISOString().split('T')[0] : '',
        });
      });

      this.styleExcelJSSheet(worksheet, members.length, 12);

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error: any) {
      throw new Error(`Failed to generate ${type} members report: ${error.message}`);
    }
  }

  /**
   * Generate Expired Members Excel Report
   * Lists members whose expiry_date < CURRENT_DATE.
   * Optional date range narrows the window to specific past dates.
   */
  static async generateExpiredMembersReport(filters: {
    province_code?: string;
    municipality_code?: string;
    expiry_date_from?: string;
    expiry_date_to?: string;
  } = {}): Promise<Buffer> {
    return this.generateExpiryStatusReport('expired', filters, 'excel');
  }

  /**
   * Generate Expiring Members Report (Excel or CSV)
   * Lists members whose expiry_date >= CURRENT_DATE.
   * Optional date range defines the look-ahead window.
   */
  static async generateExpiringMembersReport(filters: {
    province_code?: string;
    municipality_code?: string;
    expiry_date_from?: string;
    expiry_date_to?: string;
  }, format: 'excel' | 'csv' = 'excel'): Promise<Buffer> {
    return this.generateExpiryStatusReport('expiring', filters, format);
  }

  /**
   * Generate Not Registered Members Excel Report
   * Lists members who are not registered to vote (voting_district_code = '99999999')
   */
  static async generateNotRegisteredMembersReport(filters: {
    province_code?: string;
  } = {}): Promise<Buffer> {
    try {
      const { province_code } = filters;

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EFF Membership System';
      workbook.created = new Date();

      // Query for not registered members
      const notRegisteredQuery = `
        SELECT
          CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', m.surname) AS "Full Name",
          m.id_number AS "ID Number",
          COALESCE(m.cell_number, '') AS "Cell Number",
          m.province_name AS "Province",
          m.municipality_name AS "Municipality",
          m.ward_code AS "Ward",
          CASE
            WHEN m.membership_status_id = 1 THEN 'Active'
            WHEN m.membership_status_id = 2 THEN 'Expired'
            WHEN m.membership_status_id = 3 THEN 'Suspended'
            WHEN m.membership_status_id = 4 THEN 'Cancelled'
            WHEN m.membership_status_id = 5 THEN 'Pending'
            WHEN m.membership_status_id = 7 THEN 'Paid - Pending Approval'
            WHEN m.membership_status_id = 8 THEN 'Honorary'
            ELSE 'Unknown'
          END AS "Membership Status"
        FROM members_consolidated m
        WHERE m.voting_district_code = '99999999'
          ${province_code ? 'AND m.province_code = $1' : ''}
        ORDER BY m.province_name, m.municipality_name, m.surname
      `;

      const params = province_code ? [province_code] : [];
      const notRegisteredMembers = await executeQuery(notRegisteredQuery, params);

      // Create worksheet
      const worksheet = workbook.addWorksheet('Not Registered Members');

      // Define columns
      worksheet.columns = [
        { header: 'Full Name', key: 'Full Name', width: 35 },
        { header: 'ID Number', key: 'ID Number', width: 18 },
        { header: 'Cell Number', key: 'Cell Number', width: 18 },
        { header: 'Province', key: 'Province', width: 20 },
        { header: 'Municipality', key: 'Municipality', width: 30 },
        { header: 'Ward', key: 'Ward', width: 15 },
        { header: 'Membership Status', key: 'Membership Status', width: 25 }
      ];

      // Add data rows
      notRegisteredMembers.forEach((row: any) => worksheet.addRow(row));

      // Apply styling
      this.styleExcelJSSheet(worksheet, notRegisteredMembers.length, 7);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error: any) {
      throw new Error(`Failed to generate not registered members Excel report: ${error.message}`);
    }
  }

  /**
   * Generate Different Ward Members Excel Report
   * Lists members registered to a different ward than their membership ward (voting_district_code = '22222222')
   */
  static async generateDifferentWardMembersReport(filters: {
    province_code?: string;
  } = {}): Promise<Buffer> {
    try {
      const { province_code } = filters;

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EFF Membership System';
      workbook.created = new Date();

      // Query for different ward members
      const differentWardQuery = `
        SELECT
          CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', m.surname) AS "Full Name",
          m.id_number AS "ID Number",
          COALESCE(m.cell_number, '') AS "Cell Number",
          m.ward_code AS "Membership Ward",
          m.voter_district_code AS "Registered Ward",
          m.province_name AS "Province",
          m.municipality_name AS "Municipality"
        FROM members_consolidated m
        WHERE m.voting_district_code = '22222222'
          ${province_code ? 'AND m.province_code = $1' : ''}
        ORDER BY m.province_name, m.municipality_name, m.surname
      `;

      const params = province_code ? [province_code] : [];
      const differentWardMembers = await executeQuery(differentWardQuery, params);

      // Create worksheet
      const worksheet = workbook.addWorksheet('Different Ward Members');

      // Define columns
      worksheet.columns = [
        { header: 'Full Name', key: 'Full Name', width: 35 },
        { header: 'ID Number', key: 'ID Number', width: 18 },
        { header: 'Cell Number', key: 'Cell Number', width: 18 },
        { header: 'Membership Ward', key: 'Membership Ward', width: 20 },
        { header: 'Registered Ward', key: 'Registered Ward', width: 20 },
        { header: 'Province', key: 'Province', width: 20 },
        { header: 'Municipality', key: 'Municipality', width: 30 }
      ];

      // Add data rows
      differentWardMembers.forEach((row: any) => worksheet.addRow(row));

      // Apply styling
      this.styleExcelJSSheet(worksheet, differentWardMembers.length, 7);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error: any) {
      throw new Error(`Failed to generate different ward members Excel report: ${error.message}`);
    }
  }

  /**
   * Save Excel report to file
   */
  /**
   * Generate Deceased Member Purge Report (Excel)
   * Sheet 1: Summary — one row per purge run with totals
   * Sheet 2: Province Breakdown — deceased counts per province across all runs
   * Sheet 3: Individual Records — full archive of all deceased members detected
   */
  static async generateDeceasedPurgeReport(filters: {
    province_code?: string;
    run_id?: number;
  } = {}): Promise<Buffer> {
    const { province_code, run_id } = filters;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EFF Membership System';
    workbook.created = new Date();

    // ── Sheet 1: Run Summary ───────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Run Summary');
    summarySheet.columns = [
      { header: 'Run #',           key: 'run_id',          width: 10 },
      { header: 'Run Date',        key: 'run_date',         width: 15 },
      { header: 'Status',          key: 'status',           width: 14 },
      { header: 'Total Scanned',   key: 'total_scanned',    width: 16 },
      { header: 'Deceased Found',  key: 'deceased_found',   width: 16 },
      { header: 'Records Deleted', key: 'records_deleted',  width: 17 },
      { header: 'Errors',          key: 'errors_count',     width: 10 },
      { header: 'Started At',      key: 'started_at',       width: 22 },
      { header: 'Completed At',    key: 'completed_at',     width: 22 },
    ];

    const runsConditions: string[] = [];
    const runsParams: unknown[] = [];
    if (run_id) { runsConditions.push(`run_id = $${runsParams.length + 1}`); runsParams.push(run_id); }
    const runsWhere = runsConditions.length ? `WHERE ${runsConditions.join(' AND ')}` : '';

    const runs = await executeQuery(
      `SELECT run_id, run_date, status, total_scanned, deceased_found,
              records_deleted, errors_count, started_at, completed_at
       FROM deceased_purge_runs ${runsWhere}
       ORDER BY run_id DESC`,
      runsParams as any[]
    );

    runs.forEach((r: any) => {
      summarySheet.addRow({
        run_id:          r.run_id,
        run_date:        r.run_date ? new Date(r.run_date).toISOString().split('T')[0] : '',
        status:          r.status,
        total_scanned:   r.total_scanned,
        deceased_found:  r.deceased_found,
        records_deleted: r.records_deleted,
        errors_count:    r.errors_count,
        started_at:      r.started_at ? new Date(r.started_at).toLocaleString('en-ZA') : '',
        completed_at:    r.completed_at ? new Date(r.completed_at).toLocaleString('en-ZA') : '',
      });
    });
    this.styleExcelJSSheet(summarySheet, runs.length, 9);

    // ── Sheet 2: Province Breakdown ────────────────────────────────────────
    const provinceSheet = workbook.addWorksheet('Province Breakdown');
    provinceSheet.columns = [
      { header: 'Province Code', key: 'province_code', width: 16 },
      { header: 'Province',      key: 'province_name', width: 22 },
      { header: 'Total Deceased', key: 'total_deceased', width: 17 },
      { header: 'Total Deleted',  key: 'total_deleted',  width: 16 },
      { header: 'Last Detected',  key: 'last_detected',  width: 22 },
    ];

    const provinceConditions: string[] = [];
    const provinceParams: unknown[] = [];
    if (province_code) { provinceConditions.push(`province_code = $${provinceParams.length + 1}`); provinceParams.push(province_code); }
    if (run_id)        { provinceConditions.push(`purge_run_id = $${provinceParams.length + 1}`);  provinceParams.push(run_id); }
    const provinceWhere = provinceConditions.length ? `WHERE ${provinceConditions.join(' AND ')}` : '';

    const provinceSummary = await executeQuery(
      `SELECT
         province_code,
         COUNT(*) AS total_deceased,
         COUNT(*) AS total_deleted,
         MAX(detected_date) AS last_detected
       FROM deceased_members_archive
       ${provinceWhere}
       GROUP BY province_code
       ORDER BY total_deceased DESC`,
      provinceParams as any[]
    );

    const PROVINCE_NAMES: Record<string, string> = {
      GP: 'Gauteng', KZN: 'KwaZulu-Natal', EC: 'Eastern Cape',
      LP: 'Limpopo', MP: 'Mpumalanga', NW: 'North West',
      WC: 'Western Cape', FS: 'Free State', NC: 'Northern Cape',
    };

    provinceSummary.forEach((r: any) => {
      provinceSheet.addRow({
        province_code:   r.province_code,
        province_name:   PROVINCE_NAMES[r.province_code] ?? r.province_code,
        total_deceased:  parseInt(r.total_deceased, 10),
        total_deleted:   parseInt(r.total_deleted, 10),
        last_detected:   r.last_detected ? new Date(r.last_detected).toLocaleString('en-ZA') : '',
      });
    });
    this.styleExcelJSSheet(provinceSheet, provinceSummary.length, 5);

    // ── Sheet 3: Individual Records ────────────────────────────────────────
    const recordsSheet = workbook.addWorksheet('Individual Records');
    recordsSheet.columns = [
      { header: 'Archive ID',      key: 'archive_id',       width: 12 },
      { header: 'Run #',           key: 'purge_run_id',     width: 8 },
      { header: 'ID Number',       key: 'id_number',        width: 16 },
      { header: 'First Name',      key: 'firstname',        width: 20 },
      { header: 'Surname',         key: 'surname',          width: 20 },
      { header: 'Province',        key: 'province_name',    width: 20 },
      { header: 'Municipality',    key: 'municipality_code', width: 18 },
      { header: 'Ward',            key: 'ward_code',        width: 12 },
      { header: 'Membership #',    key: 'membership_number', width: 16 },
      { header: 'Cell Number',     key: 'cell_number',      width: 16 },
      { header: 'Date Joined',     key: 'date_joined',      width: 14 },
      { header: 'IEC Voter Status', key: 'iec_voter_status', width: 20 },
      { header: 'Detected Date',   key: 'detected_date',    width: 22 },
    ];

    const recordConditions: string[] = [];
    const recordParams: unknown[] = [];
    if (province_code) { recordConditions.push(`province_code = $${recordParams.length + 1}`); recordParams.push(province_code); }
    if (run_id)        { recordConditions.push(`purge_run_id = $${recordParams.length + 1}`);  recordParams.push(run_id); }
    const recordWhere = recordConditions.length ? `WHERE ${recordConditions.join(' AND ')}` : '';

    const records = await executeQuery(
      `SELECT archive_id, purge_run_id, id_number, firstname, surname,
              province_code, municipality_code, ward_code,
              membership_number, cell_number, date_joined,
              iec_voter_status, detected_date
       FROM deceased_members_archive
       ${recordWhere}
       ORDER BY detected_date DESC`,
      recordParams as any[]
    );

    records.forEach((r: any) => {
      recordsSheet.addRow({
        archive_id:        r.archive_id,
        purge_run_id:      r.purge_run_id,
        id_number:         r.id_number,
        firstname:         r.firstname,
        surname:           r.surname,
        province_name:     PROVINCE_NAMES[r.province_code] ?? r.province_code,
        municipality_code: r.municipality_code,
        ward_code:         r.ward_code,
        membership_number: r.membership_number,
        cell_number:       r.cell_number,
        date_joined:       r.date_joined ? new Date(r.date_joined).toISOString().split('T')[0] : '',
        iec_voter_status:  r.iec_voter_status,
        detected_date:     r.detected_date ? new Date(r.detected_date).toLocaleString('en-ZA') : '',
      });
    });
    this.styleExcelJSSheet(recordsSheet, records.length, 13);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  static async saveReportToFile(buffer: Buffer, fileName: string): Promise<string> {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      
      // Ensure reports directory exists
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      return filePath;
    } catch (error: any) {
      throw new Error(`Failed to save report to file: ${error.message}`);
    }
  }
}

