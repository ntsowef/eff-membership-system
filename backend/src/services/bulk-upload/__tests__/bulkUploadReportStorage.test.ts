/**
 * Unit Tests for BulkUploadReportStorage Service
 */

import { BulkUploadReportStorage } from '../bulkUploadReportStorage';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../config/database-hybrid', () => ({
  getPool: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('BulkUploadReportStorage', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock getPool
    const { getPool } = require('../../../config/database-hybrid');
    getPool.mockReturnValue(mockPool);

    // Mock fs methods
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.statSync = jest.fn().mockReturnValue({ size: 1024 * 1024 } as any); // 1MB
    mockFs.unlinkSync = jest.fn();
    mockFs.readdirSync = jest.fn().mockReturnValue([]);
  });

  describe('getReportMetadata', () => {
    it('should get metadata for existing report', async () => {
      const mockJob = {
        job_id: 'job-123',
        report_path: '/path/to/report.xlsx',
        report_filename: 'report.xlsx',
        created_at: new Date('2025-11-25')
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockJob] } as any);

      const metadata = await BulkUploadReportStorage.getReportMetadata('job-123');

      expect(metadata).toBeDefined();
      expect(metadata?.job_id).toBe('job-123');
      expect(metadata?.file_size_bytes).toBe(1024 * 1024);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['job-123']
      );
    });

    it('should return null for non-existent report', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const metadata = await BulkUploadReportStorage.getReportMetadata('job-999');

      expect(metadata).toBeNull();
    });

    it('should return null if file does not exist', async () => {
      const mockJob = {
        job_id: 'job-123',
        report_path: '/path/to/report.xlsx',
        report_filename: 'report.xlsx',
        created_at: new Date('2025-11-25')
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockJob] } as any);
      mockFs.existsSync = jest.fn().mockReturnValue(false);

      const metadata = await BulkUploadReportStorage.getReportMetadata('job-123');

      expect(metadata).toBeNull();
    });
  });

  describe('getAllReportMetadata', () => {
    it('should get all report metadata', async () => {
      const mockJobs = [
        {
          job_id: 'job-1',
          report_path: '/path/to/report1.xlsx',
          report_filename: 'report1.xlsx',
          created_at: new Date('2025-11-25')
        },
        {
          job_id: 'job-2',
          report_path: '/path/to/report2.xlsx',
          report_filename: 'report2.xlsx',
          created_at: new Date('2025-11-24')
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockJobs } as any);

      const metadata = await BulkUploadReportStorage.getAllReportMetadata(10);

      expect(metadata).toHaveLength(2);
      expect(metadata[0].job_id).toBe('job-1');
      expect(metadata[1].job_id).toBe('job-2');
    });

    it('should handle empty results', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const metadata = await BulkUploadReportStorage.getAllReportMetadata();

      expect(metadata).toHaveLength(0);
    });
  });

  describe('getStorageStats', () => {
    it('should calculate storage statistics', async () => {
      const mockStats = {
        total_reports: '5',
        oldest_report_date: new Date('2025-11-01'),
        newest_report_date: new Date('2025-11-25')
      };

      const mockJobs = [
        { job_id: 'job-1', report_path: '/path/1.xlsx', report_filename: '1.xlsx', created_at: new Date() },
        { job_id: 'job-2', report_path: '/path/2.xlsx', report_filename: '2.xlsx', created_at: new Date() }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockStats] } as any)
        .mockResolvedValueOnce({ rows: mockJobs } as any);

      const stats = await BulkUploadReportStorage.getStorageStats();

      expect(stats.total_reports).toBe(5);
      expect(stats.total_size_mb).toBeGreaterThan(0);
      expect(stats.oldest_report_date).toEqual(mockStats.oldest_report_date);
    });
  });

  describe('deleteReport', () => {
    it('should delete report file and database entry', async () => {
      const mockJob = {
        report_path: '/path/to/report.xlsx'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockJob] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const deleted = await BulkUploadReportStorage.deleteReport('job-123');

      expect(deleted).toBe(true);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/path/to/report.xlsx');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bulk_upload_jobs'),
        ['job-123']
      );
    });

    it('should return false for non-existent report', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const deleted = await BulkUploadReportStorage.deleteReport('job-999');

      expect(deleted).toBe(false);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldReports', () => {
    it('should cleanup reports older than retention period', async () => {
      const mockOldReports = [
        { job_id: 'job-1', report_path: '/path/1.xlsx', report_filename: '1.xlsx' },
        { job_id: 'job-2', report_path: '/path/2.xlsx', report_filename: '2.xlsx' }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockOldReports } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await BulkUploadReportStorage.cleanupOldReports(90);

      expect(result.deleted_count).toBe(2);
      expect(result.freed_space_mb).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('reportExists', () => {
    it('should return true if report exists', async () => {
      const mockJob = { report_path: '/path/to/report.xlsx' };
      mockPool.query.mockResolvedValueOnce({ rows: [mockJob] } as any);

      const exists = await BulkUploadReportStorage.reportExists('job-123');

      expect(exists).toBe(true);
    });

    it('should return false if report does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const exists = await BulkUploadReportStorage.reportExists('job-999');

      expect(exists).toBe(false);
    });
  });
});

