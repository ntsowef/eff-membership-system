/**
 * Queue Status Service
 * 
 * Provides comprehensive queue position tracking, estimated wait times,
 * and real-time status updates for bulk upload processing.
 * 
 * Key Features:
 * - Queue position tracking for each user's uploads
 * - Estimated wait time calculation based on historical data
 * - Real-time position updates via WebSocket
 * - Priority-based queue ordering (user roles)
 * - Processing stage tracking
 */

import { getBulkUploadQueue, BulkUploadJobData } from './bulkUploadQueueService';
import { getPool } from '../../config/database-hybrid';
import { WebSocketService } from '../websocketService';
import { Job } from 'bull';

// Processing stages for visual indicators
export enum ProcessingStage {
    QUEUED = 'queued',
    STARTING = 'starting',
    READING_FILE = 'reading_file',
    VALIDATING = 'validating',
    IEC_VERIFICATION = 'iec_verification',
    DATABASE_OPERATIONS = 'database_operations',
    GENERATING_REPORT = 'generating_report',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

// Stage display info for frontend
export const STAGE_INFO: Record<ProcessingStage, { label: string; color: string; icon: string }> = {
    [ProcessingStage.QUEUED]: { label: 'Waiting in Queue', color: '#6b7280', icon: '⏳' },
    [ProcessingStage.STARTING]: { label: 'Starting', color: '#3b82f6', icon: '🚀' },
    [ProcessingStage.READING_FILE]: { label: 'Reading File', color: '#8b5cf6', icon: '📄' },
    [ProcessingStage.VALIDATING]: { label: 'Validating Records', color: '#f59e0b', icon: '✅' },
    [ProcessingStage.IEC_VERIFICATION]: { label: 'IEC Verification', color: '#10b981', icon: '🔍' },
    [ProcessingStage.DATABASE_OPERATIONS]: { label: 'Saving to Database', color: '#06b6d4', icon: '💾' },
    [ProcessingStage.GENERATING_REPORT]: { label: 'Generating Report', color: '#ec4899', icon: '📊' },
    [ProcessingStage.COMPLETED]: { label: 'Completed', color: '#22c55e', icon: '✅' },
    [ProcessingStage.FAILED]: { label: 'Failed', color: '#ef4444', icon: '❌' }
};

// Queue position info for a specific job
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

// Full queue status for dashboard
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

// Historical processing data for estimation
interface HistoricalData {
    avg_processing_time_ms: number;
    avg_records_per_file: number;
    processing_time_per_record_ms: number;
}

export class QueueStatusService {
    private static historicalData: HistoricalData | null = null;
    private static lastHistoricalUpdate: number = 0;
    private static readonly HISTORICAL_CACHE_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Get queue position for a specific job
     */
    static async getJobQueuePosition(jobId: string): Promise<QueuePositionInfo | null> {
        try {
            const queue = getBulkUploadQueue();
            const job = await queue.getJob(jobId);

            if (!job) {
                return null;
            }

            const state = await job.getState();
            const waitingJobs = await queue.getWaiting();
            const activeJobs = await queue.getActive();

            // Find position in queue
            let position = 0;
            let jobsAhead = 0;

            if (state === 'waiting') {
                // Sort waiting jobs by priority (lower = higher priority)
                const sortedWaiting = waitingJobs.sort((a, b) =>
                    (a.opts.priority || 10) - (b.opts.priority || 10)
                );

                position = sortedWaiting.findIndex(j => j.id === jobId) + 1;
                jobsAhead = position - 1;
            } else if (state === 'active') {
                position = 0; // Currently processing
                jobsAhead = 0;
            }

            // Calculate estimated wait time
            const historical = await this.getHistoricalData();
            const estimatedWaitMinutes = jobsAhead * (historical.avg_processing_time_ms / 60000);
            const estimatedStartTime = new Date(Date.now() + estimatedWaitMinutes * 60000);

            // Determine stage
            let stage: ProcessingStage;
            let progress = 0;
            let message = '';

            if (state === 'waiting') {
                stage = ProcessingStage.QUEUED;
                message = `Your file is #${position} in queue`;
            } else if (state === 'active') {
                // Try to get current stage from job data
                const jobData = job.data as any;
                stage = jobData.currentStage || ProcessingStage.STARTING;
                progress = job.progress() as number || 0;
                message = jobData.currentMessage || 'Processing...';
            } else if (state === 'completed') {
                stage = ProcessingStage.COMPLETED;
                progress = 100;
                message = 'Processing completed successfully';
            } else {
                stage = ProcessingStage.FAILED;
                progress = 0;
                message = job.failedReason || 'Processing failed';
            }

            return {
                job_id: jobId,
                position,
                total_in_queue: waitingJobs.length,
                estimated_wait_minutes: Math.round(estimatedWaitMinutes),
                estimated_start_time: estimatedStartTime.toISOString(),
                priority: job.opts.priority || 10,
                status: state as any,
                stage,
                stage_info: STAGE_INFO[stage],
                progress,
                message,
                file_name: job.data.fileName,
                uploaded_at: new Date(job.timestamp).toISOString(),
                jobs_ahead: jobsAhead
            };
        } catch (error) {
            console.error('Error getting job queue position:', error);
            return null;
        }
    }

