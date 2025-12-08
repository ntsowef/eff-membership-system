import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from '../config/config';
import { redisService } from './redisService';
import { verifyToken } from '../middleware/auth';

export class WebSocketService {
  private static io: SocketIOServer;
  private static connectedClients: Map<string, any> = new Map();

  static initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io'
    });

    this.io.use(this.authenticateSocket);
    this.io.on('connection', this.handleConnection);
    
    console.log('🔌 WebSocket service initialized');
  }

  private static authenticateSocket = (socket: any, next: any) => {
    try {
      // Check for service-to-service API key (for Python processor)
      const apiKey = socket.handshake.auth.apiKey || socket.handshake.headers['x-api-key'];
      const serviceApiKey = process.env.INTERNAL_SERVICE_API_KEY || 'eff-internal-service-key-2024';

      if (apiKey && apiKey === serviceApiKey) {
        // Service-to-service connection (Python processor)
        console.log('✅ WebSocket: Service-to-service connection authenticated');
        socket.userId = 'system';
        socket.userRole = 'system';
        socket.userType = 'service';
        socket.isServiceConnection = true;
        return next();
      }

      // Regular user authentication with JWT token
      const token = socket.handshake.auth.token ||
                   socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Use the same verifyToken function as REST API to ensure consistency
      const decoded = verifyToken(token);
      socket.userId = decoded.id; // Note : JWT payload uses 'id', not 'userId'
      socket.userRole = decoded.role_name;
      socket.userType = decoded.admin_level;
      socket.isServiceConnection = false;

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('WebSocket authentication failed:', errorMessage);
      next(new Error('Invalid authentication token'));
    }
  };

  private static handleConnection = (socket: any) => {
    console.log('🔌 Client connected: ' + socket.id + ' (User: ' + socket.userId + ')');
    
    this.connectedClients.set(socket.id, {
      userId: socket.userId,
      userRole: socket.userRole,
      userType: socket.userType,
      connectedAt: new Date().toISOString()
    });

    // Join user-specific room
    socket.join('user:' + socket.userId);
    
    // Handle file processing subscriptions
    socket.on('subscribe_file_processing', () => {
      socket.join('file_processing');
      console.log('📡 User ' + socket.userId + ' subscribed to file processing updates');

      // Send current queue status immediately
      this.sendQueueStatus(socket);
    });

    socket.on('unsubscribe_file_processing', () => {
      socket.leave('file_processing');
      console.log('📡 User ' + socket.userId + ' unsubscribed from file processing updates');
    });

    // Handle bulk upload subscriptions
    socket.on('subscribe_bulk_upload', (data: { file_id?: number }) => {
      if (data.file_id) {
        socket.join('bulk_upload:' + data.file_id);
        console.log('📡 User ' + socket.userId + ' subscribed to bulk upload file ' + data.file_id);
      } else {
        socket.join('bulk_upload');
        console.log('📡 User ' + socket.userId + ' subscribed to all bulk uploads');
      }
    });

    socket.on('unsubscribe_bulk_upload', (data: { file_id?: number }) => {
      if (data.file_id) {
        socket.leave('bulk_upload:' + data.file_id);
        console.log('📡 User ' + socket.userId + ' unsubscribed from bulk upload file ' + data.file_id);
      } else {
        socket.leave('bulk_upload');
        console.log('📡 User ' + socket.userId + ' unsubscribed from all bulk uploads');
      }
    });

    // NEW: Subscribe to specific bulk upload job (TypeScript orchestrator)
    socket.on('subscribe_bulk_upload_job', (data: { job_id: string }) => {
      if (data.job_id) {
        socket.join('bulk_upload_job:' + data.job_id);
        console.log('📡 User ' + socket.userId + ' subscribed to bulk upload job ' + data.job_id);
      }
    });

    // NEW: Unsubscribe from specific bulk upload job
    socket.on('unsubscribe_bulk_upload_job', (data: { job_id: string }) => {
      if (data.job_id) {
        socket.leave('bulk_upload_job:' + data.job_id);
        console.log('📡 User ' + socket.userId + ' unsubscribed from bulk upload job ' + data.job_id);
      }
    });

    socket.on('get_queue_status', async () => {
      await this.sendQueueStatus(socket);
    });

    socket.on('get_job_history', async (data: { limit: number }) => {
      const history = await this.getJobHistory(data.limit || 50);
      socket.emit('job_history', history);
    });

    socket.on('cancel_job', async (data: { jobId: string }) => {
      await this.cancelJob(data.jobId, socket.userId);
    });

    // Handle events from Python processor (service-to-service)
    if (socket.isServiceConnection) {
      socket.on('bulk_upload_progress', (data: any) => {
        console.log('📊 Received bulk_upload_progress from Python:', data.file_id);
        this.sendBulkUploadProgress(data.file_id, data);
      });

      socket.on('bulk_upload_complete', (data: any) => {
        console.log('✅ Received bulk_upload_complete from Python:', data.file_id);
        this.sendBulkUploadComplete(data.file_id, data);
      });

      socket.on('bulk_upload_error', (data: any) => {
        console.log('❌ Received bulk_upload_error from Python:', data.file_id);
        this.sendBulkUploadError(data.file_id, data.error);
      });

      socket.on('bulk_upload_rows', (data: any) => {
        console.log('📤 Received bulk_upload_rows from Python:', data.file_id, 'rows:', data.total_rows);
        this.sendBulkUploadRows(data.file_id, data);
      });
    }

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected: ' + socket.id);
      this.connectedClients.delete(socket.id);
    });
  };

  private static async sendQueueStatus(socket: any): Promise<void> {
    try {
      const queueLength = await redisService.llen('excel_processing_queue');
      const currentJob = await this.getCurrentJob();
      
      socket.emit('queue_status', {
        queueLength,
        currentJob,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending queue status:', error);
    }
  }

  private static async getCurrentJob(): Promise<any> {
    try {
      const keys = await redisService.keys('job:*');
      for (const key of keys) {
        const job = await redisService.hgetall(key);
        if (job && job.status === 'processing') {
          return {
            id: job.id,
            fileName: job.fileName,
            wardNumber: job.wardNumber,
            progress: parseInt(job.progress) || 0,
            startedAt: job.startedAt
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting current job:', error);
      return null;
    }
  }

  private static async getJobHistory(limit: number): Promise<any[]> {
    try {
      const keys = await redisService.keys('job:*');
      const jobs: any[] = [];

      for (const key of keys.slice(0, limit)) {
        const job = await redisService.hgetall(key);
        if (job && Object.keys(job).length > 0) {
          jobs.push(job);
        }
      }

      return jobs.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error getting job history:', error);
      return [];
    }
  }

  private static async cancelJob(jobId: string, userId: number): Promise<void> {
    try {
      const job = await redisService.hgetall('job:' + jobId);
      if (job && job.status === 'queued') {
        await redisService.hset('job:' + jobId, 'status', 'cancelled');
        
        this.broadcast('job_cancelled', {
          jobId,
          cancelledBy: userId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  }

  static broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.to('file_processing').emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  static sendToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to('user:' + userId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  static getConnectedClients(): number {
    return this.connectedClients.size;
  }

  static isInitialized(): boolean {
    return !!this.io;
  }

  /**
   * Send bulk upload progress update to specific file subscribers
   */
  static sendBulkUploadProgress(file_id: number | string, data: {
    status: string;
    progress: number;
    rows_processed: number;
    rows_total: number;
    message?: string;
    stage?: string; // Processing stage for frontend color coding
  }): void {
    if (this.io) {
      const payload = {
        file_id,
        ...data,
        timestamp: new Date().toISOString()
      };

      // Send to specific file room
      this.io.to('bulk_upload:' + file_id).emit('bulk_upload_progress', payload);

      // Also send to general bulk_upload room for clients not subscribed to specific file
      this.io.to('bulk_upload').emit('bulk_upload_progress', payload);

      console.log('📊 Sent bulk_upload_progress for file ' + file_id + ' to rooms: bulk_upload:' + file_id + ', bulk_upload');
    }
  }

  /**
   * Send bulk upload completion notification
   */
  static sendBulkUploadComplete(file_id: number | string, data: {
    rows_success: number;
    rows_failed: number;
    rows_total: number;
    errors?: any[];
  }): void {
    if (this.io) {
      const payload = {
        file_id,
        ...data,
        timestamp: new Date().toISOString()
      };

      // Send to specific file room
      this.io.to('bulk_upload:' + file_id).emit('bulk_upload_complete', payload);

      // Also send to general bulk_upload room for clients not subscribed to specific file
      this.io.to('bulk_upload').emit('bulk_upload_complete', payload);

      console.log('✅ Sent bulk_upload_complete for file ' + file_id + ' to rooms: bulk_upload:' + file_id + ', bulk_upload');
    }
  }

  /**
   * Send bulk upload error notification
   */
  static sendBulkUploadError(file_id: number, error: string): void {
    if (this.io) {
      const payload = {
        file_id,
        error,
        timestamp: new Date().toISOString()
      };

      // Send to specific file room
      this.io.to('bulk_upload:' + file_id).emit('bulk_upload_error', payload);

      // Also send to general bulk_upload room for clients not subscribed to specific file
      this.io.to('bulk_upload').emit('bulk_upload_error', payload);

      console.log('❌ Sent bulk_upload_error for file ' + file_id + ' to rooms: bulk_upload:' + file_id + ', bulk_upload');
    }
  }

  /**
   * Send all uploaded rows to frontend for display
   */
  static sendBulkUploadRows(file_id: number, data: {
    rows: any[];
    total_rows: number;
  }): void {
    if (this.io) {
      const payload = {
        file_id,
        ...data,
        timestamp: new Date().toISOString()
      };

      // Send to specific file room
      this.io.to('bulk_upload:' + file_id).emit('bulk_upload_rows', payload);

      // Also send to general bulk_upload room for clients not subscribed to specific file
      this.io.to('bulk_upload').emit('bulk_upload_rows', payload);

      console.log('📤 Sent ' + data.total_rows + ' uploaded rows for file ' + file_id + ' to rooms: bulk_upload:' + file_id + ', bulk_upload');
    }
  }

  /**
   * Send IEC API rate limit warning notification
   */
  static sendIECRateLimitWarning(file_id: number, data: {
    current_count: number;
    max_limit: number;
    remaining: number;
    percentage_used: number;
  }): void {
    if (this.io) {
      const payload = {
        file_id,
        ...data,
        timestamp: new Date().toISOString()
      };

      // Send to specific file room
      this.io.to('bulk_upload:' + file_id).emit('iec_rate_limit_warning', payload);

      // Also send to general bulk_upload room
      this.io.to('bulk_upload').emit('iec_rate_limit_warning', payload);

      console.log('⚠️  Sent iec_rate_limit_warning for file ' + file_id + ': ' + data.current_count + '/' + data.max_limit + ' (' + data.remaining + ' remaining)');
    }
  }

  /**
   * Send IEC API rate limit exceeded notification (upload paused)
   */
  static sendIECRateLimitExceeded(file_id: number, data: {
    current_count: number;
    max_limit: number;
    reset_time: number;
    rows_processed: number;
    rows_total: number;
    message: string;
  }): void {
    if (this.io) {
      const payload = {
        file_id,
        ...data,
        timestamp: new Date().toISOString()
      };

      // Send to specific file room
      this.io.to('bulk_upload:' + file_id).emit('iec_rate_limit_exceeded', payload);

      // Also send to general bulk_upload room
      this.io.to('bulk_upload').emit('iec_rate_limit_exceeded', payload);

      console.log('🚫 Sent iec_rate_limit_exceeded for file ' + file_id + ': ' + data.current_count + '/' + data.max_limit + ' (resets at ' + new Date(data.reset_time).toISOString() + ')');
    }
  }

  /**
   * Send bulk upload progress update (NEW - for TypeScript orchestrator)
   */
  static sendBulkUploadJobProgress(jobId: string, userId: string, data: {
    stage: string;
    progress: number;
    message: string;
    status?: string;
  }): void {
    if (this.io) {
      const payload = {
        job_id: jobId,
        stage: data.stage,
        progress: data.progress,
        message: data.message,
        status: data.status || 'processing',
        timestamp: new Date().toISOString()
      };

      // Send to user-specific room
      this.io.to('user:' + userId).emit('bulk_upload_progress', payload);

      // Send to job-specific room
      this.io.to('bulk_upload_job:' + jobId).emit('bulk_upload_progress', payload);

      console.log('📊 Sent bulk_upload_progress for job ' + jobId + ': ' + data.stage + ' (' + data.progress + '%) - ' + data.message);
    }
  }

  /**
   * Send bulk upload completion notification (NEW - for TypeScript orchestrator)
   */
  static sendBulkUploadJobComplete(jobId: string, userId: string, data: {
    status: string;
    validation_stats: any;
    database_stats: any;
    report_path?: string;
    processing_duration_ms: number;
  }): void {
    if (this.io) {
      const payload = {
        job_id: jobId,
        status: data.status,
        validation_stats: data.validation_stats,
        database_stats: data.database_stats,
        report_path: data.report_path,
        processing_duration_ms: data.processing_duration_ms,
        timestamp: new Date().toISOString()
      };

      // Send to user-specific room
      this.io.to('user:' + userId).emit('bulk_upload_complete', payload);

      // Send to job-specific room
      this.io.to('bulk_upload_job:' + jobId).emit('bulk_upload_complete', payload);

      console.log('✅ Sent bulk_upload_complete for job ' + jobId + ': ' + data.status + ' (' + data.processing_duration_ms + 'ms)');
    }
  }

  /**
   * Send bulk upload failure notification (NEW - for TypeScript orchestrator)
   */
  static sendBulkUploadFailed(jobId: string, userId: string, data: {
    error: string;
    stage?: string;
  }): void {
    if (this.io) {
      const payload = {
        job_id: jobId,
        error: data.error,
        stage: data.stage,
        status: 'failed',
        timestamp: new Date().toISOString()
      };

      // Send to user-specific room
      this.io.to('user:' + userId).emit('bulk_upload_failed', payload);

      // Send to job-specific room
      this.io.to('bulk_upload_job:' + jobId).emit('bulk_upload_failed', payload);

      console.log('❌ Sent bulk_upload_failed for job ' + jobId + ': ' + data.error);
    }
  }

  /**
   * Get Socket.IO instance for direct access
   */
  static getIO(): SocketIOServer | undefined {
    return this.io;
  }
}
