import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { CommunicationCampaignModel } from '../models/communication';
import type { MessageDelivery, DeliveryStatus, DeliveryChannel } from '../types/communication';

export class DeliveryTrackingService {
  // Create delivery tracking record
  static async createDeliveryRecord(
    messageId: number,
    campaignId: number | null,
    recipientType: 'Member' | 'Admin',
    recipientId: number,
    recipientEmail: string | null,
    recipientPhone: string | null,
    deliveryChannel: DeliveryChannel
  ): Promise<number> {
    try {
      const query = `
        INSERT INTO message_deliveries (
          message_id, campaign_id, recipient_type, recipient_id,
          recipient_email, recipient_phone, delivery_channel, delivery_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Queued')
      `;

      const params = [
        messageId,
        campaignId,
        recipientType,
        recipientId,
        recipientEmail,
        recipientPhone,
        deliveryChannel
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create delivery record', error);
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(
    deliveryId: number,
    status: DeliveryStatus,
    externalMessageId?: string,
    failureReason?: string,
    trackingData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      // Set status
      updates.push('delivery_status = ?');
      params.push(status);

      // Set timestamp based on status
      switch (status) {
        case 'Sent':
          updates.push('sent_at = CURRENT_TIMESTAMP');
          break;
        case 'Delivered':
          updates.push('delivered_at = CURRENT_TIMESTAMP');
          break;
        case 'Opened':
          updates.push('opened_at = CURRENT_TIMESTAMP');
          break;
        case 'Clicked':
          updates.push('clicked_at = CURRENT_TIMESTAMP');
          break;
        case 'Failed':
        case 'Bounced':
          updates.push('failed_at = CURRENT_TIMESTAMP');
          if (failureReason) {
            updates.push('failure_reason = ?');
            params.push(failureReason);
          }
          break;
      }

      // Set external message ID if provided
      if (externalMessageId) {
        updates.push('external_message_id = ?');
        params.push(externalMessageId);
      }

      // Set tracking data if provided
      if (trackingData) {
        updates.push('tracking_data = ?');
        params.push(JSON.stringify(trackingData));
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(deliveryId);

      const query = `UPDATE message_deliveries SET ${updates.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);

      // Update campaign statistics if this is part of a campaign
      if (result.affectedRows > 0) {
        await this.updateCampaignStats(deliveryId);
      }

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update delivery status', error);
    }
  }

  // Update campaign statistics based on delivery updates
  private static async updateCampaignStats(deliveryId: number): Promise<void> {
    try {
      // Get delivery record with campaign info
      const delivery = await executeQuerySingle(
        'SELECT campaign_id, delivery_status FROM message_deliveries WHERE id = ?',
        [deliveryId]
      );

      if (!delivery || !delivery.campaign_id) {
        return;
      }

      // Get current campaign stats
      const stats = await executeQuerySingle(`
        SELECT 
          COUNT(*) as total_sent,
          SUM(CASE WHEN delivery_status IN ('Delivered', 'Opened', 'Clicked') THEN 1 ELSE 0 END) as total_delivered,
          SUM(CASE WHEN delivery_status IN ('Failed', 'Bounced') THEN 1 ELSE 0 END) as total_failed,
          SUM(CASE WHEN delivery_status = 'Opened' THEN 1 ELSE 0 END) as total_opened,
          SUM(CASE WHEN delivery_status = 'Clicked' THEN 1 ELSE 0 END) as total_clicked
        FROM message_deliveries 
        WHERE campaign_id = ?
      `, [delivery.campaign_id]);

      // Update campaign with new stats
      await CommunicationCampaignModel.updateCampaign(delivery.campaign_id, {
        total_sent: stats.total_sent,
        total_delivered: stats.total_delivered,
        total_failed: stats.total_failed,
        total_opened: stats.total_opened,
        total_clicked: stats.total_clicked
      });

      // Check if campaign is complete
      const pendingCount = await executeQuerySingle(`
        SELECT COUNT(*) as count 
        FROM message_deliveries 
        WHERE campaign_id = ? AND delivery_status IN ('Queued', 'Sending')
      `, [delivery.campaign_id]);

      if (pendingCount.count === 0) {
        // All messages processed, mark campaign as completed
        await CommunicationCampaignModel.updateCampaign(delivery.campaign_id, {
          status: 'Completed',
          completed_at: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Failed to update campaign stats:', error);
    }
  }

  // Get delivery statistics for a campaign
  static async getCampaignDeliveryStats(campaignId: number): Promise<any> {
    try {
      const query = `
        SELECT 
          delivery_channel,
          delivery_status,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(SECOND, queued_at, delivered_at)) as avg_delivery_time
        FROM message_deliveries 
        WHERE campaign_id = ?
        GROUP BY delivery_channel, delivery_status
        ORDER BY delivery_channel, delivery_status
      `;

      const stats = await executeQuery(query, [campaignId]);

      // Organize stats by channel
      const channelStats: Record<string, any> = {};
      
      stats.forEach((stat: any) => {
        if (!channelStats[stat.delivery_channel]) {
          channelStats[stat.delivery_channel] = {
            total: 0,
            delivered: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            avg_delivery_time: 0
          };
        }

        channelStats[stat.delivery_channel].total += stat.count;
        
        switch (stat.delivery_status) {
          case 'Delivered':
            channelStats[stat.delivery_channel].delivered += stat.count;
            break;
          case 'Failed':
          case 'Bounced':
            channelStats[stat.delivery_channel].failed += stat.count;
            break;
          case 'Opened':
            channelStats[stat.delivery_channel].opened += stat.count;
            break;
          case 'Clicked':
            channelStats[stat.delivery_channel].clicked += stat.count;
            break;
        }

        if (stat.avg_delivery_time) {
          channelStats[stat.delivery_channel].avg_delivery_time = stat.avg_delivery_time;
        }
      });

      // Calculate rates
      Object.keys(channelStats).forEach(channel => {
        const stats = channelStats[channel];
        stats.delivery_rate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
        stats.failure_rate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
        
        if (channel === 'Email') {
          stats.open_rate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
          stats.click_rate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;
        }
      });

      return channelStats;
    } catch (error) {
      throw createDatabaseError('Failed to get campaign delivery stats', error);
    }
  }

  // Get delivery records for a message
  static async getMessageDeliveries(messageId: number): Promise<MessageDelivery[]> {
    try {
      const query = `
        SELECT * FROM message_deliveries 
        WHERE message_id = ?
        ORDER BY created_at ASC
      `;

      const deliveries = await executeQuery(query, [messageId]);
      
      return deliveries.map((delivery: any) => ({
        ...delivery,
        tracking_data: delivery.tracking_data ? JSON.parse(delivery.tracking_data) : null
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get message deliveries', error);
    }
  }

  // Handle delivery webhook (for external services like email providers)
  static async handleDeliveryWebhook(
    externalMessageId: string,
    status: DeliveryStatus,
    timestamp?: string,
    failureReason?: string,
    trackingData?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Find delivery record by external message ID
      const delivery = await executeQuerySingle(
        'SELECT id FROM message_deliveries WHERE external_message_id = ?',
        [externalMessageId]
      );

      if (!delivery) {
        console.warn(`No delivery record found for external message ID: ${externalMessageId}`);
        return false;
      }

      // Update delivery status
      return await this.updateDeliveryStatus(
        delivery.id,
        status,
        externalMessageId,
        failureReason,
        trackingData
      );
    } catch (error) {
      console.error('Failed to handle delivery webhook:', error);
      return false;
    }
  }

  // Get delivery analytics for date range
  static async getDeliveryAnalytics(
    dateFrom?: string,
    dateTo?: string,
    campaignId?: number
  ): Promise<any> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (dateFrom) {
        whereClause += ' AND created_at >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND created_at <= ?';
        params.push(dateTo);
      }

      if (campaignId) {
        whereClause += ' AND campaign_id = ?';
        params.push(campaignId);
      }

      const query = `
        SELECT 
          DATE(created_at) as date,
          delivery_channel,
          COUNT(*) as total_sent,
          SUM(CASE WHEN delivery_status IN ('Delivered', 'Opened', 'Clicked') THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN delivery_status IN ('Failed', 'Bounced') THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN delivery_status = 'Opened' THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN delivery_status = 'Clicked' THEN 1 ELSE 0 END) as clicked,
          AVG(TIMESTAMPDIFF(SECOND, queued_at, delivered_at)) as avg_delivery_time
        FROM message_deliveries 
        ${whereClause}
        GROUP BY DATE(created_at), delivery_channel
        ORDER BY date DESC, delivery_channel
      `;

      const analytics = await executeQuery(query, params);

      // Calculate rates
      return analytics.map((row: any) => ({
        ...row,
        delivery_rate: row.total_sent > 0 ? (row.delivered / row.total_sent) * 100 : 0,
        failure_rate: row.total_sent > 0 ? (row.failed / row.total_sent) * 100 : 0,
        open_rate: row.delivery_channel === 'Email' && row.delivered > 0 
          ? (row.opened / row.delivered) * 100 : 0,
        click_rate: row.delivery_channel === 'Email' && row.opened > 0 
          ? (row.clicked / row.opened) * 100 : 0
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get delivery analytics', error);
    }
  }

  // Retry failed deliveries
  static async retryFailedDeliveries(campaignId?: number, maxAge?: number): Promise<number> {
    try {
      let whereClause = `
        WHERE delivery_status IN ('Failed', 'Bounced') 
        AND retry_count < max_retries
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      `;
      const params: any[] = [];

      if (campaignId) {
        whereClause += ' AND campaign_id = ?';
        params.push(campaignId);
      }

      if (maxAge) {
        whereClause += ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)';
        params.push(maxAge);
      }

      // Get failed deliveries to retry
      const failedDeliveries = await executeQuery(`
        SELECT id, message_id, retry_count, max_retries
        FROM message_deliveries 
        ${whereClause}
        LIMIT 100
      `, params);

      let retryCount = 0;

      for (const delivery of failedDeliveries) {
        // Calculate next retry time (exponential backoff)
        const delayMinutes = Math.pow(2, delivery.retry_count);
        const nextRetry = new Date();
        nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);

        // Update delivery record for retry
        await executeQuery(`
          UPDATE message_deliveries 
          SET delivery_status = 'Queued', 
              retry_count = retry_count + 1,
              next_retry_at = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [nextRetry.toISOString(), delivery.id]);

        retryCount++;
      }

      console.log(`🔄 Scheduled ${retryCount} deliveries for retry`);
      return retryCount;
    } catch (error) {
      throw createDatabaseError('Failed to retry failed deliveries', error);
    }
  }
}
