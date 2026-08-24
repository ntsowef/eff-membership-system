// =====================================================
// LGE2026 - API Service Layer
// =====================================================

import api from './api';
import type {
  Lge2026Candidate,
  Lge2026EligibleMember,
  NominateCandidateRequest,
  UpdateCandidateStatusRequest,
  CandidateListFilters,
  CandidateListResponse,
} from '../types/lge2026';

const unwrap = <T,>(res: any): T => res.data?.data as T;

export const lge2026Api = {
  /**
   * Full candidacy history for a ward (active + historical).
   */
  getCandidatesByWard: async (wardCode: string): Promise<Lge2026Candidate[]> => {
    try {
      const res = await api.get(`/lge2026/ward/${wardCode}/candidates`);
      return unwrap<Lge2026Candidate[]>(res);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch LGE2026 candidates'
      );
    }
  },

  /**
   * Active (nominated or approved) candidate for a ward, or null.
   */
  getActiveCandidate: async (wardCode: string): Promise<Lge2026Candidate | null> => {
    try {
      const res = await api.get(`/lge2026/ward/${wardCode}/candidate`);
      return unwrap<Lge2026Candidate | null>(res);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch active LGE2026 candidate'
      );
    }
  },

  /**
   * Members eligible for nomination within the ward.
   */
  getEligibleWardMembers: async (wardCode: string): Promise<Lge2026EligibleMember[]> => {
    try {
      const res = await api.get(`/lge2026/ward/${wardCode}/eligible-members`);
      return unwrap<Lge2026EligibleMember[]>(res);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch eligible ward members'
      );
    }
  },

  /**
   * Nominate a Ward Councillor Candidate (only one active candidate per ward).
   * Supports optional CV and IEC Form C2 document uploads.
   */
  nominateCandidate: async (
    wardCode: string,
    data: NominateCandidateRequest,
    cvFile?: File,
    iecFormC2File?: File,
  ): Promise<Lge2026Candidate> => {
    try {
      const formData = new FormData();
      formData.append('member_id', String(data.member_id));
      if (data.notes) formData.append('notes', data.notes);
      if (data.campaign_statement) formData.append('campaign_statement', data.campaign_statement);
      if (cvFile) formData.append('candidate_cv', cvFile);
      if (iecFormC2File) formData.append('iec_form_c2', iecFormC2File);

      const res = await api.post(`/lge2026/ward/${wardCode}/candidate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrap<Lge2026Candidate>(res);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to nominate candidate'
      );
    }
  },

  /**
   * Approve or withdraw a candidate.
   */
  updateCandidateStatus: async (
    candidateId: number,
    data: UpdateCandidateStatusRequest
  ): Promise<Lge2026Candidate> => {
    try {
      const res = await api.patch(`/lge2026/candidate/${candidateId}/status`, data);
      return unwrap<Lge2026Candidate>(res);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to update candidate status'
      );
    }
  },

  /**
   * All candidates across wards, with filtering and pagination.
   */
  getAllCandidates: async (filters: CandidateListFilters): Promise<CandidateListResponse> => {
    try {
      const res = await api.get('/lge2026/candidates', { params: filters });
      return res.data?.data as CandidateListResponse;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch candidates list');
    }
  },

  /**
   * Export candidates to CSV or XLSX (triggers browser download).
   */
  exportCandidates: async (filters: Omit<CandidateListFilters, 'limit' | 'offset'>, format: 'csv' | 'xlsx' = 'csv'): Promise<void> => {
    try {
      const res = await api.get('/lge2026/candidates/export', {
        params: { ...filters, format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lge2026_candidates_${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to export candidates');
    }
  },

  /**
   * Upload CV and/or IEC Form C2 for an existing candidate.
   */
  uploadCandidateDocuments: async (
    candidateId: number,
    cvFile?: File,
    iecFormC2File?: File,
  ): Promise<Lge2026Candidate> => {
    try {
      const formData = new FormData();
      if (cvFile) formData.append('candidate_cv', cvFile);
      if (iecFormC2File) formData.append('iec_form_c2', iecFormC2File);

      const res = await api.post(`/lge2026/candidate/${candidateId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrap<Lge2026Candidate>(res);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to upload candidate documents'
      );
    }
  },

  /**
   * Download a candidate document (cv or iec_form_c2).
   */
  downloadCandidateDocument: async (
    candidateId: number,
    docType: 'cv' | 'iec_form_c2',
  ): Promise<void> => {
    try {
      const res = await api.get(`/lge2026/candidate/${candidateId}/document/${docType}`, {
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'];
      let filename = `candidate_${candidateId}_${docType}`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+)"?/i);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to download candidate document'
      );
    }
  },

  /**
   * Update a candidate's personal details (name, phone, email) in members_consolidated.
   */
  updateMemberDetails: async (
    candidateId: number,
    data: { firstname: string; surname: string; cell_number: string; email: string }
  ): Promise<Lge2026Candidate> => {
    try {
      const res = await api.patch(`/lge2026/candidate/${candidateId}/member-details`, data);
      return unwrap<Lge2026Candidate>(res);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to update member details'
      );
    }
  },
};

export default lge2026Api;
