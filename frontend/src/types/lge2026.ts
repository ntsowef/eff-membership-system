// =====================================================
// LGE2026 - TypeScript Type Definitions
// Ward Councillor Candidate Selection for the 2026 Local
// Government Elections.
// =====================================================

export type Lge2026CandidateStatus = 'nominated' | 'approved' | 'withdrawn';

export interface Lge2026Candidate {
  candidate_id: number;
  ward_code: string;
  member_id: number;
  status: Lge2026CandidateStatus;
  nominated_by?: number | null;
  nominated_at: string;
  decided_by?: number | null;
  decided_at?: string | null;
  notes?: string | null;
  campaign_statement?: string | null;
  cv_path?: string | null;
  cv_original_name?: string | null;
  iec_form_c2_path?: string | null;
  iec_form_c2_original_name?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  member_name?: string;
  member_firstname?: string;
  member_surname?: string;
  id_number?: string;
  cell_number?: string;
  email?: string;
  membership_status?: string;
  voting_district_code?: string;
  voting_district_name?: string;
  ward_name?: string;
  nominated_by_name?: string;
  decided_by_name?: string;
}

export interface Lge2026EligibleMember {
  member_id: number;
  firstname: string;
  surname: string;
  full_name: string;
  id_number?: string;
  cell_number?: string;
  email?: string;
  ward_code: string;
  voting_district_code?: string;
  voting_district_name?: string;
  membership_status: string;

  // null when the member has no active candidacy in this ward
  existing_candidate_id?: number | null;
  existing_candidate_status?: Lge2026CandidateStatus | null;
}

export interface NominateCandidateRequest {
  member_id: number;
  notes?: string;
  campaign_statement?: string;
}

export interface UpdateCandidateStatusRequest {
  status: Exclude<Lge2026CandidateStatus, 'nominated'>;
  notes?: string;
}

export interface CandidateListFilters {
  province?: string;
  municipality?: string;
  ward?: string;
  search?: string;
  status?: Lge2026CandidateStatus | 'all';
  limit?: number;
  offset?: number;
}

export interface CandidateListResponse {
  candidates: Lge2026Candidate[];
  total: number;
  limit: number;
  offset: number;
}
