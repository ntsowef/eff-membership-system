/**
 * Birthday Message Cron Job
 *
 * Sends birthday SMS messages to members every day at 08:00:00 (Africa/Johannesburg).
 * After completion, sends a summary report email to all National Administrator users.
 * Uses node-cron for reliable scheduling that won't drift or miss executions.
 *
 * Schedule: 0 8 * * * (daily at 08:00)
 * Timezone: Africa/Johannesburg (SAST, UTC+2)
 */

import * as cron from 'node-cron';
import BirthdaySMSService from '../services/birthdaySMSService';
import { emailService } from '../services/emailService';
import { executeQuery } from '../config/database';
import logger from '../utils/logger';

interface BirthdayJobResult {
  queued: number;
  skipped: number;
  errors: number;
  executedAt: string;
}

export class BirthdayMessageJob {
  private static task: cron.ScheduledTask | null = null;
  private static lastRunResult: BirthdayJobResult | null = null;

  /**
   * Start the birthday message cron job
   * Runs every day at 08:00:00 Africa/Johannesburg time
   */
  static start(): void {
    if (this.task) {
      logger.warn('⚠️  Birthday message job already running');
      return;
    }

    // Run daily at 08:00 AM SAST: 0 8 * * *
    this.task = cron.schedule('0 8 * * *', async () => {
      logger.info('🎂 Running daily birthday message job at 08:00...');
      try {
        const result = await BirthdaySMSService.queueTodaysBirthdayMessages();

        this.lastRunResult = {
          ...result,
          executedAt: new Date().toISOString()
        };

        if (result.queued > 0 || result.errors > 0) {
          logger.info(
            `🎂 Birthday message job completed: ${result.queued} sent, ${result.skipped} skipped, ${result.errors} errors`
          );
        } else {
          logger.info('🎂 Birthday message job completed: No birthdays today or all already sent');
        }

        // Send summary report email to all National Admin users
        await this.sendCompletionEmailToNationalAdmins(this.lastRunResult);
      } catch (error) {
        logger.error('❌ Birthday message job failed:', { error });
      }
    }, {
      timezone: 'Africa/Johannesburg'
    });

    logger.info('✅ Birthday message job started (runs daily at 08:00 SAST)');
  }

  /**
   * Run the job immediately (useful for testing or manual trigger)
   */
  static async runNow(): Promise<BirthdayJobResult> {
    logger.info('🎂 Running birthday message job (manual trigger)...');
    try {
      const result = await BirthdaySMSService.queueTodaysBirthdayMessages();

      this.lastRunResult = {
        ...result,
        executedAt: new Date().toISOString()
      };

      logger.info(
        `🎂 Birthday message job completed: ${result.queued} sent, ${result.skipped} skipped, ${result.errors} errors`
      );

      // Send summary report email to all National Admin users
      await this.sendCompletionEmailToNationalAdmins(this.lastRunResult);

      return this.lastRunResult;
    } catch (error) {
      logger.error('❌ Birthday message job failed:', { error });
      throw error;
    }
  }

  /**
   * Stop the birthday message cron job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('🛑 Birthday message job stopped');
    }
  }

  /**
   * Get the job status including last run info
   */
  static getStatus(): {
    isRunning: boolean;
    schedule: string;
    timezone: string;
    lastRunResult: BirthdayJobResult | null;
  } {
    return {
      isRunning: this.task !== null,
      schedule: '0 8 * * * (daily at 08:00)',
      timezone: 'Africa/Johannesburg',
      lastRunResult: this.lastRunResult
    };
  }

  /**
   * Fetch all active National Administrator user emails
   */
  private static async getNationalAdminEmails(): Promise<string[]> {
    try {
      const rows = await executeQuery(`
        SELECT u.email
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_code = 'NATIONAL_ADMIN'
          AND u.is_active = true
          AND u.email IS NOT NULL
          AND u.email != ''
      `);

      const results = Array.isArray(rows) ? rows : [];
      return results.map((row: any) => row.email).filter(Boolean);
    } catch (error) {
      logger.error('Failed to fetch national admin emails', { error });
      return [];
    }
  }

