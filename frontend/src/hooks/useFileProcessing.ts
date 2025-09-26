import { useState, useEffect, useCallback } from 'react';
import { FileProcessingService } from '../services/fileProcessingService';
import type { FileProcessingJob, QueueStatus } from '../types/fileProcessing';
import { useAuth } from '../store';

export interface UseFileProcessingReturn {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Queue data
  queueStatus: QueueStatus | null;
  jobHistory: FileProcessingJob[];
  currentJob: FileProcessingJob | null;

  // Actions
  uploadFile: (file: File, wardNumber?: number) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  downloadFile: (jobId: string, fileName: string) => void;
  downloadProcessedFile: (jobId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  getJobDetails: (jobId: string) => Promise<FileProcessingJob>;

  // WebSocket connection management
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;

  // Job data access
  jobs: FileProcessingJob[];

  // Event handlers
  onFileQueued: (callback: (data: any) => void) => void;
  onJobStarted: (callback: (data: any) => void) => void;
  onJobProgress: (callback: (data: any) => void) => void;
  onJobCompleted: (callback: (data: any) => void) => void;
  onJobFailed: (callback: (data: any) => void) => void;
  onJobCancelled: (callback: (data: any) => void) => void;
}

export const useFileProcessing = (): UseFileProcessingReturn => {
  const { token } = useAuth();
  const [fileProcessingService] = useState(() => FileProcessingService.getInstance());
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [jobHistory, setJobHistory] = useState<FileProcessingJob[]>([]);
  const [currentJob, setCurrentJob] = useState<FileProcessingJob | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!token) return;

    fileProcessingService.connect(token);

    // Connection events
    fileProcessingService.on('connected', () => {
      setIsConnected(true);
      setError(null);
    });

    fileProcessingService.on('disconnected', () => {
      setIsConnected(false);
    });

    fileProcessingService.on('connection_error', (data: any) => {
      setError(data.error);
      setIsConnected(false);
    });

    // Queue status updates
    fileProcessingService.on('queue_status', (data: QueueStatus) => {
      setQueueStatus(data);
      setCurrentJob(data.currentJob ? {
        id: data.currentJob.id,
        fileName: data.currentJob.fileName,
        wardNumber: data.currentJob.wardNumber,
        status: data.currentJob.status as 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled',
        progress: data.currentJob.progress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        filePath: '',
        fileSize: 0
      } : null);
    });

    // Job history updates
    fileProcessingService.on('job_history', (data: FileProcessingJob[]) => {
      setJobHistory(data);
    });

    // Real-time job updates
    fileProcessingService.on('job_progress', (data: any) => {
      setJobHistory(prev => prev.map(job => 
        job.id === data.jobId 
          ? { ...job, progress: data.progress }
          : job
      ));
      
      if (currentJob?.id === data.jobId) {
        setCurrentJob(prev => prev ? { ...prev, progress: data.progress } : null);
      }
    });

    fileProcessingService.on('job_started', (data: any) => {
      setJobHistory(prev => prev.map(job =>
        job.id === data.jobId
          ? { ...job, status: 'processing' as const, updatedAt: data.timestamp }
          : job
      ));
    });

    fileProcessingService.on('job_completed', (data: any) => {
      setJobHistory(prev => prev.map(job =>
        job.id === data.jobId
          ? { ...job, status: 'completed' as const, completedAt: data.timestamp, result: data.result, updatedAt: data.timestamp }
          : job
      ));
    });

    fileProcessingService.on('job_failed', (data: any) => {
      setJobHistory(prev => prev.map(job =>
        job.id === data.jobId
          ? { ...job, status: 'failed' as const, completedAt: data.timestamp, error: data.error, updatedAt: data.timestamp }
          : job
      ));
    });

    fileProcessingService.on('job_cancelled', (data: any) => {
      setJobHistory(prev => prev.map(job =>
        job.id === data.jobId
          ? { ...job, status: 'cancelled' as const, updatedAt: data.timestamp }
          : job
      ));
    });

