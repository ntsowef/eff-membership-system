/**
 * React Hook Example for Bulk Upload WebSocket
 * 
 * This is an example React hook that can be used in the frontend
 * to connect to the WebSocket server and receive real-time progress updates.
 * 
 * Copy this to your frontend project and customize as needed.
 */

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface BulkUploadProgress {
  job_id: string;
  stage: string;
  progress: number;
  message: string;
  status: string;
  timestamp: string;
}

interface BulkUploadComplete {
  job_id: string;
  status: string;
  validation_stats: any;
  database_stats: any;
  report_path: string;
  processing_duration_ms: number;
  timestamp: string;
}

interface BulkUploadFailed {
  job_id: string;
  error: string;
  stage?: string;
  status: string;
  timestamp: string;
}

interface UseBulkUploadWebSocketProps {
  token: string | null;
  jobId?: string;
  onProgress?: (data: BulkUploadProgress) => void;
  onComplete?: (data: BulkUploadComplete) => void;
  onFailed?: (data: BulkUploadFailed) => void;
}

/**
 * Custom hook for bulk upload WebSocket connection
 */
export function useBulkUploadWebSocket({
  token,
  jobId,
  onProgress,
  onComplete,
  onFailed
}: UseBulkUploadWebSocketProps) {
  const socketRef = useRef<Socket | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

    console.log('🔌 Connecting to WebSocket server...');

    const socket = io(wsUrl, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');

      // Subscribe to job if jobId is provided
      if (jobId) {
        socket.emit('subscribe_bulk_upload_job', { job_id: jobId });
        console.log(`📡 Subscribed to job: ${jobId}`);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    // Bulk upload events
    socket.on('bulk_upload_progress', (data: BulkUploadProgress) => {
      console.log('📊 Progress update:', data);
      onProgress?.(data);
    });

    socket.on('bulk_upload_complete', (data: BulkUploadComplete) => {
      console.log('✅ Upload complete:', data);
      onComplete?.(data);
    });

    socket.on('bulk_upload_failed', (data: BulkUploadFailed) => {
      console.error('❌ Upload failed:', data);
      onFailed?.(data);
    });

  }, [token, jobId, onProgress, onComplete, onFailed]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting from WebSocket...');
      
      // Unsubscribe from job if jobId is provided
      if (jobId) {
        socketRef.current.emit('unsubscribe_bulk_upload_job', { job_id: jobId });
      }

      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [jobId]);

  // Subscribe to a specific job
  const subscribeToJob = useCallback((newJobId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe_bulk_upload_job', { job_id: newJobId });
      console.log(`📡 Subscribed to job: ${newJobId}`);
    }
  }, []);

  // Unsubscribe from a specific job
  const unsubscribeFromJob = useCallback((oldJobId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe_bulk_upload_job', { job_id: oldJobId });
      console.log(`📡 Unsubscribed from job: ${oldJobId}`);
    }
  }, []);

  // Auto-connect and disconnect
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    subscribeToJob,
    unsubscribeFromJob
  };
}

