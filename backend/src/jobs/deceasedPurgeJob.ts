/**
 * Deceased Member Purge Cron Job
 *
 * Triggers the monthly IEC deceased-member scan on the 1st of every month at 01:00 SAST.
 * The monthly file archive job runs at the same time (01:00) but archives uploads first;
 * this job is the main purge driver.
 *
 * Schedule: 0 1 1 * * (01:00 on the 1st of every month)
 * Timezone: Africa/Johannesburg (SAST, UTC+2)
 */

import * as cron from 'node-cron';
import { DeceasedPurgeService } from '../services/deceasedPurgeService';
import logger from '../utils/logger';

export class DeceasedPurgeJob {
  private static task: cron.ScheduledTask | null = null;

  /**
   * Start the monthly cron job.
   */
  static start(): void {
    if (this.task) {
      logger.warn('⚠️  Deceased purge job already running');
      return;
    }

    // "0 1 1 * *" = 01:00 on the 1st of every month
    this.task = cron.schedule('0 1 1 * *', async () => {
      logger.info('💀 [DeceasedPurgeJob] Monthly run triggered by cron');
      try {
        const result = await DeceasedPurgeService.startRun();
        logger.info(`💀 [DeceasedPurgeJob] ${result.message} (run_id=${result.run_id})`);
      } catch (err) {
        logger.error('❌ [DeceasedPurgeJob] Failed to start monthly run:', { error: err });
      }
    }, {
      timezone: 'Africa/Johannesburg'
    });

    logger.info('💀 Deceased Purge Job started (runs on the 1st of every month at 01:00 SAST)');
  }

  /**
   * Stop the cron job.
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('🛑 Deceased Purge Job stopped');
    }
  }

  /**
   * Manually trigger a purge run (bypasses cron schedule).
   */
  static async runNow(triggeredBy?: number): Promise<{ run_id: number; message: string }> {
    logger.info('💀 [DeceasedPurgeJob] Manual trigger');
    return DeceasedPurgeService.startRun(triggeredBy);
  }

  /**
   * Get job status.
   */
  static getStatus(): { isRunning: boolean; schedule: string; timezone: string } {
    return {
      isRunning: this.task !== null,
      schedule: '0 1 1 * * (1st of every month at 01:00 AM)',
      timezone: 'Africa/Johannesburg'
    };
  }
}

export default DeceasedPurgeJob;
