// Types for User Management System

export interface User {
  id: number;
  name: string;
  email: string;
  admin_level: 'national' | 'none';
  role_name: string;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login?: string;
  created_at: string;
}

export interface CreateAdminRequest {
  name: string;
  email: string;
  password: string;
  admin_level: 'national';
  role_name: string;
  justification?: string;
}

export interface UserCreationWorkflow {
  id: number;
  request_id: string;
  requested_by: number;
  user_data: any;
  admin_level: string;
  geographic_scope: any;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  created_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: number;
  session_id: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

export interface MFAStatus {
  enabled: boolean;
  required: boolean;
  backup_codes_remaining?: number;
  enabled_at?: string;
}

export interface MFASetup {
  qr_code: string;
  manual_entry_key: string;
  backup_codes: string[];
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  admin_users: number;
  national_admins: number;
  province_admins: number;
  district_admins: number;
  municipal_admins: number;
  ward_admins: number;
  mfa_enabled_users: number;
  active_last_30_days: number;
}

export interface AdminCreationResult {
  success: boolean;
  user_id?: number;
  workflow_id?: number;
  requires_approval: boolean;
  message: string;
}

export interface WorkflowReviewRequest {
  action: 'approve' | 'reject';
  review_notes?: string;
}

export interface BulkUpdateRequest {
  user_ids: number[];
  status: 'activate' | 'deactivate';
  reason?: string;
}

export interface GeographicAssignmentRequest {
  user_id: number;
  assignment_type: 'primary' | 'secondary' | 'temporary';
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  expires_at?: string;
  notes?: string;
}

export interface AdminListParams {
  admin_level?: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  is_active?: string;
  page?: number;
  limit?: number;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  admin_level: string;
  is_active: boolean;
  created_at: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  is_active: boolean;
}
