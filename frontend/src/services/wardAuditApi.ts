// =====================================================
// Ward Audit System - API Service Layer
// =====================================================

import api from './api';
import type {
  AssemblyType,
  WardComplianceSummary,
  VotingDistrictCompliance,
  WardDelegate,
  MunicipalityDelegateReport,
  Municipality,
  AssignDelegateRequest,
} from '../types/wardAudit';

export const wardAuditApi = {
  // =====================================================
  // Geographic Filtering
  // =====================================================
  
  /**
   * Get municipalities/subregions by province for ward audit
   */
  getMunicipalitiesByProvince: async (provinceCode: string): Promise<Municipality[]> => {
    try {
      const response = await api.get(`/ward-audit/municipalities`, {
        params: { province_code: provinceCode }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch municipalities');
    }
  },
  
  /**
   * Get wards by municipality with compliance data
   */
  getWardsByMunicipality: async (municipalityCode: string): Promise<WardComplianceSummary[]> => {
    try {
      const response = await api.get(`/ward-audit/wards`, {
        params: { municipality_code: municipalityCode }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch wards');
    }
  },

  /**
   * Get members filtered by province for presiding officer/secretary selection
   */
  getMembersByProvince: async (provinceCode: string): Promise<any[]> => {
    try {
      const response = await api.get(`/ward-audit/members/province/${provinceCode}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch members by province');
    }
  },
  
  // =====================================================
  // Ward Compliance
  // =====================================================
  
  /**
   * Get detailed compliance check for a specific ward
   */
  getWardCompliance: async (wardCode: string): Promise<WardComplianceSummary> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/compliance`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch ward compliance');
    }
  },
  
  /**
   * Approve ward compliance
   */
  approveWardCompliance: async (
    wardCode: string,
    data?: { notes?: string }
  ): Promise<{ ward_code: string; approved: boolean }> => {
    try {
      const response = await api.post(`/ward-audit/ward/${wardCode}/approve`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve ward compliance');
    }
  },
  
  /**
   * Get voting district member counts for a ward
   */
  getVotingDistrictCompliance: async (wardCode: string): Promise<VotingDistrictCompliance[]> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/voting-districts`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch voting district compliance');
    }
  },
  
  // =====================================================
  // Delegate Management
  // =====================================================
  
  /**
   * Get delegates for a ward
   */
  getWardDelegates: async (
    wardCode: string, 
    assemblyCode?: string
  ): Promise<WardDelegate[]> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/delegates`, {
        params: assemblyCode ? { assembly_code: assemblyCode } : undefined
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch ward delegates');
    }
  },
  
  /**
   * Assign a delegate to a ward for an assembly
   */
  assignDelegate: async (data: AssignDelegateRequest): Promise<{ delegate_id: number }> => {
    try {
      const response = await api.post('/ward-audit/delegates', data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to assign delegate');
    }
  },
  
  // =====================================================
  // Municipality Aggregate Reports
  // =====================================================
  
  /**
   * Get aggregate delegate report for a municipality
   */
  getMunicipalityDelegateReport: async (
    municipalityCode: string
  ): Promise<MunicipalityDelegateReport> => {
    try {
      const response = await api.get(`/ward-audit/municipality/${municipalityCode}/delegates`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch municipality delegate report');
    }
  },
  
  // =====================================================
  // Assembly Types
  // =====================================================
  
  /**
   * Get all assembly types
   */
  getAssemblyTypes: async (): Promise<AssemblyType[]> => {
    try {
      const response = await api.get('/ward-audit/assembly-types');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch assembly types');
    }
  },

  // =====================================================
  // Meeting Management
  // =====================================================

  /**
   * Create a new ward meeting record
   */
  createMeetingRecord: async (wardCode: string, data: any): Promise<any> => {
    try {
      const response = await api.post(`/ward-audit/ward/${wardCode}/meeting`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create meeting record');
    }
  },

  /**
   * Get all meeting records for a ward
   */
  getWardMeetings: async (wardCode: string, meetingType?: string): Promise<any[]> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/meetings`, {
        params: meetingType ? { meeting_type: meetingType } : {}
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch ward meetings');
    }
  },

  /**
   * Get the latest meeting record for a ward
   */
  getLatestWardMeeting: async (wardCode: string, meetingType?: string): Promise<any> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/meeting/latest`, {
        params: meetingType ? { meeting_type: meetingType } : {}
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch latest meeting');
    }
  },

  /**
   * Update a meeting record
   */
  updateMeetingRecord: async (recordId: number, data: any): Promise<void> => {
    try {
      await api.put(`/ward-audit/meeting/${recordId}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update meeting record');
    }
  },

  /**
   * Get enhanced ward compliance details with all 5 criteria
   */
  getWardComplianceDetails: async (wardCode: string): Promise<any> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/compliance/details`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch compliance details');
    }
  },

  /**
   * Remove a delegate assignment
   */
  removeDelegateAssignment: async (delegateId: number, reason: string): Promise<void> => {
    try {
      await api.delete(`/ward-audit/delegate/${delegateId}`, {
        data: { reason }
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove delegate');
    }
  },

  /**
   * Replace a delegate assignment
   */
  replaceDelegateAssignment: async (delegateId: number, newMemberId: number, reason: string): Promise<void> => {
    try {
      await api.put(`/ward-audit/delegate/${delegateId}/replace`, {
        new_member_id: newMemberId,
        reason
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to replace delegate');
    }
  },

  /**
   * Get eligible members for delegate assignment in a ward
   */
  getWardMembers: async (wardCode: string): Promise<any[]> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/members`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch ward members');
    }
  },

  /**
   * Check delegate limit for an assembly type
   */
  checkDelegateLimit: async (wardCode: string, assemblyTypeId: number): Promise<{
    current_count: number;
    limit: number;
    can_assign: boolean;
  }> => {
    try {
      const response = await api.get(`/ward-audit/ward/${wardCode}/delegate-limit/${assemblyTypeId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to check delegate limit');
    }
  },
};

export default wardAuditApi;

