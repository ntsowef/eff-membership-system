// Ward Membership Audit API Service
// Created: 2025-09-07
// Purpose: API service layer for comprehensive ward membership audit system

import { api } from '../lib/api';
import type {
  WardAuditOverviewResponse,
  WardAuditDataResponse,
  MunicipalityPerformanceResponse,
  WardTrendsResponse,
  WardAuditFilters,
  MunicipalityPerformanceFilters,
  WardTrendsFilters,
  WardDetailsResponse,
  MunicipalityDetailsResponse
} from '../types/wardMembershipAudit';

// =====================================================
// Ward Membership Audit API Service
// =====================================================

export const wardMembershipAuditApi = {
  /**
   * Get comprehensive audit overview with summary statistics
   */
  getAuditOverview: async (): Promise<WardAuditOverviewResponse['data']> => {
    const response = await api.get<WardAuditOverviewResponse>('/audit/ward-membership/overview');
    return response.data.data;
  },

  /**
   * Get paginated ward audit data with filtering and sorting
   */
  getWardAuditData: async (filters: WardAuditFilters = {}): Promise<WardAuditDataResponse['data']> => {
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    // Add filter parameters
    if (filters.standing && filters.standing !== 'all') {
      params.append('standing', filters.standing);
    }
    if (filters.municipality_code && filters.municipality_code !== 'all') {
      params.append('municipality_code', filters.municipality_code);
    }
    if (filters.province_code && filters.province_code !== 'all') {
      params.append('province_code', filters.province_code);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    // Add sorting parameters
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/audit/ward-membership/wards?${queryString}`
      : `/audit/ward-membership/wards`;

    const response = await api.get<WardAuditDataResponse>(endpoint);
    return response.data.data;
  },

  /**
   * Get municipality performance data with ward compliance percentages
   */
  getMunicipalityPerformanceData: async (filters: MunicipalityPerformanceFilters = {}): Promise<MunicipalityPerformanceResponse['data']> => {
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    // Add filter parameters
    if (filters.performance && filters.performance !== 'all') {
      params.append('performance', filters.performance);
    }
    if (filters.province_code && filters.province_code !== 'all') {
      params.append('province_code', filters.province_code);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    // Add sorting parameters
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/audit/ward-membership/municipalities?${queryString}`
      : `/audit/ward-membership/municipalities`;

    const response = await api.get<MunicipalityPerformanceResponse>(endpoint);
    return response.data.data;
  },

  /**
   * Get historical membership trends for wards and municipalities
   */
  getWardTrends: async (filters: WardTrendsFilters = {}): Promise<WardTrendsResponse['data']> => {
    const params = new URLSearchParams();
    
    // Add filter parameters
    if (filters.ward_code) {
      params.append('ward_code', filters.ward_code);
    }
    if (filters.municipality_code) {
      params.append('municipality_code', filters.municipality_code);
    }
    if (filters.months) {
      params.append('months', filters.months.toString());
    }
    if (filters.trend_type) {
      params.append('trend_type', filters.trend_type);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/audit/ward-membership/trends?${queryString}`
      : `/audit/ward-membership/trends`;

    const response = await api.get<WardTrendsResponse>(endpoint);
    return response.data.data;
  },

  /**
   * Export ward audit data to PDF
   */
  exportWardAuditPDF: async (filters: WardAuditFilters = {}): Promise<Blob> => {
    const params = new URLSearchParams();
    
    // Add filter parameters for export
    if (filters.standing && filters.standing !== 'all') {
      params.append('standing', filters.standing);
    }
    if (filters.municipality_code && filters.municipality_code !== 'all') {
      params.append('municipality_code', filters.municipality_code);
    }
    if (filters.province_code && filters.province_code !== 'all') {
      params.append('province_code', filters.province_code);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    params.append('format', 'pdf');

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/audit/ward-membership/export?${queryString}`
      : `/audit/ward-membership/export?format=pdf`;

    const response = await api.get(endpoint, {
      responseType: 'blob'
    });

    return response.data;
  },

  /**
   * Export municipality performance data to Excel
   */
  exportMunicipalityPerformanceExcel: async (filters: MunicipalityPerformanceFilters = {}): Promise<Blob> => {
    const params = new URLSearchParams();
    
    // Add filter parameters for export
    if (filters.performance && filters.performance !== 'all') {
      params.append('performance', filters.performance);
    }
    if (filters.province_code && filters.province_code !== 'all') {
      params.append('province_code', filters.province_code);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    params.append('format', 'excel');
    params.append('type', 'municipality');

    const queryString = params.toString();
    const endpoint = `/audit/ward-membership/export?${queryString}`;

    const response = await api.get(endpoint, {
      responseType: 'blob'
    });

    return response.data;
  },

  /**
   * Get ward recommendations for improvement
   */
  getWardRecommendations: async (ward_code: string): Promise<{
    ward_code: string;
    ward_name: string;
    current_standing: string;
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      action: string;
      description: string;
      expected_impact: string;
    }>;
  }> => {
    const response = await api.get(`/audit/ward-membership/recommendations/${ward_code}`);
    return response.data.data;
  },

  /**
   * Get municipality action plan for underperforming municipalities
   */
  getMunicipalityActionPlan: async (municipality_code: string): Promise<{
    municipality_code: string;
    municipality_name: string;
    current_performance: string;
    action_plan: Array<{
      phase: number;
      timeline: string;
      actions: string[];
      target_outcome: string;
      success_metrics: string[];
    }>;
  }> => {
    const response = await api.get(`/audit/ward-membership/action-plan/${municipality_code}`);
    return response.data.data;
  },

  /**
   * Refresh audit data (trigger background data update)
   */
  refreshAuditData: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/audit/ward-membership/refresh');
    return response.data;
  },

  /**
   * Get detailed ward information including trends and comparisons
   */
  getWardDetails: async (wardCode: string): Promise<WardDetailsResponse['data']> => {
    const response = await api.get<WardDetailsResponse>(`/audit/ward-membership/ward/${wardCode}/details`);
    return response.data.data;
  },

  /**
   * Get detailed municipality information including ward breakdown
   */
  getMunicipalityDetails: async (municipalityCode: string): Promise<MunicipalityDetailsResponse['data']> => {
    const response = await api.get<MunicipalityDetailsResponse>(`/audit/ward-membership/municipality/${municipalityCode}/details`);
    return response.data.data;
  },

  /**
   * Export ward-specific detailed report
   */
  exportWardDetailReport: async (wardCode: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> => {
    const response = await api.get(`/audit/ward-membership/ward/${wardCode}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Export municipality-specific detailed report
   */
  exportMunicipalityDetailReport: async (municipalityCode: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> => {
    const response = await api.get(`/audit/ward-membership/municipality/${municipalityCode}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Download blob as file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Generate filename for export
 */
export const generateExportFilename = (type: 'ward-audit' | 'municipality-performance', format: 'pdf' | 'excel'): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  return `${type}-report-${timestamp}.${extension}`;
};

/**
 * Format compliance percentage for display
 */
export const formatCompliancePercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};

/**
 * Get standing color based on ward standing
 */
export const getStandingColor = (standing: string): 'success' | 'warning' | 'error' => {
  switch (standing) {
    case 'Good Standing':
      return 'success';
    case 'Acceptable Standing':
      return 'warning';
    case 'Needs Improvement':
      return 'error';
    default:
      return 'error';
  }
};

/**
 * Get performance color based on municipality performance
 */
export const getPerformanceColor = (performance: string): 'success' | 'error' => {
  return performance === 'Performing Municipality' ? 'success' : 'error';
};

/**
 * Calculate members needed for next standing level
 */
export const calculateMembersNeeded = (currentMembers: number, currentStanding: string): number => {
  switch (currentStanding) {
    case 'Good Standing':
      return 0; // Already at highest level
    case 'Acceptable Standing':
      return 200 - currentMembers; // Need 200 for Good Standing
    case 'Needs Improvement':
      return 100 - currentMembers; // Need 100 for Acceptable Standing
    default:
      return 100 - currentMembers;
  }
};
