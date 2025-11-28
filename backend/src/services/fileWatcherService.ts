import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { redisService } from './redisService';
import { executeQuery } from '../config/database';

export interface FileProcessingJob {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  wardNumber?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  result?: any;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  userId?: number;
  priority: number;
}

export class FileWatcherService {
  private static instance: FileWatcherService;
  private watcher: chokidar.FSWatcher | null = null;
  private uploadDir: string;
  private isRunning: boolean = false;

  private constructor() {
    this.uploadDir = path.resolve('./uploads/excel-processing');
  }

  public static getInstance(): FileWatcherService {
    if (!FileWatcherService.instance) {
      FileWatcherService.instance = new FileWatcherService();
    }
    return FileWatcherService.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    // Ensure upload directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });
    console.log('📁 Created upload directory: ' + this.uploadDir + '');

    this.watcher = chokidar.watch(this.uploadDir, {
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        '**/processed/**', // ignore processed subdirectory and all its contents
        '**/*_processed*.xlsx', // ignore any files with "_processed" in the name
        '**/*_report.txt' // ignore report files
      ],
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 3000, // Wait 3 seconds for file to stabilize
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('error', (error) => console.error('📁 File watcher error:', error))
      .on('ready', () => console.log('📁 File watcher ready'));

    this.isRunning = true;
    console.log('📁 File watcher started monitoring: ' + this.uploadDir + '');
  }

  private async handleFileAdded(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();

    if (!['.xlsx', '.xls'].includes(ext)) {
      console.log('📄 Ignoring non-Excel file: ' + path.basename(filePath) + '');
      return;
    }

    try {
      const fileName = path.basename(filePath);

      // Check if this file is already being processed or queued
      const existingJob = await this.checkExistingJob(fileName);
      if (existingJob) {
        console.log('📄 File already queued or processing: ${fileName} (Job ID: ' + existingJob.id + ')');
        return;
      }

      const fileStats = await fs.stat(filePath);

      // Extract ward number from filename
      const wardNumber = this.extractWardNumber(fileName);

      const job: FileProcessingJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        fileName,
        filePath,
        fileSize: fileStats.size,
        wardNumber,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        priority: 1
      };

      // Store job in database
      await this.storeJobInDatabase(job);

      // Add to Redis queue
      await redisService.lpush('excel_processing_queue', JSON.stringify(job));
      await redisService.hset('job:' + job.id + '', job as any);

      console.log('📄 Excel file queued for processing: ${fileName} (Ward: ' + wardNumber + ')');

      // Broadcast to WebSocket (will be handled by WebSocketService)
      const { WebSocketService } = await import('./websocketService');
      WebSocketService.broadcast('file_queued', {
        jobId: job.id,
        fileName: job.fileName,
        wardNumber: job.wardNumber,
        status: 'queued',
        timestamp: job.createdAt
      });

    } catch (error) {
      console.error('📄 Error handling file:', error);
    }
  }

  private async checkExistingJob(fileName: string): Promise<FileProcessingJob | null> {
    try {
      // Check database for existing job with same filename that's not completed or failed
      const query = `
        SELECT * FROM file_processing_jobs
        WHERE file_name = ? AND status IN ('queued', 'processing')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const results = await executeQuery(query, [fileName]);
      return results.length > 0 ? results[0]  : null;
    } catch (error) {
      console.error('Error checking existing job:', error);
      return null;
    }
  }

  private extractWardNumber(fileName: string): number {
    // Extract ward number from filename patterns like "WARD 16", "WARD_16", etc.
    const wardMatch = fileName.toUpperCase().match(/WARD[_\s]*(\d+)/);
    if (wardMatch) {
      return parseInt(wardMatch[1]);
    }
    
    // Default ward number if not found
    return 93501016;
  }

  private async storeJobInDatabase(job: FileProcessingJob): Promise<void> {
    const query = `
      INSERT INTO file_processing_jobs (
        job_uuid, file_name, file_path, file_size, ward_number,
        status, progress, created_at, priority, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(query, [
      job.id,
      job.fileName,
      job.filePath,
      job.fileSize,
      job.wardNumber,
      job.status,
      job.progress,
      job.createdAt,
      job.priority,
      job.userId || null
    ]);
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.isRunning = false;
    console.log('📁 File watcher stopped');
  }

  getUploadDirectory(): string {
    return this.uploadDir;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Manually queue a file for processing with user tracking
   * This is used when files are created programmatically (e.g., ward audit exports)
   */
  async queueFileForProcessing(filePath: string, userId?: number): Promise<string> {
    try {
      const fileName = path.basename(filePath);
      const fileStats = await fs.stat(filePath);

      // Extract ward number from filename
      const wardNumber = this.extractWardNumber(fileName);

      const job: FileProcessingJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        fileName,
        filePath,
        fileSize: fileStats.size,
        wardNumber,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        priority: 1,
        userId
      };

      // Store job in database
      await this.storeJobInDatabase(job);

      // Add to Redis queue
      await redisService.lpush('excel_processing_queue', JSON.stringify(job));
      await redisService.hset('job:' + job.id + '', job as any);

      console.log('📄 Excel file manually queued for processing: ${fileName} (Ward: ${wardNumber}, User: ' + userId + ')');

      // Broadcast to WebSocket
      const { WebSocketService } = await import('./websocketService');
      WebSocketService.broadcast('file_queued', {
        jobId: job.id,
        fileName: job.fileName,
        wardNumber: job.wardNumber,
        status: 'queued',
        userId: job.userId,
        timestamp: job.createdAt
      });

      return job.id;
    } catch (error) {
      console.error('📄 Error manually queuing file:', error);
      throw error;
    }
  }
}
