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
   */
  nominateCandidate: async (
    wardCode: string,
    data: NominateCandidateRequest
  ): Promise<Lge2026Candidate> => {
    try {
      const res = await api.post(`/lge2026/ward/${wardCode}/candidate`, data);
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
};

export default lge2026Api;
