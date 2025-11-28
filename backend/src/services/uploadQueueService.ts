import Bull, { Queue, Job, JobOptions } from 'bull';

/**
 * Upload Queue Service - Manages Bull job queues for file upload processing
 * 
 * This service provides:
 * - File upload processing queue with controlled concurrency
 * - Automatic retry mechanism for failed jobs
 * - Priority-based job processing
 * - Job monitoring and status tracking
 */

// Queue configuration interface
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
    lockDuration: 300000, // Lock jobs for 5 minutes
  },
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay, then 10s, 20s
    },
    removeOnComplete: false, // Keep completed jobs for monitoring
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

// Queue instances
let uploadQueue: Queue | null = null;
let renewalQueue: Queue | null = null;

/**
 * Initialize the upload queue
 */
export const initializeUploadQueue = (): Queue => {
  if (uploadQueue) {
    return uploadQueue;
  }

  const queueConfig = getQueueConfig();

  uploadQueue = new Bull('file-uploads', {
    redis: queueConfig.redis,
    settings: queueConfig.settings,
    defaultJobOptions: queueConfig.defaultJobOptions,
  });

  // Queue event listeners for monitoring
  uploadQueue.on('error', (error) => {
    console.error('❌ Upload queue error:', error);
  });

  uploadQueue.on('waiting', (jobId) => {
    console.log(`⏳ Job ${jobId} is waiting to be processed`);
  });

  uploadQueue.on('active', (job) => {
    console.log(`🔄 Processing job ${job.id}: ${job.data.upload_uuid}`);
  });

  uploadQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  uploadQueue.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  });

  uploadQueue.on('stalled', (job) => {
    console.warn(`⚠️  Job ${job.id} has stalled`);
  });

  console.log('✅ Upload queue initialized successfully');
  return uploadQueue;
};

/**
 * Initialize the renewal queue
 */
export const initializeRenewalQueue = (): Queue => {
  if (renewalQueue) {
    return renewalQueue;
  }

  const queueConfig = getQueueConfig();

  renewalQueue = new Bull('renewal-uploads', {
    redis: queueConfig.redis,
    settings: queueConfig.settings,
    defaultJobOptions: queueConfig.defaultJobOptions,
  });

  // Queue event listeners
  renewalQueue.on('error', (error) => {
    console.error('❌ Renewal queue error:', error);
  });

  renewalQueue.on('active', (job) => {
    console.log(`🔄 Processing renewal job ${job.id}: ${job.data.upload_uuid}`);
  });

  renewalQueue.on('completed', (job) => {
    console.log(`✅ Renewal job ${job.id} completed successfully`);
  });

  renewalQueue.on('failed', (job, error) => {
    console.error(`❌ Renewal job ${job?.id} failed:`, error.message);
  });

  console.log('✅ Renewal queue initialized successfully');
  return renewalQueue;
};

/**
 * Get the upload queue instance
 */
export const getUploadQueue = (): Queue => {
  if (!uploadQueue) {
    return initializeUploadQueue();
  }
  return uploadQueue;
};

/**
 * Get the renewal queue instance
 */
export const getRenewalQueue = (): Queue => {
  if (!renewalQueue) {
    return initializeRenewalQueue();
  }
  return renewalQueue;
};

/**
 * Add a file upload job to the queue
 */
export const addUploadJob = async (
  upload_uuid: string,
  priority: number = 10,
  userRole?: string
): Promise<Job> => {
  const queue = getUploadQueue();

  // Determine priority based on user role
  let jobPriority = priority;
  if (userRole === 'super_admin') {
    jobPriority = 1; // Highest priority
  } else if (userRole === 'province_admin') {
    jobPriority = 5;
  } else if (userRole === 'municipality_admin') {
    jobPriority = 10;
  }

  const job = await queue.add(
    { upload_uuid },
    {
      priority: jobPriority,
      jobId: upload_uuid, // Use upload_uuid as job ID for easy tracking
    }
  );

  console.log(`📥 Added upload job to queue: ${upload_uuid} (priority: ${jobPriority})`);
  return job;
};

/**
 * Add a renewal upload job to the queue
 */
export const addRenewalJob = async (
  upload_uuid: string,
  priority: number = 10,
  userRole?: string
): Promise<Job> => {
  const queue = getRenewalQueue();

  // Determine priority based on user role
  let jobPriority = priority;
  if (userRole === 'super_admin') {
    jobPriority = 1;
  } else if (userRole === 'province_admin') {
    jobPriority = 5;
  }

  const job = await queue.add(
    { upload_uuid },
    {
      priority: jobPriority,
      jobId: upload_uuid,
    }
  );

  console.log(`📥 Added renewal job to queue: ${upload_uuid} (priority: ${jobPriority})`);
  return job;
};

/**
 * Get job status
 */
export const getJobStatus = async (upload_uuid: string, queueType: 'upload' | 'renewal' = 'upload'): Promise<any> => {
  const queue = queueType === 'upload' ? getUploadQueue() : getRenewalQueue();
  const job = await queue.getJob(upload_uuid);

  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  const progress = job.progress();
  const failedReason = job.failedReason;

  return {
    status: state,
    progress,
    failedReason,
    attemptsMade: job.attemptsMade,
    data: job.data,
  };
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (queueType: 'upload' | 'renewal' = 'upload'): Promise<any> => {
  const queue = queueType === 'upload' ? getUploadQueue() : getRenewalQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
};

/**
 * Clean up old completed/failed jobs
 */
export const cleanupOldJobs = async (olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> => {
  const uploadQ = getUploadQueue();
  const renewalQ = getRenewalQueue();

  const cutoffTime = Date.now() - olderThanMs;

  // Clean upload queue
  const uploadCompleted = await uploadQ.getCompleted();
  const uploadFailed = await uploadQ.getFailed();

  for (const job of [...uploadCompleted, ...uploadFailed]) {
    if (job.finishedOn && job.finishedOn < cutoffTime) {
      await job.remove();
    }
  }

  // Clean renewal queue
  const renewalCompleted = await renewalQ.getCompleted();
  const renewalFailed = await renewalQ.getFailed();

  for (const job of [...renewalCompleted, ...renewalFailed]) {
    if (job.finishedOn && job.finishedOn < cutoffTime) {
      await job.remove();
    }
  }

  console.log('🧹 Cleaned up old jobs from queues');
};

/**
 * Gracefully close all queues
 */
export const closeQueues = async (): Promise<void> => {
  if (uploadQueue) {
    await uploadQueue.close();
    uploadQueue = null;
  }
  if (renewalQueue) {
    await renewalQueue.close();
    renewalQueue = null;
  }
  console.log('✅ All queues closed');
};

