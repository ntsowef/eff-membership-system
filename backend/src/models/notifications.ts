import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';
// import { smsService } from '../services/smsService'; // Temporarily disabled

// Notification interfaces
export interface Notification {
  id: number;
  user_id?: number;
  member_id?: number;
  recipient_type: 'User' | 'Member' | 'Admin';
  notification_type: 'System' | 'Renewal' | 'Payment' | 'Admin' | 'Application Status' | 'Voter Verification' | 'Meeting' | 'Leadership' | 'Other';
  delivery_channel: 'Email' | 'SMS' | 'In-App' | 'Push';
  delivery_status: 'Pending' | 'Sent' | 'Failed' | 'Delivered';
  title: string;
  message: string;
  sent_at?: string;
  read_at?: string;
  template_id?: string;
  template_data?: any;
  created_at: string;
  updated_at: string;
}

export interface NotificationDetails extends Notification {
  recipient_name?: string;
  recipient_email?: string;
}

export interface CreateNotificationData {
  user_id?: number;
  member_id?: number;
  recipient_type: 'User' | 'Member' | 'Admin';
  notification_type: 'System' | 'Renewal' | 'Payment' | 'Admin' | 'Application Status' | 'Voter Verification' | 'Meeting' | 'Leadership' | 'Other';
  delivery_channel: 'Email' | 'SMS' | 'In-App' | 'Push';
  title: string;
  message: string;
  template_id?: string;
  template_data?: any;
  send_immediately?: boolean;
}

export interface UpdateNotificationData {
  delivery_status?: 'Pending' | 'Sent' | 'Failed' | 'Delivered';
  sent_at?: string;
  read_at?: string;
}

export interface NotificationFilters {
  user_id?: number;
  member_id?: number;
  recipient_type?: string;
  notification_type?: string;
  delivery_channel?: string;
  delivery_status?: string;
  unread_only?: boolean;
  created_after?: string;
  created_before?: string;
}

// Notification model class
export class NotificationModel {
  // Create new notification
  static async createNotification(notificationData: CreateNotificationData): Promise<number> {
    try {
      const query = `
        INSERT INTO notifications (
          user_id, member_id, recipient_type, notification_type, delivery_channel,
          title, message, template_id, template_data, delivery_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
      `;

      const params = [
        notificationData.user_id || null,
        notificationData.member_id || null,
        notificationData.recipient_type,
        notificationData.notification_type,
        notificationData.delivery_channel,
        notificationData.title,
        notificationData.message,
        notificationData.template_id || null,
        notificationData.template_data ? JSON.stringify(notificationData.template_data) : null
      ];

      const result = await executeQuery(query, params);
      const notificationId = result.insertId;

      // Send immediately if requested
      if (notificationData.send_immediately) {
        await this.sendNotification(notificationId);
      }

      return notificationId;
    } catch (error) {
      throw createDatabaseError('Failed to create notification', error);
    }
  }

  // Get notification by ID with details
  static async getNotificationById(id: number): Promise<NotificationDetails | null> {
    try {
      const query = `
        SELECT 
          n.*,
          u.name as recipient_name,
          u.email as recipient_email
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN members_consolidated m ON n.member_id = m.id
        WHERE n.id = ?
      `;

      const notification = await executeQuerySingle<NotificationDetails>(query, [id]);
      
      if (notification && notification.template_data) {
        try {
          notification.template_data = JSON.parse(notification.template_data);
        } catch (error) {
          console.warn('Failed to parse template_data for notification', id);
        }
      }

      return notification;
    } catch (error) {
      throw createDatabaseError('Failed to fetch notification', error);
    }
  }

