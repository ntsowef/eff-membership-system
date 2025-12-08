import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { devLog, devWarn } from '../utils/logger';

interface BulkUploadProgress {
  file_id: number;
  status: string;
  progress: number;
  rows_processed: number;
  rows_total: number;
  message?: string;
  stage?: string; // Processing stage: initialization, file_reading, validation, iec_verification, database_operations, report_generation, completion
  timestamp: string;
}

interface BulkUploadComplete {
  file_id: number;
  rows_success: number;
  rows_failed: number;
  rows_total: number;
  errors?: any[];
  timestamp: string;
}

interface BulkUploadError {
  file_id: number;
  error: string;
  timestamp: string;
}

interface IECRateLimitWarning {
  file_id: number;
  current_count: number;
  max_limit: number;
  remaining: number;
  percentage_used: number;
  timestamp: string;
}

interface IECRateLimitExceeded {
  file_id: number;
  current_count: number;
  max_limit: number;
  reset_time: number;
  rows_processed: number;
  rows_total: number;
  message: string;
  timestamp: string;
}

interface UseBulkUploadWebSocketOptions {
  fileId?: number;
  onProgress?: (data: BulkUploadProgress) => void;
  onComplete?: (data: BulkUploadComplete) => void;
  onError?: (data: BulkUploadError) => void;
  onRateLimitWarning?: (data: IECRateLimitWarning) => void;
  onRateLimitExceeded?: (data: IECRateLimitExceeded) => void;
}

export const useBulkUploadWebSocket = (options: UseBulkUploadWebSocketOptions = {}) => {
  const { fileId, onProgress, onComplete, onError, onRateLimitWarning, onRateLimitExceeded } = options;
  const { token } = useAuth();

  // State - maintain same hook order as before
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Refs - socket and callbacks
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<UseBulkUploadWebSocketOptions>({});

  // Keep callbacks up to date without triggering reconnection
  callbacksRef.current = { onProgress, onComplete, onError, onRateLimitWarning, onRateLimitExceeded };

  const connect = useCallback(() => {
    if (!token) {
      devWarn('No auth token available for WebSocket connection');
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    // Get WebSocket URL from environment or use default
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

    const socket = io(wsUrl, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      devLog('🔌 Connected to bulk upload WebSocket');
      setIsConnected(true);
      setConnectionError(null);

      // Subscribe to bulk upload updates
      if (fileId) {
        socket.emit('subscribe_bulk_upload', { file_id: fileId });
      } else {
        socket.emit('subscribe_bulk_upload', {});
      }
    });

    socket.on('disconnect', () => {
      devLog('🔌 Disconnected from bulk upload WebSocket');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Use refs for callbacks to get latest callback without causing reconnects
    socket.on('bulk_upload_progress', (data: BulkUploadProgress) => {
      devLog('Bulk upload progress:', data);
      callbacksRef.current.onProgress?.(data);
    });

    socket.on('bulk_upload_complete', (data: BulkUploadComplete) => {
      devLog('✅ Bulk upload complete:', data);
      callbacksRef.current.onComplete?.(data);
    });

    socket.on('bulk_upload_error', (data: BulkUploadError) => {
      console.error('❌ Bulk upload error:', data);
      callbacksRef.current.onError?.(data);
    });

    socket.on('iec_rate_limit_warning', (data: IECRateLimitWarning) => {
      devWarn('⚠️ IEC API rate limit warning:', data);
      callbacksRef.current.onRateLimitWarning?.(data);
    });

    socket.on('iec_rate_limit_exceeded', (data: IECRateLimitExceeded) => {
      console.error('🚫 IEC API rate limit exceeded:', data);
      callbacksRef.current.onRateLimitExceeded?.(data);
    });

    socketRef.current = socket;
  }, [token, fileId]); // Only reconnect when token or fileId changes

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Unsubscribe before disconnecting
      if (fileId) {
        socketRef.current.emit('unsubscribe_bulk_upload', { file_id: fileId });
      } else {
        socketRef.current.emit('unsubscribe_bulk_upload', {});
      }

      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [fileId]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
  };
};

