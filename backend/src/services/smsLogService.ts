import { executeQuery, executeQuerySingle } from '../config/database';
import { logger } from '../utils/logger';

export type SMSSourceType = 'quick_send' | 'birthday' | 'campaign' | 'expiration_reminder' | 'bulk' | 'manual' | 'voter_registration' | 'system' | 'otp';
export type SMSStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired';

export interface SMSSendLogEntry {
  message_id: string;
  provider_message_id?: string;
  source_type: SMSSourceType;
  source_reference_id?: string;
  recipient_phone: string;
  recipient_name?: string;
  recipient_member_id?: string;
  message_content: string;
  sender_id?: number;
  sender_name?: string;
  status: SMSStatus;
  error_code?: string;
  error_message?: string;
  cost?: number;
  provider_name?: string;
}

export interface SMSLogUpdateData {
  status?: SMSStatus;
  provider_message_id?: string;
  delivery_timestamp?: Date;
  error_code?: string;
  error_message?: string;
  retry_count?: number;
  cost?: number;
  webhook_data?: any;
}

export class SMSLogService {

  // Generate a unique message ID
  static generateMessageId(source: SMSSourceType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${source}_${timestamp}_${random}`;
  }

  // Log a new SMS send
  static async logSMSSend(entry: SMSSendLogEntry): Promise<string> {
    try {
      const query = `
        INSERT INTO sms_send_log (
          message_id, provider_message_id, source_type, source_reference_id,
          recipient_phone, recipient_name, recipient_member_id,
          message_content, message_length, sender_id, sender_name,
          status, error_code, error_message, cost, provider_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;

      await executeQuery(query, [
        entry.message_id,
        entry.provider_message_id || null,
        entry.source_type,
        entry.source_reference_id || null,
        entry.recipient_phone,
        entry.recipient_name || null,
        entry.recipient_member_id || null,
        entry.message_content,
        entry.message_content.length,
        entry.sender_id || null,
        entry.sender_name || null,
        entry.status,
        entry.error_code || null,
        entry.error_message || null,
        entry.cost || 0,
        entry.provider_name || 'JSON Applink'
      ]);

      logger.info('SMS send logged', {
        messageId: entry.message_id,
        source: entry.source_type,
        recipient: entry.recipient_phone,
        status: entry.status
      });

      return entry.message_id;
    } catch (error: any) {
      logger.error('Failed to log SMS send', { error: error.message, entry });
      throw error;
    }
  }

