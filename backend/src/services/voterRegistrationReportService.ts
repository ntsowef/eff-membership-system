import { executeQuery } from '../config/database';
import * as ExcelJS from 'exceljs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

/**
 * Voter Registration Report Service
 *
 * Provides comprehensive voter registration status reports with:
 * - Member categorization by good standing/expired and phone availability
 * - Voter registration status filtering (Registered/Not Registered/All)
 * - Province and municipality geographic filtering
 * - Excel/PDF export with charts
 */

export interface VoterRegistrationReportMember {
  member_id: number;
  membership_number: string;
  full_name: string;
  firstname: string;
  surname: string;
  id_number: string;
  cell_number: string | null;
  has_valid_phone: boolean;
  membership_status: string;
  is_good_standing: boolean;
  expiry_date: string | null;
  voting_district_code: string | null;
  is_registered_voter: boolean;
  province_code: string;
  province_name: string;
  municipality_code: string;
  municipality_name: string;
  ward_code: string;
}

export interface VoterRegistrationReportSummary {
  total_members: number;
  good_standing_with_phone: number;
  good_standing_without_phone: number;
  expired_with_phone: number;
  expired_without_phone: number;
  registered_voters: number;
  not_registered_voters: number;
  // New fields for not registered breakdown by phone availability
  not_registered_with_phone: number;
  not_registered_without_phone: number;
  // Also add registered breakdown for completeness
  registered_with_phone: number;
  registered_without_phone: number;
  region_name: string;
  region_type: 'country' | 'province' | 'municipality';
  generated_date: string;
}

export interface VoterRegistrationReportFilters {
  province_code?: string;
  province_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  voter_status?: 'registered' | 'not_registered' | 'all';
  page?: number;
  limit?: number;
  category?: 'good_standing_with_phone' | 'good_standing_without_phone' | 'expired_with_phone' | 'expired_without_phone';
}

// Province/municipality data for grouping when no filter applied
export interface RegionSummary {
  code: string;
  name: string;
  good_standing_with_phone: number;
  good_standing_without_phone: number;
  expired_with_phone: number;
  expired_without_phone: number;
  total: number;
  // Not registered breakdown by phone availability
  not_registered_with_phone: number;
  not_registered_without_phone: number;
  not_registered_total: number;
}

export class VoterRegistrationReportService {

  /**
   * Build voter registration filter for SQL queries
   * Uses same logic as dashboard: voter_registration_id first, then is_registered_voter field
   * voter_registration_id: 1=Registered, 2=Not Registered, 3=Unknown, 4=Verification Failed
   */
  private static buildVoterStatusFilter(voter_status?: string): string {
    if (voter_status === 'registered') {
      // Match dashboard logic: voter_registration_id = 1 OR (NULL and is_registered_voter = true)
      return `AND (m.voter_registration_id = 1
              OR (m.voter_registration_id IS NULL AND m.is_registered_voter = true AND m.voting_district_code != '222222222'))`;
    } else if (voter_status === 'not_registered') {
      // Match dashboard logic: voter_registration_id = 2 OR (NULL and is_registered_voter = false)
      return `AND (m.voter_registration_id = 2
              OR (m.voter_registration_id IS NULL AND m.is_registered_voter = false))`;
    }
    return ''; // 'all' - no filter
  }

  /**
   * Build geographic filter for SQL queries
   */
  private static buildGeographicFilter(
    province_code?: string,
    municipality_code?: string,
    startParamIndex: number = 1
  ): { filter: string; params: any[]; nextParamIndex: number } {
    let filter = '';
    const params: any[] = [];
    let paramIndex = startParamIndex;

    if (municipality_code) {
      filter = `AND m.municipality_code = $${paramIndex}`;
      params.push(municipality_code);
      paramIndex++;
    } else if (province_code) {
      filter = `AND m.province_code = $${paramIndex}`;
      params.push(province_code);
      paramIndex++;
    }

    return { filter, params, nextParamIndex: paramIndex };
  }

