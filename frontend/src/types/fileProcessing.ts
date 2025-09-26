export interface FileProcessingJob {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  wardNumber?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  result?: FileProcessingResult;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userId?: number;
  user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
}

export interface FileProcessingResult {
  success: boolean;
  statistics: {
    total_members: number;
    registered_voters: number;
    not_registered: number;
    deceased: number;
    not_in_ward: number;
    processing_time: number;
  };
  output_files: string[];
}

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  isEmpty: boolean;
  status: 'idle' | 'processing' | 'queued';
  currentJob: {
    id: string;
    fileName: string;
    wardNumber?: number;
    status: string;
    progress: number;
    userId?: number;
  } | null;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  jobId: string;
  fileName: string;
  fileSize: number;
}

export interface WebSocketMessage {
  type: 'job_update' | 'queue_status' | 'job_completed' | 'job_failed' | 'job_progress';
  data: any;
}

export interface FileProcessingHookState {
  jobs: FileProcessingJob[];
  currentJob: FileProcessingJob | null;
  queueStatus: QueueStatus;
  isConnected: boolean;
  error: string | null;
}