  // Get notifications with filtering and pagination
  static async getNotifications(
    limit: number = 20,
    offset: number = 0,
    filters: NotificationFilters = {}
  ): Promise<NotificationDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.user_id) {
        whereClause += ' AND n.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.member_id) {
        whereClause += ' AND n.member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.recipient_type) {
        whereClause += ' AND n.recipient_type = ?';
        params.push(filters.recipient_type);
      }

      if (filters.notification_type) {
        whereClause += ' AND n.notification_type = ?';
        params.push(filters.notification_type);
      }

      if (filters.delivery_channel) {
        whereClause += ' AND n.delivery_channel = ?';
        params.push(filters.delivery_channel);
      }

      if (filters.delivery_status) {
        whereClause += ' AND n.delivery_status = ?';
        params.push(filters.delivery_status);
      }

      if (filters.unread_only) {
        whereClause += ' AND n.read_at IS NULL';
      }

      if (filters.created_after) {
        whereClause += ' AND n.created_at >= ?';
        params.push(filters.created_after);
      }

      if (filters.created_before) {
        whereClause += ' AND n.created_at <= ?';
        params.push(filters.created_before);
      }

      const query = `
        SELECT 
          n.*,
          u.name as recipient_name,
          u.email as recipient_email
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN members_consolidated m ON n.member_id = m.id
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const notifications = await executeQuery<NotificationDetails>(query, params);

      // Parse template_data for each notification
      notifications.forEach(notification => {
        if (notification.template_data) {
          try {
            notification.template_data = JSON.parse(notification.template_data);
          } catch (error) {
            console.warn('Failed to parse template_data for notification', notification.id);
          }
        }
      });

      return notifications;
    } catch (error) {
      throw createDatabaseError('Failed to fetch notifications', error);
    }
  }

  // Get notification count with filters
  static async getNotificationCount(filters: NotificationFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.user_id) {
        whereClause += ' AND user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.member_id) {
        whereClause += ' AND member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.recipient_type) {
        whereClause += ' AND recipient_type = ?';
        params.push(filters.recipient_type);
      }

      if (filters.notification_type) {
        whereClause += ' AND notification_type = ?';
        params.push(filters.notification_type);
      }

      if (filters.delivery_channel) {
        whereClause += ' AND delivery_channel = ?';
        params.push(filters.delivery_channel);
      }

      if (filters.delivery_status) {
        whereClause += ' AND delivery_status = ?';
        params.push(filters.delivery_status);
      }

      if (filters.unread_only) {
        whereClause += ' AND read_at IS NULL';
      }

      if (filters.created_after) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.created_after);
      }

      if (filters.created_before) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.created_before);
      }

      const query = `SELECT COUNT(*) as count FROM notifications ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);

      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get notification count', error);
    }
  }

  // Update notification
  static async updateNotification(id: number, updateData: UpdateNotificationData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.delivery_status !== undefined) {
        fields.push('delivery_status = ?');
        params.push(updateData.delivery_status);
      }

      if (updateData.sent_at !== undefined) {
        fields.push('sent_at = ?');
        params.push(updateData.sent_at);
      }

      if (updateData.read_at !== undefined) {
        fields.push('read_at = ?');
        params.push(updateData.read_at);
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update notification', error);
    }
  }

  // Mark notification as read
  static async markAsRead(id: number): Promise<boolean> {
    try {
      return await this.updateNotification(id, { read_at: new Date().toISOString() });
    } catch (error) {
      throw createDatabaseError('Failed to mark notification as read', error);
    }
  }

  // Mark multiple notifications as read
  static async markMultipleAsRead(ids: number[]): Promise<boolean> {
    try {
      if (ids.length === 0) return false;

      const placeholders = ids.map(() => '?').join(', ');
      const query = `
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders}) AND read_at IS NULL
      `;

      const result = await executeQuery(query, ids);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to mark notifications as read', error);
    }
  }

  // Send notification (deliver via appropriate channel)
  static async sendNotification(id: number): Promise<boolean> {
    try {
      const notification = await this.getNotificationById(id);
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.delivery_status !== 'Pending') {
        return false; // Already sent or failed
      }

      let success = false;

      switch (notification.delivery_channel) {
        case 'Email':
          success = await this.sendEmailNotification(notification);
          break;
        case 'SMS':
          success = await this.sendSMSNotification(notification);
          break;
        case 'In-App':
          success = true; // In-app notifications are just database records
          break;
        case 'Push':
          success = await this.sendPushNotification(notification);
          break;
        default:
          console.warn('Unknown delivery channel:', notification.delivery_channel);
          success = false;
      }

      // Update delivery status
      await this.updateNotification(id, {
        delivery_status: success ? 'Sent' : 'Failed',
        sent_at: success ? new Date().toISOString() : undefined
      });

      return success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      await this.updateNotification(id, { delivery_status: 'Failed' });
      return false;
    }
  }

  // Send email notification
  private static async sendEmailNotification(notification: NotificationDetails): Promise<boolean> {
    try {
      if (!notification.recipient_email) {
        console.warn('No email address for notification recipient');
        return false;
      }

      return await emailService.sendEmail({
        to: notification.recipient_email,
        subject: notification.title,
        html: notification.message
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  // Send SMS notification
  private static async sendSMSNotification(notification: NotificationDetails): Promise<boolean> {
    try {
      // Get recipient phone number
      let phoneNumber: string | null = null;

      if (notification.member_id) {
        // Get member's phone number
        const memberQuery = 'SELECT cell_number FROM members_consolidated WHERE member_id = ?';
        const member = await executeQuerySingle<{ cell_number: string }>(memberQuery, [notification.member_id]);
        phoneNumber = member?.cell_number || null;
      } else if (notification.user_id) {
        // Get user's phone number (if we add phone to users table later)
        // For now, we'll need to get it from the member record linked to the user
        const userMemberQuery = `
          SELECT m.cell_number
          FROM users u
          LEFT JOIN members_consolidated m ON u.member_id = m.member_id
          WHERE u.id = ?
        `;
        const userMember = await executeQuerySingle<{ cell_number: string }>(userMemberQuery, [notification.user_id]);
        phoneNumber = userMember?.cell_number || null;
      }

      if (!phoneNumber) {
        console.warn('No phone number found for SMS notification recipient');
        return false;
      }

      // Create SMS message (limit to 160 characters for standard SMS)
      let smsMessage = notification.message;
      if (smsMessage.length > 160) {
        smsMessage = smsMessage.substring(0, 157) + '...';
      }

      // Send SMS (temporarily disabled)
      // const result = await smsService.sendSMS(phoneNumber, smsMessage);
      const result = { success: false, error: 'SMS service temporarily disabled', provider: 'mock' };

      if (result.success) {
        console.log(`SMS sent successfully to ${phoneNumber} via ${result.provider}`);
        return true;
      } else {
        console.error(`Failed to send SMS to ${phoneNumber}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      return false;
    }
  }

  // Send push notification (placeholder - implement with push service)
  private static async sendPushNotification(notification: NotificationDetails): Promise<boolean> {
    try {
      // TODO: Implement push notification logic
      console.log('Push notification would be sent:', {
        recipient: notification.recipient_name,
        title: notification.title,
        message: notification.message
      });
      return true; // Return true for now
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  // Send pending notifications
  static async sendPendingNotifications(): Promise<{ sent: number; failed: number }> {
    try {
      const pendingNotifications = await this.getNotifications(100, 0, { delivery_status: 'Pending' });
      
      let sent = 0;
      let failed = 0;

      for (const notification of pendingNotifications) {
        const success = await this.sendNotification(notification.id);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      throw createDatabaseError('Failed to send pending notifications', error);
    }
  }

  // Delete notification
  static async deleteNotification(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM notifications WHERE id = ?';
      const result = await executeQuery(query, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete notification', error);
    }
  }

  // Get unread count for user
  static async getUnreadCount(userId: number): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? AND read_at IS NULL
      `;

      const result = await executeQuerySingle<{ count: number }>(query, [userId]);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get unread notification count', error);
    }
  }
}
