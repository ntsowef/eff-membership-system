/**
 * TypeScript Types and Interfaces for Renewal Bulk Upload System
 */

// =====================================================================================
// BULK UPLOAD TYPES
// =====================================================================================

export interface BulkUpload {
  upload_id: number;
  upload_uuid: string;
  file_name: string;
  file_path: string;
  file_size: number;
  province_code: string;
  upload_status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
  total_records: number;
  processed_records: number;
  successful_renewals: number;
  failed_validations: number;
  fraud_detected: number;
  early_renewals: number;
  inactive_renewals: number;
  progress_percentage: string;
  uploaded_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  uploaded_by: number;
  uploaded_by_name?: string;
  uploaded_by_email?: string;
  processing_time_seconds: string | null;
  processing_summary: any;
  error_message: string | null;
}

export interface BulkUploadRecord {
  record_id: number;
  upload_id: number;
  row_number: number;
  member_id_number: string;
  member_firstname: string;
  member_surname: string;
  member_email: string | null;
  member_phone: string | null;
  renewal_ward_code: string;
  renewal_ward_name: string | null;
  renewal_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  payment_date: string | null;
  validation_passed: boolean;
  validation_errors: any;
  fraud_detected: boolean;
  fraud_type: string | null;
  fraud_details: any;
  found_member_id: number | null;
  current_ward_code: string | null;
  current_ward_name: string | null;
  membership_status: string | null;
  membership_expiry_date: string | null;
  renewal_type: string | null;
  processing_status: 'Pending' | 'Processed' | 'Failed' | 'Skipped';
  processed_at: string | null;
  created_at: string;
}

// =====================================================================================
// FRAUD CASE TYPES
// =====================================================================================

export interface FraudCase {
  fraud_case_id: number;
  upload_id: number;
  record_id: number;
  member_id: number | null;
  member_id_number: string;
  member_name: string | null;
  fraud_type: 'Ward Mismatch' | 'Duplicate Renewal' | 'Invalid Payment' | 'Suspicious Activity';
  fraud_severity: 'Low' | 'Medium' | 'High' | 'Critical';
  fraud_description: string;
  current_ward_code: string | null;
  current_ward_name: string | null;
  attempted_ward_code: string | null;
  attempted_ward_name: string | null;
  evidence: any;
  case_status: 'Detected' | 'Under Review' | 'Confirmed' | 'Dismissed' | 'Resolved';
  detected_at: string;
  reviewed_by: number | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
  upload_uuid?: string;
  file_name?: string;
  uploaded_by?: number;
  uploaded_by_name?: string;
}

export interface FraudCaseFilters {
  fraud_type?: string;
  fraud_severity?: string;
  case_status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// =====================================================================================
// APPROVAL WORKFLOW TYPES
// =====================================================================================

export interface ApprovalRequest {
  approval_id: number;
  renewal_id: number;
  member_id: number;
  member_name?: string;
  member_id_number?: string;
  approval_level: 'Provincial' | 'Regional' | 'National';
  approval_status: 'Pending' | 'Approved' | 'Rejected' | 'Escalated';
  review_reason: string | null;
  review_priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigned_to: number | null;
  assigned_to_name?: string;
  requested_by: number;
  requested_by_name?: string;
  requested_at: string;
  reviewed_by: number | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  escalation_reason: string | null;
  metadata: any;
}

export interface ApprovalFilters {
  approval_level?: string;
  approval_status?: string;
  review_priority?: string;
  assigned_to?: number;
  date_from?: string;
  date_to?: string;
}

// =====================================================================================
// AUDIT TRAIL TYPES
// =====================================================================================

export interface AuditTrailEntry {
  audit_id: number;
  renewal_id: number;
  member_id: number;
  member_name?: string;
  member_id_number?: string;
  action_type: string;
  action_category: 'Status Change' | 'Payment' | 'Approval' | 'Fraud Detection' | 'Manual Update' | 'Bulk Operation' | 'System';
  action_description: string;
  performed_by: number;
  performed_by_name?: string;
  performed_at: string;
  old_values: any;
  new_values: any;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AuditTrailFilters {
  action_category?: string;
  action_type?: string;
  performed_by?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// =====================================================================================
// MANUAL NOTES TYPES
// =====================================================================================

export interface ManualNote {
  note_id: number;
  renewal_id: number;
  member_id: number;
  member_name?: string;
  note_type: 'General' | 'Issue' | 'Follow-up' | 'Resolution';
  note_content: string;
  priority: 'Low' | 'Medium' | 'High';
  requires_followup: boolean;
  followup_date: string | null;
  followup_completed: boolean;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================================================
// BULK OPERATIONS TYPES
// =====================================================================================

export interface BulkOperation {
  operation_id: number;
  operation_type: 'Approve' | 'Reject' | 'Update Status' | 'Assign Reviewer' | 'Export';
  operation_status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  initiated_by: number;
  initiated_by_name?: string;
  initiated_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface BulkOperationItem {
  item_id: number;
  operation_id: number;
  renewal_id: number;
  member_id: number;
  processing_status: 'Pending' | 'Processed' | 'Failed' | 'Skipped';
  error_message: string | null;
  processed_at: string | null;
}

// =====================================================================================
// EXPORT JOB TYPES
// =====================================================================================

export interface ExportJob {
  job_id: number;
  job_type: 'Upload Report' | 'Fraud Cases' | 'Audit Trail' | 'Approval Queue';
  job_status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  filters: any;
  requested_by: number;
  requested_by_name?: string;
  requested_at: string;
  completed_at: string | null;
  error_message: string | null;
}

// =====================================================================================
// API RESPONSE TYPES
// =====================================================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface UploadResponse {
  upload_uuid: string;
  message: string;
}

export interface StatusResponse {
  upload: BulkUpload;
}

export interface RecentUploadsResponse {
  uploads: BulkUpload[];
  total: number;
}

export interface FraudCasesResponse {
  fraud_cases: FraudCase[];
  total: number;
}

export interface RecordsResponse {
  records: BulkUploadRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ApprovalsResponse {
  renewals: ApprovalRequest[];
  total: number;
}

export interface AuditTrailResponse {
  entries: AuditTrailEntry[];
  total: number;
}

// =====================================================================================
// FORM TYPES
// =====================================================================================

export interface UploadFormData {
  file: File | null;
  province_code: string;
}

export interface ApprovalFormData {
  approval_notes?: string;
  rejection_reason?: string;
}

export interface NoteFormData {
  note_type: 'General' | 'Issue' | 'Follow-up' | 'Resolution';
  note_content: string;
  priority: 'Low' | 'Medium' | 'High';
  requires_followup: boolean;
  followup_date?: string;
}

// =====================================================================================
// STATISTICS TYPES
// =====================================================================================

export interface UploadStatistics {
  total_uploads: number;
  completed_uploads: number;
  processing_uploads: number;
  failed_uploads: number;
  total_records_processed: number;
  total_fraud_detected: number;
  success_rate: number;
}

export interface FraudStatistics {
  total_cases: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
}