  /**
   * Get summary counts only (fast query for initial load)
   */
  static async getSummary(filters: VoterRegistrationReportFilters = {}): Promise<{
    summary: VoterRegistrationReportSummary;
    regions?: RegionSummary[];
  }> {
    const { province_code, municipality_code, voter_status = 'all' } = filters;
    const voterFilter = this.buildVoterStatusFilter(voter_status);
    const { filter: geoFilter, params } = this.buildGeographicFilter(province_code, municipality_code);

    // Determine region info
    let regionName = 'South Africa';
    let regionType: 'country' | 'province' | 'municipality' = 'country';

    if (municipality_code) {
      // Fetch municipality name
      const munQuery = `SELECT municipality_name FROM municipalities WHERE municipality_code = $1`;
      const munResult = await executeQuery<any>(munQuery, [municipality_code]);
      regionName = munResult[0]?.municipality_name || municipality_code;
      regionType = 'municipality';
    } else if (province_code) {
      // Fetch province name
      const provQuery = `SELECT province_name FROM provinces WHERE province_code = $1`;
      const provResult = await executeQuery<any>(provQuery, [province_code]);
      regionName = provResult[0]?.province_name || province_code;
      regionType = 'province';
    }

    // Main summary query
    // voter_registration_id: 1=Registered, 2=Not Registered, 3=Unknown, 4=Verification Failed
    // Use same logic as dashboard: check voter_registration_id first, then fall back to is_registered_voter field
    const summaryQuery = `
      SELECT
        COUNT(*) FILTER (WHERE is_good_standing AND has_valid_phone) AS good_standing_with_phone,
        COUNT(*) FILTER (WHERE is_good_standing AND NOT has_valid_phone) AS good_standing_without_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND has_valid_phone) AS expired_with_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND NOT has_valid_phone) AS expired_without_phone,
        COUNT(*) FILTER (WHERE is_registered_voter) AS registered_voters,
        COUNT(*) FILTER (WHERE NOT is_registered_voter) AS not_registered_voters,
        COUNT(*) FILTER (WHERE NOT is_registered_voter AND has_valid_phone) AS not_registered_with_phone,
        COUNT(*) FILTER (WHERE NOT is_registered_voter AND NOT has_valid_phone) AS not_registered_without_phone,
        COUNT(*) FILTER (WHERE is_registered_voter AND has_valid_phone) AS registered_with_phone,
        COUNT(*) FILTER (WHERE is_registered_voter AND NOT has_valid_phone) AS registered_without_phone,
        COUNT(*) AS total_members
      FROM (
        SELECT
          m.member_id,
          CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' AND LENGTH(TRIM(m.cell_number)) >= 10 THEN true ELSE false END AS has_valid_phone,
          CASE WHEN mst.is_active = true AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days') THEN true ELSE false END AS is_good_standing,
          CASE
            WHEN m.voter_registration_id = 1 THEN true
            WHEN m.voter_registration_id = 2 THEN false
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = true AND m.voting_district_code != '222222222' THEN true
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = false THEN false
            ELSE false
          END AS is_registered_voter
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE 1=1 ${geoFilter} ${voterFilter}
      ) AS categorized
    `;

    const result = await executeQuery<any>(summaryQuery, params);
    const row = result[0] || {};

    const summary: VoterRegistrationReportSummary = {
      total_members: parseInt(row.total_members) || 0,
      good_standing_with_phone: parseInt(row.good_standing_with_phone) || 0,
      good_standing_without_phone: parseInt(row.good_standing_without_phone) || 0,
      expired_with_phone: parseInt(row.expired_with_phone) || 0,
      expired_without_phone: parseInt(row.expired_without_phone) || 0,
      registered_voters: parseInt(row.registered_voters) || 0,
      not_registered_voters: parseInt(row.not_registered_voters) || 0,
      not_registered_with_phone: parseInt(row.not_registered_with_phone) || 0,
      not_registered_without_phone: parseInt(row.not_registered_without_phone) || 0,
      registered_with_phone: parseInt(row.registered_with_phone) || 0,
      registered_without_phone: parseInt(row.registered_without_phone) || 0,
      region_name: regionName,
      region_type: regionType,
      generated_date: new Date().toISOString().split('T')[0]
    };

    // If no province filter and no municipality filter, get province breakdown
    let regions: RegionSummary[] | undefined;
    if (!province_code && !municipality_code) {
      regions = await this.getProvinceSummaries(voter_status);
    } else if (province_code && !municipality_code) {
      // If province selected but no municipality, get municipality breakdown
      regions = await this.getMunicipalitySummaries(province_code, voter_status);
    }

    return { summary, regions };
  }

