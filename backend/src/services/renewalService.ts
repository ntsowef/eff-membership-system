import { MembershipRenewalModel } from '../models/membershipRenewals';
import { NotificationModel } from '../models/notifications';
import { executeQuery, executeQuerySingle } from '../config/database';

export interface RenewalSettings {
  renewal_fee_amount: number;
  grace_period_days: number;
  late_fee_amount: number;
  early_reminder_days: number;
  due_reminder_days: number;
  overdue_reminder_days: number;
  final_reminder_days: number;
  auto_renewal_enabled: boolean;
  payment_methods: string[];
  renewal_notification_channels: string[];
}

export class RenewalService {
  // Get renewal settings from database
  static async getRenewalSettings(): Promise<RenewalSettings> {
    try {
      const query = `
        SELECT setting_key, setting_value, setting_type 
        FROM renewal_settings 
        WHERE is_active = TRUE
      `;
      
      const settings = await executeQuery(query);
      const settingsMap: any = {};
      
      for (const setting of settings) {
        let value = setting.setting_value;
        
        switch (setting.setting_type) {
          case 'number':
            value = parseFloat(value);
            break;
          case 'boolean':
            value = value.toLowerCase() === 'true';
            break;
          case 'json':
            value = JSON.parse(value);
            break;
          default:
            // string - keep as is
            break;
        }
        
        settingsMap[setting.setting_key] = value;
      }
      
      return {
        renewal_fee_amount: settingsMap.renewal_fee_amount || 10.00,
        grace_period_days: settingsMap.grace_period_days || 30,
        late_fee_amount: settingsMap.late_fee_amount || 5.00,
        early_reminder_days: settingsMap.early_reminder_days || 60,
        due_reminder_days: settingsMap.due_reminder_days || 30,
        overdue_reminder_days: settingsMap.overdue_reminder_days || 7,
        final_reminder_days: settingsMap.final_reminder_days || 21,
        auto_renewal_enabled: settingsMap.auto_renewal_enabled || false,
        payment_methods: settingsMap.payment_methods || ['Cash', 'Bank Transfer'],
        renewal_notification_channels: settingsMap.renewal_notification_channels || ['Email']
      };
    } catch (error) {
      console.error('Failed to get renewal settings:', error);
      // Return default settings
      return {
        renewal_fee_amount: 10.00,
        grace_period_days: 30,
        late_fee_amount: 5.00,
        early_reminder_days: 60,
        due_reminder_days: 30,
        overdue_reminder_days: 7,
        final_reminder_days: 21,
        auto_renewal_enabled: false,
        payment_methods: ['Cash', 'Bank Transfer', 'Credit Card'],
        renewal_notification_channels: ['Email', 'SMS']
      };
    }
  }

