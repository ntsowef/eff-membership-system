/**
 * API Service for Renewal Bulk Upload System
 */

import axios, { AxiosError } from 'axios';
import type {
  ApiResponse,
  BulkUpload,
  BulkUploadRecord,
  FraudCase,
  ApprovalRequest,
  AuditTrailEntry,
  ManualNote,
  UploadResponse,
  StatusResponse,
  RecentUploadsResponse,
  FraudCasesResponse,
  RecordsResponse,
  ApprovalsResponse,
  AuditTrailResponse,
  FraudCaseFilters,
  ApprovalFilters,
  AuditTrailFilters,
  ApprovalFormData,
  NoteFormData,
} from '../types/renewalBulkUpload';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// =====================================================================================
// ERROR HANDLING
// =====================================================================================

export class RenewalBulkUploadError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'RenewalBulkUploadError';
  }
}

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const message = axiosError.response?.data?.message || axiosError.message || 'An error occurred';
    const statusCode = axiosError.response?.status;
    const details = axiosError.response?.data;
    throw new RenewalBulkUploadError(message, statusCode, details);
  }
  throw new RenewalBulkUploadError('An unexpected error occurred');
};

// =====================================================================================
// BULK UPLOAD ENDPOINTS
// =====================================================================================

/**
 * Upload a file for bulk renewal processing
 */
export const uploadFile = async (
  file: File,
  provinceCode: string
): Promise<ApiResponse<UploadResponse>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('province_code', provinceCode);

    const response = await axios.post<ApiResponse<UploadResponse>>(
      `${API_BASE_URL}/renewal-bulk-upload/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get upload status by UUID
 */
export const getUploadStatus = async (
  uploadUuid: string
): Promise<ApiResponse<StatusResponse>> => {
  try {
    const response = await axios.get<ApiResponse<StatusResponse>>(
      `${API_BASE_URL}/renewal-bulk-upload/status/${uploadUuid}`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get recent uploads
 */
export const getRecentUploads = async (
  limit: number = 20
): Promise<ApiResponse<RecentUploadsResponse>> => {
  try {
    const response = await axios.get<ApiResponse<RecentUploadsResponse>>(
      `${API_BASE_URL}/renewal-bulk-upload/recent`,
      { params: { limit } }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get fraud cases for an upload
 */
export const getFraudCases = async (
  uploadUuid: string
): Promise<ApiResponse<FraudCasesResponse>> => {
  try {
    const response = await axios.get<ApiResponse<FraudCasesResponse>>(
      `${API_BASE_URL}/renewal-bulk-upload/fraud-cases/${uploadUuid}`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get all fraud cases with filters
 */
export const getAllFraudCases = async (
  filters?: FraudCaseFilters
): Promise<ApiResponse<FraudCasesResponse>> => {
  try {
    const response = await axios.get<ApiResponse<FraudCasesResponse>>(
      `${API_BASE_URL}/renewal-bulk-upload/fraud-cases`,
      { params: filters }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get upload records
 */
export const getUploadRecords = async (
  uploadUuid: string,
  page: number = 1,
  limit: number = 50
): Promise<ApiResponse<RecordsResponse>> => {
  try {
    const response = await axios.get<ApiResponse<RecordsResponse>>(
      `${API_BASE_URL}/renewal-bulk-upload/records/${uploadUuid}`,
      { params: { page, limit } }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Download template file
 */
export const downloadTemplate = async (): Promise<Blob> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/renewal-bulk-upload/download-template`,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Download report for an upload
 */
export const downloadReport = async (uploadUuid: string): Promise<Blob> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/renewal-bulk-upload/export-report/${uploadUuid}`,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Cancel an upload
 */
export const cancelUpload = async (
  uploadUuid: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await axios.post<ApiResponse<{ message: string }>>(
      `${API_BASE_URL}/renewal-bulk-upload/cancel/${uploadUuid}`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// =====================================================================================
// APPROVAL WORKFLOW ENDPOINTS
// =====================================================================================

/**
 * Get pending approvals
 */
export const getPendingApprovals = async (
  filters?: ApprovalFilters
): Promise<ApiResponse<ApprovalsResponse>> => {
  try {
    const response = await axios.get<ApiResponse<ApprovalsResponse>>(
      `${API_BASE_URL}/renewal-admin/approvals/pending`,
      { params: filters }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Create approval request
 */
export const createApprovalRequest = async (data: {
  renewal_id: number;
  member_id: number;
  review_reason?: string;
  review_priority?: string;
  assigned_to?: number;
}): Promise<ApiResponse<{ approval_id: number }>> => {
  try {
    const response = await axios.post<ApiResponse<{ approval_id: number }>>(
      `${API_BASE_URL}/renewal-admin/approvals/create`,
      data
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Approve a renewal
 */
export const approveRenewal = async (
  approvalId: number,
  data: ApprovalFormData
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await axios.post<ApiResponse<{ message: string }>>(
      `${API_BASE_URL}/renewal-admin/approvals/${approvalId}/approve`,
      data
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Reject a renewal
 */
export const rejectRenewal = async (
  approvalId: number,
  data: ApprovalFormData
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await axios.post<ApiResponse<{ message: string }>>(
      `${API_BASE_URL}/renewal-admin/approvals/${approvalId}/reject`,
      data
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// =====================================================================================
// AUDIT TRAIL ENDPOINTS
// =====================================================================================

/**
 * Get audit trail for a renewal
 */
export const getAuditTrail = async (
  renewalId: number
): Promise<ApiResponse<AuditTrailResponse>> => {
  try {
    const response = await axios.get<ApiResponse<AuditTrailResponse>>(
      `${API_BASE_URL}/renewal-admin/audit/${renewalId}`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get all audit trail entries with filters
 */
export const getAllAuditTrail = async (
  filters?: AuditTrailFilters
): Promise<ApiResponse<AuditTrailResponse>> => {
  try {
    const response = await axios.get<ApiResponse<AuditTrailResponse>>(
      `${API_BASE_URL}/renewal-admin/audit`,
      { params: filters }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// =====================================================================================
// MANUAL NOTES ENDPOINTS
// =====================================================================================

/**
 * Add a manual note
 */
export const addManualNote = async (
  renewalId: number,
  memberId: number,
  data: NoteFormData
): Promise<ApiResponse<{ note_id: number }>> => {
  try {
    const response = await axios.post<ApiResponse<{ note_id: number }>>(
      `${API_BASE_URL}/renewal-admin/notes/add`,
      {
        renewal_id: renewalId,
        member_id: memberId,
        ...data,
      }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get notes for a renewal
 */
export const getRenewalNotes = async (
  renewalId: number
): Promise<ApiResponse<{ notes: ManualNote[] }>> => {
  try {
    const response = await axios.get<ApiResponse<{ notes: ManualNote[] }>>(
      `${API_BASE_URL}/renewal-admin/notes/${renewalId}`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get notes requiring follow-up
 */
export const getPendingFollowUps = async (): Promise<ApiResponse<{ notes: ManualNote[] }>> => {
  try {
    const response = await axios.get<ApiResponse<{ notes: ManualNote[] }>>(
      `${API_BASE_URL}/renewal-admin/notes/follow-up/pending`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Mark follow-up as completed
 */
export const completeFollowUp = async (
  noteId: number
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await axios.put<ApiResponse<{ message: string }>>(
      `${API_BASE_URL}/renewal-admin/notes/${noteId}/complete-follow-up`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