  /**
   * Get province-level summaries for whole country view
   */
  private static async getProvinceSummaries(voter_status?: string): Promise<RegionSummary[]> {
    const voterFilter = this.buildVoterStatusFilter(voter_status);

    const query = `
      SELECT
        categorized.province_code AS code,
        COALESCE(p.province_name, categorized.province_code) AS name,
        COUNT(*) FILTER (WHERE is_good_standing AND has_valid_phone) AS good_standing_with_phone,
        COUNT(*) FILTER (WHERE is_good_standing AND NOT has_valid_phone) AS good_standing_without_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND has_valid_phone) AS expired_with_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND NOT has_valid_phone) AS expired_without_phone,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE NOT is_registered_voter AND has_valid_phone) AS not_registered_with_phone,
        COUNT(*) FILTER (WHERE NOT is_registered_voter AND NOT has_valid_phone) AS not_registered_without_phone,
        COUNT(*) FILTER (WHERE NOT is_registered_voter) AS not_registered_total
      FROM (
        SELECT
          m.member_id,
          m.province_code,
          CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' AND LENGTH(TRIM(m.cell_number)) >= 10 THEN true ELSE false END AS has_valid_phone,
          CASE WHEN mst.is_active = true AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days') THEN true ELSE false END AS is_good_standing,
          CASE
            WHEN m.voter_registration_id = 1 THEN true
            WHEN m.voter_registration_id = 2 THEN false
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = true AND m.voting_district_code != '222222222' THEN true
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = false THEN false
            ELSE false
          END AS is_registered_voter
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE m.province_code IS NOT NULL ${voterFilter}
      ) AS categorized
      LEFT JOIN provinces p ON categorized.province_code = p.province_code
      GROUP BY categorized.province_code, p.province_name
      ORDER BY p.province_name
    `;

    return await executeQuery<RegionSummary>(query, []);
  }

  /**
   * Get municipality-level summaries for province view
   */
  private static async getMunicipalitySummaries(province_code: string, voter_status?: string): Promise<RegionSummary[]> {
    const voterFilter = this.buildVoterStatusFilter(voter_status);

    const query = `
      SELECT
        categorized.municipality_code AS code,
        COALESCE(mun.municipality_name, categorized.municipality_code) AS name,
        COUNT(*) FILTER (WHERE is_good_standing AND has_valid_phone) AS good_standing_with_phone,
        COUNT(*) FILTER (WHERE is_good_standing AND NOT has_valid_phone) AS good_standing_without_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND has_valid_phone) AS expired_with_phone,
        COUNT(*) FILTER (WHERE NOT is_good_standing AND NOT has_valid_phone) AS expired_without_phone,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE NOT is_registered_voter AND has_valid_phone) AS not_registered_with_phone,
        COUNT(*) FILTER (WHERE NOT is_registered_voter AND NOT has_valid_phone) AS not_registered_without_phone,
        COUNT(*) FILTER (WHERE NOT is_registered_voter) AS not_registered_total
      FROM (
        SELECT
          m.member_id,
          m.municipality_code,
          CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' AND LENGTH(TRIM(m.cell_number)) >= 10 THEN true ELSE false END AS has_valid_phone,
          CASE WHEN mst.is_active = true AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days') THEN true ELSE false END AS is_good_standing,
          CASE
            WHEN m.voter_registration_id = 1 THEN true
            WHEN m.voter_registration_id = 2 THEN false
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = true AND m.voting_district_code != '222222222' THEN true
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = false THEN false
            ELSE false
          END AS is_registered_voter
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE m.province_code = $1 AND m.municipality_code IS NOT NULL ${voterFilter}
      ) AS categorized
      LEFT JOIN municipalities mun ON categorized.municipality_code = mun.municipality_code
      GROUP BY categorized.municipality_code, mun.municipality_name
      ORDER BY mun.municipality_name
    `;

    return await executeQuery<RegionSummary>(query, [province_code]);
  }