  // Process automatic renewals for members with auto-renewal enabled
  static async processAutoRenewals(): Promise<{ processed: number; failed: number; errors: string[] }> {
    try {
      const settings = await this.getRenewalSettings();
      
      if (!settings.auto_renewal_enabled) {
        return { processed: 0, failed: 0, errors: ['Auto renewal is disabled'] };
      }

      // Get renewals that are due and have auto_renewal enabled
      const query = `
        SELECT r.*, m.firstname, m.surname, m.email_address, m.cell_number
        FROM membership_renewals r
        LEFT JOIN members_consolidated m ON r.member_id = m.member_id
        WHERE r.renewal_due_date <= CURRENT_DATE
        AND r.auto_renewal = TRUE
        AND r.renewal_status = 'Pending'
        AND r.payment_status = 'Pending'
        LIMIT 100
      `;

      const autoRenewals = await executeQuery(query);
      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const renewal of autoRenewals) {
        try {
          // Update renewal status to processing
          await MembershipRenewalModel.updateRenewal(renewal.renewal_id, {
            renewal_status: 'Processing'
          });

          // In a real implementation, you would integrate with payment gateway here
          // For now, we'll simulate successful auto-payment
          const autoPaymentSuccess = Math.random() > 0.1; // 90% success rate

          if (autoPaymentSuccess) {
            // Record payment
            await MembershipRenewalModel.createPayment({
              renewal_id: renewal.renewal_id,
              member_id: renewal.member_id,
              payment_amount: renewal.final_amount,
              payment_method: 'Auto Debit',
              payment_reference: 'AUTO_${renewal.renewal_id}_' + Date.now() + '',
              payment_date: new Date().toISOString()
            });

            // Update renewal to completed
            await MembershipRenewalModel.updateRenewal(renewal.renewal_id, {
              renewal_status: 'Completed',
              payment_status: 'Completed'
            });

            processed++;

            // Send success notification
            await NotificationModel.createNotification({
              member_id: renewal.member_id,
              recipient_type: 'Member',
              notification_type: 'Renewal',
              delivery_channel: 'Email',
              title: 'Auto Renewal Successful',
              message: 'Your membership has been automatically renewed for ${renewal.renewal_year}. Payment of R' + renewal.final_amount + ' has been processed.',
              template_data: {
                member_name: '${renewal.firstname} ' + renewal.surname || '' + ''.trim(),
                renewal_year: renewal.renewal_year,
                amount: renewal.final_amount,
                payment_method: 'Auto Debit'
              }
            });
          } else {
            // Auto payment failed
            await MembershipRenewalModel.updateRenewal(renewal.renewal_id, {
              renewal_status: 'Failed',
              payment_status: 'Failed'
            });

            failed++;
            errors.push('Auto renewal failed for member ' + renewal.member_id + ': Payment processing failed');

            // Send failure notification
            await NotificationModel.createNotification({
              member_id: renewal.member_id,
              recipient_type: 'Member',
              notification_type: 'Renewal',
              delivery_channel: 'Email',
              title: 'Auto Renewal Failed',
              message: 'Your automatic membership renewal for ' + renewal.renewal_year + ' could not be processed. Please update your payment method or pay manually.',
              template_data: {
                member_name: '${renewal.firstname} ' + renewal.surname || '' + ''.trim(),
                renewal_year: renewal.renewal_year,
                amount: renewal.final_amount
              }
            });
          }
        } catch (error) {
          failed++;
          errors.push(`Auto renewal failed for member ${renewal.member_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { processed, failed, errors };
    } catch (error) {
      console.error('Failed to process auto renewals:', error);
      return { processed: 0, failed: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Send renewal reminders based on settings
  static async sendRenewalReminders(): Promise<{ sent: number; failed: number; errors: string[] }> {
    try {
      const settings = await this.getRenewalSettings();
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Early reminders (60 days before due)
      const earlyReminders = await this.getRenewalsForReminder(settings.early_reminder_days, 'Early');
      for (const renewal of earlyReminders) {
        try {
          await this.sendReminderNotification(renewal, 'Early', settings);
          await this.createReminderRecord(renewal.renewal_id, renewal.member_id, 'Early');
          sent++;
        } catch (error) {
          failed++;
          errors.push(`Early reminder failed for member ${renewal.member_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Due reminders (30 days before due)
      const dueReminders = await this.getRenewalsForReminder(settings.due_reminder_days, 'Due');
      for (const renewal of dueReminders) {
        try {
          await this.sendReminderNotification(renewal, 'Due', settings);
          await this.createReminderRecord(renewal.renewal_id, renewal.member_id, 'Due');
          sent++;
        } catch (error) {
          failed++;
          errors.push(`Due reminder failed for member ${renewal.member_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Overdue reminders (7 days after due)
      const overdueReminders = await this.getRenewalsForReminder(-settings.overdue_reminder_days, 'Overdue');
      for (const renewal of overdueReminders) {
        try {
          await this.sendReminderNotification(renewal, 'Overdue', settings);
          await this.createReminderRecord(renewal.renewal_id, renewal.member_id, 'Overdue');
          sent++;
        } catch (error) {
          failed++;
          errors.push(`Overdue reminder failed for member ${renewal.member_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Final reminders (21 days after due)
      const finalReminders = await this.getRenewalsForReminder(-settings.final_reminder_days, 'Final');
      for (const renewal of finalReminders) {
        try {
          await this.sendReminderNotification(renewal, 'Final', settings);
          await this.createReminderRecord(renewal.renewal_id, renewal.member_id, 'Final');
          sent++;
        } catch (error) {
          failed++;
          errors.push(`Final reminder failed for member ${renewal.member_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { sent, failed, errors };
    } catch (error) {
      console.error('Failed to send renewal reminders:', error);
      return { sent: 0, failed: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Get renewals that need reminders
  private static async getRenewalsForReminder(daysBefore: number, stage: string): Promise<any[]> {
    const query = `
      SELECT 
        r.*,
        m.firstname,
        m.surname,
        m.email_address,
        m.cell_number
      FROM membership_renewals r
      LEFT JOIN members_consolidated m ON r.member_id = m.member_id
      WHERE r.renewal_due_date = DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)
      AND r.renewal_status IN ('Pending', 'Processing')
      AND NOT EXISTS (
        SELECT 1 FROM renewal_reminders rr 
        WHERE rr.renewal_id = r.renewal_id 
        AND rr.reminder_stage = ?
        AND rr.delivery_status IN ('Sent', 'Delivered')
      )
      LIMIT 100
    `;

    return await executeQuery(query, [daysBefore, stage]);
  }

  // Send reminder notification
  private static async sendReminderNotification(renewal : any, stage: string, settings: RenewalSettings): Promise<void> {
    const memberName = '${renewal.firstname} ' + renewal.surname || '' + ''.trim();
    
    let title = '';
    let message = '';
    
    switch (stage) {
      case 'Early':
        title = 'Membership Renewal Reminder';
        message = 'Hi ${memberName}, your membership renewal for ${renewal.renewal_year} is due on ' + renewal.renewal_due_date + '. Please renew early to avoid any interruption.';
        break;
      case 'Due':
        title = 'Membership Renewal Due Soon';
        message = 'Hi ${memberName}, your membership renewal for ${renewal.renewal_year} is due on ' + renewal.renewal_due_date + '. Please renew to maintain your membership.';
        break;
      case 'Overdue':
        title = 'Membership Renewal Overdue';
        message = 'Hi ${memberName}, your membership renewal for ${renewal.renewal_year} was due on ' + renewal.renewal_due_date + ' and is now overdue. Please renew immediately to avoid suspension.';
        break;
      case 'Final':
        title = 'Final Notice - Membership Renewal';
        message = 'Hi ${memberName}, this is your final notice for membership renewal ' + renewal.renewal_year + '. Your membership will be suspended if not renewed soon. Late fees may apply.';
        break;
    }

    // Send notification through configured channels
    for (const channel of settings.renewal_notification_channels) {
      await NotificationModel.createNotification({
        member_id: renewal.member_id,
        recipient_type: 'Member',
        notification_type: 'Renewal',
        delivery_channel: channel as any,
        title,
        message,
        template_data: {
          member_name: memberName,
          renewal_year: renewal.renewal_year,
          due_date: renewal.renewal_due_date,
          amount: renewal.final_amount,
          stage
        }
      });
    }
  }

  // Create reminder record
  private static async createReminderRecord(renewalId: number, memberId: number, stage: string): Promise<void> {
    await MembershipRenewalModel.createReminder({
      renewal_id: renewalId,
      member_id: memberId,
      reminder_type: 'Email',
      reminder_stage: stage as any,
      scheduled_date: new Date().toISOString().split('T')[0],
      template_used: 'renewal_' + stage.toLowerCase() + '_reminder'
    });

    // Update renewal reminder count
    await executeQuery(
      'UPDATE membership_renewals SET reminder_sent_count = reminder_sent_count + 1, last_reminder_sent = CURRENT_TIMESTAMP WHERE renewal_id = ? ',
      [renewalId]
    );
  }

  // Apply late fees to overdue renewals
  static async applyLateFees() : Promise<{ applied: number; errors: string[] }> {
    try {
      const settings = await this.getRenewalSettings();
      let applied = 0;
      const errors: string[] = [];

      // Get renewals that are past grace period and don't have late fees applied
      const query = `
        SELECT renewal_id, member_id, renewal_due_date, late_fee
        FROM membership_renewals
        WHERE renewal_due_date < DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
        AND renewal_status IN ('Pending', 'Processing')
        AND (late_fee = 0 OR late_fee IS NULL)
        LIMIT 100
      `;

      const overdueRenewals = await executeQuery(query, [settings.grace_period_days]);

      for (const renewal of overdueRenewals) {
        try {
          await MembershipRenewalModel.updateRenewal(renewal.renewal_id, {
            late_fee : settings.late_fee_amount,
            renewal_notes: 'Late fee of R${settings.late_fee_amount} applied on ' + new Date().toISOString().split('T')[0] + ''
          });

          await MembershipRenewalModel.logRenewalActivity(
            renewal.renewal_id,
            renewal.member_id,
            'Updated',
            'Late fee of R' + settings.late_fee_amount + ' applied',
            undefined,
            undefined,
            undefined,
            { late_fee_applied: settings.late_fee_amount }
          );

          applied++;
        } catch (error) {
          errors.push(`Failed to apply late fee for renewal ${renewal.renewal_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { applied, errors };
    } catch (error) {
      console.error('Failed to apply late fees:', error);
      return { applied: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Generate renewal report
  static async generateRenewalReport(year?: number): Promise<any> {
    try {
      const currentYear = year || new Date().getFullYear();
      
      const query = `
        SELECT 
          COUNT(*) as total_renewals,
          COUNT(CASE WHEN renewal_status = 'Completed' THEN 1 END) as completed,
          COUNT(CASE WHEN renewal_status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN renewal_status = 'Processing' THEN 1 END) as processing,
          COUNT(CASE WHEN renewal_status = 'Failed' THEN 1 END) as failed,
          COUNT(CASE WHEN renewal_status = 'Expired' THEN 1 END) as expired,
          COUNT(CASE WHEN renewal_due_date < CURRENT_DATE AND renewal_status != 'Completed' THEN 1 END) as overdue,
          SUM(renewal_amount) as total_revenue,
          SUM(CASE WHEN payment_status = 'Completed' THEN renewal_amount ELSE 0 END) as collected_revenue,
          AVG(renewal_amount) as average_amount,
          SUM(late_fee) as total_late_fees,
          COUNT(CASE WHEN auto_renewal = TRUE THEN 1 END) as auto_renewals
        FROM membership_renewals
        WHERE renewal_year = ? `;

      const stats = await executeQuerySingle(query, [currentYear]);

      return {
        year : currentYear,
        statistics: stats,
        completion_rate: stats.total_renewals > 0 ? ((stats.completed / stats.total_renewals) * 100).toFixed(2) + '%'  : '0%',
        collection_rate: stats.total_revenue > 0 ? ((stats.collected_revenue / stats.total_revenue) * 100).toFixed(2) + '%'  : '0%',
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to generate renewal report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
