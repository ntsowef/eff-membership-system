import api from './api';

const BASE_URL = '/delegates-management';

export interface DelegateOverview {
  delegate_id: number;
  ward_code: string;
  ward_name: string;
  member_id: number;
  member_name: string;
  id_number: string;
  cell_number?: string;
  email?: string;
  assembly_type_id: number;
  assembly_code: string;
  assembly_name: string;
  assembly_level: string;
  selection_date: string;
  selection_method?: string;
  delegate_status: string;
  term_start_date?: string;
  term_end_date?: string;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  district_name: string;
  province_code: string;
  province_name: string;
}

export interface DelegateSummary {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  municipality_code: string;
  municipality_name: string;
  total_wards: number;
  compliant_wards: number;
  total_srpa_delegates: number;
  total_ppa_delegates: number;
  total_npa_delegates: number;
  total_delegates: number;
}

export interface ConferenceDelegateList {
  assembly_code: string;
  assembly_name: string;
  assembly_level: string;
  total_delegates: number;
  delegates: DelegateOverview[];
}

export interface DelegateStatistics {
  total_delegates: number;
  active_delegates: number;
  inactive_delegates: number;
  srpa_delegates: number;
  ppa_delegates: number;
  npa_delegates: number;
  total_compliant_wards: number;
  total_wards: number;
  provinces_with_delegates: number;
}

export interface DelegateFilters {
  province_code?: string;
  district_code?: string;
  municipality_code?: string;
  assembly_code?: string;
  delegate_status?: string;
}

// API functions
export const delegatesManagementApi = {
  /**
   * Get all delegates with optional filtering
   */
  getAllDelegates: async (filters?: DelegateFilters): Promise<DelegateOverview[]> => {
    const response = await api.get(`${BASE_URL}/delegates`, { params: filters });
    return response.data.data;
  },

  /**
   * Get delegate summary by geographic hierarchy
   */
  getDelegateSummary: async (filters?: { province_code?: string; district_code?: string }): Promise<DelegateSummary[]> => {
    const response = await api.get(`${BASE_URL}/summary`, { params: filters });
    return response.data.data;
  },

  /**
   * Get delegates for a specific conference
   */
  getDelegatesByConference: async (assemblyCode: string): Promise<ConferenceDelegateList> => {
    const response = await api.get(`${BASE_URL}/conference/${assemblyCode}`);
    return response.data.data;
  },

  /**
   * Get delegate statistics
   */
  getDelegateStatistics: async (): Promise<DelegateStatistics> => {
    const response = await api.get(`${BASE_URL}/statistics`);
    return response.data.data;
  },

  /**
   * Update delegate information
   */
  updateDelegate: async (delegateId: number, data: {
    delegate_status?: string;
    term_end_date?: string;
    notes?: string;
    replacement_reason?: string;
  }): Promise<void> => {
    await api.put(`${BASE_URL}/delegate/${delegateId}`, data);
  },

  /**
   * Remove a delegate
   */
  removeDelegate: async (delegateId: number, reason: string): Promise<void> => {
    await api.delete(`${BASE_URL}/delegate/${delegateId}`, { data: { reason } });
  }
};

// Default export
export default delegatesManagementApi;
