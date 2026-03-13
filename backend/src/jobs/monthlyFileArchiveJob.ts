/**
 * Monthly File Archive Cron Job
 *
 * Scans the uploads directory, creates a tar.gz archive of all files found,
 * and stores it in a dedicated `archive` directory.
 *
 * Schedule: 0 1 1 * * (1st of every month at 01:00 AM)
 * Timezone: Africa/Johannesburg (SAST, UTC+2)
 */

import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import logger from '../utils/logger';

export class MonthlyFileArchiveJob {
  private static task: cron.ScheduledTask | null = null;

  private static get UPLOAD_DIR(): string {
    const repoRoot = path.join(__dirname, '..', '..', '..');
    return path.join(repoRoot, process.env.UPLOAD_DIR || '_upload_file_directory');
  }

  private static get ARCHIVE_DIR(): string {
    const repoRoot = path.join(__dirname, '..', '..', '..');
    return path.join(repoRoot, process.env.ARCHIVE_DIR || '_upload_archive');
  }

  /**
   * Start the monthly archive cron job.
   * Runs at 01:00 AM on the 1st of every month.
   */
  static start(): void {
    if (this.task) {
      logger.warn('⚠️  Monthly file archive job already running');
      return;
    }

    // Cron: minute hour day-of-month month day-of-week
    // "0 1 1 * *" = 01:00 AM on the 1st of every month
    this.task = cron.schedule('0 1 1 * *', async () => {
      logger.info('📦 Running monthly file archive job...');
      try {
        await MonthlyFileArchiveJob.runNow();
      } catch (error) {
        logger.error('❌ Monthly file archive job failed:', { error });
      }
    }, {
      timezone: 'Africa/Johannesburg'
    });

    logger.info('✅ Monthly file archive job started (runs on the 1st of every month at 01:00 SAST)');
  }

  /**
   * Run the archive job immediately (useful for testing or manual trigger).
   */
  static async runNow(): Promise<{ archivePath: string; fileCount: number; archiveSizeBytes: number }> {
    const uploadDir = this.UPLOAD_DIR;
    const archiveDir = this.ARCHIVE_DIR;

    // Ensure archive directory exists
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
      logger.info(`📁 Created archive directory: ${archiveDir}`);
    }

    // Scan the upload directory for files
    if (!fs.existsSync(uploadDir)) {
      logger.warn(`⚠️  Upload directory does not exist: ${uploadDir}. Nothing to archive.`);
      return { archivePath: '', fileCount: 0, archiveSizeBytes: 0 };
    }

    const files = fs.readdirSync(uploadDir).filter(f => {
      const filePath = path.join(uploadDir, f);
      return fs.statSync(filePath).isFile();
    });

    if (files.length === 0) {
      logger.info('📦 Monthly archive: No files found in upload directory. Skipping.');
      return { archivePath: '', fileCount: 0, archiveSizeBytes: 0 };
    }

    logger.info(`📦 Monthly archive: Found ${files.length} file(s) to archive.`);

    // Create a timestamped archive filename
    const now = new Date();
    const label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const archiveFilename = `uploads_archive_${label}.tar.gz`;
    const archivePath = path.join(archiveDir, archiveFilename);

    // Create the tar.gz archive
    await tar.c(
      {
        gzip: true,
        file: archivePath,
        cwd: uploadDir,
      },
      files
    );

    const archiveSizeBytes = fs.statSync(archivePath).size;

    logger.info(
      `✅ Monthly archive created: ${archiveFilename} | ` +
      `${files.length} files | ${(archiveSizeBytes / 1024 / 1024).toFixed(2)} MB`
    );

    return { archivePath, fileCount: files.length, archiveSizeBytes };
  }

  /**
   * Stop the cron job.
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('🛑 Monthly file archive job stopped');
    }
  }

  /**
   * Get a simple status report.
   */
  static getStatus(): { isRunning: boolean; schedule: string; timezone: string } {
    return {
      isRunning: this.task !== null,
      schedule: '0 1 1 * * (1st of every month at 01:00 AM)',
      timezone: 'Africa/Johannesburg',
    };
  }
}

export default MonthlyFileArchiveJob;
