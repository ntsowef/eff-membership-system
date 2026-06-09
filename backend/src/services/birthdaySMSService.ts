import { executeQuery } from '../config/database';
import { SMSManagementService } from './smsManagementService';
import { renderTemplateString } from '../utils/templateRenderer';
import { SMSLogService } from './smsLogService';
import { SMSService } from './smsService';

// Create a simple logger if it doesn't exist
const logger = {
  info: (message: string, meta?: any) => console.log('[INFO]', message, meta || ''),
  error: (message: string, meta?: any) => console.error('[ERROR]', message, meta || ''),
  warn: (message: string, meta?: any) => console.warn('[WARN]', message, meta || ''),
  debug: (message: string, meta?: any) => console.debug('[DEBUG]', message, meta || '')
};

export interface BirthdayMember {
  member_id: number;
  full_name: string;
  firstname: string;
  surname: string;
  cell_number: string;
  date_of_birth: string;
  current_age: number;
  ward_code: string;
  ward_name?: string;
  municipality_code?: string;
}

export interface BirthdayConfig {
  id: number;
  is_enabled: boolean;
  template_id: number;
  send_time: string;
  timezone: string;
  include_age: boolean;
  include_organization_name: boolean;
  max_daily_sends: number;
}

export interface BirthdayQueueItem {
  id?: number;
  member_id: number;
  member_name: string;
  member_phone: string;
  birth_date: string;
  age_at_birthday: number;
  scheduled_for: string;
  template_id?: number;
  personalized_message?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

export class BirthdaySMSService {

  // Get birthday configuration
  static async getBirthdayConfig(): Promise<BirthdayConfig | null> {
    try {
      // Get the birthday template from sms_templates table (category = 'birthday')
      // This ensures we use the correct template, not the WELCOME template
      const result = await executeQuery(`
        SELECT
          template_id,
          TRUE as is_enabled,
          '09:00:00' as send_time,
          'Africa/Johannesburg' as timezone,
          TRUE as include_age,
          TRUE as include_organization_name,
          1000 as max_daily_sends
        FROM sms_templates
        WHERE category = 'birthday' AND is_active = TRUE
        ORDER BY template_id ASC
        LIMIT 1
      `);

      const configs = Array.isArray(result) ? result : result[0] || [];
      if (configs.length > 0) {
        logger.info('Using birthday template ID: ' + configs[0].template_id);
        return {
          id: 1,
          is_enabled: true,
          template_id: configs[0].template_id,
          send_time: '09:00:00',
          timezone: 'Africa/Johannesburg',
          include_age: true,
          include_organization_name: true,
          max_daily_sends: 1000
        };
      }

      // Fallback: no birthday template found
      logger.warn('No birthday template found in sms_templates table');
      return null;
    } catch (error: any) {
      logger.error('Failed to get birthday config', { error: error.message });
      // Return default config pointing to first birthday template (ID 6 = BIRTHDAY_STANDARD)
      return {
        id: 1,
        is_enabled: true,
        template_id: 6, // BIRTHDAY_STANDARD template
        send_time: '09:00:00',
        timezone: 'Africa/Johannesburg',
        include_age: true,
        include_organization_name: true,
        max_daily_sends: 1000
      };
    }
  }

  // Get today's birthdays
  static async getTodaysBirthdays(): Promise<BirthdayMember[]> {
    try {
      const result = await executeQuery(`
        SELECT
          member_id,
          CONCAT(first_name, ' ', last_name) as full_name,
          first_name as firstname,
          last_name as surname,
          phone_number as cell_number,
          date_of_birth,
          age as current_age,
          ward_code,
          ward_name,
          province_code
        FROM vw_todays_birthdays
        ORDER BY first_name, last_name
      `);
      return Array.isArray(result) ? result : result[0] || [];
    } catch (error: any) {
      logger.error('Failed to get today\'s birthdays', { error: error.message });
      throw error;
    }
  }

  // Get upcoming birthdays
  static async getUpcomingBirthdays(days: number = 7): Promise<BirthdayMember[]> {
    try {
      const result = await executeQuery(`
        SELECT
          member_id,
          CONCAT(first_name, ' ', last_name) as full_name,
          first_name as firstname,
          last_name as surname,
          phone_number as cell_number,
          date_of_birth,
          current_age,
          '' as ward_code,
          province_code,
          days_until_birthday
        FROM vw_upcoming_birthdays
        WHERE days_until_birthday <= $1
        ORDER BY days_until_birthday ASC, first_name ASC, last_name ASC
      `, [days]);

      return Array.isArray(result) ? result : result[0] || [];
    } catch (error: any) {
      logger.error('Failed to get upcoming birthdays', { error: error.message });
      throw error;
    }
  }