  /**
   * Get paginated members for a specific category
   */
  static async getCategoryMembers(filters: VoterRegistrationReportFilters): Promise<{
    members: VoterRegistrationReportMember[];
    pagination: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const { province_code, municipality_code, voter_status = 'all', page = 1, limit = 50, category } = filters;

    if (!category) {
      throw new Error('Category is required for paginated query');
    }

    const voterFilter = this.buildVoterStatusFilter(voter_status);
    const { filter: geoFilter, params, nextParamIndex } = this.buildGeographicFilter(province_code, municipality_code);
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
          CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' AND LENGTH(TRIM(m.cell_number)) >= 10 THEN true ELSE false END AS has_valid_phone,
          CASE WHEN mst.is_active = true AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days') THEN true ELSE false END AS is_good_standing
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE 1=1 ${geoFilter} ${voterFilter}
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
        member_id, membership_number, full_name, firstname, surname, id_number,
        cell_number, has_valid_phone, membership_status, is_good_standing, expiry_date,
        voting_district_code, is_registered_voter, province_code, province_name,
        municipality_code, municipality_name, ward_code
      FROM (
        SELECT
          m.member_id,
          COALESCE(m.membership_number, 'MEM' || LPAD(m.member_id::TEXT, 6, '0')) AS membership_number,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
          m.firstname,
          COALESCE(m.surname, '') AS surname,
          m.id_number,
          m.cell_number,
          CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' AND LENGTH(TRIM(m.cell_number)) >= 10 THEN true ELSE false END AS has_valid_phone,
          COALESCE(mst.status_name, 'Unknown') AS membership_status,
          CASE WHEN mst.is_active = true AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days') THEN true ELSE false END AS is_good_standing,
          m.expiry_date,
          m.voting_district_code,
          CASE
            WHEN m.voter_registration_id = 1 THEN true
            WHEN m.voter_registration_id = 2 THEN false
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = true AND m.voting_district_code != '222222222' THEN true
            WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = false THEN false
            ELSE false
          END AS is_registered_voter,
          COALESCE(m.province_code, '') AS province_code,
          COALESCE(m.province_name, '') AS province_name,
          COALESCE(m.municipality_code, '') AS municipality_code,
          COALESCE(m.municipality_name, '') AS municipality_name,
          COALESCE(m.ward_code, '') AS ward_code
        FROM members_consolidated m
        LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
        WHERE 1=1 ${geoFilter} ${voterFilter}
      ) AS categorized
      WHERE 1=1 ${categoryFilter}
      ORDER BY province_name, municipality_name, full_name
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const members = await executeQuery<VoterRegistrationReportMember>(dataQuery, dataParams);

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
   * Generate chart images for the report
   */
  private static async generateChartImages(
    summary: VoterRegistrationReportSummary
  ): Promise<{ barChart: Buffer; donutChart: Buffer }> {
    const chartWidth = 600;
    const chartHeight = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight, backgroundColour: 'white' });

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

    // Bar Chart
    const barChartConfig: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Members',
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `Voter Registration Report for ${summary.region_name}`,
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

