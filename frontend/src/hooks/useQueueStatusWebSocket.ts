import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { devLog, devWarn } from '../utils/logger';

/**
 * Processing stages matching backend ProcessingStage enum
 */
export const ProcessingStage = {
    QUEUED: 'queued',
    STARTING: 'starting',
    READING_FILE: 'reading_file',
    VALIDATING: 'validating',
    IEC_VERIFICATION: 'iec_verification',
    DATABASE_OPERATIONS: 'database_operations',
    GENERATING_REPORT: 'generating_report',
    COMPLETED: 'completed',
    FAILED: 'failed'
} as const;

export type ProcessingStage = typeof ProcessingStage[keyof typeof ProcessingStage];

/**
 * Queue position information for a single job
 */
export interface QueuePositionInfo {
    job_id: string;
    position: number;
    total_in_queue: number;
    estimated_wait_minutes: number;
    estimated_start_time: string;
    priority: number;
    status: 'waiting' | 'active' | 'completed' | 'failed';
    stage: ProcessingStage;
    stage_info: { label: string; color: string; icon: string };
    progress: number;
    message: string;
    file_name: string;
    uploaded_at: string;
    jobs_ahead: number;
}

/**
 * Queue dashboard status
 */
export interface QueueDashboardStatus {
    queue_stats: {
        total_waiting: number;
        total_active: number;
        total_completed_today: number;
        total_failed_today: number;
        avg_processing_time_minutes: number;
        current_concurrency: number;
        max_concurrency: number;
    };
    user_jobs: QueuePositionInfo[];
    all_waiting_jobs: QueuePositionInfo[];
    active_job: QueuePositionInfo | null;
    system_message: string | null;
    timestamp?: string;
}

/**
 * Job queued notification
 */
export interface JobQueuedNotification {
    job_id: string;
    position: number;
    message: string;
    notification_type: 'queued';
    file_name: string;
    estimated_wait_minutes: number;
}

/**
 * Job started notification
 */
export interface JobStartedNotification {
    job_id: string;
    file_name: string;
    stage: ProcessingStage;
    stage_info: { label: string; color: string; icon: string };
    message: string;
    notification_type: 'started';
}

/**
 * Processing stage update
 */
export interface ProcessingStageUpdate {
    job_id: string;
    stage: ProcessingStage;
    stage_info: { label: string; color: string; icon: string };
    progress: number;
    message: string;
}

/**
 * Job completed notification
 */
export interface JobCompletedNotification {
    job_id: string;
    file_name: string;
    stage: ProcessingStage;
    stage_info: { label: string; color: string; icon: string };
    stats: { inserts: number; updates: number; failures: number };
    message: string;
    notification_type: 'completed';
}

/**
 * Job failed notification
 */
export interface JobFailedNotification {
    job_id: string;
    file_name: string;
    stage: ProcessingStage;
    stage_info: { label: string; color: string; icon: string };
    error: string;
    message: string;
    notification_type: 'failed';
}

interface UseQueueStatusWebSocketOptions {
    onJobQueued?: (data: JobQueuedNotification) => void;
    onJobStarted?: (data: JobStartedNotification) => void;
    onStageUpdate?: (data: ProcessingStageUpdate) => void;
    onJobCompleted?: (data: JobCompletedNotification) => void;
    onJobFailed?: (data: JobFailedNotification) => void;
    onPositionUpdate?: (data: QueuePositionInfo) => void;
    onDashboardUpdate?: (data: QueueDashboardStatus) => void;
}

/**
 * Custom hook for queue status WebSocket connection
 * 
 * Provides real-time updates for:
 * - Queue position changes
 * - Job started/completed/failed notifications
 * - Processing stage updates
 * - Full dashboard updates
 */
