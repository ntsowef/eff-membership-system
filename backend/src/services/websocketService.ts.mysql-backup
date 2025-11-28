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
      const token = socket.handshake.auth.token ||
                   socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Use the same verifyToken function as REST API to ensure consistency
      const decoded = verifyToken(token);
      socket.userId = decoded.id; // Note: JWT payload uses 'id', not 'userId'
      socket.userRole = decoded.role_name;
      socket.userType = decoded.admin_level;

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('WebSocket authentication failed:', errorMessage);
      next(new Error('Invalid authentication token'));
    }
  };

  private static handleConnection = (socket: any) => {
    console.log(`🔌 Client connected: ${socket.id} (User: ${socket.userId})`);
    
    this.connectedClients.set(socket.id, {
      userId: socket.userId,
      userRole: socket.userRole,
      userType: socket.userType,
      connectedAt: new Date().toISOString()
    });

    // Join user-specific room
    socket.join(`user:${socket.userId}`);
    
    // Handle file processing subscriptions
    socket.on('subscribe_file_processing', () => {
      socket.join('file_processing');
      console.log(`📡 User ${socket.userId} subscribed to file processing updates`);
      
      // Send current queue status immediately
      this.sendQueueStatus(socket);
    });

    socket.on('unsubscribe_file_processing', () => {
      socket.leave('file_processing');
      console.log(`📡 User ${socket.userId} unsubscribed from file processing updates`);
    });

    socket.on('get_queue_status', async () => {
      await this.sendQueueStatus(socket);
    });

    socket.on('get_job_history', async (data: { limit?: number }) => {
      const history = await this.getJobHistory(data.limit || 50);
      socket.emit('job_history', history);
    });

    socket.on('cancel_job', async (data: { jobId: string }) => {
      await this.cancelJob(data.jobId, socket.userId);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
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
      const job = await redisService.hgetall(`job:${jobId}`);
      if (job && job.status === 'queued') {
        await redisService.hset(`job:${jobId}`, 'status', 'cancelled');
        
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
      this.io.to(`user:${userId}`).emit(event, {
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
}
