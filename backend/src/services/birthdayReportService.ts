import { executeQuery } from '../config/database';
import * as ExcelJS from 'exceljs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

/**
 * Birthday Report Service
 *
 * Provides comprehensive birthday reports for the current month with:
 * - Member categorization by status and phone availability
 * - Municipality filtering
 * - Excel export with multiple sheets and charts
 */

export interface BirthdayReportMember {
  member_id: number;
  membership_number: string;
  full_name: string;
  firstname: string;
  surname: string;
  id_number: string;
  date_of_birth: string;
  birth_day: number;
  current_age: number;
  cell_number: string | null;
  has_valid_phone: boolean;
  membership_status: string;
  is_good_standing: boolean;
  expiry_date: string | null;
  province_name: string;
  municipality_name: string;
  ward_code: string;
}

export interface BirthdayReportSummary {
  total_members: number;
  good_standing_with_phone: number;
  good_standing_without_phone: number;
  expired_with_phone: number;
  expired_without_phone: number;
  current_month: string;
  current_year: number;
}

export interface BirthdayReportFilters {
  province_code?: string;
  municipality_code?: string;
  municipality_name?: string;
  page?: number;
  limit?: number;
  category?: 'good_standing_with_phone' | 'good_standing_without_phone' | 'expired_with_phone' | 'expired_without_phone';
}

export interface BirthdayReportResult {
  summary: BirthdayReportSummary;
  good_standing_with_phone: BirthdayReportMember[];
  good_standing_without_phone: BirthdayReportMember[];
  expired_with_phone: BirthdayReportMember[];
  expired_without_phone: BirthdayReportMember[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export class BirthdayReportService {

  /**
   * Helper to build geographic filter (province and municipality)
   */
  private static buildGeographicFilter(province_code?: string, municipality_code?: string, municipality_name?: string): { filter: string; params: any[]; nextParamIndex: number } {
    let filter = '';
    const params: any[] = [];
    let paramIndex = 1;

    // Province filter takes precedence if no municipality specified
    if (province_code) {
      filter += `AND m.province_code = $${paramIndex}`;
      params.push(province_code);
      paramIndex++;
    }

    // Municipality filter (can be combined with province)
    if (municipality_code) {
      filter += ` AND m.municipality_code = $${paramIndex}`;
      params.push(municipality_code);
      paramIndex++;
    } else if (municipality_name) {
      filter += ` AND LOWER(m.municipality_name) LIKE LOWER($${paramIndex})`;
      params.push(`%${municipality_name}%`);
      paramIndex++;
    }

    return { filter, params, nextParamIndex: paramIndex };
  }

  /**
   * Get summary counts only (fast query for initial load)
   */
  static async getMonthlyBirthdayReportSummary(filters: BirthdayReportFilters = {}): Promise<{ summary: BirthdayReportSummary }> {
    const { province_code, municipality_code, municipality_name } = filters;
    const { filter: geoFilter, params } = this.buildGeographicFilter(province_code, municipality_code, municipality_name);

    // Single query to get counts by category (much faster than fetching all records)
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE is_good_standing AND has_valid_phone) AS good_standing_with_phone,
        COUNT(*) FILTER (WHERE is_good_standing AND NOT has_valid_phone) AS good_standing_without_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND has_valid_phone) AS expired_with_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND NOT has_valid_phone) AS expired_without_phone,
        COUNT(*) AS total_members
      FROM (
        SELECT
          m.member_id,
          CASE
            WHEN m.cell_number IS NOT NULL
              AND m.cell_number != ''
              AND LENGTH(TRIM(m.cell_number)) >= 10
            THEN true
            ELSE false
          END AS has_valid_phone,
          CASE
            WHEN mst.is_active = true
              AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
            THEN true
            ELSE false
          END AS is_good_standing
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE
          EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND m.date_of_birth IS NOT NULL
          ${geoFilter}
      ) AS categorized
    `;

    const result = await executeQuery<any>(query, params);
    const row = result[0] || {};

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentDate = new Date();

    return {
      summary: {
        total_members: parseInt(row.total_members) || 0,
        good_standing_with_phone: parseInt(row.good_standing_with_phone) || 0,
        good_standing_without_phone: parseInt(row.good_standing_without_phone) || 0,
        expired_with_phone: parseInt(row.expired_with_phone) || 0,
        expired_without_phone: parseInt(row.expired_without_phone) || 0,
        current_month: monthNames[currentDate.getMonth()],
        current_year: currentDate.getFullYear()
      }
    };
  }

  /**
   * Get paginated members for a specific category
   */
  static async getCategoryMembers(filters: BirthdayReportFilters): Promise<{
    members: BirthdayReportMember[];
    pagination: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const { province_code, municipality_code, municipality_name, page = 1, limit = 50, category } = filters;

    if (!category) {
      throw new Error('Category is required for paginated query');
    }

    const { filter: geoFilter, params, nextParamIndex } = this.buildGeographicFilter(province_code, municipality_code, municipality_name);
    let paramIdx = nextParamIndex;

    // Build category-specific filter
    let categoryFilter = '';
    switch (category) {
      case 'good_standing_with_phone':
        categoryFilter = 'AND is_good_standing = true AND has_valid_phone = true';
        break;
      case 'good_standing_without_phone':
        categoryFilter = 'AND is_good_standing = true AND has_valid_phone = false';
        break;
      case 'expired_with_phone':
        categoryFilter = 'AND is_good_standing = false AND has_valid_phone = true';
        break;
      case 'expired_without_phone':
        categoryFilter = 'AND is_good_standing = false AND has_valid_phone = false';
        break;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT
          m.member_id,
          CASE
            WHEN m.cell_number IS NOT NULL
              AND m.cell_number != ''
              AND LENGTH(TRIM(m.cell_number)) >= 10
            THEN true
            ELSE false
          END AS has_valid_phone,
          CASE
            WHEN mst.is_active = true
              AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
            THEN true
            ELSE false
          END AS is_good_standing
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE
          EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND m.date_of_birth IS NOT NULL
          ${geoFilter}
      ) AS categorized
      WHERE 1=1 ${categoryFilter}
    `;

