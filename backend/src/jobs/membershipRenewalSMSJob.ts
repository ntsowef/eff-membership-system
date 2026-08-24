import * as cron from 'node-cron';
import { MembershipRenewalSMSService } from '../services/membershipRenewalSMSService';
import { logger } from '../utils/logger';

export class MembershipRenewalSMSJob {
    private static job: cron.ScheduledTask | null = null;

    /**
     * Start the scheduled job for sending automated renewal SMS reminders.
     * Runs every Friday between 7:00 - 8:00 AM (starts at 7:00 AM).
     * Prioritises recently expired members first.
     */
    static start() {
        // ⛔ DISABLED: Membership expiry SMS sending is disabled as of 2026-08-14
        logger.info('MembershipRenewalSMSJob is DISABLED. Skipping start.');
        return;

        if (this.job) {
            logger.warn('MembershipRenewalSMSJob is already running.');
            return;
        }

        logger.info('Starting MembershipRenewalSMSJob - Scheduled for Fridays at 07:00');

        // Schedule to run every Friday at 07:00 server time (day 5 = Friday)
        this.job = cron.schedule('0 7 * * 5', async () => {
            logger.info('Executing scheduled MembershipRenewalSMSJob (Friday run)...');

            try {
                // Priority 1: Send reminders to recently expired members first
                await MembershipRenewalSMSService.sendBulkReminders('expired_recently');

                // Priority 2: Send reminders for memberships expiring soon
                await MembershipRenewalSMSService.sendBulkReminders('expiring_7_days');
                await MembershipRenewalSMSService.sendBulkReminders('expiring_30_days');

                // Priority 3: Members expired 30+ days (admins can also trigger manually)
                await MembershipRenewalSMSService.sendBulkReminders('expired_30_plus');

                logger.info('MembershipRenewalSMSJob execution completed successfully.');
            } catch (error: any) {
                logger.error('Error during scheduled MembershipRenewalSMSJob execution:', { error: error.message });
            }
        });
    }

    /**
     * Stop the scheduled job
     */
    static stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            logger.info('MembershipRenewalSMSJob stopped.');
        }
    }
}
