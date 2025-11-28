/**
 * Bulk Upload File Monitor Service
 * 
 * Monitors a directory for new bulk upload Excel files and automatically
 * queues them for processing with:
 * - Chokidar-based file system watching
 * - File validation and filtering
 * - Duplicate detection
 * - Automatic queue integration
 * - WebSocket notifications
 * - Configurable watch patterns
 */

import chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { addBulkUploadJob } from './bulkUploadQueueService';
import { WebSocketService } from '../websocketService';
import { getPool } from '../../config/database-hybrid';
import { BulkUploadLogger } from './bulkUploadLogger';

// Configuration interface
interface MonitorConfig {
  watchDir: string;
  enabled: boolean;
  filePatterns: string[];
  ignorePatterns: string[];
  stabilityThreshold: number; // ms to wait for file to stabilize
  pollInterval: number; // ms between stability checks
  defaultUploadedBy: string;
  defaultUserId: string;
}

// Get configuration from environment
const getMonitorConfig = (): MonitorConfig => ({
  watchDir: process.env.BULK_UPLOAD_WATCH_DIR || path.join(process.cwd(), '_bulk_upload_watch'),
  enabled: process.env.BULK_UPLOAD_MONITOR_ENABLED !== 'false',
  filePatterns: ['*.xlsx', '*.xls'],
  ignorePatterns: [
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*~',
    '**/*.tmp',
    '**/~$*', // Excel temp files
    '**/processed/**',
    '**/failed/**',
    '**/archive/**'
  ],
  stabilityThreshold: 5000, // Wait 5 seconds for file to stabilize
  pollInterval: 100,
  defaultUploadedBy: 'file-monitor',
  defaultUserId: 'system'
});

export class BulkUploadFileMonitor {
  private static instance: BulkUploadFileMonitor;
  private watcher: chokidar.FSWatcher | null = null;
  private config: MonitorConfig;
  private isRunning: boolean = false;
  private processingFiles: Set<string> = new Set();

  private constructor() {
    this.config = getMonitorConfig();
  }

  public static getInstance(): BulkUploadFileMonitor {
    if (!BulkUploadFileMonitor.instance) {
      BulkUploadFileMonitor.instance = new BulkUploadFileMonitor();
    }
    return BulkUploadFileMonitor.instance;
  }

