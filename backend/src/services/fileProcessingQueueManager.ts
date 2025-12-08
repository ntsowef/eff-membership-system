import { redisService } from './redisService';
import { WebSocketService } from './websocketService';
import { VoterVerificationService } from './voterVerificationService';
import { getPrisma } from './prismaService';
import { createDatabaseError } from '../middleware/errorHandler';
import { FileProcessingJob } from './fileWatcherService';
import fs from 'fs/promises';

const prisma = getPrisma();

export class FileProcessingQueueManager {
  private static instance: FileProcessingQueueManager;
  private isProcessing: boolean = false;
  private currentJob: FileProcessingJob | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private jobTimeout: NodeJS.Timeout | null = null;
  private readonly JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes timeout

  private constructor() {}

  static getInstance(): FileProcessingQueueManager {
    if (!FileProcessingQueueManager.instance) {
      FileProcessingQueueManager.instance = new FileProcessingQueueManager();
    }
    return FileProcessingQueueManager.instance;
  }

  async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    console.log('🔄 File processing queue manager started');
    this.processNextJob();
  }

  private async processNextJob(): Promise<void> {
    if (this.isProcessing) return;

    try {
      // Get next job from queue (FIFO)
      const jobData = await redisService.brpop('excel_processing_queue', 5);
      
      if (jobData && jobData[1]) {
        let job: FileProcessingJob;
        try {
          const parsedData = JSON.parse(jobData[1]);

          // Check if we need to parse again (double JSON encoding)
          if (typeof parsedData === 'string') {
            job = JSON.parse(parsedData);
          } else {
            job = parsedData;
          }
        } catch (parseError) {
          console.error('❌ Failed to parse job data:', parseError);
          setTimeout(() => this.processNextJob(), 1000);
          return;
        }

        // Skip cancelled jobs
        const currentStatus = await redisService.hget(`job:${job.id}`, 'status');
        if (currentStatus === 'cancelled') {
          console.log(`⏭️ Skipping cancelled job: ${job.fileName}`);
          setTimeout(() => this.processNextJob(), 1000);
          return;
        }

        await this.executeJob(job);
      }
    } catch (error) {
      console.error('🔄 Queue processing error:', error);
    }

    // Continue processing (recursive with delay)
    setTimeout(() => this.processNextJob(), 2000);
  }

  private async executeJob(job: FileProcessingJob): Promise<void> {
    // If job is a string, try to parse it (fallback safety)
    if (typeof job === 'string') {
      try {
        job = JSON.parse(job);
      } catch (parseError) {
        console.error('❌ Failed to parse job string:', parseError);
        return;
      }
    }

    this.currentJob = job;
    this.isProcessing = true;

    // Set job timeout
    this.jobTimeout = setTimeout(() => {
      console.error(`⏰ Job timeout: ${job.fileName} has been processing for more than ${this.JOB_TIMEOUT_MS / 60000} minutes`);
      this.handleJobTimeout(job);
    }, this.JOB_TIMEOUT_MS);

    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      await this.updateJob(job);

      // Notify frontend
      WebSocketService.broadcast('job_started', {
        jobId: job.id,
        fileName: job.fileName,
        wardNumber: job.wardNumber,
        status: 'processing',
        timestamp: job.startedAt
      });

      console.log(`🔄 Processing job: ${job.fileName} (Ward: ${job.wardNumber})`);

      // Process the Excel file
      const result = await VoterVerificationService.processExcelFile(
        job.filePath,
        job.wardNumber || 93501016,
        (progress: number, message: string) => {
          job.progress = progress;
          this.updateJobProgress(job.id, progress, message);
        }
      );

      // Job completed
      job.status = result.success ? 'completed' : 'failed';
      job.completedAt = new Date().toISOString();
      job.progress = 100;
      job.result = result;
      
      if (!result.success) {
        job.error = result.error;
      }

      await this.updateJob(job);

      // Notify frontend
      const eventType = result.success ? 'job_completed' : 'job_failed';
      WebSocketService.broadcast(eventType, {
        jobId: job.id,
        fileName: job.fileName,
        wardNumber: job.wardNumber,
        status: job.status,
        result: result,
        error: job.error,
        timestamp: job.completedAt
      });

      const statusIcon = result.success ? '✅' : '❌';
      console.log(`${statusIcon} Job ${result.success ? 'completed' : 'failed'}: ${job.fileName}`);

      // Clean up: Remove the original file after processing (success or failure)
      // Note: For successful jobs, the VoterVerificationService already handles cleanup
      // This is a backup cleanup for jobs that fail before reaching the service
      if (!result.success) {
        await this.cleanupOriginalFile(job.filePath, job.fileName);
      }

    } catch (error) {
      // Job failed with exception
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date().toISOString();
      await this.updateJob(job);

      WebSocketService.broadcast('job_failed', {
        jobId: job.id,
        fileName: job.fileName,
        wardNumber: job.wardNumber,
        status: 'failed',
        error: job.error,
        timestamp: job.completedAt
      });

      console.error(`❌ Job failed with exception: ${job.fileName}`, error);

      // Clean up: Remove the original file for failed jobs too
      await this.cleanupOriginalFile(job.filePath, job.fileName);
    } finally {
      // Clear job timeout
      if (this.jobTimeout) {
        clearTimeout(this.jobTimeout);
        this.jobTimeout = null;
      }

      this.currentJob = null;
      this.isProcessing = false;
    }
  }

  private async updateJob(job: FileProcessingJob): Promise<void> {
    try {
      // Update in Redis - properly stringify the result field
      await redisService.hset(`job:${job.id}`, {
        ...job,
        result: job.result ? JSON.stringify(job.result) : null
      });

      // Update in database using Prisma - use job_uuid field, not job_id
      await prisma.file_processing_jobs.update({
        where: { job_uuid: job.id },
        data: {
          status: job.status || 'queued',
          progress: job.progress || 0,
          started_at: job.startedAt ? new Date(job.startedAt) : null,
          completed_at: job.completedAt ? new Date(job.completedAt) : null,
          error: job.error || null,
          result: job.result || null,
          updated_at: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating job:', error);
      throw createDatabaseError('Failed to update job in database', error);
    }
  }

  private async updateJobProgress(jobId: string, progress: number, message: string): Promise<void> {
    await redisService.hset(`job:${jobId}`, 'progress', progress);
    
    WebSocketService.broadcast('job_progress', {
      jobId,
      progress,
      message,
      timestamp: new Date().toISOString()
    });
  }

  async getQueueStatus(): Promise<any> {
    const queueLength = await redisService.llen('excel_processing_queue');
    const isEmpty = queueLength === 0 && !this.isProcessing;

    return {
      queueLength,
      isProcessing: this.isProcessing,
      isEmpty,
      status: isEmpty ? 'idle' : (this.isProcessing ? 'processing' : 'queued'),
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        fileName: this.currentJob.fileName,
        wardNumber: this.currentJob.wardNumber,
        status: this.currentJob.status,
        progress: this.currentJob.progress || 0,
        userId: this.currentJob.userId
      } : null
    };
  }

  async getJobHistory(limit: number = 50): Promise<FileProcessingJob[]> {
    try {
      const jobs = await prisma.file_processing_jobs.findMany({
        where: {},
        include: {
          users: {
            select: {
              user_id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: limit
      });

      return jobs.map((job) => ({
        id: job.job_id.toString(),
        fileName: job.file_name,
        filePath: job.file_path,
        fileSize: Number(job.file_size),
        wardNumber: job.ward_number || undefined,
        status: job.status || 'queued',
        progress: job.progress || 0,
        error: job.error || undefined,
        result: job.result || undefined,
        createdAt: job.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: job.updated_at?.toISOString(),
        startedAt: job.started_at?.toISOString(),
        completedAt: job.completed_at?.toISOString(),
        userId: job.user_id || undefined,
        priority: job.priority || 1,
        user: job.users ? {
          id: job.users.user_id,
          email: job.users.email,
          name: job.users.name || undefined
        } : null
      })) as FileProcessingJob[];
    } catch (error) {
      console.error('Error getting job history:', error);
      throw createDatabaseError('Failed to get job history from database', error);
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await redisService.hgetall(`job:${jobId}`);
      if (job && (job.status === 'queued' || job.status === 'processing')) {
        await redisService.hset(`job:${jobId}`, 'status', 'cancelled');

        // Update database using Prisma - use job_uuid field
        await prisma.file_processing_jobs.update({
          where: { job_uuid: jobId },
          data: {
            status: 'cancelled',
            updated_at: new Date()
          }
        });

        // If it's the currently processing job, clear the timeout
        if (this.currentJob && this.currentJob.id === jobId) {
          if (this.jobTimeout) {
            clearTimeout(this.jobTimeout);
            this.jobTimeout = null;
          }
          this.currentJob = null;
          this.isProcessing = false;
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cancelling job : ', error);
      return false;
    }
  }

  /**
   * Clear all jobs from the Redis queue (emergency cleanup)
   * This will remove all queued jobs but not affect currently processing jobs
   */
  async clearQueue(): Promise<number> {
    try {
      const queueLength = await redisService.llen('excel_processing_queue');

      if (queueLength === 0) {
        console.log('📭 Queue is already empty');
        return 0;
      }

      // Remove all items from the queue
      await redisService.del('excel_processing_queue');

      // Update database to mark all queued jobs as cancelled using Prisma
      await prisma.file_processing_jobs.updateMany({
        where: { status: 'queued' },
        data: {
          status: 'cancelled',
          updated_at: new Date()
        }
      });

      console.log(`🧹 Cleared ${queueLength} jobs from Redis queue`);
      return queueLength;
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw error;
    }
  }

  private async handleJobTimeout(job: FileProcessingJob): Promise<void> {
    try {
      console.error(`⏰ Job timed out: ${job.fileName}`);

      // Update job status to failed
      job.status = 'failed';
      job.error = `Job timed out after ${this.JOB_TIMEOUT_MS / 60000} minutes`;
      job.completedAt = new Date().toISOString();
      await this.updateJob(job);

      // Notify frontend
      WebSocketService.broadcast('job_failed', {
        jobId: job.id,
        fileName: job.fileName,
        wardNumber: job.wardNumber,
        status: 'failed',
        error: job.error,
        timestamp: job.completedAt
      });

      // Clean up the original file
      await this.cleanupOriginalFile(job.filePath, job.fileName);

      // Reset processing state
      this.currentJob = null;
      this.isProcessing = false;
      this.jobTimeout = null;

      console.log(`⏰ Timed out job cleaned up: ${job.fileName}`);
    } catch (error) {
      console.error('Error handling job timeout:', error);
    }
  }

  getCurrentJob(): FileProcessingJob | null {
    return this.currentJob;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  async stop(): Promise<void> {
    console.log('🔄 Stopping file processing queue manager...');
    this.isProcessing = false;

    if (this.processingInterval) {
      clearTimeout(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.jobTimeout) {
      clearTimeout(this.jobTimeout);
      this.jobTimeout = null;
    }

    console.log('🔄 File processing queue manager stopped');
  }

  /**
   * Clean up the original file after processing (success or failure)
   */
  private async cleanupOriginalFile(filePath: string, fileName: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Original file removed: ${fileName}`);
    } catch (cleanupError) {
      const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
      console.warn(`⚠️ Failed to remove original file ${fileName}: ${errorMessage}`);
      // Don't fail the entire process if cleanup fails
    }
  }
}
