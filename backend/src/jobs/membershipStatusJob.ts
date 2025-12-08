/**
 * Membership Status Update Job
 * 
 * This job runs daily at midnight to ensure all membership statuses are up-to-date
 * based on their expiry dates. It serves as a safety net alongside the database trigger.
 * 
 * Business Rules:
 * - Good Standing (status_id=8): expiry_date >= CURRENT_DATE
 * - Grace Period (status_id=7): expiry_date between CURRENT_DATE-90 days and CURRENT_DATE
 * - Expired (status_id=2): expiry_date < CURRENT_DATE-90 days
 * - Inactive (status_id=6): expiry_date IS NULL
 * 
 * Note: Does NOT override manual statuses (Suspended, Cancelled, Pending)
 */

import * as cron from 'node-cron';
import { executeQuery } from '../config/database';
import logger from '../utils/logger';

interface StatusUpdateResult {
  updated: number;
  errors: number;
  details: {
    to_good_standing: number;
    to_grace_period: number;
    to_expired: number;
    to_inactive: number;
  };
}

export class MembershipStatusJob {
  private static task: cron.ScheduledTask | null = null;

  /**
   * Start the membership status update job
   * Runs daily at midnight (00:00)
   */
  static start(): void {
    if (this.task) {
      logger.warn('⚠️  Membership status job already running');
      return;
    }

    // Run daily at midnight: 0 0 * * *
    // For testing, you can use: */5 * * * * (every 5 minutes)
    this.task = cron.schedule('0 0 * * *', async () => {
      logger.info('🔄 Running membership status update job...');
      try {
        const result = await this.updateMembershipStatuses();
        if (result.updated > 0 || result.errors > 0) {
          logger.info(`✅ Membership status job completed: ${result.updated} updated, ${result.errors} errors`, result.details);
        } else {
          logger.info('✅ Membership status job completed: No updates needed');
        }
      } catch (error) {
        logger.error('❌ Membership status job failed:', { error });
      }
    });

    logger.info('✅ Membership status job started (runs daily at midnight)');
  }

  /**
   * Run the job immediately (useful for testing or manual trigger)
   */
  static async runNow(): Promise<StatusUpdateResult> {
    logger.info('🔄 Running membership status update job (manual trigger)...');
    try {
      const result = await this.updateMembershipStatuses();
      logger.info(`✅ Membership status job completed: ${result.updated} updated, ${result.errors} errors`, result.details);
      return result;
    } catch (error) {
      logger.error('❌ Membership status job failed:', { error });
      throw error;
    }
  }

  /**
   * Stop the membership status update job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('🛑 Membership status job stopped');
    }
  }

  /**
   * Update membership statuses based on expiry dates
   * Returns the number of records updated
   */
  private static async updateMembershipStatuses(): Promise<StatusUpdateResult> {
    const result: StatusUpdateResult = {
      updated: 0,
      errors: 0,
      details: {
        to_good_standing: 0,
        to_grace_period: 0,
        to_expired: 0,
        to_inactive: 0,
      },
    };

    try {
      // Update to Active (status_id=1)
      const activeResult = await executeQuery(`
        UPDATE members_consolidated
        SET
          membership_status_id = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE
          expiry_date >= CURRENT_DATE
          AND membership_status_id NOT IN (3, 4, 5) -- Don't override Suspended, Cancelled, Pending
          AND membership_status_id != 1
      `);
      result.details.to_good_standing = activeResult.rowCount || 0;

      // Update to Grace Period (status_id=7)
      const gracePeriodResult = await executeQuery(`
        UPDATE members_consolidated
        SET
          membership_status_id = 7,
          updated_at = CURRENT_TIMESTAMP
        WHERE
          expiry_date >= CURRENT_DATE - INTERVAL '90 days'
          AND expiry_date < CURRENT_DATE
          AND membership_status_id NOT IN (3, 4, 5) -- Don't override Suspended, Cancelled, Pending
          AND membership_status_id != 7
      `);
      result.details.to_grace_period = gracePeriodResult.rowCount || 0;

      // Update to Expired (status_id=2)
      const expiredResult = await executeQuery(`
        UPDATE members_consolidated
        SET
          membership_status_id = 2,
          updated_at = CURRENT_TIMESTAMP
        WHERE
          expiry_date < CURRENT_DATE - INTERVAL '90 days'
          AND membership_status_id NOT IN (3, 4, 5) -- Don't override Suspended, Cancelled, Pending
          AND membership_status_id != 2
      `);
      result.details.to_expired = expiredResult.rowCount || 0;

      // Update to Inactive (status_id=6) for members with no expiry date
      const inactiveResult = await executeQuery(`
        UPDATE members_consolidated
        SET
          membership_status_id = 6,
          updated_at = CURRENT_TIMESTAMP
        WHERE
          expiry_date IS NULL
          AND membership_status_id NOT IN (3, 4, 5) -- Don't override Suspended, Cancelled, Pending
          AND membership_status_id != 6
      `);
      result.details.to_inactive = inactiveResult.rowCount || 0;

      result.updated = 
        result.details.to_good_standing +
        result.details.to_grace_period +
        result.details.to_expired +
        result.details.to_inactive;

    } catch (error) {
      logger.error('Error updating membership statuses:', { error });
      result.errors++;
      throw error;
    }

    return result;
  }
}

export default MembershipStatusJob;

