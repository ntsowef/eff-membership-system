import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Queue Position Information
 */
export interface QueuePositionInfo {
    job_id: string;
    position: number;
    total_in_queue: number;
    estimated_wait_minutes: number;
    estimated_start_time: string;
    priority: number;
    status: 'waiting' | 'active' | 'completed' | 'failed';
    stage: string;
    stage_info: { label: string; color: string; icon: string };
    progress: number;
    message: string;
    file_name: string;
    uploaded_at: string;
    jobs_ahead: number;
}

/**
 * Queue Dashboard Status
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
}

/**
 * User Queue Status Response
 */
export interface UserQueueStatusResponse {
    user_id: string;
    jobs: QueuePositionInfo[];
    total_jobs: number;
    waiting_jobs: number;
    active_jobs: number;
    completed_jobs: number;
}

/**
 * Processing Stage Info
 */
export interface ProcessingStageInfo {
    stage: string;
    label: string;
    color: string;
    icon: string;
}

/**
 * Queue Status Service
 * 
 * Provides API methods for fetching queue status information
 */
export const queueStatusService = {
    /**
     * Get queue position for a specific job
     */
    async getJobQueuePosition(jobId: string, token: string): Promise<QueuePositionInfo> {
        const response = await axios.get(
            `${API_BASE_URL}/bulk-upload/queue/position/${jobId}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data.data;
    },

    /**
     * Get queue status for the authenticated user's jobs
     */
    async getUserQueueStatus(token: string): Promise<UserQueueStatusResponse> {
        const response = await axios.get(
            `${API_BASE_URL}/bulk-upload/queue/user-status`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data.data;
    },

    /**
     * Get full queue dashboard status
     */
    async getQueueDashboard(token: string): Promise<QueueDashboardStatus> {
        const response = await axios.get(
            `${API_BASE_URL}/bulk-upload/queue/dashboard`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data.data;
    },

    /**
     * Get processing stage information
     */
    async getProcessingStages(token: string): Promise<{
        stages: ProcessingStageInfo[];
        stage_order: string[];
    }> {
        const response = await axios.get(
            `${API_BASE_URL}/bulk-upload/queue/stages`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data.data;
    },

    /**
     * Get queue statistics
     */
    async getQueueStats(token: string): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: number;
        total: number;
    }> {
        const response = await axios.get(
            `${API_BASE_URL}/bulk-upload/queue/stats`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data.data;
    },

    /**
     * Check if uploads are currently allowed
     */
    async canUpload(token: string): Promise<{
        can_upload: boolean;
        reason: string | null;
        reset_time: number | null;
    }> {
        const response = await axios.get(
            `${API_BASE_URL}/bulk-upload/can-upload`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data.data;
    },

    /**
     * Get IEC API rate limit status
     */
    async getRateLimitStatus(token: string): Promise<{
        is_limited: boolean;
        uploads_allowed: boolean;
        current_count: number;
        max_limit: number;
        remaining: number;
        reset_time: number;
        reset_time_formatted: string;
        message: string;
    }> {
        const response = await axios.get(
            `${API_BASE_URL}/bulk-upload/rate-limit-status`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data.data;
    }
};

export default queueStatusService;
