/**
 * Bulk Upload Queue Service
 * 
 * Manages Bull job queue for async bulk upload processing with:
 * - Controlled concurrency
 * - Automatic retry mechanism
 * - Priority-based processing
 * - Job monitoring and status tracking
 * - WebSocket integration for real-time updates
 */

import Bull, { Queue, Job, JobOptions } from 'bull';
import { WebSocketService } from '../websocketService';

// Job data interface
export interface BulkUploadJobData {
  jobId: string;
  filePath: string;
  fileName: string;
  uploadedBy: string;
  userId: string;
  userRole?: string;
  fileId?: number; // Optional: ID from uploaded_files table for status sync
}

// Queue configuration
interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  settings: {
    maxStalledCount: number;
    stalledInterval: number;
    lockDuration: number;
  };
  defaultJobOptions: JobOptions;
}

// Get queue configuration from environment
const getQueueConfig = (): QueueConfig => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  settings: {
    maxStalledCount: 3, // Retry stalled jobs 3 times
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    lockDuration: 600000, // Lock jobs for 10 minutes (bulk uploads can take time)
  },
  defaultJobOptions: {
    attempts: 2, // Retry failed jobs once (bulk uploads are expensive)
    backoff: {
      type: 'exponential',
      delay: 10000, // Start with 10 second delay, then 20s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs for debugging
    timeout: 600000, // 10 minute timeout per job
  },
});

// Queue instance
let bulkUploadQueue: Queue<BulkUploadJobData> | null = null;

/**
 * Initialize the bulk upload queue
 */
export const initializeBulkUploadQueue = (): Queue<BulkUploadJobData> => {
  if (bulkUploadQueue) {
    return bulkUploadQueue;
  }

  const queueConfig = getQueueConfig();

  bulkUploadQueue = new Bull<BulkUploadJobData>('bulk-uploads', {
    redis: queueConfig.redis,
    settings: queueConfig.settings,
    defaultJobOptions: queueConfig.defaultJobOptions,
  });

  // Queue event listeners for monitoring
  bulkUploadQueue.on('error', (error) => {
    console.error('❌ Bulk upload queue error:', error);
  });

  bulkUploadQueue.on('waiting', (jobId) => {
    console.log(`⏳ Bulk upload job ${jobId} is waiting to be processed`);
  });

  bulkUploadQueue.on('active', (job) => {
    console.log(`🔄 Processing bulk upload job ${job.id}: ${job.data.fileName}`);
    
    // Send WebSocket notification
    WebSocketService.sendBulkUploadProgress(job.data.jobId, {
      progress: 0,
      rows_processed: 0,
      rows_total: 0,
      message: 'Job started processing',
      status: 'processing'
    });
  });

  bulkUploadQueue.on('completed', (job, result) => {
    console.log(`✅ Bulk upload job ${job.id} completed successfully`);
    console.log(`   File: ${job.data.fileName}`);
    console.log(`   Duration: ${result.processing_duration_ms}ms`);
  });

  bulkUploadQueue.on('failed', (job, error) => {
    console.error(`❌ Bulk upload job ${job?.id} failed:`, error.message);
    if (job) {
      console.error(`   File: ${job.data.fileName}`);
      console.error(`   Attempt: ${job.attemptsMade}/${job.opts.attempts}`);
      
      // Send WebSocket failure notification
      WebSocketService.sendBulkUploadFailed(job.data.jobId, job.data.userId, {
        error: error.message,
        stage: 'processing'
      });
    }
  });

  bulkUploadQueue.on('stalled', (job) => {
    console.warn(`⚠️ Bulk upload job ${job.id} has stalled`);
  });

  bulkUploadQueue.on('progress', (job, progress) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
  });

  console.log('✅ Bulk upload queue initialized');
  return bulkUploadQueue;
};

/**
 * Get the bulk upload queue instance
 */
export const getBulkUploadQueue = (): Queue<BulkUploadJobData> => {
  if (!bulkUploadQueue) {
    return initializeBulkUploadQueue();
  }
  return bulkUploadQueue;
};

/**
 * Add a bulk upload job to the queue
 */