    /**
     * Get all jobs for a specific user
     */
    static async getUserJobs(userId: string): Promise<QueuePositionInfo[]> {
        try {
            const queue = getBulkUploadQueue();
            const [waiting, active, completed, failed] = await Promise.all([
                queue.getWaiting(),
                queue.getActive(),
                queue.getCompleted(0, 20),
                queue.getFailed(0, 10)
            ]);

            const allJobs = [...waiting, ...active, ...completed, ...failed];
            const userJobs = allJobs.filter(job => job.data.userId === userId);

            const positions = await Promise.all(
                userJobs.map(job => this.getJobQueuePosition(job.id as string))
            );

            return positions.filter((p): p is QueuePositionInfo => p !== null);
        } catch (error) {
            console.error('Error getting user jobs:', error);
            return [];
        }
    }

    /**
     * Get full queue dashboard status
     */
    static async getQueueDashboardStatus(userId?: string): Promise<QueueDashboardStatus> {
        try {
            const queue = getBulkUploadQueue();
            const [waiting, active, completedToday, failedToday] = await Promise.all([
                queue.getWaiting(),
                queue.getActive(),
                queue.getCompleted(0, 100),
                queue.getFailed(0, 100)
            ]);

            // Filter completed/failed to today only
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const completedTodayCount = completedToday.filter(
                j => j.finishedOn && j.finishedOn >= todayStart.getTime()
            ).length;

            const failedTodayCount = failedToday.filter(
                j => j.finishedOn && j.finishedOn >= todayStart.getTime()
            ).length;

            // Get historical data for estimations
            const historical = await this.getHistoricalData();

            // Get waiting jobs with positions
            const waitingPositions = await Promise.all(
                waiting.slice(0, 20).map(job => this.getJobQueuePosition(job.id as string))
            );

            // Get user-specific jobs if userId provided
            let userJobs: QueuePositionInfo[] = [];
            if (userId) {
                userJobs = await this.getUserJobs(userId);
            }

            // Get active job info
            let activeJob: QueuePositionInfo | null = null;
            if (active.length > 0) {
                activeJob = await this.getJobQueuePosition(active[0].id as string);
            }

            // System message (e.g., rate limit warning)
            let systemMessage: string | null = null;
            if (waiting.length > 5) {
                systemMessage = `High queue volume: ${waiting.length} files waiting. Processing time may be longer than usual.`;
            }

            return {
                queue_stats: {
                    total_waiting: waiting.length,
                    total_active: active.length,
                    total_completed_today: completedTodayCount,
                    total_failed_today: failedTodayCount,
                    avg_processing_time_minutes: Math.round(historical.avg_processing_time_ms / 60000),
                    current_concurrency: active.length,
                    max_concurrency: 1 // Currently limited to 1 for safety
                },
                user_jobs: userJobs,
                all_waiting_jobs: waitingPositions.filter((p): p is QueuePositionInfo => p !== null),
                active_job: activeJob,
                system_message: systemMessage
            };
        } catch (error) {
            console.error('Error getting queue dashboard status:', error);
            return {
                queue_stats: {
                    total_waiting: 0,
                    total_active: 0,
                    total_completed_today: 0,
                    total_failed_today: 0,
                    avg_processing_time_minutes: 5,
                    current_concurrency: 0,
                    max_concurrency: 1
                },
                user_jobs: [],
                all_waiting_jobs: [],
                active_job: null,
                system_message: 'Unable to retrieve queue status'
            };
        }
    }

    /**
     * Get historical processing data for time estimation
     */
    static async getHistoricalData(): Promise<HistoricalData> {
        // Return cached data if fresh
        if (this.historicalData && Date.now() - this.lastHistoricalUpdate < this.HISTORICAL_CACHE_MS) {
            return this.historicalData;
        }

        try {
            const pool = getPool();
            const result = await pool.query(`
        SELECT 
          AVG(processing_duration_ms) as avg_processing_time_ms,
          AVG((validation_stats->>'total_records')::int) as avg_records_per_file
        FROM bulk_upload_jobs
        WHERE status = 'completed'
          AND processing_duration_ms IS NOT NULL
          AND uploaded_at > NOW() - INTERVAL '7 days'
      `);

            const row = result.rows[0];
            const avgProcessingTime = parseFloat(row.avg_processing_time_ms) || 300000; // Default 5 minutes
            const avgRecords = parseFloat(row.avg_records_per_file) || 500;

            this.historicalData = {
                avg_processing_time_ms: avgProcessingTime,
                avg_records_per_file: avgRecords,
                processing_time_per_record_ms: avgProcessingTime / avgRecords
            };
            this.lastHistoricalUpdate = Date.now();

            return this.historicalData;
        } catch (error) {
            console.error('Error getting historical data:', error);
            return {
                avg_processing_time_ms: 300000,
                avg_records_per_file: 500,
                processing_time_per_record_ms: 600
            };
        }
    }

