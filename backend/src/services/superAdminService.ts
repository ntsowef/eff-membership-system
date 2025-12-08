import { executeQuery } from '../config/database-hybrid';
import { getUploadQueue, getRenewalQueue, getQueueStats, cleanupOldJobs } from './uploadQueueService';
import { FileStorageService } from './fileStorageService';
import { MonitoringService } from './monitoringService';
import { cacheService } from './cacheService';
import { RedisService } from './redisService';
import { Queue, Job } from 'bull';
import { createDatabaseError } from '../middleware/errorHandler';

/**
 * Super Admin Service
 * Provides comprehensive system management capabilities for super admins
 */
export class SuperAdminService {
  
  /**
   * Get aggregated dashboard data
   */
  static async getDashboardData(): Promise<any> {
    try {
      const [
        systemHealth,
        userStats,
        uploadQueueStats,
        renewalQueueStats,
        storageStats,
        recentActivity
      ] = await Promise.all([
        MonitoringService.getSystemHealth(),
        this.getUserStatistics(),
        getQueueStats('upload'),
        getQueueStats('renewal'),
        FileStorageService.getStorageStats(),
        this.getRecentActivity(10)
      ]);

      return {
        system_health: systemHealth,
        user_statistics: userStats,
        queue_statistics: {
          uploads: uploadQueueStats,
          renewals: renewalQueueStats,
          total_waiting: uploadQueueStats.waiting + renewalQueueStats.waiting,
          total_active: uploadQueueStats.active + renewalQueueStats.active,
          total_completed: uploadQueueStats.completed + renewalQueueStats.completed,
          total_failed: uploadQueueStats.failed + renewalQueueStats.failed
        },
        storage_statistics: storageStats,
        recent_activity: recentActivity,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch dashboard data', error);
    }
  }

  /**
   * Get comprehensive user statistics
   */
  static async getUserStatistics(): Promise<any> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactive_users,
          COUNT(CASE WHEN u.admin_level = 'national' THEN 1 END) as national_admins,
          COUNT(CASE WHEN u.admin_level = 'province' THEN 1 END) as province_admins,
          COUNT(CASE WHEN u.admin_level = 'district' THEN 1 END) as district_admins,
          COUNT(CASE WHEN u.admin_level = 'municipality' THEN 1 END) as municipality_admins,
          COUNT(CASE WHEN u.admin_level = 'ward' THEN 1 END) as ward_admins,
          COUNT(CASE WHEN r.role_code = 'SUPER_ADMIN' THEN 1 END) as super_admins,
          COUNT(CASE WHEN u.mfa_enabled = true THEN 1 END) as mfa_enabled_users,
          COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '24 hours' THEN 1 END) as active_last_24h,
          COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7d,
          COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30d
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
      `;

      const result = await executeQuery(query, []);
      return result[0] || {};
    } catch (error) {
      throw createDatabaseError('Failed to fetch user statistics', error);
    }
  }

  /**
   * Get recent system activity
   */
  static async getRecentActivity(limit: number = 10): Promise<any[]> {
    try {
      const query = `
        SELECT 
          audit_id,
          user_id,
          action,
          entity_type,
          entity_id,
          ip_address,
          created_at,
          (SELECT name FROM users WHERE user_id = al.user_id) as user_name
        FROM audit_logs al
        ORDER BY created_at DESC
        LIMIT $1
      `;

      return await executeQuery(query, [limit]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch recent activity', error);
    }
  }

  /**
   * Get detailed Redis metrics
   */
  static async getRedisMetrics(): Promise<any> {
    try {
      const redisService = RedisService.getInstance();

      const [cacheStats, isAvailable] = await Promise.all([
        cacheService.getStats(),
        Promise.resolve(cacheService.isAvailable())
      ]);

      return {
        connected: isAvailable,
        status: cacheStats?.status || 'unknown',
        metrics: cacheStats?.metrics || {},
        info: cacheStats?.info || null,
        keyspace: cacheStats?.keyspace || null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch Redis metrics', error);
    }
  }

  /**
   * Get database connection statistics
   */
  static async getDatabaseConnectionStats(): Promise<any> {
    try {
      const query = `
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      const result = await executeQuery(query, []);
      return result[0] || {};
    } catch (error) {
      throw createDatabaseError('Failed to fetch database connection stats', error);
    }
  }

  /**
   * Get comprehensive queue system statistics
   */
  static async getQueueSystemStats(): Promise<any> {
    try {
      const uploadQueue = getUploadQueue();
      const renewalQueue = getRenewalQueue();

      // Get stats for both queues in parallel
      const [uploadStats, renewalStats, uploadPaused, renewalPaused] = await Promise.all([
        getQueueStats('upload'),
        getQueueStats('renewal'),
        uploadQueue.isPaused(),
        renewalQueue.isPaused()
      ]);

      // Get recent jobs for each queue (last 10)
      const [uploadRecentJobs, renewalRecentJobs] = await Promise.all([
        uploadQueue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, 9),
        renewalQueue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, 9)
      ]);

      // Calculate processing rate (jobs completed in last hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const uploadCompletedJobs = await uploadQueue.getCompleted(0, 100);
      const renewalCompletedJobs = await renewalQueue.getCompleted(0, 100);

      const uploadCompletedLastHour = uploadCompletedJobs.filter(
        job => job.finishedOn && job.finishedOn > oneHourAgo
      ).length;
      const renewalCompletedLastHour = renewalCompletedJobs.filter(
        job => job.finishedOn && job.finishedOn > oneHourAgo
      ).length;

      // Get failed jobs for error analysis
      const [uploadFailedJobs, renewalFailedJobs] = await Promise.all([
        uploadQueue.getFailed(0, 5),
        renewalQueue.getFailed(0, 5)
      ]);

      // Map jobs to a simpler format
      const mapJob = async (job: any) => ({
        id: job.id,
        name: job.name || 'Unknown',
        state: await job.getState(),
        progress: await job.progress(),
        attempts: job.attemptsMade,
        createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
        processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        failedReason: job.failedReason || null,
        data: {
          upload_uuid: job.data?.upload_uuid,
          filename: job.data?.filename || job.data?.originalFilename,
          user_id: job.data?.user_id
        }
      });

      const recentUploadJobs = await Promise.all(uploadRecentJobs.map(mapJob));
      const recentRenewalJobs = await Promise.all(renewalRecentJobs.map(mapJob));
      const failedUploadJobsDetails = await Promise.all(uploadFailedJobs.map(mapJob));
      const failedRenewalJobsDetails = await Promise.all(renewalFailedJobs.map(mapJob));

      return {
        summary: {
          totalWaiting: uploadStats.waiting + renewalStats.waiting,
          totalActive: uploadStats.active + renewalStats.active,
          totalCompleted: uploadStats.completed + renewalStats.completed,
          totalFailed: uploadStats.failed + renewalStats.failed,
          totalDelayed: uploadStats.delayed + renewalStats.delayed,
          processingRate: {
            lastHour: uploadCompletedLastHour + renewalCompletedLastHour,
            unit: 'jobs/hour'
          }
        },
        queues: {
          upload: {
            name: 'File Uploads',
            status: uploadPaused ? 'paused' : (uploadStats.active > 0 ? 'processing' : 'idle'),
            isPaused: uploadPaused,
            stats: uploadStats,
            recentJobs: recentUploadJobs,
            failedJobs: failedUploadJobsDetails,
            completedLastHour: uploadCompletedLastHour
          },
          renewal: {
            name: 'Membership Renewals',
            status: renewalPaused ? 'paused' : (renewalStats.active > 0 ? 'processing' : 'idle'),
            isPaused: renewalPaused,
            stats: renewalStats,
            recentJobs: recentRenewalJobs,
            failedJobs: failedRenewalJobsDetails,
            completedLastHour: renewalCompletedLastHour
          }
        },
        health: {
          status: this.calculateQueueHealth(uploadStats, renewalStats, uploadPaused, renewalPaused),
          message: this.getQueueHealthMessage(uploadStats, renewalStats, uploadPaused, renewalPaused)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch queue system stats', error);
    }
  }

  /**
   * Calculate overall queue health status
   */
  private static calculateQueueHealth(
    uploadStats: any,
    renewalStats: any,
    uploadPaused: boolean,
    renewalPaused: boolean
  ): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    const totalFailed = uploadStats.failed + renewalStats.failed;
    const totalWaiting = uploadStats.waiting + renewalStats.waiting;

    if (uploadPaused && renewalPaused) return 'critical';
    if (totalFailed > 10) return 'critical';
    if (totalFailed > 5 || totalWaiting > 50) return 'degraded';
    if (uploadPaused || renewalPaused) return 'degraded';
    return 'healthy';
  }

  /**
   * Get queue health message
   */
  private static getQueueHealthMessage(
    uploadStats: any,
    renewalStats: any,
    uploadPaused: boolean,
    renewalPaused: boolean
  ): string {
    const totalFailed = uploadStats.failed + renewalStats.failed;
    const totalWaiting = uploadStats.waiting + renewalStats.waiting;

    if (uploadPaused && renewalPaused) return 'All queues are paused';
    if (uploadPaused) return 'Upload queue is paused';
    if (renewalPaused) return 'Renewal queue is paused';
    if (totalFailed > 10) return `High number of failed jobs (${totalFailed})`;
    if (totalFailed > 5) return `Some jobs have failed (${totalFailed})`;
    if (totalWaiting > 50) return `Large queue backlog (${totalWaiting} waiting)`;
    if (totalWaiting > 0) return `Processing ${totalWaiting} queued jobs`;
    return 'All queues operational';
  }

  /**
   * Get all queue jobs with filtering
   */
  static async getAllQueueJobs(filters: {
    queueType?: 'upload' | 'renewal' | 'all';
    status?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      const { queueType = 'all', status, limit = 50, offset = 0 } = filters;

      const queues: Queue[] = [];
      if (queueType === 'upload' || queueType === 'all') {
        queues.push(getUploadQueue());
      }
      if (queueType === 'renewal' || queueType === 'all') {
        queues.push(getRenewalQueue());
      }

      const allJobs: any[] = [];

      for (const queue of queues) {
        let jobs: Job[] = [];

        if (status) {
          jobs = await queue.getJobs([status], offset, offset + limit - 1);
        } else {
          const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getJobs(['waiting'], 0, limit - 1),
            queue.getJobs(['active'], 0, limit - 1),
            queue.getJobs(['completed'], 0, limit - 1),
            queue.getJobs(['failed'], 0, limit - 1),
            queue.getJobs(['delayed'], 0, limit - 1)
          ]);
          jobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
        }

        for (const job of jobs) {
          allJobs.push({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: await job.progress(),
            state: await job.getState(),
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            timestamp: job.timestamp,
            queueName: queue.name
          });
        }
      }

      return {
        jobs: allJobs.slice(offset, offset + limit),
        total: allJobs.length,
        limit,
        offset
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch queue jobs', error);
    }
  }

  /**
   * Retry a failed job
   */
  static async retryJob(jobId: string, queueType: 'upload' | 'renewal'): Promise<any> {
    try {
      const queue = queueType === 'upload' ? getUploadQueue() : getRenewalQueue();
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await job.retry();

      return {
        success: true,
        message: `Job ${jobId} has been queued for retry`,
        job_id: jobId
      };
    } catch (error) {
      throw createDatabaseError('Failed to retry job', error);
    }
  }

  /**
   * Cancel a job
   */
  static async cancelJob(jobId: string, queueType: 'upload' | 'renewal'): Promise<any> {
    try {
      const queue = queueType === 'upload' ? getUploadQueue() : getRenewalQueue();
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await job.remove();

      return {
        success: true,
        message: `Job ${jobId} has been cancelled`,
        job_id: jobId
      };
    } catch (error) {
      throw createDatabaseError('Failed to cancel job', error);
    }
  }

  /**
   * Pause queue processing
   */
  static async pauseQueue(queueType: 'upload' | 'renewal'): Promise<any> {
    try {
      const queue = queueType === 'upload' ? getUploadQueue() : getRenewalQueue();
      await queue.pause();

      return {
        success: true,
        message: `${queueType} queue has been paused`,
        queue_type: queueType
      };
    } catch (error) {
      throw createDatabaseError('Failed to pause queue', error);
    }
  }

  /**
   * Resume queue processing
   */
  static async resumeQueue(queueType: 'upload' | 'renewal'): Promise<any> {
    try {
      const queue = queueType === 'upload' ? getUploadQueue() : getRenewalQueue();
      await queue.resume();

      return {
        success: true,
        message: `${queueType} queue has been resumed`,
        queue_type: queueType
      };
    } catch (error) {
      throw createDatabaseError('Failed to resume queue', error);
    }
  }

  /**
   * Get all uploads across the system
   */
  static async getAllUploads(filters: {
    status?: string;
    uploadType?: 'member_application' | 'renewal';
    startDate?: string;
    endDate?: string;
    userId?: number;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      const { status, uploadType, startDate, endDate, userId, limit = 50, offset = 0 } = filters;

      let whereConditions: string[] = ['1=1'];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereConditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (uploadType) {
        whereConditions.push(`upload_type = $${paramIndex++}`);
        params.push(uploadType);
      }

      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      if (userId) {
        whereConditions.push(`uploaded_by = $${paramIndex++}`);
        params.push(userId);
      }

      const query = `
        SELECT
          bu.upload_id,
          bu.upload_uuid,
          bu.upload_type,
          bu.file_name,
          bu.file_size,
          bu.status,
          bu.total_records,
          bu.successful_records,
          bu.failed_records,
          bu.uploaded_by,
          bu.created_at,
          bu.updated_at,
          u.name as uploaded_by_name,
          u.email as uploaded_by_email,
          u.admin_level
        FROM bulk_uploads bu
        LEFT JOIN users u ON bu.uploaded_by = u.user_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY bu.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);

      const uploads = await executeQuery(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM bulk_uploads bu
        WHERE ${whereConditions.join(' AND ')}
      `;

      const countResult = await executeQuery(countQuery, params.slice(0, -2));
      const total = parseInt(countResult[0]?.total || '0');

      return {
        uploads,
        total,
        limit,
        offset,
        has_more: offset + limit < total
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch uploads', error);
    }
  }

  /**
   * Get upload statistics
   */
  static async getUploadStatistics(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const { startDate, endDate } = filters || {};

      let whereConditions: string[] = ['1=1'];
      const params: any[] = [];
      let paramIndex = 1;

      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      const query = `
        SELECT
          COUNT(*) as total_uploads,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_uploads,
          COUNT(CASE WHEN status = 'Processing' THEN 1 END) as processing_uploads,
          COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_uploads,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_uploads,
          SUM(total_records) as total_records_processed,
          SUM(successful_records) as total_successful_records,
          SUM(failed_records) as total_failed_records,
          AVG(file_size) as avg_file_size,
          SUM(file_size) as total_file_size
        FROM bulk_uploads
        WHERE ${whereConditions.join(' AND ')}
      `;

      const result = await executeQuery(query, params);
      return result[0] || {};
    } catch (error) {
      throw createDatabaseError('Failed to fetch upload statistics', error);
    }
  }

  /**
   * Get active user sessions
   */
  static async getActiveSessions(): Promise<any[]> {
    try {
      const query = `
        SELECT
          s.session_id,
          s.user_id,
          s.ip_address,
          s.user_agent,
          s.created_at,
          s.last_activity,
          s.expires_at,
          u.name as user_name,
          u.email as user_email,
          r.role_name,
          u.admin_level
        FROM user_sessions s
        LEFT JOIN users u ON s.user_id = u.user_id
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE s.expires_at > NOW()
        AND s.is_active = true
        ORDER BY s.last_activity DESC
      `;

      return await executeQuery(query, []);
    } catch (error) {
      throw createDatabaseError('Failed to fetch active sessions', error);
    }
  }

  /**
   * Terminate a user session
   */
  static async terminateSession(sessionId: string): Promise<any> {
    try {
      const query = `
        UPDATE user_sessions
        SET is_active = false, expires_at = NOW()
        WHERE session_id = $1
        RETURNING session_id, user_id
      `;

      const result = await executeQuery(query, [sessionId]);

      if (result.length === 0) {
        throw new Error(`Session ${sessionId} not found`);
      }

      return {
        success: true,
        message: `Session ${sessionId} has been terminated`,
        session_id: sessionId,
        user_id: result[0].user_id
      };
    } catch (error) {
      throw createDatabaseError('Failed to terminate session', error);
    }
  }

  /**
   * Get system configuration
   */
  static async getSystemConfiguration(): Promise<any> {
    try {
      return {
        rate_limits: {
          upload_frequency_limit: parseInt(process.env.UPLOAD_FREQUENCY_LIMIT || '5'),
          max_concurrent_uploads_per_user: parseInt(process.env.MAX_CONCURRENT_UPLOADS_PER_USER || '2'),
          max_system_concurrent_uploads: parseInt(process.env.MAX_SYSTEM_CONCURRENT_UPLOADS || '20'),
          window_ms: 15 * 60 * 1000 // 15 minutes
        },
        queue_settings: {
          concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
          max_retries: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
          retry_delay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000')
        },
        storage_settings: {
          max_upload_size_mb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50'),
          retention_days: 30,
          min_free_space_gb: 5
        },
        database_settings: {
          connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '50')
        },
        cache_settings: {
          enabled: process.env.CACHE_ENABLED !== 'false',
          default_ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '1800')
        }
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch system configuration', error);
    }
  }

  /**
   * Update rate limit configuration
   * Note: This updates in-memory configuration. For persistent changes, update .env file
   */
  static async updateRateLimitConfig(config: {
    upload_frequency_limit?: number;
    max_concurrent_uploads_per_user?: number;
    max_system_concurrent_uploads?: number;
  }): Promise<any> {
    try {
      // Update environment variables (in-memory only)
      if (config.upload_frequency_limit !== undefined) {
        process.env.UPLOAD_FREQUENCY_LIMIT = config.upload_frequency_limit.toString();
      }
      if (config.max_concurrent_uploads_per_user !== undefined) {
        process.env.MAX_CONCURRENT_UPLOADS_PER_USER = config.max_concurrent_uploads_per_user.toString();
      }
      if (config.max_system_concurrent_uploads !== undefined) {
        process.env.MAX_SYSTEM_CONCURRENT_UPLOADS = config.max_system_concurrent_uploads.toString();
      }

      return {
        success: true,
        message: 'Rate limit configuration updated (in-memory). Restart server for persistent changes.',
        config: await this.getSystemConfiguration()
      };
    } catch (error) {
      throw createDatabaseError('Failed to update rate limit configuration', error);
    }
  }

  /**
   * Update queue configuration
   * Note: This updates in-memory configuration. For persistent changes, update .env file
   */
  static async updateQueueConfig(config: {
    concurrency?: number;
    max_retries?: number;
    retry_delay?: number;
  }): Promise<any> {
    try {
      // Update environment variables (in-memory only)
      if (config.concurrency !== undefined) {
        process.env.QUEUE_CONCURRENCY = config.concurrency.toString();
      }
      if (config.max_retries !== undefined) {
        process.env.QUEUE_MAX_RETRIES = config.max_retries.toString();
      }
      if (config.retry_delay !== undefined) {
        process.env.QUEUE_RETRY_DELAY = config.retry_delay.toString();
      }

      return {
        success: true,
        message: 'Queue configuration updated (in-memory). Restart server for persistent changes.',
        config: await this.getSystemConfiguration()
      };
    } catch (error) {
      throw createDatabaseError('Failed to update queue configuration', error);
    }
  }

  /**
   * Get rate limiting statistics
   */
  static async getRateLimitStatistics(): Promise<any> {
    try {
      // This would require tracking rate limit hits in Redis or database
      // For now, return configuration and current queue stats
      const config = await this.getSystemConfiguration();
      const uploadQueueStats = await getQueueStats('upload');
      const renewalQueueStats = await getQueueStats('renewal');

      return {
        configuration: config.rate_limits,
        current_usage: {
          upload_queue_active: uploadQueueStats.active,
          renewal_queue_active: renewalQueueStats.active,
          total_active: uploadQueueStats.active + renewalQueueStats.active,
          system_limit: config.rate_limits.max_system_concurrent_uploads,
          utilization_percentage: ((uploadQueueStats.active + renewalQueueStats.active) / config.rate_limits.max_system_concurrent_uploads) * 100
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch rate limit statistics', error);
    }
  }
}