    return () => {
      fileProcessingService.disconnect();
    };
  }, [token, fileProcessingService]);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [status, history] = await Promise.all([
        fileProcessingService.getQueueStatus(),
        fileProcessingService.getJobHistory(50)
      ]);

      setQueueStatus(status);
      setJobHistory(history);
      setCurrentJob(status.currentJob ? {
        id: status.currentJob.id,
        fileName: status.currentJob.fileName,
        wardNumber: status.currentJob.wardNumber,
        status: status.currentJob.status as 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled',
        progress: status.currentJob.progress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        filePath: '',
        fileSize: 0
      } : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      console.error('Error refreshing file processing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fileProcessingService]);

  const uploadFile = useCallback(async (file: File, wardNumber?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const validation = FileProcessingService.validateExcelFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      await fileProcessingService.uploadFile(file, wardNumber);
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fileProcessingService, refreshData]);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await fileProcessingService.cancelJob(jobId);
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel job';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fileProcessingService, refreshData]);

  const downloadFile = useCallback((jobId: string, fileName: string) => {
    try {
      fileProcessingService.downloadFile(jobId, fileName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
      setError(errorMessage);
      throw err;
    }
  }, [fileProcessingService]);

  const getJobDetails = useCallback(async (jobId: string): Promise<FileProcessingJob> => {
    try {
      setIsLoading(true);
      setError(null);
      
      return await fileProcessingService.getJobDetails(jobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get job details';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fileProcessingService]);

  // Event handler registration methods
  const onFileQueued = useCallback((callback: (data: any) => void) => {
    fileProcessingService.on('file_queued', callback);
    return () => fileProcessingService.off('file_queued', callback);
  }, [fileProcessingService]);

  const onJobStarted = useCallback((callback: (data: any) => void) => {
    fileProcessingService.on('job_started', callback);
    return () => fileProcessingService.off('job_started', callback);
  }, [fileProcessingService]);

  const onJobProgress = useCallback((callback: (data: any) => void) => {
    fileProcessingService.on('job_progress', callback);
    return () => fileProcessingService.off('job_progress', callback);
  }, [fileProcessingService]);

  const onJobCompleted = useCallback((callback: (data: any) => void) => {
    fileProcessingService.on('job_completed', callback);
    return () => fileProcessingService.off('job_completed', callback);
  }, [fileProcessingService]);

  const onJobFailed = useCallback((callback: (data: any) => void) => {
    fileProcessingService.on('job_failed', callback);
    return () => fileProcessingService.off('job_failed', callback);
  }, [fileProcessingService]);

  const onJobCancelled = useCallback((callback: (data: any) => void) => {
    fileProcessingService.on('job_cancelled', callback);
    return () => fileProcessingService.off('job_cancelled', callback);
  }, [fileProcessingService]);

  // Auto-refresh data when connected
  useEffect(() => {
    if (isConnected) {
      refreshData();
    }
  }, [isConnected]); // Remove refreshData from dependencies to prevent infinite loop

  // Additional methods for the new integration
  const downloadProcessedFile = useCallback(async (jobId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/file-processing/download/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `audit_package_${jobId}.zip`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      console.error('Download error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const connectWebSocket = useCallback(() => {
    if (token) {
      fileProcessingService.connect(token);
    }
  }, [token, fileProcessingService]);

  const disconnectWebSocket = useCallback(() => {
    fileProcessingService.disconnect();
  }, [fileProcessingService]);

  return {
    isConnected,
    isLoading,
    error,
    queueStatus,
    jobHistory,
    currentJob,
    jobs: jobHistory || [], // Alias for compatibility
    uploadFile,
    cancelJob,
    downloadFile,
    downloadProcessedFile,
    refreshData,
    getJobDetails,
    connectWebSocket,
    disconnectWebSocket,
    onFileQueued,
    onJobStarted,
    onJobProgress,
    onJobCompleted,
    onJobFailed,
    onJobCancelled
  };
};
