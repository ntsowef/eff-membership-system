import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { executeQuery, executeQuerySingle } from '../config/database';
import * as path from 'path';
import * as fs from 'fs';

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
   * Generate Comprehensive Audit Excel Report (matching original format)
   * Sheet1: Provincial Summary
   * Sheet4: Municipality/District Detail
   * Uses ExcelJS for full styling support
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

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EFF Membership System';
      workbook.created = new Date();

      // ===== SHEET 1: PROVINCIAL SUMMARY =====
      const provincialQuery = `
        SELECT
          m.province_name as "PROVINCE",
          COUNT(DISTINCT w.ward_code) as "NUMBER OF IEC WARDS",
          COUNT(DISTINCT CASE WHEN m.membership_number IS NOT NULL THEN m.member_id END) as "TOTAL NUMBER OF REGISTERS ISSUED",
          COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as "NUMBER OF BRANCHES CONVENED BPA/BGA",
          COUNT(DISTINCT w.ward_code) - COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as "NUMBER OF BRANCHES NOT CONVENED BPA/BGA",
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Good Standing', 'Excellent Standing') THEN w.ward_code END) as "NUMBER OF BRANCHES PASSED FINAL AUDIT TO THE 1ST SRPA",
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Poor Standing', 'Critical Standing') THEN w.ward_code END) as "NUMBER OF BRANCHES FAILED AUDIT FINAL AUDIT TO THE 1ST SRPA",
          COUNT(DISTINCT CASE WHEN wma.ward_standing = 'Fair Standing' THEN w.ward_code END) as "NUMBER OF BRANCHES CURRENTLY IN AUDIT",
          ROUND(
            CAST(COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Good Standing', 'Excellent Standing') THEN w.ward_code END) AS NUMERIC) /
            NULLIF(COUNT(DISTINCT w.ward_code), 0),
            4
          ) as "PERCENTAGE % TOWARDS 1ST SRPA"
        FROM wards w
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
        LEFT JOIN vw_ward_membership_audit wma ON w.ward_code = wma.ward_code
        ${province_code ? 'WHERE m.province_code = $1' : ''}
        GROUP BY m.province_name
        ORDER BY m.province_name
      `;

      const provincialParams = province_code ? [province_code] : [];
      const provincialData = await executeQuery(provincialQuery, provincialParams);

      // Create Sheet1 with ExcelJS
      const sheet1 = workbook.addWorksheet('Sheet1');

      // Define columns with headers
      sheet1.columns = [
        { header: 'PROVINCE', key: 'PROVINCE', width: 20 },
        { header: 'NUMBER OF IEC WARDS', key: 'NUMBER OF IEC WARDS', width: 20 },
        { header: 'TOTAL NUMBER OF REGISTERS ISSUED', key: 'TOTAL NUMBER OF REGISTERS ISSUED', width: 35 },
        { header: 'NUMBER OF BRANCHES CONVENED BPA/BGA', key: 'NUMBER OF BRANCHES CONVENED BPA/BGA', width: 40 },
        { header: 'NUMBER OF BRANCHES NOT CONVENED BPA/BGA', key: 'NUMBER OF BRANCHES NOT CONVENED BPA/BGA', width: 45 },
        { header: 'NUMBER OF BRANCHES PASSED FINAL AUDIT TO THE 1ST SRPA', key: 'NUMBER OF BRANCHES PASSED FINAL AUDIT TO THE 1ST SRPA', width: 55 },
        { header: 'NUMBER OF BRANCHES FAILED AUDIT FINAL AUDIT TO THE 1ST SRPA', key: 'NUMBER OF BRANCHES FAILED AUDIT FINAL AUDIT TO THE 1ST SRPA', width: 60 },
        { header: 'NUMBER OF BRANCHES CURRENTLY IN AUDIT', key: 'NUMBER OF BRANCHES CURRENTLY IN AUDIT', width: 40 },
        { header: 'PERCENTAGE % TOWARDS 1ST SRPA', key: 'PERCENTAGE % TOWARDS 1ST SRPA', width: 30 }
      ];

      // Add data rows
      provincialData.forEach((row: any) => {
        sheet1.addRow(row);
      });

      // Style header row
      sheet1.getRow(1).eachCell((cell) => {
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
      sheet1.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };

            // Right-align numbers
            if (colNumber > 1 && colNumber < 9) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = '#,##0';
            }
            // Format percentage
            else if (colNumber === 9) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = '0.00%';
            }
            // Left-align text
            else {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
          });
        }
      });

      // ===== SHEET 4: MUNICIPALITY/DISTRICT DETAIL =====
      const municipalityQuery = `
        SELECT
          m.province_name,
          COALESCE(m.municipality_name, m.district_name) as "MUNICIPALITY/ DISTRICTS",
          COUNT(DISTINCT w.ward_code) as "NUMBER OF IEC WARDS",
          '' as "empty_col",
          COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as "NUMBER OF BRANCHES CONVENED",
          COUNT(DISTINCT w.ward_code) - COUNT(DISTINCT CASE WHEN wd.delegate_id IS NOT NULL AND wd.delegate_status = 'Active' THEN w.ward_code END) as "NUMBER OF BRANCHES NOT CONVENED",
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Good Standing', 'Excellent Standing') THEN w.ward_code END) as "NUMBER OF BRANCHES PASSED AUDIT",
          COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Poor Standing', 'Critical Standing', 'Fair Standing') THEN w.ward_code END) as "NUMBER OF BRANCHES FAILED AUDIT",
          ROUND(
            CAST(COUNT(DISTINCT CASE WHEN wma.ward_standing IN ('Good Standing', 'Excellent Standing') THEN w.ward_code END) AS NUMERIC) /
            NULLIF(COUNT(DISTINCT w.ward_code), 0),
            4
          ) as "PERCENTAGE % TOWARDS BPA/BGA"
        FROM wards w
        LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
        LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
        LEFT JOIN vw_ward_membership_audit wma ON w.ward_code = wma.ward_code
        ${province_code ? 'WHERE m.province_code = $1' : ''}
        GROUP BY m.province_name, COALESCE(m.municipality_name, m.district_name)
        ORDER BY m.province_name, COALESCE(m.municipality_name, m.district_name)
      `;

      const municipalityParams = province_code ? [province_code] : [];
      const municipalityDataRaw = await executeQuery(municipalityQuery, municipalityParams);

      // Group municipalities by province
      const groupedByProvince: Record<string, any[]> = {};
      municipalityDataRaw.forEach((row: any) => {
        const provinceName = row.province_name || 'Unknown Province';
        if (!groupedByProvince[provinceName]) {
          groupedByProvince[provinceName] = [];
        }
        groupedByProvince[provinceName].push(row);
      });

      // Calculate totals for each province
      const calculateProvinceTotals = (municipalities: any[]) => {
        const totals = {
          'NUMBER OF IEC WARDS': 0,
          'NUMBER OF BRANCHES CONVENED': 0,
          'NUMBER OF BRANCHES NOT CONVENED': 0,
          'NUMBER OF BRANCHES PASSED AUDIT': 0,
          'NUMBER OF BRANCHES FAILED AUDIT': 0,
        };

        municipalities.forEach(muni => {
          totals['NUMBER OF IEC WARDS'] += muni['NUMBER OF IEC WARDS'] || 0;
          totals['NUMBER OF BRANCHES CONVENED'] += muni['NUMBER OF BRANCHES CONVENED'] || 0;
          totals['NUMBER OF BRANCHES NOT CONVENED'] += muni['NUMBER OF BRANCHES NOT CONVENED'] || 0;
          totals['NUMBER OF BRANCHES PASSED AUDIT'] += muni['NUMBER OF BRANCHES PASSED AUDIT'] || 0;
          totals['NUMBER OF BRANCHES FAILED AUDIT'] += muni['NUMBER OF BRANCHES FAILED AUDIT'] || 0;
        });

        // Calculate weighted percentage
        const percentage = totals['NUMBER OF IEC WARDS'] > 0
          ? totals['NUMBER OF BRANCHES PASSED AUDIT'] / totals['NUMBER OF IEC WARDS']
          : 0;

        return {
          ...totals,
          'PERCENTAGE % TOWARDS BPA/BGA': percentage,
        };
      };

      // Prepare data with province headers and totals (with row tracking for formulas)
      const municipalityData: any[] = [];
      const totalsRowInfo: Array<{ rowNumber: number; startRow: number; endRow: number }> = [];

      Object.entries(groupedByProvince).forEach(([provinceName, municipalities]) => {
        // Add province header row
        municipalityData.push({
          'MUNICIPALITY/ DISTRICTS': provinceName,
          'NUMBER OF IEC WARDS': '',
          '': '',
          'NUMBER OF BRANCHES CONVENED': '',
          'NUMBER OF BRANCHES NOT CONVENED': '',
          'NUMBER OF BRANCHES PASSED AUDIT': '',
          'NUMBER OF BRANCHES FAILED AUDIT': '',
          'PERCENTAGE % TOWARDS BPA/BGA': '',
          _isProvinceHeader: true,
        });

        // Track the start row for this province's municipalities (after header row)
        const startRow = municipalityData.length + 2; // +2 because: +1 for Excel 1-based, +1 for header row

        // Add municipality rows
        municipalities.forEach(muni => {
          municipalityData.push({
            'MUNICIPALITY/ DISTRICTS': muni['MUNICIPALITY/ DISTRICTS'],
            'NUMBER OF IEC WARDS': muni['NUMBER OF IEC WARDS'],
            '': '',
            'NUMBER OF BRANCHES CONVENED': muni['NUMBER OF BRANCHES CONVENED'],
            'NUMBER OF BRANCHES NOT CONVENED': muni['NUMBER OF BRANCHES NOT CONVENED'],
            'NUMBER OF BRANCHES PASSED AUDIT': muni['NUMBER OF BRANCHES PASSED AUDIT'],
            'NUMBER OF BRANCHES FAILED AUDIT': muni['NUMBER OF BRANCHES FAILED AUDIT'],
            'PERCENTAGE % TOWARDS BPA/BGA': muni['PERCENTAGE % TOWARDS BPA/BGA'],
          });
        });

        // Track the end row for this province's municipalities
        const endRow = municipalityData.length + 1; // +1 for Excel 1-based indexing

        // Add province totals row (will be populated with formulas later)
        municipalityData.push({
          'MUNICIPALITY/ DISTRICTS': `${provinceName} - Total`,
          'NUMBER OF IEC WARDS': '',
          '': '',
          'NUMBER OF BRANCHES CONVENED': '',
          'NUMBER OF BRANCHES NOT CONVENED': '',
          'NUMBER OF BRANCHES PASSED AUDIT': '',
          'NUMBER OF BRANCHES FAILED AUDIT': '',
          'PERCENTAGE % TOWARDS BPA/BGA': '',
          _isProvinceTotals: true,
        });

        // Store info for adding formulas later
        totalsRowInfo.push({
          rowNumber: municipalityData.length + 1, // +1 for Excel 1-based indexing
          startRow,
          endRow,
        });
      });

      // Create Sheet4 with ExcelJS
      const sheet4 = workbook.addWorksheet('Sheet4');

      // Define columns with headers
      sheet4.columns = [
        { header: 'MUNICIPALITY/ DISTRICTS', key: 'MUNICIPALITY/ DISTRICTS', width: 35 },
        { header: 'NUMBER OF IEC WARDS', key: 'NUMBER OF IEC WARDS', width: 20 },
        { header: '', key: '', width: 5 },
        { header: 'NUMBER OF BRANCHES CONVENED', key: 'NUMBER OF BRANCHES CONVENED', width: 30 },
        { header: 'NUMBER OF BRANCHES NOT CONVENED', key: 'NUMBER OF BRANCHES NOT CONVENED', width: 35 },
        { header: 'NUMBER OF BRANCHES PASSED AUDIT', key: 'NUMBER OF BRANCHES PASSED AUDIT', width: 35 },
        { header: 'NUMBER OF BRANCHES FAILED AUDIT', key: 'NUMBER OF BRANCHES FAILED AUDIT', width: 35 },
        { header: 'PERCENTAGE % TOWARDS BPA/BGA', key: 'PERCENTAGE % TOWARDS BPA/BGA', width: 30 }
      ];

      // Add data rows and track special rows
      const provinceHeaderRows: number[] = [];
      const provinceTotalsRows: number[] = [];

      municipalityData.forEach((row: any, index: number) => {
        const excelRow = sheet4.addRow(row);
        const rowNumber = excelRow.number;

        if (row._isProvinceHeader) {
          provinceHeaderRows.push(rowNumber);
        } else if (row._isProvinceTotals) {
          provinceTotalsRows.push(rowNumber);
        }
      });

      // Add SUM formulas to totals rows
      totalsRowInfo.forEach((info) => {
        const totalsRow = sheet4.getRow(info.rowNumber);

        // Column B (2): NUMBER OF IEC WARDS
        totalsRow.getCell(2).value = { formula: `SUM(B${info.startRow}:B${info.endRow})` };

        // Column D (4): NUMBER OF BRANCHES CONVENED
        totalsRow.getCell(4).value = { formula: `SUM(D${info.startRow}:D${info.endRow})` };

        // Column E (5): NUMBER OF BRANCHES NOT CONVENED
        totalsRow.getCell(5).value = { formula: `SUM(E${info.startRow}:E${info.endRow})` };

        // Column F (6): NUMBER OF BRANCHES PASSED AUDIT
        totalsRow.getCell(6).value = { formula: `SUM(F${info.startRow}:F${info.endRow})` };

        // Column G (7): NUMBER OF BRANCHES FAILED AUDIT
        totalsRow.getCell(7).value = { formula: `SUM(G${info.startRow}:G${info.endRow})` };

        // Column H (8): PERCENTAGE % TOWARDS BPA/BGA (calculated: passed / total wards)
        totalsRow.getCell(8).value = { formula: `IF(B${info.rowNumber}=0,0,F${info.rowNumber}/B${info.rowNumber})` };
      });

      // Style header row
      sheet4.getRow(1).eachCell((cell) => {
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
      sheet4.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const isProvinceHeader = provinceHeaderRows.includes(rowNumber);
          const isProvinceTotals = provinceTotalsRows.includes(rowNumber);

          row.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };

            // Province Header Row Styling
            if (isProvinceHeader) {
              cell.font = { bold: true, size: 12 };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE3F2FD' } // Light blue background
              };
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
            // Province Totals Row Styling
            else if (isProvinceTotals) {
              cell.font = { bold: true, size: 11 };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF5F5F5' } // Light grey background
              };

              // Right-align numbers (columns 2, 4-7)
              if ((colNumber >= 2 && colNumber <= 2) || (colNumber >= 4 && colNumber <= 7)) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '#,##0';
              }
              // Format percentage (column 8)
              else if (colNumber === 8) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '0.00%';
              }
              // Left-align text
              else {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              }
            }
            // Regular Municipality Row Styling
            else {
              // Right-align numbers (columns 2, 4-7)
              if ((colNumber >= 2 && colNumber <= 2) || (colNumber >= 4 && colNumber <= 7)) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '#,##0';
              }
              // Format percentage (column 8)
              else if (colNumber === 8) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '0.00%';
              }
              // Left-align text
              else {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              }
            }
          });
        }
      });

      // Generate buffer with ExcelJS
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
        { header: 'Ward Name', key: 'Ward Name', width: 30 },
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
          'Ward Name': row.ward_name,
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
   * Save Excel report to file
   */
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

