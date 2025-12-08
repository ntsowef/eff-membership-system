/**
 * Custom Hook for Renewal Bulk Upload Management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  uploadFile,
  getUploadStatus,
  getRecentUploads,
  getFraudCases,
  downloadTemplate,
  downloadReport,
  cancelUpload,
} from '../services/renewalBulkUploadService';
import type {
  BulkUpload,
  FraudCase,
  // UploadFormData,
} from '../types/renewalBulkUpload';

interface UseRenewalBulkUploadOptions {
  autoFetchRecent?: boolean;
  pollingInterval?: number; // milliseconds
}

interface UseRenewalBulkUploadReturn {
  // State
  currentUpload: BulkUpload | null;
  recentUploads: BulkUpload[];
  fraudCases: FraudCase[];
  isUploading: boolean;
  isPolling: boolean;
  error: string | null;
  
  // Actions
  upload: (file: File, provinceCode: string) => Promise<void>;
  fetchStatus: (uploadUuid: string) => Promise<void>;
  fetchRecentUploads: () => Promise<void>;
  fetchFraudCases: (uploadUuid: string) => Promise<void>;
  downloadTemplateFile: () => Promise<void>;
  downloadReportFile: (uploadUuid: string, fileName: string) => Promise<void>;
  cancelCurrentUpload: (uploadUuid: string) => Promise<void>;
  clearError: () => void;
  clearCurrentUpload: () => void;
  
  // Polling control
  startPolling: (uploadUuid: string) => void;
  stopPolling: () => void;
}

export const useRenewalBulkUpload = (
  options: UseRenewalBulkUploadOptions = {}
): UseRenewalBulkUploadReturn => {
  const {
    autoFetchRecent = true,
    pollingInterval = 3000, // 3 seconds
  } = options;

  // State
  const [currentUpload, setCurrentUpload] = useState<BulkUpload | null>(null);
  const [recentUploads, setRecentUploads] = useState<BulkUpload[]>([]);
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUploadUuidRef = useRef<string | null>(null);

  // =====================================================================================
  // FETCH FUNCTIONS
  // =====================================================================================

  /**
   * Fetch upload status
   */
  const fetchStatus = useCallback(async (uploadUuid: string) => {
    try {
      const response = await getUploadStatus(uploadUuid);
      if (response.success) {
        setCurrentUpload(response.data.upload);
        
        // Stop polling if processing is complete
        if (response.data.upload.upload_status !== 'Processing') {
          stopPolling();
          // Refresh recent uploads
          if (autoFetchRecent) {
            fetchRecentUploads();
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch upload status');
      stopPolling();
    }
  }, [autoFetchRecent]);

  /**
   * Fetch recent uploads
   */
  const fetchRecentUploads = useCallback(async () => {
    try {
      const response = await getRecentUploads(20);
      if (response.success) {
        setRecentUploads(response.data.uploads || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch recent uploads:', err);
      // Don't set error for this - it's not critical
    }
  }, []);

  /**
   * Fetch fraud cases
   */
  const fetchFraudCases = useCallback(async (uploadUuid: string) => {
    try {
      const response = await getFraudCases(uploadUuid);
      if (response.success) {
        setFraudCases(response.data.fraud_cases || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch fraud cases');
    }
  }, []);

  // =====================================================================================
  // UPLOAD FUNCTION
  // =====================================================================================

  /**
   * Upload a file
   */
  const upload = useCallback(async (file: File, provinceCode: string) => {
    setIsUploading(true);
    setError(null);
    setCurrentUpload(null);

    try {
      const response = await uploadFile(file, provinceCode);
      if (response.success) {
        const uploadUuid = response.data.upload_uuid;
        currentUploadUuidRef.current = uploadUuid;
        
        // Start polling for status
        startPolling(uploadUuid);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // =====================================================================================
  // DOWNLOAD FUNCTIONS
  // =====================================================================================

  /**
   * Download template file
   */
  const downloadTemplateFile = useCallback(async () => {
    try {
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'renewal_bulk_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    }
  }, []);

  /**
   * Download report file
   */
  const downloadReportFile = useCallback(async (uploadUuid: string, fileName: string) => {
    try {
      const blob = await downloadReport(uploadUuid);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}_report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    }
  }, []);

  // =====================================================================================
  // CANCEL FUNCTION
  // =====================================================================================

  /**
   * Cancel an upload
   */
  const cancelCurrentUpload = useCallback(async (uploadUuid: string) => {
    try {
      const response = await cancelUpload(uploadUuid);
      if (response.success) {
        stopPolling();
        setCurrentUpload(null);
        if (autoFetchRecent) {
          fetchRecentUploads();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel upload');
    }
  }, [autoFetchRecent, fetchRecentUploads]);

  // =====================================================================================
  // POLLING FUNCTIONS
  // =====================================================================================

  /**
   * Start polling for status updates
   */
  const startPolling = useCallback((uploadUuid: string) => {
    // Stop any existing polling
    stopPolling();

    setIsPolling(true);
    currentUploadUuidRef.current = uploadUuid;

    // Fetch immediately
    fetchStatus(uploadUuid);

    // Start interval
    pollingIntervalRef.current = setInterval(() => {
      fetchStatus(uploadUuid);
    }, pollingInterval);
  }, [fetchStatus, pollingInterval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    currentUploadUuidRef.current = null;
  }, []);

  // =====================================================================================
  // UTILITY FUNCTIONS
  // =====================================================================================

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear current upload
   */
  const clearCurrentUpload = useCallback(() => {
    setCurrentUpload(null);
    stopPolling();
  }, [stopPolling]);

  // =====================================================================================
  // EFFECTS
  // =====================================================================================

  /**
   * Fetch recent uploads on mount
   */
  useEffect(() => {
    if (autoFetchRecent) {
      fetchRecentUploads();
    }
  }, [autoFetchRecent, fetchRecentUploads]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // =====================================================================================
  // RETURN
  // =====================================================================================

  return {
    // State
    currentUpload,
    recentUploads,
    fraudCases,
    isUploading,
    isPolling,
    error,
    
    // Actions
    upload,
    fetchStatus,
    fetchRecentUploads,
    fetchFraudCases,
    downloadTemplateFile,
    downloadReportFile,
    cancelCurrentUpload,
    clearError,
    clearCurrentUpload,
    
    // Polling control
    startPolling,
    stopPolling,
  };
};