    const countResult = await executeQuery<any>(countQuery, params);
    const total = parseInt(countResult[0]?.total) || 0;

    // Data query with pagination
    const offset = (page - 1) * limit;
    const dataParams = [...params, limit, offset];

    const dataQuery = `
      SELECT
        member_id,
        membership_number,
        full_name,
        firstname,
        surname,
        id_number,
        date_of_birth,
        birth_day,
        current_age,
        cell_number,
        has_valid_phone,
        membership_status,
        is_good_standing,
        expiry_date,
        province_name,
        municipality_name,
        ward_code
      FROM (
        SELECT
          m.member_id,
          COALESCE(m.membership_number, 'MEM' || LPAD(m.member_id::TEXT, 6, '0')) AS membership_number,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
          m.firstname,
          COALESCE(m.surname, '') AS surname,
          m.id_number,
          m.date_of_birth,
          EXTRACT(DAY FROM m.date_of_birth)::INTEGER AS birth_day,
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER AS current_age,
          m.cell_number,
          CASE
            WHEN m.cell_number IS NOT NULL
              AND m.cell_number != ''
              AND LENGTH(TRIM(m.cell_number)) >= 10
            THEN true
            ELSE false
          END AS has_valid_phone,
          COALESCE(mst.status_name, 'Unknown') AS membership_status,
          CASE
            WHEN mst.is_active = true
              AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
            THEN true
            ELSE false
          END AS is_good_standing,
          m.expiry_date,
          COALESCE(m.province_name, '') AS province_name,
          COALESCE(m.municipality_name, '') AS municipality_name,
          COALESCE(m.ward_code, '') AS ward_code
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE
          EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND m.date_of_birth IS NOT NULL
          ${geoFilter}
      ) AS categorized
      WHERE 1=1 ${categoryFilter}
      ORDER BY birth_day, firstname, surname
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const members = await executeQuery<BirthdayReportMember>(dataQuery, dataParams);

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get comprehensive monthly birthday report (legacy - for Excel export)
   * WARNING: This fetches all records - use getMonthlyBirthdayReportSummary + getCategoryMembers for UI
   */
  static async getMonthlyBirthdayReport(filters: BirthdayReportFilters = {}): Promise<BirthdayReportResult> {
    const { province_code, municipality_code, municipality_name, page = 1, limit = 1000 } = filters;
    const { filter: geoFilter, params } = this.buildGeographicFilter(province_code, municipality_code, municipality_name);

    // Main query to get all birthday members for current month
    const query = `
      SELECT
        m.member_id,
        COALESCE(m.membership_number, 'MEM' || LPAD(m.member_id::TEXT, 6, '0')) AS membership_number,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
        m.firstname,
        COALESCE(m.surname, '') AS surname,
        m.id_number,
        m.date_of_birth,
        EXTRACT(DAY FROM m.date_of_birth)::INTEGER AS birth_day,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER AS current_age,
        m.cell_number,
        CASE
          WHEN m.cell_number IS NOT NULL
            AND m.cell_number != ''
            AND LENGTH(TRIM(m.cell_number)) >= 10
          THEN true
          ELSE false
        END AS has_valid_phone,
        COALESCE(mst.status_name, 'Unknown') AS membership_status,
        CASE
          WHEN mst.is_active = true
            AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
          THEN true
          ELSE false
        END AS is_good_standing,
        m.expiry_date,
        COALESCE(m.province_name, '') AS province_name,
        COALESCE(m.municipality_name, '') AS municipality_name,
        COALESCE(m.ward_code, '') AS ward_code
      FROM members_consolidated m
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE
        EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND m.date_of_birth IS NOT NULL
        ${geoFilter}
      ORDER BY EXTRACT(DAY FROM m.date_of_birth), m.firstname, m.surname
    `;

    const members = await executeQuery<BirthdayReportMember>(query, params);

    // Categorize members
    const goodStandingWithPhone = members.filter(m => m.is_good_standing && m.has_valid_phone);
    const goodStandingWithoutPhone = members.filter(m => m.is_good_standing && !m.has_valid_phone);
    const expiredWithPhone = members.filter(m => !m.is_good_standing && m.has_valid_phone);
    const expiredWithoutPhone = members.filter(m => !m.is_good_standing && !m.has_valid_phone);

    // Get current month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentDate = new Date();

    const summary: BirthdayReportSummary = {
      total_members: members.length,
      good_standing_with_phone: goodStandingWithPhone.length,
      good_standing_without_phone: goodStandingWithoutPhone.length,
      expired_with_phone: expiredWithPhone.length,
      expired_without_phone: expiredWithoutPhone.length,
      current_month: monthNames[currentDate.getMonth()],
      current_year: currentDate.getFullYear()
    };

    return {
      summary,
      good_standing_with_phone: goodStandingWithPhone,
      good_standing_without_phone: goodStandingWithoutPhone,
      expired_with_phone: expiredWithPhone,
      expired_without_phone: expiredWithoutPhone,
      pagination: {
        page,
        limit,
        total: members.length,
        total_pages: Math.ceil(members.length / limit)
      }
    };
  }

  /**
   * Generate chart images for the birthday report
   */
  private static async generateChartImages(summary: BirthdayReportSummary, regionName: string): Promise<{ barChart: Buffer; donutChart: Buffer }> {
    const chartWidth = 600;
    const chartHeight = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight, backgroundColour: 'white' });

    // Data for charts
    const labels = [
      'Good Standing\n(With Phone)',
      'Good Standing\n(No Phone)',
      'Expired\n(With Phone)',
      'Expired\n(No Phone)'
    ];
    const data = [
      summary.good_standing_with_phone,
      summary.good_standing_without_phone,
      summary.expired_with_phone,
      summary.expired_without_phone
    ];
    const colors = ['#28a745', '#6c757d', '#dc3545', '#ffc107'];

    // Bar Chart Configuration
    const barChartConfig: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Members',
          data,
          backgroundColor: colors,
          borderColor: colors.map(c => c),
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `Birthday Report for ${regionName} for ${summary.current_month} ${summary.current_year}`,
            font: { size: 16, weight: 'bold' }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Members' }
          }
        }
      }
    };

    // Donut Chart Configuration
    const donutChartConfig: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: [
          'Good Standing (With Phone)',
          'Good Standing (No Phone)',
          'Expired (With Phone)',
          'Expired (No Phone)'
        ],
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `Member Distribution for ${regionName}`,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'right'
          }
        }
      }
    };

    const barChart = await chartJSNodeCanvas.renderToBuffer(barChartConfig);
    const donutChart = await chartJSNodeCanvas.renderToBuffer(donutChartConfig);

    return { barChart, donutChart };
  }

  /**
   * Export birthday report to Excel with multiple sheets and charts
   */
  static async exportBirthdayReportToExcel(filters: BirthdayReportFilters = {}): Promise<Buffer> {
    const report = await this.getMonthlyBirthdayReport(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EFF Membership System';
    workbook.created = new Date();

    // Determine region name for titles (municipality takes precedence, then province, then default)
    let regionName = 'South Africa';
    if (filters.municipality_name) {
      regionName = filters.municipality_name;
    } else if (filters.province_code) {
      // Map province code to name
      const provinceNames: Record<string, string> = {
        'EC': 'Eastern Cape',
        'FS': 'Free State',
        'GP': 'Gauteng',
        'KZN': 'KwaZulu-Natal',
        'LP': 'Limpopo',
        'MP': 'Mpumalanga',
        'NC': 'Northern Cape',
        'NW': 'North West',
        'WC': 'Western Cape'
      };
      regionName = provinceNames[filters.province_code] || filters.province_code;
    }
    const reportTitle = `Birthday Report for ${regionName} for ${report.summary.current_month} ${report.summary.current_year}`;

    // ==========================================
    // SHEET 1: Summary (First)
    // ==========================================
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Category', key: 'category', width: 55 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const total = report.summary.total_members || 1; // Avoid division by zero
    const calcPercentage = (val: number) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '0%';

    summarySheet.addRow({ category: reportTitle, count: '', percentage: '' });
    summarySheet.addRow({ category: '', count: '', percentage: '' });
    summarySheet.addRow({ category: 'Good Standing with Phone (SMS Eligible)', count: report.summary.good_standing_with_phone, percentage: calcPercentage(report.summary.good_standing_with_phone) });
    summarySheet.addRow({ category: 'Good Standing without Phone', count: report.summary.good_standing_without_phone, percentage: calcPercentage(report.summary.good_standing_without_phone) });
    summarySheet.addRow({ category: 'Expired with Phone', count: report.summary.expired_with_phone, percentage: calcPercentage(report.summary.expired_with_phone) });
    summarySheet.addRow({ category: 'Expired without Phone', count: report.summary.expired_without_phone, percentage: calcPercentage(report.summary.expired_without_phone) });
    summarySheet.addRow({ category: '', count: '', percentage: '' });
    summarySheet.addRow({ category: 'TOTAL MEMBERS WITH BIRTHDAYS THIS MONTH', count: report.summary.total_members, percentage: '100%' });

    // Style summary - Title row with font size 20
    summarySheet.getRow(2).font = { bold: true, size: 20 };
    summarySheet.getRow(2).height = 30;
    summarySheet.getRow(9).font = { bold: true };
    summarySheet.getRow(9).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' }
    };

    // Color code the category rows
    summarySheet.getRow(4).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }; // Green - Good Standing with Phone
    summarySheet.getRow(5).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } }; // Gray - Good Standing no Phone
    summarySheet.getRow(6).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } }; // Red - Expired with Phone
    summarySheet.getRow(7).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }; // Yellow - Expired no Phone

    // Add borders to summary
    summarySheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // ==========================================
    // SHEET 2: Charts
    // ==========================================
    const chartsSheet = workbook.addWorksheet('Charts');

    // Generate chart images with region name
    const { barChart, donutChart } = await this.generateChartImages(report.summary, regionName);

    // Add title with font size 20
    chartsSheet.mergeCells('A1:L1');
    chartsSheet.getCell('A1').value = reportTitle;
    chartsSheet.getCell('A1').font = { bold: true, size: 20 };
    chartsSheet.getCell('A1').alignment = { horizontal: 'center' };
    chartsSheet.getRow(1).height = 35;

    // Add bar chart image using base64 encoding
    const barChartImageId = workbook.addImage({
      base64: barChart.toString('base64'),
      extension: 'png',
    });
    chartsSheet.addImage(barChartImageId, {
      tl: { col: 0.5, row: 2 },
      ext: { width: 550, height: 380 }
    });

    // Add donut chart image using base64 encoding
    const donutChartImageId = workbook.addImage({
      base64: donutChart.toString('base64'),
      extension: 'png',
    });
    chartsSheet.addImage(donutChartImageId, {
      tl: { col: 8, row: 2 },
      ext: { width: 550, height: 380 }
    });

    // Add chart labels
    chartsSheet.getCell('A24').value = 'Bar Chart: Category Comparison';
    chartsSheet.getCell('A24').font = { bold: true, size: 12 };
    chartsSheet.getCell('I24').value = 'Donut Chart: Member Distribution';
    chartsSheet.getCell('I24').font = { bold: true, size: 12 };

    // Set column widths for charts sheet
    for (let i = 1; i <= 16; i++) {
      chartsSheet.getColumn(i).width = 10;
    }

    // ==========================================
    // SHEETS 3-6: Data Sheets
    // ==========================================
    const columns = [
      { header: '#', key: 'row_num', width: 6 },
      { header: 'Member ID', key: 'membership_number', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 30 },
      { header: 'ID Number', key: 'id_number', width: 15 },
      { header: 'Date of Birth', key: 'date_of_birth', width: 15 },
      { header: 'Birthday', key: 'birth_day', width: 10 },
      { header: 'Age', key: 'current_age', width: 8 },
      { header: 'Cell Number', key: 'cell_number', width: 15 },
      { header: 'Status', key: 'membership_status', width: 15 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
      { header: 'Province', key: 'province_name', width: 20 },
      { header: 'Municipality', key: 'municipality_name', width: 25 },
      { header: 'Ward Code', key: 'ward_code', width: 12 }
    ];

    // Helper to add sheet with data
    const addSheet = (name: string, members: BirthdayReportMember[]) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = columns;

      // Get current day of month for comparison
      const currentDay = new Date().getDate();

      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add data rows with conditional formatting
      members.forEach((member, index) => {
        const row = sheet.addRow({
          row_num: index + 1,
          membership_number: member.membership_number,
          full_name: member.full_name,
          id_number: member.id_number,
          date_of_birth: member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString('en-ZA') : '',
          birth_day: member.birth_day,
          current_age: member.current_age,
          cell_number: member.cell_number || 'N/A',
          membership_status: member.membership_status,
          expiry_date: member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-ZA') : '',
          province_name: member.province_name,
          municipality_name: member.municipality_name,
          ward_code: member.ward_code
        });

        // Check if birthday has passed or is today
        const isPassed = member.birth_day < currentDay;
        const isToday = member.birth_day === currentDay;

        if (isToday) {
          // Highlight today's birthday with green background and bold text
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF90EE90' } // Light green
            };
            cell.font = { bold: true };
          });
          // Add birthday emoji to full name
          const fullNameCell = row.getCell(3);
          fullNameCell.value = `🎂 ${member.full_name} - TODAY!`;
        } else if (isPassed) {
          // Highlight passed birthdays with light red background and strikethrough
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFCCCB' } // Light red
            };
            cell.font = {
              strike: true,
              color: { argb: 'FF808080' } // Gray text
            };
          });
        }
      });

      // Add borders
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Add legend at the bottom
      const legendStartRow = members.length + 3;
      sheet.getCell(`A${legendStartRow}`).value = 'Legend:';
      sheet.getCell(`A${legendStartRow}`).font = { bold: true };

      sheet.getCell(`A${legendStartRow + 1}`).value = '🎂 Green Background';
      sheet.getCell(`A${legendStartRow + 1}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' }
      };
      sheet.getCell(`B${legendStartRow + 1}`).value = '= Birthday Today';

      sheet.getCell(`A${legendStartRow + 2}`).value = 'Red Background + Strikethrough';
      sheet.getCell(`A${legendStartRow + 2}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCCCB' }
      };
      sheet.getCell(`A${legendStartRow + 2}`).font = { strike: true, color: { argb: 'FF808080' } };
      sheet.getCell(`B${legendStartRow + 2}`).value = '= Birthday Passed';

      sheet.getCell(`A${legendStartRow + 3}`).value = 'No Highlight';
      sheet.getCell(`B${legendStartRow + 3}`).value = '= Upcoming Birthday';

      return sheet;
    };

    // Create sheets for each category (after Summary and Charts)
    addSheet('Good Standing - With Phone', report.good_standing_with_phone);
    addSheet('Good Standing - No Phone', report.good_standing_without_phone);
    addSheet('Expired - With Phone', report.expired_with_phone);
    addSheet('Expired - No Phone', report.expired_without_phone);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export default BirthdayReportService;
