import { api } from '../lib/api';

export interface ProvinceStats {
  scanned: number;
  deceased: number;
  deleted: number;
  errors: number;
  not_found: number;
}

export interface PurgeRun {
  run_id: number;
  status: 'STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  total_scanned: number;
  deceased_found: number;
  records_deleted: number;
  errors_count: number;
  province_breakdown: Record<string, ProvinceStats> | null;
  started_at: string;
  completed_at: string | null;
}

export interface ArchivedMember {
  archive_id: number;
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  province_code: string;
  ward_code: string;
  municipality_code: string;
  cell_number: string;
  membership_number: string;
  date_joined: string | null;
  iec_voter_status: string;
  detected_date: string;
  purge_run_id: number;
}

const BASE = '/deceased-purge';

export const deceasedPurgeApi = {
  startRun: async (): Promise<{ run_id: number; message: string }> => {
    const res = await api.post(`${BASE}/start`);
    return res.data.data;
  },

  pauseRun: async (runId: number): Promise<{ message: string }> => {
    const res = await api.post(`${BASE}/pause/${runId}`);
    return res.data;
  },

  getCurrentRun: async (): Promise<PurgeRun | null> => {
    const res = await api.get(`${BASE}/runs/current`);
    return res.data.data;
  },

  getRun: async (runId: number): Promise<PurgeRun> => {
    const res = await api.get(`${BASE}/runs/${runId}`);
    return res.data.data;
  },

  listRuns: async (): Promise<PurgeRun[]> => {
    const res = await api.get(`${BASE}/runs`);
    return res.data.data;
  },

  listArchived: async (params: {
    run_id?: number;
    province_code?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ rows: ArchivedMember[]; total: number }> => {
    const res = await api.get(`${BASE}/archived`, { params });
    return { rows: res.data.data, total: res.data.total };
  },
};