  /**
   * Send a birthday job completion summary email to all National Admin users
   */
  private static async sendCompletionEmailToNationalAdmins(result: BirthdayJobResult): Promise<void> {
    try {
      const adminEmails = await this.getNationalAdminEmails();

      if (adminEmails.length === 0) {
        logger.warn('🎂 No national admin users found to send birthday report email');
        return;
      }

      const today = new Date().toLocaleDateString('en-ZA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Africa/Johannesburg'
      });

      const totalProcessed = result.queued + result.skipped + result.errors;
      const statusColor = result.errors > 0 ? '#DC143C' : '#28a745';
      const statusText = result.errors > 0 ? 'Completed with Errors' : 'Completed Successfully';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #DC143C; color: white; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; }
            .content { padding: 30px; background-color: #f9f9f9; border: 1px solid #ddd; }
            .stats-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .stats-table th, .stats-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
            .stats-table th { background-color: #DC143C; color: white; }
            .stats-table tr:nth-child(even) { background-color: #f2f2f2; }
            .status-badge { display: inline-block; padding: 5px 12px; border-radius: 4px; color: white; font-weight: bold; font-size: 14px; }
            .footer { padding: 15px 20px; text-align: center; font-size: 12px; color: #888; background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎂 Daily Birthday Messages Report</h1>
              <p style="margin: 5px 0 0;">${today}</p>
            </div>
            <div class="content">
              <p>Good morning,</p>
              <p>The daily birthday message job has completed. Below is the summary:</p>

              <p>
                <strong>Status:</strong>
                <span class="status-badge" style="background-color: ${statusColor};">${statusText}</span>
              </p>

              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>📋 Total Birthdays Processed</td>
                    <td><strong>${totalProcessed}</strong></td>
                  </tr>
                  <tr>
                    <td>✅ Messages Sent Successfully</td>
                    <td><strong style="color: #28a745;">${result.queued}</strong></td>
                  </tr>
                  <tr>
                    <td>⏭️ Skipped (Already Sent)</td>
                    <td><strong style="color: #6c757d;">${result.skipped}</strong></td>
                  </tr>
                  <tr>
                    <td>❌ Failed</td>
                    <td><strong style="color: #DC143C;">${result.errors}</strong></td>
                  </tr>
                </tbody>
              </table>

              <p><strong>Executed at:</strong> ${new Date(result.executedAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>

              ${result.errors > 0 ? `
              <p style="color: #DC143C; font-weight: bold;">
                ⚠️ There were ${result.errors} error(s) during processing. Please check the system logs for details.
              </p>
              ` : ''}

              <p style="margin-top: 20px; font-style: italic; color: #666;">
                This is an automated report from the EFF Membership Management System.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Economic Freedom Fighters — Membership Management System</p>
              <p><em>Economic Freedom In Our Lifetime!</em></p>
            </div>
          </div>
        </body>
        </html>
      `;

      const sent = await emailService.sendEmail({
        to: adminEmails,
        subject: `🎂 Birthday Messages Report — ${today} | ${result.queued} Sent, ${result.errors} Failed`,
        html: htmlContent,
        text: `Birthday Messages Report - ${today}\n\nStatus: ${statusText}\nTotal Processed: ${totalProcessed}\nSent: ${result.queued}\nSkipped: ${result.skipped}\nFailed: ${result.errors}\nExecuted at: ${result.executedAt}`
      });

      if (sent) {
        logger.info(`📧 Birthday report email sent to ${adminEmails.length} national admin(s)`);
      } else {
        logger.error('📧 Failed to send birthday report email to national admins');
      }
    } catch (error) {
      // Don't let email failure crash the job — log and continue
      logger.error('📧 Error sending birthday report email to national admins', { error });
    }
  }
}

export default BirthdayMessageJob;

