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
    ];
  },
};

export default reportsApi;