  // Send birthday messages for today (individual sending, no bulk queue)
  static async queueTodaysBirthdayMessages(): Promise<{ queued: number; skipped: number; errors: number }> {
    try {
      const config = await this.getBirthdayConfig();
      if (!config || !config.is_enabled) {
        logger.warn('Birthday SMS is disabled or not configured');
        return { queued: 0, skipped: 0, errors: 0 };
      }

      const todaysBirthdays = await this.getTodaysBirthdays();
      let queued = 0;
      let skipped = 0;
      let errors = 0;
      const currentYear = new Date().getFullYear();

      // Deduplicate by phone number — if multiple members share the same cell_number,
      // only send to the first one to avoid duplicate SMS to the same phone.
      const seenPhones = new Set<string>();
      const deduped: BirthdayMember[] = [];
      for (const member of todaysBirthdays) {
        const normalized = member.cell_number?.replace(/\s+/g, '').replace(/^0/, '27');
        if (!normalized || seenPhones.has(normalized)) {
          continue;
        }
        seenPhones.add(normalized);
        deduped.push(member);
      }

      const duplicateCount = todaysBirthdays.length - deduped.length;
      if (duplicateCount > 0) {
        logger.info(`Deduplicated ${duplicateCount} duplicate phone number(s) from ${todaysBirthdays.length} birthday members`);
      }

      logger.info(`Processing ${deduped.length} birthday messages individually (${todaysBirthdays.length} total, ${duplicateCount} duplicate phones removed)`);

      for (const member of deduped) {
        try {
          // Check if already sent today
          const existingResult = await executeQuery(`
            SELECT id FROM birthday_messages_sent
            WHERE member_id = $1 AND DATE(sent_at) = CURRENT_DATE
          `, [member.member_id]);

          const existing = Array.isArray(existingResult) ? existingResult : existingResult[0] || [];
          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // Generate personalized message
          const personalizedMessage = await this.generateBirthdayMessage(member, config);

          // Send the SMS individually (normal flow, not bulk)
          const smsResult = await SMSService.sendSMS(
            member.cell_number,
            personalizedMessage,
            'EFF',
            undefined, // trackingId handled by SMSService
            'birthday',
            member.member_id.toString()
          );

          const trackingMessageId = smsResult.messageId || `birthday_${Date.now()}`;

          // Record in birthday_messages_sent table
          await executeQuery(`
            INSERT INTO birthday_messages_sent (
              member_id, membership_number, member_name, phone_number, message_text,
              sms_message_id, delivery_status, birthday_year, member_age
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            member.member_id,
            '',
            member.full_name,
            member.cell_number,
            personalizedMessage,
            trackingMessageId,
            smsResult.success ? 'delivered' : 'failed',
            currentYear,
            member.current_age
          ]);

          // Log to sms_messages for reports
          try {
            await executeQuery(`
              INSERT INTO sms_messages (
                message_text, recipient_number, recipient_name, member_id,
                status, cost_per_message, provider_message_id, error_message, sent_at, category
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
            `, [
              personalizedMessage,
              member.cell_number,
              member.full_name,
              member.member_id,
              smsResult.success ? 'Sent' : 'Failed',
              0.05,
              smsResult.messageId || trackingMessageId,
              smsResult.error || null,
              'Birthday'
            ]);
          } catch (logErr) {
            logger.error('Failed to log birthday SMS to sms_messages', { error: logErr });
          }

          queued++;

          if (queued % 50 === 0) {
            logger.info(`Birthday progress: ${queued} sent, ${skipped} skipped, ${errors} errors`);
          }

        } catch (error: any) {
          logger.error('Failed to send birthday message for member ' + member.member_id, { error: error.message });
          errors++;
        }
      }

      logger.info(`Birthday message sending complete`, { sent: queued, skipped, errors });
      return { queued, skipped, errors };

    } catch (error: any) {
      logger.error('Failed to send birthday messages', { error: error.message });
      throw error;
    }
  }

  // Generate personalized birthday message
  static async generateBirthdayMessage(member: BirthdayMember, config: BirthdayConfig): Promise<string> {
    try {
      // Get the template
      const template = await SMSManagementService.getTemplateById(config.template_id);
      if (!template) {
        throw new Error('Birthday template not found: ' + config.template_id + '');
      }

      const variables = {
        // Common name variants
        name: member.firstname,
        firstname: member.firstname,
        first_name: member.firstname,

        surname: member.surname,
        last_name: member.surname,

        full_name: member.full_name,
        fullname: member.full_name,
        member_name: member.full_name,

        // Birthday-specific
        age: config.include_age ? member.current_age?.toString?.() || '' : '',
        organization: config.include_organization_name ? 'Our Organization' : '',
        ward: member.ward_name || 'Ward ' + member.ward_code + '',
        ward_name: member.ward_name || '',
        ward_code: member.ward_code,
        municipality: member.municipality_code || '',
        municipality_code: member.municipality_code || '',

        cell_number: member.cell_number
      };

      return renderTemplateString(template.content, variables, { keepUnmatched: true });

    } catch (error: any) {
      logger.error('Failed to generate birthday message', { error: error.message, member });
      throw error;
    }
  }

  // Process queued birthday messages (deprecated - now sending directly)
  static async processQueuedMessages(limit: number = 50): Promise<{ processed: number; sent: number; failed: number }> {
    try {
      logger.info('processQueuedMessages is deprecated - birthday messages are now sent directly');
      return { processed: 0, sent: 0, failed: 0 };
    } catch (error: any) {
      logger.error('Failed to process queued birthday messages', { error: error.message });
      throw error;
    }
  }

  // Deprecated queue processing code - keeping structure for reference
  private static async _oldProcessQueuedMessages(limit: number = 50): Promise<{ processed: number; sent: number; failed: number }> {
    try {
      const config = await this.getBirthdayConfig();
      if (!config || !config.is_enabled) {
        return { processed: 0, sent: 0, failed: 0 };
      }

      // Old queue processing code removed - now sending directly
      return { processed: 0, sent: 0, failed: 0 };
    } catch (error: any) {
      logger.error('Failed to process queued birthday messages', { error: error.message });
      throw error;
    }
  }

  // Get birthday statistics
  static async getBirthdayStatistics(): Promise<any> {
    try {
      const todayResult = await executeQuery('SELECT COUNT(*) as count FROM vw_todays_birthdays');
      const upcomingResult = await executeQuery('SELECT COUNT(*) as count FROM vw_upcoming_birthdays WHERE days_until_birthday <= 7');
      const queuedResult = await executeQuery(`SELECT COUNT(*) as count FROM sms_queue WHERE status = 'Pending'`);
      const sentTodayResult = await executeQuery(`
        SELECT COUNT(*) as count FROM birthday_messages_sent
        WHERE sent_at::date = CURRENT_DATE AND delivery_status = 'delivered'
      `);

      const today = Array.isArray(todayResult) ? todayResult : todayResult[0] || [];
      const upcoming = Array.isArray(upcomingResult) ? upcomingResult : upcomingResult[0] || [];
      const queued = Array.isArray(queuedResult) ? queuedResult : queuedResult[0] || [];
      const sentToday = Array.isArray(sentTodayResult) ? sentTodayResult : sentTodayResult[0] || [];

      return {
        todays_birthdays: today[0]?.count || 0,
        upcoming_birthdays: upcoming[0]?.count || 0,
        queued_messages: queued[0]?.count || 0,
        sent_today: sentToday[0]?.count || 0
      };

    } catch (error: any) {
      logger.error('Failed to get birthday statistics', { error: error.message });
      throw error;
    }
  }

  // Manual birthday message sending
  static async sendBirthdayMessage(memberId: number, customMessage?: string): Promise<{ success: boolean; message?: string; error?: string; messageId?: string }> {
    try {
      const config = await this.getBirthdayConfig();
      if (!config || !config.is_enabled) {
        return { success: false, error: 'Birthday SMS is disabled or not configured' };
      }

      // Get member details
      const memberResult = await executeQuery(`
        SELECT
          m.member_id,
          m.membership_number,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
          m.firstname,
          m.surname,
          m.cell_number,
          m.date_of_birth,
          EXTRACT(YEAR FROM AGE(m.date_of_birth)) as current_age,
          m.ward_code,
          w.ward_name,
          w.municipality_code
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        WHERE m.member_id = $1 AND m.cell_number IS NOT NULL AND m.cell_number != ''
      `, [memberId]);

      const members = Array.isArray(memberResult) ? memberResult : memberResult[0] || [];
      if (members.length === 0) {
        return { success: false, error: 'Member not found or no phone number' };
      }

      const member = members[0];

      // Generate personalized message or use custom message
      const personalizedMessage = customMessage || await this.generateBirthdayMessage(member, config);

      // Send the SMS
      const smsResult = await SMSService.sendSMS(
        member.cell_number,
        personalizedMessage,
        'EFF',
        undefined,
        'birthday',
        memberId.toString()
      );

      const trackingMessageId = smsResult.messageId || `birthday_${Date.now()}`;

      if (smsResult.success) {
        // Record in birthday_messages_sent table
        const currentYear = new Date().getFullYear();
        await executeQuery(`
          INSERT INTO birthday_messages_sent (
            member_id, membership_number, member_name, phone_number, message_text,
            sms_message_id, delivery_status, birthday_year, member_age
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          member.member_id,
          member.membership_number || '',
          member.full_name,
          member.cell_number,
          personalizedMessage,
          trackingMessageId, // Use our tracking message ID
          'delivered',
          currentYear,
          member.current_age
        ]);

        return {
          success: true,
          message: 'Birthday SMS sent to ' + member.full_name + '',
          messageId: trackingMessageId
        };
      } else {
        return { success: false, error: smsResult.error || 'Failed to send SMS' };
      }

    } catch (error: any) {
      logger.error('Failed to send manual birthday message', { error: error.message, memberId });
      return { success: false, error: error.message };
    }
  }
}

export default BirthdaySMSService;
