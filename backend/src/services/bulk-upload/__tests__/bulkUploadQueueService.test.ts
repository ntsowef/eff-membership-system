/**
 * Unit Tests for Bulk Upload Queue Service
 */

import {
  addBulkUploadJob,
  getBulkUploadJobStatus,
  cancelBulkUploadJob,
  retryBulkUploadJob,
  getBulkUploadQueueStats,
  getRecentBulkUploadJobs,
  cleanOldBulkUploadJobs
} from '../bulkUploadQueueService';
import Bull from 'bull';

// Mock Bull
jest.mock('bull');

describe('BulkUploadQueueService', () => {
  let mockQueue: jest.Mocked<Bull.Queue>;
  let mockJob: jest.Mocked<Bull.Job>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock job
    mockJob = {
      id: 'job-123',
      data: {
        filePath: '/path/to/file.xlsx',
        fileName: 'file.xlsx',
        uploadedBy: 'user@test.com',
        userId: 'user-1'
      },
      progress: jest.fn().mockReturnValue(50),
      getState: jest.fn().mockResolvedValue('active'),
      remove: jest.fn().mockResolvedValue(undefined),
      retry: jest.fn().mockResolvedValue(undefined),
      finished: jest.fn().mockResolvedValue({ status: 'completed' }),
      toJSON: jest.fn().mockReturnValue({
        id: 'job-123',
        data: {},
        opts: {},
        progress: 50,
        returnvalue: null,
        stacktrace: [],
        attemptsMade: 0,
        delay: 0,
        timestamp: Date.now(),
        finishedOn: null,
        processedOn: null
      })
    } as any;

    // Mock queue
    mockQueue = {
      add: jest.fn().mockResolvedValue(mockJob),
      getJob: jest.fn().mockResolvedValue(mockJob),
      getJobs: jest.fn().mockResolvedValue([mockJob]),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 0,
        paused: 0
      }),
      clean: jest.fn().mockResolvedValue([mockJob]),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn()
    } as any;

    // Mock Bull constructor
    (Bull as unknown as jest.Mock).mockReturnValue(mockQueue);
  });

  describe('addBulkUploadJob', () => {
    it('should add job to queue successfully', async () => {
      const jobId = await addBulkUploadJob(
        '/path/to/file.xlsx',
        'file.xlsx',
        'user@test.com',
        'user-1'
      );

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-bulk-upload',
        expect.objectContaining({
          filePath: '/path/to/file.xlsx',
          fileName: 'file.xlsx',
          uploadedBy: 'user@test.com',
          userId: 'user-1'
        }),
        expect.any(Object)
      );
    });

    it('should throw error if queue add fails', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Queue error'));

      await expect(
        addBulkUploadJob('/path/to/file.xlsx', 'file.xlsx', 'user@test.com', 'user-1')
      ).rejects.toThrow('Queue error');
    });
  });

  describe('getBulkUploadJobStatus', () => {
    it('should get job status successfully', async () => {
      const status = await getBulkUploadJobStatus('job-123');

      expect(status).toBeDefined();
      expect(status.jobId).toBe('job-123');
      expect(status.state).toBe('active');
      expect(status.progress).toBe(50);
    });

    it('should return null for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);

      const status = await getBulkUploadJobStatus('job-999');

      expect(status).toBeNull();
    });
  });

  describe('cancelBulkUploadJob', () => {
    it('should cancel job successfully', async () => {
      const cancelled = await cancelBulkUploadJob('job-123');

      expect(cancelled).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should return false for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);

      const cancelled = await cancelBulkUploadJob('job-999');

      expect(cancelled).toBe(false);
    });
  });

  describe('retryBulkUploadJob', () => {
    it('should retry failed job successfully', async () => {
      mockJob.getState.mockResolvedValueOnce('failed');

      const retried = await retryBulkUploadJob('job-123');

      expect(retried).toBe(true);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should return false for non-failed job', async () => {
      mockJob.getState.mockResolvedValueOnce('completed');

      const retried = await retryBulkUploadJob('job-123');

      expect(retried).toBe(false);
    });
  });

  describe('getBulkUploadQueueStats', () => {
    it('should get queue statistics', async () => {
      const stats = await getBulkUploadQueueStats();

      expect(stats).toBeDefined();
      expect(stats.waiting).toBe(5);
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(100);
      expect(stats.failed).toBe(3);
      expect(stats.total).toBe(110);
    });
  });

  describe('getRecentBulkUploadJobs', () => {
    it('should get recent jobs', async () => {
      const jobs = await getRecentBulkUploadJobs(10);

      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('job-123');
    });
  });

  describe('cleanOldBulkUploadJobs', () => {
    it('should clean old jobs', async () => {
      const result = await cleanOldBulkUploadJobs(24);

      expect(result.cleaned).toBeGreaterThanOrEqual(0);
      expect(mockQueue.clean).toHaveBeenCalled();
    });
  });
});