    // Donut Chart
    const donutChartConfig: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Good Standing (With Phone)', 'Good Standing (No Phone)', 'Expired (With Phone)', 'Expired (No Phone)'],
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
            text: `Member Distribution for ${summary.region_name}`,
            font: { size: 16, weight: 'bold' }
          },
          legend: { display: true, position: 'right' }
        }
      }
    };

    const barChart = await chartJSNodeCanvas.renderToBuffer(barChartConfig);
    const donutChart = await chartJSNodeCanvas.renderToBuffer(donutChartConfig);

    return { barChart, donutChart };
  }

  /**
   * Get all members for Excel export (no pagination limit)
   */
  private static async getAllMembersForExport(filters: VoterRegistrationReportFilters): Promise<{
    good_standing_with_phone: VoterRegistrationReportMember[];
    good_standing_without_phone: VoterRegistrationReportMember[];
    expired_with_phone: VoterRegistrationReportMember[];
    expired_without_phone: VoterRegistrationReportMember[];
  }> {
    const { province_code, municipality_code, voter_status = 'all' } = filters;
    const voterFilter = this.buildVoterStatusFilter(voter_status);
    const { filter: geoFilter, params } = this.buildGeographicFilter(province_code, municipality_code);

    const query = `
      SELECT
        m.member_id,
        COALESCE(m.membership_number, 'MEM' || LPAD(m.member_id::TEXT, 6, '0')) AS membership_number,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
        m.firstname, COALESCE(m.surname, '') AS surname, m.id_number, m.cell_number,
        CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' AND LENGTH(TRIM(m.cell_number)) >= 10 THEN true ELSE false END AS has_valid_phone,
        COALESCE(mst.status_name, 'Unknown') AS membership_status,
        CASE WHEN mst.is_active = true AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days') THEN true ELSE false END AS is_good_standing,
        m.expiry_date, m.voting_district_code,
        CASE
          WHEN m.voter_registration_id = 1 THEN true
          WHEN m.voter_registration_id = 2 THEN false
          WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = true AND m.voting_district_code != '222222222' THEN true
          WHEN m.voter_registration_id IS NULL AND m.is_registered_voter = false THEN false
          ELSE false
        END AS is_registered_voter,
        COALESCE(m.province_code, '') AS province_code, COALESCE(m.province_name, '') AS province_name,
        COALESCE(m.municipality_code, '') AS municipality_code, COALESCE(m.municipality_name, '') AS municipality_name,
        COALESCE(m.ward_code, '') AS ward_code
      FROM members_consolidated m
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE 1=1 ${geoFilter} ${voterFilter}
      ORDER BY m.province_name, m.municipality_name, m.firstname, m.surname
    `;

    const members = await executeQuery<VoterRegistrationReportMember>(query, params);

    return {
      good_standing_with_phone: members.filter(m => m.is_good_standing && m.has_valid_phone),
      good_standing_without_phone: members.filter(m => m.is_good_standing && !m.has_valid_phone),
      expired_with_phone: members.filter(m => !m.is_good_standing && m.has_valid_phone),
      expired_without_phone: members.filter(m => !m.is_good_standing && !m.has_valid_phone)
    };
  }

  /**
   * Export voter registration report to Excel
   */
  static async exportToExcel(filters: VoterRegistrationReportFilters = {}): Promise<Buffer> {
    const { summary, regions } = await this.getSummary(filters);
    const categorizedMembers = await this.getAllMembersForExport(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EFF Membership System';
    workbook.created = new Date();

    const reportTitle = `Voter Registration Report for ${summary.region_name}`;

    // ===== SHEET 1: Summary =====
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Category', key: 'category', width: 55 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];

    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    const total = summary.total_members || 1;
    const calcPct = (val: number) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '0%';

    summarySheet.addRow({ category: reportTitle, count: '', percentage: '' });
    summarySheet.addRow({ category: `Generated: ${summary.generated_date}`, count: '', percentage: '' });
    summarySheet.addRow({ category: '', count: '', percentage: '' });
    summarySheet.addRow({ category: 'Good Standing with Phone (SMS Eligible)', count: summary.good_standing_with_phone, percentage: calcPct(summary.good_standing_with_phone) });
    summarySheet.addRow({ category: 'Good Standing without Phone', count: summary.good_standing_without_phone, percentage: calcPct(summary.good_standing_without_phone) });
    summarySheet.addRow({ category: 'Expired with Phone', count: summary.expired_with_phone, percentage: calcPct(summary.expired_with_phone) });
    summarySheet.addRow({ category: 'Expired without Phone', count: summary.expired_without_phone, percentage: calcPct(summary.expired_without_phone) });
    summarySheet.addRow({ category: '', count: '', percentage: '' });
    summarySheet.addRow({ category: 'TOTAL MEMBERS', count: summary.total_members, percentage: '100%' });
    summarySheet.addRow({ category: '', count: '', percentage: '' });
    summarySheet.addRow({ category: 'Voter Registration Stats:', count: '', percentage: '' });
    summarySheet.addRow({ category: 'Registered to Vote', count: summary.registered_voters, percentage: calcPct(summary.registered_voters) });
    summarySheet.addRow({ category: 'Not Registered to Vote', count: summary.not_registered_voters, percentage: calcPct(summary.not_registered_voters) });

    // Style title rows
    summarySheet.getRow(2).font = { bold: true, size: 20 };
    summarySheet.getRow(2).height = 30;
    summarySheet.getRow(10).font = { bold: true };
    summarySheet.getRow(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

    // Color code category rows
    summarySheet.getRow(5).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    summarySheet.getRow(6).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } };
    summarySheet.getRow(7).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
    summarySheet.getRow(8).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

    // Add borders
    summarySheet.eachRow(row => {
      row.eachCell(cell => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // ===== SHEET 2: Charts =====
    const chartsSheet = workbook.addWorksheet('Charts');
    const { barChart, donutChart } = await this.generateChartImages(summary);

    chartsSheet.mergeCells('A1:L1');
    chartsSheet.getCell('A1').value = reportTitle;
    chartsSheet.getCell('A1').font = { bold: true, size: 20 };
    chartsSheet.getCell('A1').alignment = { horizontal: 'center' };
    chartsSheet.getRow(1).height = 35;

    const barChartImageId = workbook.addImage({ base64: barChart.toString('base64'), extension: 'png' });
    chartsSheet.addImage(barChartImageId, { tl: { col: 0.5, row: 2 }, ext: { width: 550, height: 380 } });

    const donutChartImageId = workbook.addImage({ base64: donutChart.toString('base64'), extension: 'png' });
    chartsSheet.addImage(donutChartImageId, { tl: { col: 8, row: 2 }, ext: { width: 550, height: 380 } });

    chartsSheet.getCell('A24').value = 'Bar Chart: Category Comparison';
    chartsSheet.getCell('A24').font = { bold: true, size: 12 };
    chartsSheet.getCell('I24').value = 'Donut Chart: Member Distribution';
    chartsSheet.getCell('I24').font = { bold: true, size: 12 };

    for (let i = 1; i <= 16; i++) { chartsSheet.getColumn(i).width = 10; }

    // ===== SHEET 3: Regional Breakdown (if applicable) =====
    if (regions && regions.length > 0) {
      const regionSheet = workbook.addWorksheet(summary.region_type === 'country' ? 'Province Breakdown' : 'Municipality Breakdown');
      regionSheet.columns = [
        { header: '#', key: 'row_num', width: 6 },
        { header: summary.region_type === 'country' ? 'Province' : 'Municipality', key: 'name', width: 35 },
        { header: 'Good Standing + Phone', key: 'good_standing_with_phone', width: 22 },
        { header: 'Good Standing - No Phone', key: 'good_standing_without_phone', width: 22 },
        { header: 'Expired + Phone', key: 'expired_with_phone', width: 18 },
        { header: 'Expired - No Phone', key: 'expired_without_phone', width: 18 },
        { header: 'Total', key: 'total', width: 12 }
      ];

      regionSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      regionSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      regions.forEach((region, index) => {
        regionSheet.addRow({
          row_num: index + 1,
          name: region.name,
          good_standing_with_phone: region.good_standing_with_phone,
          good_standing_without_phone: region.good_standing_without_phone,
          expired_with_phone: region.expired_with_phone,
          expired_without_phone: region.expired_without_phone,
          total: region.total
        });
      });

      regionSheet.eachRow(row => {
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      });
    }

    // ===== DATA SHEETS =====
    const columns = [
      { header: '#', key: 'row_num', width: 6 },
      { header: 'Member ID', key: 'membership_number', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 30 },
      { header: 'ID Number', key: 'id_number', width: 15 },
      { header: 'Cell Number', key: 'cell_number', width: 15 },
      { header: 'Status', key: 'membership_status', width: 15 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
      { header: 'Voter Registered', key: 'voter_status', width: 15 },
      { header: 'Province', key: 'province_name', width: 20 },
      { header: 'Municipality', key: 'municipality_name', width: 25 },
      { header: 'Ward Code', key: 'ward_code', width: 12 }
    ];

    const addDataSheet = (name: string, members: VoterRegistrationReportMember[]) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = columns;
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      members.forEach((member, index) => {
        sheet.addRow({
          row_num: index + 1,
          membership_number: member.membership_number,
          full_name: member.full_name,
          id_number: member.id_number,
          cell_number: member.cell_number || 'N/A',
          membership_status: member.membership_status,
          expiry_date: member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-ZA') : '',
          voter_status: member.is_registered_voter ? 'Yes' : 'No',
          province_name: member.province_name,
          municipality_name: member.municipality_name,
          ward_code: member.ward_code
        });
      });

      sheet.eachRow(row => {
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      });
    };

    addDataSheet('Good Standing - With Phone', categorizedMembers.good_standing_with_phone);
    addDataSheet('Good Standing - No Phone', categorizedMembers.good_standing_without_phone);
    addDataSheet('Expired - With Phone', categorizedMembers.expired_with_phone);
    addDataSheet('Expired - No Phone', categorizedMembers.expired_without_phone);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export default VoterRegistrationReportService;

