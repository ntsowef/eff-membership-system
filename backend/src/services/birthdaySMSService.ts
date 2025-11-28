import { executeQuery } from '../config/database';
import { SMSManagementService } from './smsManagementService';

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
      const result = await executeQuery(`
        SELECT * FROM birthday_sms_config 
        WHERE is_enabled = TRUE 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      const configs = Array.isArray(result) ? result : result[0] || [];
      return configs.length > 0 ? configs[0] : null;
    } catch (error: any) {
      logger.error('Failed to get birthday config', { error: error.message });
      throw error;
    }
  }

  // Get today's birthdays
  static async getTodaysBirthdays(): Promise<BirthdayMember[]> {
    try {
      const result = await executeQuery('SELECT * FROM todays_birthdays ORDER BY full_name');
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
        SELECT * FROM upcoming_birthdays 
        WHERE days_until_birthday <= ? ORDER BY days_until_birthday ASC, full_name ASC
      `, [days]);
      
      return Array.isArray(result) ? result  : result[0] || [];
    } catch (error: any) {
      logger.error('Failed to get upcoming birthdays', { error: error.message });
      throw error;
    }
  }

  // Queue birthday messages for today
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

      for (const member of todaysBirthdays) {
        try {
          // Check if already queued for today
          const existingResult = await executeQuery(`
            SELECT id FROM birthday_sms_queue 
            WHERE member_id = ? AND scheduled_for = CURRENT_DATE
          `, [member.member_id]);
          
          const existing = Array.isArray(existingResult) ? existingResult  : existingResult[0] || [];
          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // Generate personalized message
          const personalizedMessage = await this.generateBirthdayMessage(member, config);

          // Queue the message
          await executeQuery(`
            INSERT INTO birthday_sms_queue (
              member_id, member_name, member_phone, birth_date, age_at_birthday,
              scheduled_for, template_id, personalized_message, status
            ) EXCLUDED.? , , $3, $4, $5, CURRENT_DATE, $6, $7, 'queued'
          `, [
            member.member_id,
            member.full_name,
            member.cell_number,
            member.date_of_birth,
            member.current_age,
            config.template_id,
            personalizedMessage
          ]);

          queued++;
          logger.info('Queued birthday message for ' + member.full_name + '');

        } catch (error : any) {
          logger.error('Failed to queue birthday message for member ' + member.member_id + '', { error: error.message });
          errors++;
        }
      }

      logger.info(`Birthday message queueing complete`, { queued, skipped, errors });
      return { queued, skipped, errors };

    } catch (error: any) {
      logger.error('Failed to queue birthday messages', { error: error.message });
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

      let message = template.content;

      // Replace variables
      const variables = {
        name: member.firstname,
        full_name: member.full_name,
        age: config.include_age ? member.current_age.toString() : '',
        organization: config.include_organization_name ? 'Our Organization'  : '',
        ward: member.ward_name || 'Ward ' + member.ward_code + '',
        municipality: member.municipality_code || '',
        ward_code: member.ward_code
      };

      // Process variables
      Object.keys(variables).forEach(key => {
        const placeholder = '{' + key + '}';
        message = message.replace(new RegExp(placeholder, 'g'), variables[key as keyof typeof variables] || '');
      });

      return message;

    } catch (error: any) {
      logger.error('Failed to generate birthday message', { error: error.message, member });
      throw error;
    }
  }

  // Process queued birthday messages
  static async processQueuedMessages(limit: number = 50): Promise<{ processed: number; sent: number; failed: number }> {
    try {
      const config = await this.getBirthdayConfig();
      if (!config || !config.is_enabled) {
        return { processed: 0, sent: 0, failed: 0 };
      }

      // Get queued messages
      const queueResult = await executeQuery(`
        SELECT * FROM birthday_sms_queue 
        WHERE status = 'queued' AND scheduled_for <= CURRENT_DATE
        ORDER BY scheduled_for ASC, id ASC
        LIMIT ?
      `, [limit]);

      const queuedMessages = Array.isArray(queueResult) ? queueResult : queueResult[0] || [];
      
      let processed = 0;
      let sent = 0;
      let failed = 0;

      for (const queueItem of queuedMessages) {
        try {
          // Mark as processing
          await executeQuery(`
            UPDATE birthday_sms_queue 
            SET status = 'processing', processed_at = CURRENT_TIMESTAMP 
            WHERE id = ? `, [queueItem.id]);

          // Send the SMS using the mock SMS service
          const smsResult = await SMSManagementService.sendSMSMessage({
            recipient_phone : queueItem.member_phone,
            recipient_name: queueItem.member_name,
            recipient_member_id: queueItem.member_id,
            message_content: queueItem.personalized_message,
            status: 'pending',
            retry_count: 0,
            cost_per_sms: 0.05,
            total_cost: 0.05
          });

          if (smsResult.success) {
            // Mark as completed and record in history
            await executeQuery(`
              UPDATE birthday_sms_queue 
              SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
              WHERE id = ? `, [queueItem.id]);

            await executeQuery(`
              INSERT INTO birthday_sms_history (
                member_id, member_name, member_phone, birth_date, age_at_birthday,
                template_id, message_content, scheduled_date, sent_at, delivery_status
              ) EXCLUDED.$1, , $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, 'sent'
            `, [
              queueItem.member_id,
              queueItem.member_name,
              queueItem.member_phone,
              queueItem.birth_date,
              queueItem.age_at_birthday,
              queueItem.template_id,
              queueItem.personalized_message,
              queueItem.scheduled_for
            ]);

            sent++;
            logger.info('Birthday SMS sent to ' + queueItem.member_name + '', { messageId : smsResult.messageId });

          } else {
            // Mark as failed
            await executeQuery(`
              UPDATE birthday_sms_queue 
              SET status = 'failed', error_message = ? , retry_count = retry_count + 1 
              WHERE id = $1
            `, [smsResult.error || 'Unknown error', queueItem.id]);

            failed++;
            logger.error('Birthday SMS failed for ' + queueItem.member_name + '', { error : smsResult.error });
          }

          processed++;

        } catch (error: any) {
          logger.error('Failed to process birthday message for queue item ' + queueItem.id + '', { error: error.message });
          
          // Mark as failed
          await executeQuery(`
            UPDATE birthday_sms_queue 
            SET status = 'failed', error_message = ? , retry_count = retry_count + 1 
            WHERE id = $1
          `, [error.message, queueItem.id]);

          failed++;
          processed++;
        }
      }

      logger.info(`Birthday message processing complete`, { processed, sent, failed });
      return { processed, sent, failed };

    } catch (error : any) {
      logger.error('Failed to process queued birthday messages', { error: error.message });
      throw error;
    }
  }

  // Get birthday statistics
  static async getBirthdayStatistics(): Promise<any> {
    try {
      const todayResult = await executeQuery('SELECT COUNT(*) as count FROM todays_birthdays');
      const upcomingResult = await executeQuery('SELECT COUNT(*) as count FROM upcoming_birthdays');
      const queuedResult = await executeQuery('SELECT COUNT(*) as count FROM birthday_sms_queue WHERE status = "queued"');
      const sentTodayResult = await executeQuery(`
        SELECT COUNT(*) as count FROM birthday_sms_history 
        WHERE scheduled_date = CURRENT_DATE AND delivery_status = 'sent'
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
  static async sendBirthdayMessage(memberId: number): Promise<{ success: boolean; message?: string; error?: string; messageId?: string }> {
    try {
      const config = await this.getBirthdayConfig();
      if (!config || !config.is_enabled) {
        return { success: false, error: 'Birthday SMS is disabled or not configured' };
      }

      // Get member details
      const memberResult = await executeQuery(`
        SELECT 
          m.member_id,
          m.firstname || ' ' || COALESCE(m.middle_name || '', ' ', COALESCE(m.surname, '')) as full_name,
          m.firstname,
          m.surname,
          m.cell_number,
          m.date_of_birth,
          EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM m.date_of_birth) - 
          (DATE_FORMAT(CURRENT_DATE, '%m%d') < DATE_FORMAT(m.date_of_birth, '%m%d')) as current_age,
          m.ward_code,
          w.ward_name,
          w.municipality_code
        FROM members m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        WHERE m.member_id = ? AND m.cell_number IS NOT NULL AND m.cell_number != ''
      `, [memberId]);

      const members = Array.isArray(memberResult) ? memberResult  : memberResult[0] || [];
      if (members.length === 0) {
        return { success: false, error: 'Member not found or no phone number' };
      }

      const member = members[0];

      // Generate personalized message
      const personalizedMessage = await this.generateBirthdayMessage(member, config);

      // Send the SMS
      const smsResult = await SMSManagementService.sendSMSMessage({
        recipient_phone: member.cell_number,
        recipient_name: member.full_name,
        recipient_member_id: member.member_id,
        message_content: personalizedMessage,
        status: 'pending',
        retry_count: 0,
        cost_per_sms: 0.05,
        total_cost: 0.05
      });

      if (smsResult.success) {
        // Record in history
        await executeQuery(`
          INSERT INTO birthday_sms_history (
            member_id, member_name, member_phone, birth_date, age_at_birthday,
            template_id, message_content, scheduled_date, sent_at, delivery_status
          ) EXCLUDED.? , , $3, $4, $5, $6, $7, CURRENT_DATE, CURRENT_TIMESTAMP, 'sent'
        `, [
          member.member_id,
          member.full_name,
          member.cell_number,
          member.date_of_birth,
          member.current_age,
          config.template_id,
          personalizedMessage
        ]);

        return { 
          success : true, 
          message: 'Birthday SMS sent to ' + member.full_name + '',
          messageId: smsResult.messageId 
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
