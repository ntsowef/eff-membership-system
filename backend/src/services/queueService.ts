import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { MessageModel } from '../models/communication';
import { emailService } from './emailService';
import { NotificationModel } from '../models/notifications';
import type { MessageQueue, Message } from '../types/communication';

export class QueueService {
  private static isProcessing = false;
  private static processingInterval: NodeJS.Timeout | null = null;

  // Initialize queue processing
  static initialize() {
    console.log('🚀 Initializing Queue Service...');
    this.startQueueProcessor();
  }

  // Start the queue processor
  static startQueueProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process queue every 30 seconds
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, 30000);

    // Process immediately on start
    setTimeout(() => this.processQueue(), 1000);
  }

  // Stop the queue processor
  static stopQueueProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Add message to queue
  static async addToQueue(
    messageId: number,
    campaignId?: number,
    queueType: 'Immediate' | 'Scheduled' | 'Batch' | 'Retry' = 'Immediate',
    priority: number = 5,
    scheduledFor?: Date
  ): Promise<number> {
    try {
      const query = `
        INSERT INTO message_queue (
          campaign_id, message_id, queue_type, priority, 
          scheduled_for, status
        ) VALUES ($1, $2, $3, $4, $5, 'Pending')
      `;

      const params = [
        campaignId || null,
        messageId,
        queueType,
        priority,
        scheduledFor ? scheduledFor.toISOString() : null
      ];

      const result = await executeQuery(query, params);
      console.log(`📨 Message ${messageId} added to queue with priority ${priority}`);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to add message to queue', error);
    }
  }

  // Process the message queue
  static async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log('⚡ Processing message queue...');

    try {
      // Get pending messages from queue, ordered by priority and creation time
      const queueItems = await this.getPendingQueueItems();
      
      if (queueItems.length === 0) {
        console.log('📭 No messages in queue');
        return;
      }

      console.log(`📬 Processing ${queueItems.length} messages from queue`);

      // Process messages in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < queueItems.length; i += batchSize) {
        const batch = queueItems.slice(i, i + batchSize);
        await this.processBatch(batch);
        
        // Small delay between batches to prevent overwhelming external services
        if (i + batchSize < queueItems.length) {
          await this.delay(1000); // 1 second delay
        }
      }

    } catch (error) {
      console.error('❌ Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Get pending queue items
  private static async getPendingQueueItems(): Promise<MessageQueue[]> {
    try {
      const query = `
        SELECT * FROM message_queue 
        WHERE status = 'Pending' 
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        AND (retry_after IS NULL OR retry_after <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT 50
      `;

      return await executeQuery(query);
    } catch (error) {
      throw createDatabaseError('Failed to get pending queue items', error);
    }
  }

  // Process a batch of queue items
  private static async processBatch(batch: MessageQueue[]): Promise<void> {
    const promises = batch.map(queueItem => this.processQueueItem(queueItem));
    await Promise.allSettled(promises);
  }

  // Process individual queue item
  private static async processQueueItem(queueItem: MessageQueue): Promise<void> {
    try {
      // Mark as processing
      await this.updateQueueItemStatus(queueItem.id, 'Processing');

      // Get the message details
      const message = await MessageModel.getMessageById(queueItem.message_id);
      if (!message) {
        await this.updateQueueItemStatus(queueItem.id, 'Failed', 'Message not found');
        return;
      }

      // Process the message
      const success = await this.sendMessage(message);

      if (success) {
        // Mark as completed
        await this.updateQueueItemStatus(queueItem.id, 'Completed');
        console.log(`✅ Message ${message.id} sent successfully`);
      } else {
        // Handle retry logic
        await this.handleRetry(queueItem);
      }

    } catch (error) {
      console.error(`❌ Error processing queue item ${queueItem.id}:`, error);
      await this.handleRetry(queueItem, (error as Error).message || 'Unknown error');
    }
  }

  // Send message through appropriate channels
  private static async sendMessage(message: Message): Promise<boolean> {
    let overallSuccess = false;

    // Get recipient details based on message type
    const recipientDetails = await this.getRecipientDetails(message);
    if (!recipientDetails) {
      console.warn(`No recipient details found for message ${message.id}`);
      return false;
    }

    // Send through each delivery channel
    for (const channel of message.delivery_channels) {
      try {
        const channelSuccess = await this.sendViaChannel(message, channel, recipientDetails);
        if (channelSuccess) {
          overallSuccess = true;
        }
      } catch (error) {
        console.error(`Failed to send message ${message.id} via ${channel}:`, error);
      }
    }

    // Update message status
    await MessageModel.updateMessage(message.id, {
      delivery_status: overallSuccess ? 'Sent' : 'Failed',
      sent_at: overallSuccess ? new Date().toISOString() : undefined,
      failed_reason: overallSuccess ? undefined : 'Failed to send via any channel'
    });

    return overallSuccess;
  }

  // Get recipient details
  private static async getRecipientDetails(message: Message): Promise<any> {
    if (message.recipient_type === 'Member' && message.recipient_id) {
      try {
        const query = `
          SELECT member_id, firstname, surname, email, cell_number, ward_code
          FROM members_consolidated 
          WHERE member_id = $1
        `;
        return await executeQuerySingle(query, [message.recipient_id]);
      } catch (error) {
        console.error('Failed to get member details:', error);
        return null;
      }
    }
    
    // Handle other recipient types (Admin, All) here
    return null;
  }

  // Send message via specific channel
  private static async sendViaChannel(
    message: Message, 
    channel: string, 
    recipient: any
  ): Promise<boolean> {
    switch (channel) {
      case 'Email':
        if (!recipient.email) {
          console.warn(`No email address for recipient ${recipient.member_id}`);
          return false;
        }
        
        return await emailService.sendEmail({
          to: recipient.email,
          subject: message.subject || 'Message from Organization',
          html: message.content
        });

      case 'SMS':
        if (!recipient.cell_number) {
          console.warn(`No phone number for recipient ${recipient.member_id}`);
          return false;
        }
        
        // Create SMS notification (SMS service integration would go here)
        await NotificationModel.createNotification({
          member_id: recipient.member_id,
          recipient_type: 'Member',
          notification_type: 'System',
          delivery_channel: 'SMS',
          title: message.subject || 'SMS Message',
          message: message.content.substring(0, 160), // SMS length limit
          send_immediately: true
        });
        return true;

      case 'In-App':
        // Create in-app notification
        await NotificationModel.createNotification({
          member_id: recipient.member_id,
          recipient_type: 'Member',
          notification_type: 'System',
          delivery_channel: 'In-App',
          title: message.subject || 'New Message',
          message: message.content,
          send_immediately: true
        });
        return true;

      default:
        console.warn(`Unsupported delivery channel: ${channel}`);
        return false;
    }
  }

  // Handle retry logic
  private static async handleRetry(queueItem: MessageQueue, errorMessage?: string): Promise<void> {
    const maxRetries = queueItem.max_retries || 3;
    const currentRetries = queueItem.retry_count || 0;

    if (currentRetries < maxRetries) {
      // Calculate exponential backoff delay (2^retry_count minutes)
      const delayMinutes = Math.pow(2, currentRetries);
      const retryAfter = new Date();
      retryAfter.setMinutes(retryAfter.getMinutes() + delayMinutes);

      await this.updateQueueItem(queueItem.id, {
        status: 'Pending',
        retry_count: currentRetries + 1,
        retry_after: retryAfter.toISOString(),
        error_message: errorMessage || 'Processing failed'
      });

      console.log(`🔄 Message ${queueItem.message_id} scheduled for retry ${currentRetries + 1}/${maxRetries} in ${delayMinutes} minutes`);
    } else {
      // Max retries reached, mark as failed
      await this.updateQueueItemStatus(queueItem.id, 'Failed', `Max retries (${maxRetries}) reached`);
      console.log(`❌ Message ${queueItem.message_id} failed after ${maxRetries} retries`);
    }
  }

  // Update queue item status
  private static async updateQueueItemStatus(
    queueId: number, 
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE message_queue 
        SET status = $1, processed_at = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `;

      const processedAt = status === 'Completed' || status === 'Failed' ? new Date().toISOString() : null;
      await executeQuery(query, [status, processedAt, errorMessage || null, queueId]);
    } catch (error) {
      console.error('Failed to update queue item status:', error);
    }
  }

  // Update queue item with multiple fields
  private static async updateQueueItem(queueId: number, updates: Partial<MessageQueue>): Promise<void> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${params.length + 1}`);
          params.push(value);
        }
      });

      if (updateFields.length === 0) return;

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(queueId);

      const query = `UPDATE message_queue SET ${updateFields.join(', ')} WHERE id = $${params.length + 1}`;
      params.push(queueId);
      await executeQuery(query, params);
    } catch (error) {
      console.error('Failed to update queue item:', error);
    }
  }

  // Utility function for delays
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get queue statistics
  static async getQueueStats(): Promise<any> {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (COALESCE(processed_at, NOW()) - created_at))) as avg_processing_time
        FROM message_queue
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY status
      `;

      const stats = await executeQuery(query);
      
      return {
        last_24_hours: stats,
        is_processing: this.isProcessing,
        processor_active: this.processingInterval !== null
      };
    } catch (error) {
      throw createDatabaseError('Failed to get queue statistics', error);
    }
  }

  // Clear completed queue items older than specified days
  static async cleanupQueue(olderThanDays: number = 7): Promise<number> {
    try {
      const query = `
        DELETE FROM message_queue 
        WHERE status IN ('Completed', 'Failed') 
        AND processed_at < NOW() - INTERVAL '$1 days'
      `;

      const result = await executeQuery(query, [olderThanDays]);
      console.log(`🧹 Cleaned up ${result.affectedRows} old queue items`);
      return result.affectedRows;
    } catch (error) {
      throw createDatabaseError('Failed to cleanup queue', error);
    }
  }
}

// Queue service will be initialized manually after database connection
