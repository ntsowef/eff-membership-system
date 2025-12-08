import { api } from './api';

/**
 * Super Admin API Service
 * Provides methods to interact with super admin endpoints
 * Uses the api instance with authentication interceptor
 */
export class SuperAdminAPI {

  /**
   * Get aggregated dashboard data
   */
  static async getDashboardData() {
    const response = await api.get('/super-admin/dashboard');
    return response.data;
  }

  /**
   * Get system health status
   */
  static async getSystemHealth() {
    const response = await api.get('/super-admin/system/health');
    return response.data;
  }

  /**
   * Get Redis metrics
   */
  static async getRedisMetrics() {
    const response = await api.get('/super-admin/redis/status');
    return response.data;
  }

  /**
   * Get database connection statistics
   */
  static async getDatabaseConnectionStats() {
    const response = await api.get('/super-admin/database/connections');
    return response.data;
  }

  /**
   * Get comprehensive queue system statistics
   */
  static async getQueueSystemStats() {
    const response = await api.get('/super-admin/queue/stats');
    return response.data;
  }

  /**
   * Get all queue jobs with filtering
   */
  static async getQueueJobs(filters?: {
    queueType?: 'upload' | 'renewal' | 'all';
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get('/super-admin/queue/jobs', { params: filters });
    return response.data;
  }

  /**
   * Retry a failed job
   */
  static async retryJob(jobId: string, queueType: 'upload' | 'renewal') {
    const response = await api.post(`/super-admin/queue/retry/${jobId}`, { queueType });
    return response.data;
  }

  /**
   * Cancel a job
   */
  static async cancelJob(jobId: string, queueType: 'upload' | 'renewal') {
    const response = await api.post(`/super-admin/queue/cancel/${jobId}`, { queueType });
    return response.data;
  }

  /**
   * Pause queue processing
   */
  static async pauseQueue(queueType: 'upload' | 'renewal') {
    const response = await api.post('/super-admin/queue/pause', { queueType });
    return response.data;
  }

  /**
   * Resume queue processing
   */
  static async resumeQueue(queueType: 'upload' | 'renewal') {
    const response = await api.post('/super-admin/queue/resume', { queueType });
    return response.data;
  }

  /**
   * Get all uploads across the system
   */
  static async getAllUploads(filters?: {
    status?: string;
    uploadType?: 'member_application' | 'renewal';
    startDate?: string;
    endDate?: string;
    userId?: number;
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get('/super-admin/uploads/all', { params: filters });
    return response.data;
  }

  /**
   * Get upload statistics
   */
  static async getUploadStatistics(filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get('/super-admin/uploads/statistics', { params: filters });
    return response.data;
  }

  /**
   * Get active user sessions
   */
  static async getActiveSessions() {
    const response = await api.get('/super-admin/sessions/active');
    return response.data;
  }

  /**
   * Terminate a user session
   */
  static async terminateSession(sessionId: string) {
    const response = await api.post(`/super-admin/sessions/terminate/${sessionId}`);
    return response.data;
  }

  /**
   * Get system configuration
   */
  static async getSystemConfiguration() {
    const response = await api.get('/super-admin/config');
    return response.data;
  }

  /**
   * Update rate limit configuration
   */
  static async updateRateLimitConfig(config: {
    upload_frequency_limit?: number;
    max_concurrent_uploads_per_user?: number;
    max_system_concurrent_uploads?: number;
  }) {
    const response = await api.put('/super-admin/config/rate-limits', config);
    return response.data;
  }

  /**
   * Update queue configuration
   */
  static async updateQueueConfig(config: {
    concurrency?: number;
    max_retries?: number;
    retry_delay?: number;
  }) {
    const response = await api.put('/super-admin/config/queue', config);
    return response.data;
  }

  /**
   * Get rate limiting statistics
   */
  static async getRateLimitStatistics() {
    const response = await api.get('/super-admin/rate-limits/statistics');
    return response.data;
  }

  /**
   * Get list of all lookup tables
   */
  static async getLookupTables() {
    const response = await api.get('/super-admin/lookups/tables');
    return response.data;
  }

  /**
   * Get entries for a specific lookup table
   */
  static async getLookupEntries(tableName: string, filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get(`/super-admin/lookups/${tableName}`, { params: filters });
    return response.data;
  }

  /**
   * Add new lookup entry
   */
  static async addLookupEntry(tableName: string, data: any) {
    const response = await api.post(`/super-admin/lookups/${tableName}`, data);
    return response.data;
  }

  /**
   * Update lookup entry
   */
  static async updateLookupEntry(tableName: string, id: number, data: any) {
    const response = await api.put(`/super-admin/lookups/${tableName}/${id}`, data);
    return response.data;
  }

  /**
   * Delete/deactivate lookup entry
   */
  static async deleteLookupEntry(tableName: string, id: number) {
    const response = await api.delete(`/super-admin/lookups/${tableName}/${id}`);
    return response.data;
  }

  /**
   * Bulk import lookup data
   */
  static async bulkImportLookupData(tableName: string, entries: any[]) {
    const response = await api.post(`/super-admin/lookups/${tableName}/bulk-import`, { entries });
    return response.data;
  }

  /**
   * Export lookup data
   */
  static async exportLookupData(tableName: string) {
    const response = await api.get(`/super-admin/lookups/${tableName}/export`);
    return response.data;
  }
}