export const addBulkUploadJob = async (
  jobData: BulkUploadJobData,
  priority: number = 10
): Promise<Job<BulkUploadJobData>> => {
  const queue = getBulkUploadQueue();

  // Determine priority based on user role
  let jobPriority = priority;
  if (jobData.userRole === 'super_admin') {
    jobPriority = 1; // Highest priority
  } else if (jobData.userRole === 'national_admin') {
    jobPriority = 3;
  } else if (jobData.userRole === 'province_admin') {
    jobPriority = 5;
  } else if (jobData.userRole === 'municipality_admin') {
    jobPriority = 10;
  }

  const job = await queue.add(jobData, {
    priority: jobPriority,
    jobId: jobData.jobId, // Use jobId for easy tracking
  });

  console.log(`📥 Added bulk upload job to queue: ${jobData.jobId}`);
  console.log(`   File: ${jobData.fileName}`);
  console.log(`   Priority: ${jobPriority}`);
  console.log(`   User: ${jobData.uploadedBy}`);

  return job;
};

/**
 * Get job status by jobId
 */
export const getBulkUploadJobStatus = async (jobId: string): Promise<any> => {
  const queue = getBulkUploadQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  const progress = job.progress();
  const failedReason = job.failedReason;

  return {
    jobId: job.id,
    status: state,
    progress,
    failedReason,
    attemptsMade: job.attemptsMade,
    data: job.data,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    timestamp: job.timestamp,
  };
};

/**
 * Cancel a job by jobId
 */
export const cancelBulkUploadJob = async (jobId: string): Promise<boolean> => {
  const queue = getBulkUploadQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  const state = await job.getState();

  // Can only cancel waiting or delayed jobs
  if (state === 'waiting' || state === 'delayed') {
    await job.remove();
    console.log(`🚫 Cancelled bulk upload job: ${jobId}`);
    return true;
  }

  // Cannot cancel active or completed jobs
  console.warn(`⚠️ Cannot cancel job ${jobId} in state: ${state}`);
  return false;
};

/**
 * Retry a failed job
 */
export const retryBulkUploadJob = async (jobId: string): Promise<boolean> => {
  const queue = getBulkUploadQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  const state = await job.getState();

  if (state === 'failed') {
    await job.retry();
    console.log(`🔄 Retrying bulk upload job: ${jobId}`);
    return true;
  }

  console.warn(`⚠️ Cannot retry job ${jobId} in state: ${state}`);
  return false;
};

/**
 * Get queue statistics
 */
export const getBulkUploadQueueStats = async (): Promise<any> => {
  const queue = getBulkUploadQueue();

  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + completed + failed + delayed,
  };
};

/**
 * Get recent jobs (last N jobs)
 */
export const getRecentBulkUploadJobs = async (limit: number = 20): Promise<any[]> => {
  const queue = getBulkUploadQueue();

  const [completed, failed, active, waiting] = await Promise.all([
    queue.getCompleted(0, limit / 4),
    queue.getFailed(0, limit / 4),
    queue.getActive(0, limit / 4),
    queue.getWaiting(0, limit / 4),
  ]);

  const allJobs = [...completed, ...failed, ...active, ...waiting];

  return Promise.all(
    allJobs.map(async (job) => ({
      jobId: job.id,
      fileName: job.data.fileName,
      uploadedBy: job.data.uploadedBy,
      status: await job.getState(),
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }))
  );
};

/**
 * Clean old jobs (completed and failed)
 */
export const cleanOldBulkUploadJobs = async (
  gracePeriodMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<{ removedCompleted: number; removedFailed: number }> => {
  const queue = getBulkUploadQueue();

  const [removedCompleted, removedFailed] = await Promise.all([
    queue.clean(gracePeriodMs, 'completed'),
    queue.clean(gracePeriodMs, 'failed'),
  ]);

  console.log(`🧹 Cleaned old bulk upload jobs:`);
  console.log(`   Completed: ${removedCompleted.length}`);
  console.log(`   Failed: ${removedFailed.length}`);

  return {
    removedCompleted: removedCompleted.length,
    removedFailed: removedFailed.length,
  };
};

/**
 * Pause the queue
 */
export const pauseBulkUploadQueue = async (): Promise<void> => {
  const queue = getBulkUploadQueue();
  await queue.pause();
  console.log('⏸️ Bulk upload queue paused');
};

/**
 * Resume the queue
 */
export const resumeBulkUploadQueue = async (): Promise<void> => {
  const queue = getBulkUploadQueue();
  await queue.resume();
  console.log('▶️ Bulk upload queue resumed');
};

/**
 * Close the queue (cleanup on shutdown)
 */
export const closeBulkUploadQueue = async (): Promise<void> => {
  if (bulkUploadQueue) {
    await bulkUploadQueue.close();
    bulkUploadQueue = null;
    console.log('🔒 Bulk upload queue closed');
  }
};

