import axios from 'axios';

// Get API base URL from environment variable or use proxy path for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance with auth token
const getAuthHeaders = () => {
  // Try to get token from multiple sources
  let token = localStorage.getItem('authToken') || localStorage.getItem('token');

  // If not found, try Zustand persisted storage (PRIMARY SOURCE)
  if (!token) {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token;
      } catch (error) {
        console.error('Failed to parse auth-storage:', error);
      }
    }
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface ReportFilters {
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  date?: string;
  format?: 'excel' | 'pdf';
}

export interface ExpiryReportFilters {
  province_code?: string;
  municipality_code?: string;
  expiry_date_from?: string;
  expiry_date_to?: string;
}

/**
 * Reports API Service
 * Handles all report generation and download operations
 */
export const reportsApi = {
  /**
   * Generate and download Ward Audit Report (Audit.xlsx)
   * Contains 2 sheets: Provincial Summary and Municipality Detail
   */
  downloadWardAuditReport: async (filters: ReportFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);
      params.append('format', 'excel');

      const response = await axios.get(
        `${API_BASE_URL}/audit/ward-membership/export?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Ward_Audit_Report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Ward Audit Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Ward Audit Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Ward Audit Report');
    }
  },

  /**
   * Generate and download Daily Report (DAILY REPORT.xlsx)
   * Contains 4 sheets: Summary, New Members, Applications, Payments
   */
  downloadDailyReport: async (filters: ReportFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      params.append('format', 'excel');

      const response = await axios.get(
        `${API_BASE_URL}/reports/daily?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = filters.date || new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Daily_Report_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Daily Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Daily Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Daily Report');
    }
  },

  /**
   * Generate and download SRPA Delegates Report (ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES.xlsx)
   * Contains 10 sheets: 9 provinces + National Summary
   */
  downloadSRPADelegatesReport: async (filters: ReportFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);
      if (filters.ward_code) params.append('ward_code', filters.ward_code);
      params.append('format', 'excel');

      const response = await axios.get(
        `${API_BASE_URL}/reports/srpa-delegates?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'SRPA_Delegates_Report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'SRPA Delegates Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading SRPA Delegates Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download SRPA Delegates Report');
    }
  },

  /**
   * Generate and download Expired Members Report (expiry_date < CURRENT_DATE)
   */
  downloadExpiredMembersReport: async (filters: ExpiryReportFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);
      if (filters.expiry_date_from) params.append('expiry_date_from', filters.expiry_date_from);
      if (filters.expiry_date_to) params.append('expiry_date_to', filters.expiry_date_to);
      params.append('format', 'excel');

      const response = await axios.get(
        `${API_BASE_URL}/reports/expired-members?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      const dateStr = new Date().toISOString().split('T')[0];
      const rangeSuffix = (filters.expiry_date_from || filters.expiry_date_to)
        ? `-${filters.expiry_date_from || 'start'}-to-${filters.expiry_date_to || 'end'}`
        : `-${dateStr}`;
      const filename = `expired-members${rangeSuffix}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Expired Members Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Expired Members Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Expired Members Report');
    }
  },

  /**
   * Generate and download Expiring Members Report (expiry_date >= CURRENT_DATE)
   * Optional date range defines the look-ahead window.
   */
  downloadExpiringMembersReport: async (filters: ExpiryReportFilters & { format: 'csv' | 'excel' }) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);
      if (filters.expiry_date_from) params.append('expiry_date_from', filters.expiry_date_from);
      if (filters.expiry_date_to) params.append('expiry_date_to', filters.expiry_date_to);
      params.append('format', filters.format);

      const response = await axios.get(
        `${API_BASE_URL}/reports/expiring-members?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      const dateStr = new Date().toISOString().split('T')[0];
      const rangeSuffix = (filters.expiry_date_from || filters.expiry_date_to)
        ? `-${filters.expiry_date_from || dateStr}-to-${filters.expiry_date_to || 'open'}`
        : `-${dateStr}`;
      const ext = filters.format === 'csv' ? 'csv' : 'xlsx';
      const filename = `expiring-members${rangeSuffix}.${ext}`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Expiring Members Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Expiring Members Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Expiring Members Report');
    }
  },

  /**
   * Generate and download Not Registered Members Report
   * Contains members who are not registered to vote (voting_district_code = '99999999')
   */
  downloadNotRegisteredMembersReport: async (filters: ReportFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      params.append('format', 'excel');

      const response = await axios.get(
        `${API_BASE_URL}/reports/not-registered?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Not_Registered_Members_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Not Registered Members Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Not Registered Members Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Not Registered Members Report');
    }
  },

  /**
   * Generate and download Different Ward Members Report
   * Contains members registered to a different ward than their membership ward (voting_district_code = '22222222')
   */
  downloadDifferentWardMembersReport: async (filters: ReportFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      params.append('format', 'excel');

      const response = await axios.get(
        `${API_BASE_URL}/reports/different-ward?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Different_Ward_Members_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Different Ward Members Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Different Ward Members Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Different Ward Members Report');
    }
  },

  /**
   * Generate and download Duplicate Phone Numbers Report
   * Identifies members sharing the same cell phone number
   */
  downloadDuplicatePhoneReport: async (filters: ReportFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);

      const response = await axios.get(
        `${API_BASE_URL}/reports/duplicate-phones/export-excel?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Duplicate_Phone_Numbers_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Duplicate Phone Numbers Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Duplicate Phone Numbers Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Duplicate Phone Numbers Report');
    }
  },

  /**
   * Generate and download Deceased Member Purge Report (Excel — 3 sheets)
   * Sheet 1: Run Summary  |  Sheet 2: Province Breakdown  |  Sheet 3: Individual Records
   */
  downloadDeceasedPurgeReport: async (filters: {
    province_code?: string;
    run_id?: number;
  } = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.run_id)        params.append('run_id', String(filters.run_id));

      const response = await axios.get(
        `${API_BASE_URL}/reports/deceased-purge?${params.toString()}`,
        { responseType: 'blob', headers: getAuthHeaders() }
      );

      const dateStr = new Date().toISOString().split('T')[0];
      const suffix = filters.province_code
        ? `_${filters.province_code}`
        : filters.run_id ? `_Run${filters.run_id}` : '';
      const filename = `Deceased_Purge_Report${suffix}_${dateStr}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Deceased Purge Report downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading Deceased Purge Report:', error);
      throw new Error(error.response?.data?.message || 'Failed to download Deceased Purge Report');
    }
  },

  /**
   * Generate and download the LGE2026 Package (ZIP)
   * Contains the existing Attendance Register (Word) and a newly formatted
   * Membership Spreadsheet (Excel) with a Summary sheet and conditional
   * column reordering based on the number of Voting Districts per ward.
   */
  downloadLGE2026Package: async (filters: ReportFilters = {}) => {
    try {
      if (!filters.ward_code) {
        throw new Error('Ward Code is required for the LGE2026 Package');
      }

      const params = new URLSearchParams();
      params.append('ward_code', filters.ward_code);
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);

      const response = await axios.get(
        `${API_BASE_URL}/reports/lge2026-package?${params.toString()}`,
        {
          responseType: 'blob',
          headers: getAuthHeaders(),
        }
      );

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `LGE2026_Package_Ward_${filters.ward_code}_${dateStr}.zip`;

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'LGE2026 Package downloaded successfully' };
    } catch (error: any) {
      console.error('Error downloading LGE2026 Package:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to download LGE2026 Package');
    }
  },

  /**
   * Generate all three reports at once
   */
  generateAllReports: async (filters: ReportFilters = {}) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/reports/generate-all`,
        {
          date: filters.date,
          province_code: filters.province_code,
          municipality_code: filters.municipality_code,
        },
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        message: 'All reports generated successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error generating all reports:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate all reports');
    }
  },

  /**
   * Get list of available reports
   */
  getAvailableReports: () => {
    return [
      {
        id: 'ward-audit',
        name: 'Ward Audit Report',
        description: 'Provincial and municipality-level membership audit with detailed statistics',
        sheets: 2,
        format: 'Excel',
        icon: 'Assessment',
        category: 'Membership Reports',
      },
      {
        id: 'daily-report',
        name: 'Daily Membership Report',
        description: 'Daily summary of membership statistics, new members, applications, and payments',
        sheets: 4,
        format: 'Excel',
        icon: 'CalendarToday',
        category: 'Activity Reports',
      },
      {
        id: 'srpa-delegates',
        name: 'SRPA Delegates Report',
        description: 'Sub-Regional People\'s Assembly delegates organized by province with national summary',
        sheets: 10,
        format: 'Excel',
        icon: 'Groups',
        category: 'Leadership Reports',
      },
      {
        id: 'expired-members',
        name: 'Expired Members Report',
        description: 'List of members whose membership has expired',
        sheets: 1,
        format: 'Excel',
        icon: 'EventBusy',
        category: 'Membership Reports',
      },
      {
        id: 'not-registered',
        name: 'Not Registered Members Report',
        description: 'Members who are not registered to vote',
        sheets: 1,
        format: 'Excel',
        icon: 'HowToReg',
        category: 'Membership Reports',
      },
      {
        id: 'different-ward',
        name: 'Different Ward Members Report',
        description: 'Members registered to a different ward than their membership ward',
        sheets: 1,
        format: 'Excel',
        icon: 'CompareArrows',
        category: 'Membership Reports',
      },
      {
        id: 'expiring-members',
        name: 'Expiring Members Report',
        description: 'Members whose membership expires on or after 1st October 2026',
        sheets: 1,
        format: 'CSV/Excel',
        icon: 'Schedule',
        category: 'Membership Reports',
      },
      {
        id: 'duplicate-phones',
        name: 'Duplicate Phone Numbers Report',
        description: 'Identifies members sharing the same cell phone number',
        sheets: 2,
        format: 'Excel',
        icon: 'PhoneAndroid',
        category: 'Data Quality Reports',
      },
    ];
  },
};

export default reportsApi;