export const useQueueStatusWebSocket = (options: UseQueueStatusWebSocketOptions = {}) => {
    const {
        onJobQueued,
        onJobStarted,
        onStageUpdate,
        onJobCompleted,
        onJobFailed,
        onPositionUpdate,
        onDashboardUpdate
    } = options;

    const { token } = useAuth();

    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<QueueDashboardStatus | null>(null);
    const [userJobs, setUserJobs] = useState<QueuePositionInfo[]>([]);

    const socketRef = useRef<Socket | null>(null);
    const callbacksRef = useRef<UseQueueStatusWebSocketOptions>({});

    // Keep callbacks up to date without triggering reconnection
    callbacksRef.current = {
        onJobQueued,
        onJobStarted,
        onStageUpdate,
        onJobCompleted,
        onJobFailed,
        onPositionUpdate,
        onDashboardUpdate
    };

    const connect = useCallback(() => {
        if (!token) {
            devWarn('No auth token available for WebSocket connection');
            return;
        }

        if (socketRef.current?.connected) {
            return;
        }

        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

        const socket = io(wsUrl, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            devLog('🔌 Connected to queue status WebSocket');
            setIsConnected(true);
            setConnectionError(null);

            // Subscribe to queue updates
            socket.emit('subscribe_queue_updates');

            // Request initial dashboard data
            socket.emit('get_queue_dashboard');
            socket.emit('get_user_queue_status');
        });

        socket.on('disconnect', () => {
            devLog('🔌 Disconnected from queue status WebSocket');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('🔌 WebSocket connection error:', error);
            setConnectionError(error.message);
            setIsConnected(false);
        });

        // Queue position update
        socket.on('queue_position_update', (data: QueuePositionInfo) => {
            devLog('📊 Queue position update:', data);
            setUserJobs(prevJobs => {
                const index = prevJobs.findIndex(j => j.job_id === data.job_id);
                if (index >= 0) {
                    const updated = [...prevJobs];
                    updated[index] = data;
                    return updated;
                }
                return [...prevJobs, data];
            });
            callbacksRef.current.onPositionUpdate?.(data);
        });

        // Job queued notification
        socket.on('job_queued', (data: JobQueuedNotification) => {
            devLog('📥 Job queued:', data);
            callbacksRef.current.onJobQueued?.(data);
        });

        // Job started notification
        socket.on('job_started', (data: JobStartedNotification) => {
            devLog('🚀 Job started:', data);
            callbacksRef.current.onJobStarted?.(data);
        });

        // Processing stage update
        socket.on('processing_stage_update', (data: ProcessingStageUpdate) => {
            devLog('📊 Stage update:', data);
            setUserJobs(prevJobs => {
                const index = prevJobs.findIndex(j => j.job_id === data.job_id);
                if (index >= 0) {
                    const updated = [...prevJobs];
                    updated[index] = {
                        ...updated[index],
                        stage: data.stage,
                        stage_info: data.stage_info,
                        progress: data.progress,
                        message: data.message
                    };
                    return updated;
                }
                return prevJobs;
            });
            callbacksRef.current.onStageUpdate?.(data);
        });

        // Job completed notification
        socket.on('job_completed', (data: JobCompletedNotification) => {
            devLog('✅ Job completed:', data);
            callbacksRef.current.onJobCompleted?.(data);
            // Refresh dashboard after completion
            socket.emit('get_queue_dashboard');
        });

        // Job failed notification
        socket.on('job_failed', (data: JobFailedNotification) => {
            devLog('❌ Job failed:', data);
            callbacksRef.current.onJobFailed?.(data);
            // Refresh dashboard after failure
            socket.emit('get_queue_dashboard');
        });

        // Queue dashboard update
        socket.on('queue_dashboard', (data: QueueDashboardStatus) => {
            devLog('📊 Queue dashboard update:', data);
            setDashboard(data);
            if (data.user_jobs) {
                setUserJobs(data.user_jobs);
            }
            callbacksRef.current.onDashboardUpdate?.(data);
        });

        // User queue status update
        socket.on('user_queue_status', (data: { jobs: QueuePositionInfo[] }) => {
            devLog('📊 User queue status:', data);
            setUserJobs(data.jobs);
        });

        socketRef.current = socket;
    }, [token]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.emit('unsubscribe_queue_updates');
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    }, []);

    // Request fresh dashboard data
    const refreshDashboard = useCallback(() => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('get_queue_dashboard');
            socketRef.current.emit('get_user_queue_status');
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // Periodic refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (isConnected) {
                refreshDashboard();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isConnected, refreshDashboard]);

    return {
        isConnected,
        connectionError,
        dashboard,
        userJobs,
        connect,
        disconnect,
        refreshDashboard,
    };
};
