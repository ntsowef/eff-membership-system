import { apiGet, apiPost, apiPut, apiDelete, api } from './api';
import type { ApiResponse } from '../types/api';

export interface UploadedFile {
  file_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  upload_timestamp: string;
  uploaded_by_user_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  error_message?: string;
  rows_processed: number;
  rows_total: number;
  rows_success: number;
  rows_failed: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  report_file_path?: string;
}

export interface MemberSearchResult {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  membership_status: string;
  membership_number?: string;
  province_name?: string;
  municipality_name?: string;
}

export interface BulkOperation {
  operation_id: number;
  operation_type: 'status_update' | 'bulk_delete' | 'bulk_update';
  performed_by_user_id: number;
  member_ids: number[];
  total_members: number;
  successful_count: number;
  failed_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  operation_details?: any;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Rate limit status response
 */
export interface RateLimitStatus {
  is_limited: boolean;
  uploads_allowed: boolean;
  current_count: number;
  max_limit: number;
  remaining: number;
  reset_time: number;
  reset_time_formatted: string;
  message: string;
}

/**
 * Check IEC API rate limit status before upload
 * Returns whether uploads are currently allowed
 */
export const checkRateLimitStatus = async (): Promise<RateLimitStatus> => {
  const response = await apiGet<RateLimitStatus>('/bulk-upload/rate-limit-status');
  if (!response.data) {
    // Default to allowing uploads if check fails
    return {
      is_limited: false,
      uploads_allowed: true,
      current_count: 0,
      max_limit: 10000,
      remaining: 10000,
      reset_time: Date.now() + 3600000,
      reset_time_formatted: new Date(Date.now() + 3600000).toISOString(),
      message: 'Rate limit check failed, allowing upload'
    };
  }
  return response.data;
};

/**
 * Quick check if uploads are allowed
 */
export const canUpload = async (): Promise<{ can_upload: boolean; reason: string | null; reset_time: number | null }> => {
  const response = await apiGet<{ can_upload: boolean; reason: string | null; reset_time: number | null }>('/bulk-upload/can-upload');
  if (!response.data) {
    return { can_upload: true, reason: null, reset_time: null };
  }
  return response.data;
};

/**
 * Upload Excel file for bulk member amendments
 */
export const uploadBulkFile = async (file: File): Promise<UploadedFile> => {
  const formData = new FormData();
  formData.append('file', file);

  // Use api instance directly for file upload
  // IMPORTANT: We must delete the Content-Type header to let the browser set it automatically
  // The browser will set it to multipart/form-data with the correct boundary
  const response = await api.post<ApiResponse<UploadedFile>>(
    '/self-data-management/bulk-upload',
    formData,
    {
      headers: {
        'Content-Type': undefined, // Remove Content-Type so browser sets it with boundary
        // Removed 'X-No-Retry' header - causes CORS error and retry is already disabled in mutation config
      },
      transformRequest: [(data) => data], // Prevent axios from transforming FormData
      timeout: 120000, // 2 minutes timeout for file uploads (default is 10 seconds)
    }
  );

  if (!response.data.data) {
    throw new Error('No data returned from upload');
  }
  return response.data.data;
};

/**
 * Get file processing status
 */
export const getFileStatus = async (fileId: number): Promise<UploadedFile> => {
  const response = await apiGet<UploadedFile>(`/self-data-management/bulk-upload/status/${fileId}`);
  if (!response.data) {
    throw new Error('No data returned from file status');
  }
  return response.data;
};

/**
 * Get upload history
 */
export const getUploadHistory = async (params?: {
  user_id?: number;
  limit?: number;
  offset?: number;
}): Promise<{ files: UploadedFile[]; total: number }> => {
  const response = await apiGet<{ files: UploadedFile[]; total: number }>(
    '/self-data-management/bulk-upload/history',
    params
  );
  if (!response.data) {
    throw new Error('No data returned from upload history');
  }
  return response.data;
};

/**
 * Delete upload history record
 */
export const deleteUploadHistory = async (fileId: number): Promise<void> => {
  await apiDelete(`/self-data-management/bulk-upload/history/${fileId}`);
};

/**
 * Search members by ID number
 */
export const searchMembers = async (
  idNumber: string,
  limit?: number
): Promise<MemberSearchResult[]> => {
  const response = await apiPost<MemberSearchResult[]>(
    '/self-data-management/bulk-manipulation/search',
    { id_number: idNumber, limit }
  );
  if (!response.data) {
    return [];
  }
  return response.data;
};

/**
 * Bulk update member status
 */
export const bulkUpdateMemberStatus = async (
  memberIds: number[],
  newStatusId: number,
  reason?: string
): Promise<BulkOperation> => {
  const response = await apiPut<BulkOperation>(
    '/self-data-management/bulk-manipulation/update-status',
    {
      member_ids: memberIds,
      new_status_id: newStatusId,
      reason,
    }
  );
  if (!response.data) {
    throw new Error('No data returned from bulk update');
  }
  return response.data;
};

/**
 * Bulk delete members
 */
export const bulkDeleteMembers = async (memberIds: number[]): Promise<BulkOperation> => {
  const response = await apiPost<BulkOperation>(
    '/self-data-management/bulk-manipulation/delete',
    {
      member_ids: memberIds,
      confirmation: 'DELETE',
    }
  );
  if (!response.data) {
    throw new Error('No data returned from bulk delete');
  }
  return response.data;
};

/**
 * Get membership statuses for dropdown
 */
export const getMembershipStatuses = async (): Promise<Array<{ status_id: number; status_name: string }>> => {
  const response = await apiGet<{ data: Array<{ status_id: number; status_name: string }> }>(
    '/lookups/membership-statuses'
  );
  return response.data?.data || [];
};

