import { Job } from 'bull';
import { initializeUploadQueue, initializeRenewalQueue } from '../services/uploadQueueService';
import { MemberApplicationBulkProcessor } from '../services/memberApplicationBulkProcessor';
import { RenewalBulkProcessor } from '../services/renewalBulkProcessor';

/**
 * Upload Queue Worker
 * 
 * Processes file upload jobs from the Bull queue
 * Runs with controlled concurrency to prevent system overload
 */

const CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '5', 10);

/**
 * Initialize and start the upload queue worker
 */
export const startUploadQueueWorker = () => {
  const uploadQueue = initializeUploadQueue();

  // Process upload jobs with controlled concurrency
  uploadQueue.process(CONCURRENCY, async (job: Job) => {
    const { upload_uuid } = job.data;
    
    console.log(`🔄 [Worker] Processing upload job: ${upload_uuid}`);
    console.log(`📊 [Worker] Job ID: ${job.id}, Attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`);

    try {
      // Update job progress
      await job.progress(10);

      // Process the upload
      await MemberApplicationBulkProcessor.processBulkUpload(upload_uuid);

      // Mark as complete
      await job.progress(100);
      
      console.log(`✅ [Worker] Upload job completed: ${upload_uuid}`);
      return { success: true, upload_uuid };
    } catch (error: any) {
      console.error(`❌ [Worker] Upload job failed: ${upload_uuid}`, error.message);
      throw error; // Bull will handle retry logic
    }
  });

  // Queue event handlers
  uploadQueue.on('completed', (job, result) => {
    console.log(`✅ [Queue] Job ${job.id} completed:`, result);
  });

  uploadQueue.on('failed', (job, error) => {
    console.error(`❌ [Queue] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, error.message);
  });

  uploadQueue.on('stalled', (job) => {
    console.warn(`⚠️  [Queue] Job ${job.id} has stalled and will be retried`);
  });

  console.log(`✅ Upload queue worker started with concurrency: ${CONCURRENCY}`);
};

/**
 * Initialize and start the renewal queue worker
 */
export const startRenewalQueueWorker = () => {
  const renewalQueue = initializeRenewalQueue();

  // Process renewal jobs with controlled concurrency
  renewalQueue.process(CONCURRENCY, async (job: Job) => {
    const { upload_uuid } = job.data;
    
    console.log(`🔄 [Worker] Processing renewal job: ${upload_uuid}`);
    console.log(`📊 [Worker] Job ID: ${job.id}, Attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`);

    try {
      // Update job progress
      await job.progress(10);

      // Process the renewal upload
      await RenewalBulkProcessor.processBulkUpload(upload_uuid);

      // Mark as complete
      await job.progress(100);
      
      console.log(`✅ [Worker] Renewal job completed: ${upload_uuid}`);
      return { success: true, upload_uuid };
    } catch (error: any) {
      console.error(`❌ [Worker] Renewal job failed: ${upload_uuid}`, error.message);
      throw error; // Bull will handle retry logic
    }
  });

  // Queue event handlers
  renewalQueue.on('completed', (job, result) => {
    console.log(`✅ [Queue] Renewal job ${job.id} completed:`, result);
  });

  renewalQueue.on('failed', (job, error) => {
    console.error(`❌ [Queue] Renewal job ${job?.id} failed after ${job?.attemptsMade} attempts:`, error.message);
  });

  renewalQueue.on('stalled', (job) => {
    console.warn(`⚠️  [Queue] Renewal job ${job.id} has stalled and will be retried`);
  });

  console.log(`✅ Renewal queue worker started with concurrency: ${CONCURRENCY}`);
};

/**
 * Start all queue workers
 */
export const startAllQueueWorkers = () => {
  console.log('🚀 Starting all queue workers...');
  startUploadQueueWorker();
  startRenewalQueueWorker();
  console.log('✅ All queue workers started successfully');
};