    /**
     * Notify user when their queue position changes
     */
    static async notifyQueuePositionChange(jobId: string, userId: string): Promise<void> {
        const position = await this.getJobQueuePosition(jobId);
        if (position) {
            WebSocketService.sendToUser(userId, 'queue_position_update', position);
        }
    }

    /**
     * Notify all waiting users about queue changes
     */
    static async notifyAllQueueChanges(): Promise<void> {
        try {
            const queue = getBulkUploadQueue();
            const waiting = await queue.getWaiting();

            for (const job of waiting) {
                const position = await this.getJobQueuePosition(job.id as string);
                if (position) {
                    WebSocketService.sendToUser(job.data.userId, 'queue_position_update', position);
                }
            }
        } catch (error) {
            console.error('Error notifying queue changes:', error);
        }
    }

    /**
     * Send job queued notification
     */
    static async sendJobQueuedNotification(job: Job<BulkUploadJobData>): Promise<void> {
        const position = await this.getJobQueuePosition(job.id as string);
        if (position) {
            WebSocketService.sendToUser(job.data.userId, 'job_queued', {
                ...position,
                message: `Your file "${job.data.fileName}" has been queued at position #${position.position}`,
                notification_type: 'queued'
            });
        }
    }

    /**
     * Send job started notification
     */
    static sendJobStartedNotification(jobId: string, userId: string, fileName: string): void {
        WebSocketService.sendToUser(userId, 'job_started', {
            job_id: jobId,
            file_name: fileName,
            stage: ProcessingStage.STARTING,
            stage_info: STAGE_INFO[ProcessingStage.STARTING],
            message: `Processing of "${fileName}" has started`,
            notification_type: 'started'
        });
    }

    /**
     * Send processing stage update
     */
    static sendStageUpdate(
        jobId: string,
        userId: string,
        stage: ProcessingStage,
        progress: number,
        message: string
    ): void {
        WebSocketService.sendToUser(userId, 'processing_stage_update', {
            job_id: jobId,
            stage,
            stage_info: STAGE_INFO[stage],
            progress,
            message
        });
    }

    /**
     * Send job completed notification
     */
    static sendJobCompletedNotification(
        jobId: string,
        userId: string,
        fileName: string,
        stats: { inserts: number; updates: number; failures: number }
    ): void {
        WebSocketService.sendToUser(userId, 'job_completed', {
            job_id: jobId,
            file_name: fileName,
            stage: ProcessingStage.COMPLETED,
            stage_info: STAGE_INFO[ProcessingStage.COMPLETED],
            stats,
            message: `Processing of "${fileName}" completed: ${stats.inserts} inserts, ${stats.updates} updates, ${stats.failures} failures`,
            notification_type: 'completed'
        });

        // Notify other waiting users that their position may have changed
        this.notifyAllQueueChanges();
    }

    /**
     * Send job failed notification
     */
    static sendJobFailedNotification(jobId: string, userId: string, fileName: string, error: string): void {
        WebSocketService.sendToUser(userId, 'job_failed', {
            job_id: jobId,
            file_name: fileName,
            stage: ProcessingStage.FAILED,
            stage_info: STAGE_INFO[ProcessingStage.FAILED],
            error,
            message: `Processing of "${fileName}" failed: ${error}`,
            notification_type: 'failed'
        });

        // Notify other waiting users that their position may have changed
        this.notifyAllQueueChanges();
    }

    /**
     * Get priority label based on user role
     */
    static getPriorityLabel(priority: number): string {
        if (priority <= 1) return 'Highest (Super Admin)';
        if (priority <= 3) return 'High (National Admin)';
        if (priority <= 5) return 'Medium (Province Admin)';
        if (priority <= 10) return 'Normal';
        return 'Low';
    }

    /**
     * Format estimated time for display
     */
    static formatEstimatedTime(minutes: number): string {
        if (minutes < 1) return 'Less than a minute';
        if (minutes === 1) return '1 minute';
        if (minutes < 60) return `${minutes} minutes`;

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (remainingMinutes === 0) {
            return hours === 1 ? '1 hour' : `${hours} hours`;
        }

        return `${hours}h ${remainingMinutes}m`;
    }
}
