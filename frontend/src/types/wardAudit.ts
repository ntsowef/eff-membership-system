// =====================================================
// Ward Audit System - TypeScript Type Definitions
// =====================================================

export interface AssemblyType {
  assembly_type_id: number;
  assembly_code: string;
  assembly_name: string;
  assembly_level: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WardDelegate {
  delegate_id: number;
  ward_code: string;
  member_id: number;
  assembly_type_id: number;
  selection_date: string;
  selection_method?: string;
  delegate_status: string;
  term_start_date?: string;
  term_end_date?: string;
  replacement_reason?: string;
  replaced_by_delegate_id?: number;
  notes?: string;
  selected_by?: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  member_name?: string;
  assembly_code?: string;
  assembly_name?: string;
}

export interface WardComplianceAuditLog {
  audit_log_id: number;
  ward_code: string;
  audit_date: string;
  audited_by: number;
  
  // Criterion 1
  total_members: number;
  meets_member_threshold: boolean;
  total_voting_districts: number;
  compliant_voting_districts: number;
  meets_vd_threshold: boolean;
  criterion_1_passed: boolean;
  
  // Criterion 2
  last_meeting_id?: number;
  quorum_required?: number;
  quorum_achieved?: number;
  quorum_met: boolean;
  criterion_2_passed: boolean;
  
  // Criterion 3
  meeting_attended: boolean;
  criterion_3_passed: boolean;
  
  // Criterion 4
  presiding_officer_id?: number;
  presiding_officer_recorded: boolean;
  criterion_4_passed: boolean;
  
  // Criterion 5
  delegates_selected: boolean;
  criterion_5_passed: boolean;
  
  // Overall
  overall_compliant: boolean;
  compliance_score?: number;
  audit_notes?: string;
  created_at: string;
}

export interface VotingDistrictCompliance {
  voting_district_code: string;
  voting_district_name: string;
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  member_count: number;
  is_compliant: boolean;
  compliance_status: string;
}

export interface WardComplianceSummary {
  ward_code: string;
  ward_name: string;
  ward_number?: number;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  province_code: string;
  
  total_members: number;
  meets_member_threshold: boolean;
  
  total_voting_districts: number;
  compliant_voting_districts: number;
  all_vds_compliant: boolean;
  
  criterion_1_compliant: boolean;
  
  is_compliant: boolean;
  compliance_approved_at?: string;
  compliance_approved_by?: number;
  last_audit_date?: string;
  
  srpa_delegates: number;
  ppa_delegates: number;
  npa_delegates: number;
  
  created_at: string;
  updated_at: string;
}

export interface MunicipalityDelegateReport {
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  province_code: string;
  
  total_wards: number;
  compliant_wards: number;
  non_compliant_wards: number;
  compliance_percentage: number;
  
  total_srpa_delegates: number;
  total_ppa_delegates: number;
  total_npa_delegates: number;
  
  wards: WardComplianceSummary[];
}

export interface Municipality {
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  province_code?: string;
  municipality_type: string;
  parent_municipality_id?: number;
  parent_municipality_code?: string;
  parent_municipality_name?: string;
}

export interface Province {
  province_code: string;
  province_name: string;
}

export interface AssignDelegateRequest {
  ward_code: string;
  member_id: number;
  assembly_code: string;
  selection_method?: 'Elected' | 'Appointed' | 'Ex-Officio';
  term_start_date?: string;
  term_end_date?: string;
  notes?: string;
}

export interface ApproveComplianceRequest {
  notes?: string;
}

export interface ComplianceCriterion {
  id: number;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
}

export interface WardAuditFilters {
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  compliance_status?: 'all' | 'compliant' | 'non-compliant';
  has_delegates?: boolean;
}