  // Update SMS log entry (for delivery status updates)
  static async updateSMSLog(messageId: string, updateData: SMSLogUpdateData): Promise<void> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }
      if (updateData.provider_message_id !== undefined) {
        setClauses.push(`provider_message_id = $${paramIndex++}`);
        values.push(updateData.provider_message_id);
      }
      if (updateData.delivery_timestamp !== undefined) {
        setClauses.push(`delivery_timestamp = $${paramIndex++}`);
        values.push(updateData.delivery_timestamp);
      }
      if (updateData.error_code !== undefined) {
        setClauses.push(`error_code = $${paramIndex++}`);
        values.push(updateData.error_code);
      }
      if (updateData.error_message !== undefined) {
        setClauses.push(`error_message = $${paramIndex++}`);
        values.push(updateData.error_message);
      }
      if (updateData.retry_count !== undefined) {
        setClauses.push(`retry_count = $${paramIndex++}`);
        values.push(updateData.retry_count);
      }
      if (updateData.cost !== undefined) {
        setClauses.push(`cost = $${paramIndex++}`);
        values.push(updateData.cost);
      }
      if (updateData.webhook_data !== undefined) {
        setClauses.push(`webhook_data = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.webhook_data));
      }

      if (setClauses.length === 0) return;

      values.push(messageId);
      const query = `UPDATE sms_send_log SET ${setClauses.join(', ')} WHERE message_id = $${paramIndex}`;

      await executeQuery(query, values);
      logger.info('SMS log updated', { messageId, updates: Object.keys(updateData) });
    } catch (error: any) {
      logger.error('Failed to update SMS log', { error: error.message, messageId });
      throw error;
    }
  }

  // Get SMS log entry by message ID
  static async getSMSLogByMessageId(messageId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM sms_send_log WHERE message_id = $1
      `;
      const result = await executeQuerySingle(query, [messageId]);
      return result || null;
    } catch (error: any) {
      logger.error('Failed to get SMS log', { error: error.message, messageId });
      return null;
    }
  }

  // Get SMS logs by source type with pagination
  static async getSMSLogsBySource(
    sourceType: SMSSourceType,
    options: { page?: number; limit?: number; status?: SMSStatus } = {}
  ): Promise<{ logs: any[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 50;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE source_type = $1';
      const params: any[] = [sourceType];
      let paramIndex = 2;

      if (options.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(options.status);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM sms_send_log ${whereClause}`;
      const countResult = await executeQuerySingle(countQuery, params);
      const total = parseInt(countResult?.total || '0');

      // Get logs
      params.push(limit, offset);
      const query = `
        SELECT * FROM sms_send_log
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      const logs = await executeQuery(query, params);

      return { logs: Array.isArray(logs) ? logs : [], total };
    } catch (error: any) {
      logger.error('Failed to get SMS logs by source', { error: error.message, sourceType });
      return { logs: [], total: 0 };
    }
  }

  // Get delivery statistics by source
  static async getDeliveryStatsBySource(): Promise<any[]> {
    try {
      const query = `SELECT * FROM vw_sms_delivery_stats_by_source`;
      const result = await executeQuery(query, []);
      return Array.isArray(result) ? result : [];
    } catch (error: any) {
      logger.error('Failed to get delivery stats', { error: error.message });
      return [];
    }
  }

  // Get recent SMS logs with optional filters
  static async getRecentSMSLogs(options: {
    limit?: number;
    sourceType?: SMSSourceType;
    recipientPhone?: string;
    memberId?: string;
    status?: SMSStatus;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<any[]> {
    try {
      const limit = options.limit || 100;
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (options.sourceType) {
        conditions.push(`source_type = $${paramIndex++}`);
        params.push(options.sourceType);
      }
      if (options.recipientPhone) {
        conditions.push(`recipient_phone = $${paramIndex++}`);
        params.push(options.recipientPhone);
      }
      if (options.memberId) {
        conditions.push(`recipient_member_id = $${paramIndex++}`);
        params.push(options.memberId);
      }
      if (options.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(options.status);
      }
      if (options.startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(options.startDate);
      }
      if (options.endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(options.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(limit);

      const query = `
        SELECT * FROM sms_send_log
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `;

      const result = await executeQuery(query, params);
      return Array.isArray(result) ? result : [];
    } catch (error: any) {
      logger.error('Failed to get recent SMS logs', { error: error.message });
      return [];
    }
  }

  // Process webhook delivery update
  static async processWebhookDeliveryUpdate(webhookData: any): Promise<void> {
    try {
      // Extract message ID from webhook data (flexible parsing)
      const messageId = webhookData.message_id || webhookData.messageId ||
        webhookData.id || webhookData.reference || webhookData.ref;

      if (!messageId) {
        logger.warn('Webhook missing message ID', { webhookData });
        return;
      }

      // Map status from webhook
      const rawStatus = webhookData.status || webhookData.delivery_status ||
        webhookData.state || webhookData.message_status;
      const status = this.mapWebhookStatus(rawStatus);

      // Update the log entry
      await this.updateSMSLog(messageId, {
        status,
        delivery_timestamp: new Date(),
        error_code: webhookData.error_code || webhookData.errorCode,
        error_message: webhookData.error_message || webhookData.errorMessage,
        webhook_data: webhookData
      });

      logger.info('Webhook delivery update processed', { messageId, status });
    } catch (error: any) {
      logger.error('Failed to process webhook delivery update', { error: error.message, webhookData });
    }
  }

  // Map webhook status to our status enum
  private static mapWebhookStatus(rawStatus: string): SMSStatus {
    if (!rawStatus) return 'pending';

    const statusLower = rawStatus.toLowerCase();

    if (['delivered', 'delivery_success', 'dlr_success'].includes(statusLower)) {
      return 'delivered';
    }
    if (['sent', 'submitted', 'accepted'].includes(statusLower)) {
      return 'sent';
    }
    if (['failed', 'rejected', 'undelivered', 'delivery_failed', 'dlr_failed'].includes(statusLower)) {
      return 'failed';
    }
    if (['expired', 'timeout'].includes(statusLower)) {
      return 'expired';
    }
    if (['queued', 'buffered'].includes(statusLower)) {
      return 'queued';
    }
    if (['sending', 'in_progress'].includes(statusLower)) {
      return 'sending';
    }

    return 'pending';
  }
}