  /**
   * Start monitoring the watch directory
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('📁 Bulk upload file monitor is disabled');
      return;
    }

    if (this.isRunning) {
      console.log('📁 Bulk upload file monitor is already running');
      return;
    }

    // Ensure watch directory exists
    try {
      await fs.mkdir(this.config.watchDir, { recursive: true });
      console.log(`📁 Created watch directory: ${this.config.watchDir}`);
    } catch (error) {
      console.error('❌ Failed to create watch directory:', error);
      throw error;
    }

    // Initialize chokidar watcher
    this.watcher = chokidar.watch(this.config.watchDir, {
      ignored: this.config.ignorePatterns,
      persistent: true,
      ignoreInitial: false, // Process existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval
      },
      depth: 1 // Only watch immediate subdirectories
    });

    // Set up event handlers
    this.watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => this.handleReady());

    this.isRunning = true;
    console.log(`📁 Bulk upload file monitor started`);
    console.log(`   Watch directory: ${this.config.watchDir}`);
    console.log(`   File patterns: ${this.config.filePatterns.join(', ')}`);
  }

  /**
   * Handle file added event
   */
  private async handleFileAdded(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Filter by extension
    if (!['.xlsx', '.xls'].includes(ext)) {
      console.log(`📄 Ignoring non-Excel file: ${fileName}`);
      return;
    }

    // Check if already processing
    if (this.processingFiles.has(filePath)) {
      console.log(`📄 File already being processed: ${fileName}`);
      return;
    }

    this.processingFiles.add(filePath);

    try {
      console.log(`📄 New file detected: ${fileName}`);

      // Validate file
      const validation = await this.validateFile(filePath);
      if (!validation.valid) {
        console.error(`❌ File validation failed: ${fileName} - ${validation.error}`);

        // Log validation failure
        await BulkUploadLogger.logFileValidationFailed(
          fileName,
          validation.error || 'Validation failed'
        );

        await this.moveToFailed(filePath, validation.error || 'Validation failed');
        return;
      }

      // Check for duplicate
      const isDuplicate = await this.checkDuplicate(fileName);
      if (isDuplicate) {
        console.warn(`⚠️ Duplicate file detected: ${fileName}`);

        // Log duplicate detection
        await BulkUploadLogger.logDuplicateDetected(fileName, 'existing-job');

        await this.moveToFailed(filePath, 'Duplicate file');
        return;
      }

      // Generate job ID
      const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // Log file detection
      await BulkUploadLogger.logFileDetection(
        jobId,
        fileName,
        validation.fileSize || 0,
        this.config.watchDir
      );

      // Add to queue
      await addBulkUploadJob({
        jobId,
        filePath,
        fileName,
        uploadedBy: this.config.defaultUploadedBy,
        userId: this.config.defaultUserId,
        userRole: 'system'
      }, 5); // Medium priority for auto-detected files

      // Create initial database record
      const pool = getPool();
      await pool.query(
        `INSERT INTO bulk_upload_jobs (
          job_id, file_name, uploaded_by, status, uploaded_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [jobId, fileName, this.config.defaultUploadedBy, 'pending']
      );

      // Send WebSocket notification
      WebSocketService.sendBulkUploadProgress(jobId, {
        progress: 0,
        rows_processed: 0,
        rows_total: 0,
        message: `File detected and queued: ${fileName}`,
        status: 'pending'
      });

      console.log(`✅ File queued for processing: ${fileName} (Job ID: ${jobId})`);

      // Move to processed directory (will be deleted by worker after processing)
      // For now, keep in place for worker to process

    } catch (error: any) {
      console.error(`❌ Error processing file ${fileName}:`, error.message);
      await this.moveToFailed(filePath, error.message);
    } finally {
      this.processingFiles.delete(filePath);
    }
  }

  /**
   * Validate file
   */
  private async validateFile(filePath: string): Promise<{ valid: boolean; error?: string; fileSize?: number }> {
    try {
      // Check file exists
      const stats = await fs.stat(filePath);

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (stats.size > maxSize) {
        return { valid: false, error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 50MB)`, fileSize: stats.size };
      }

      // Check file size (min 1KB)
      if (stats.size < 1024) {
        return { valid: false, error: 'File too small (min 1KB)', fileSize: stats.size };
      }

      // Check file is readable
      await fs.access(filePath, fs.constants.R_OK);

      return { valid: true, fileSize: stats.size };

    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check if file is duplicate (already processed or in queue)
   */
  private async checkDuplicate(fileName: string): Promise<boolean> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM bulk_upload_jobs
         WHERE file_name = $1
         AND status IN ('pending', 'processing', 'completed')
         AND uploaded_at > NOW() - INTERVAL '24 hours'`,
        [fileName]
      );

      return parseInt(result.rows[0].count) > 0;

    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false; // Allow processing if check fails
    }
  }

  /**
   * Move file to failed directory
   */
  private async moveToFailed(filePath: string, reason: string): Promise<void> {
    try {
      const failedDir = path.join(this.config.watchDir, 'failed');
      await fs.mkdir(failedDir, { recursive: true });

      const fileName = path.basename(filePath);
      const timestamp = Date.now();
      const newPath = path.join(failedDir, `${timestamp}_${fileName}`);

      await fs.rename(filePath, newPath);

      // Create error log
      const errorLog = path.join(failedDir, `${timestamp}_${fileName}.error.txt`);
      await fs.writeFile(errorLog, `Error: ${reason}\nTimestamp: ${new Date().toISOString()}\n`);

      console.log(`📁 Moved failed file to: ${newPath}`);

    } catch (error) {
      console.error('Error moving file to failed directory:', error);
    }
  }

  /**
   * Handle watcher error
   */
  private handleError(error: Error): void {
    console.error('📁 File watcher error:', error);
  }

  /**
   * Handle watcher ready
   */
  private handleReady(): void {
    console.log('📁 Bulk upload file monitor ready');
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.isRunning = false;
    console.log('📁 Bulk upload file monitor stopped');
  }

  /**
   * Get monitor status
   */
  getStatus(): { isRunning: boolean; watchDir: string; enabled: boolean } {
    return {
      isRunning: this.isRunning,
      watchDir: this.config.watchDir,
      enabled: this.config.enabled
    };
  }

  /**
   * Get watch directory
   */
  getWatchDirectory(): string {
    return this.config.watchDir;
  }

  /**
   * Check if monitor is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Manually trigger file processing
   */
  async processFile(filePath: string, uploadedBy: string, userId: string): Promise<string> {
    const fileName = path.basename(filePath);

    // Validate file
    const validation = await this.validateFile(filePath);
    if (!validation.valid) {
      throw new Error(validation.error || 'File validation failed');
    }

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Add to queue
    await addBulkUploadJob({
      jobId,
      filePath,
      fileName,
      uploadedBy,
      userId,
      userRole: 'manual'
    }, 1); // High priority for manual triggers

    // Create initial database record
    const pool = getPool();
    await pool.query(
      `INSERT INTO bulk_upload_jobs (
        job_id, file_name, uploaded_by, status, uploaded_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [jobId, fileName, uploadedBy, 'pending']
    );

    console.log(`✅ File manually queued: ${fileName} (Job ID: ${jobId})`);

    return jobId;
  }
}

