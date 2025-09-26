import { Router, Request, Response, NextFunction } from 'express';
import { NotificationModel, CreateNotificationData, NotificationFilters } from '../models/notifications';
import { authenticate, requirePermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';
// import { smsService } from '../services/smsService'; // Temporarily disabled
import Joi from 'joi';

const router = Router();

// Validation schemas
const createNotificationSchema = Joi.object({
  user_id: Joi.number().integer().positive().optional(),
  member_id: Joi.number().integer().positive().optional(),
  recipient_type: Joi.string().valid('User', 'Member', 'Admin').required(),
  notification_type: Joi.string().valid('System', 'Renewal', 'Payment', 'Admin', 'Application Status', 'Voter Verification', 'Meeting', 'Leadership', 'Other').required(),
  delivery_channel: Joi.string().valid('Email', 'SMS', 'In-App', 'Push').required(),
  title: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).max(2000).required(),
  template_id: Joi.string().max(50).optional(),
  template_data: Joi.object().optional(),
  send_immediately: Joi.boolean().optional()
}).custom((value, helpers) => {
  // Either user_id or member_id must be provided
  if (!value.user_id && !value.member_id) {
    return helpers.error('any.custom', { message: 'Either user_id or member_id must be provided' });
  }
  return value;
});

const sendAnnouncementSchema = Joi.object({
  recipient_emails: Joi.array().items(Joi.string().email()).min(1).required(),
  subject: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).max(5000).required(),
  is_html: Joi.boolean().optional()
});

// Create new notification
router.post('/', authenticate, requirePermission('notifications.create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createNotificationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const notificationData: CreateNotificationData = value;
    const notificationId = await NotificationModel.createNotification(notificationData);

    const notification = await NotificationModel.getNotificationById(notificationId);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: {
        notification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get all notifications (admin only)
router.get('/', authenticate, requirePermission('notifications.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: NotificationFilters = {};
    
    if (req.query.user_id) filters.user_id = parseInt(req.query.user_id as string);
    if (req.query.member_id) filters.member_id = parseInt(req.query.member_id as string);
    if (req.query.recipient_type) filters.recipient_type = req.query.recipient_type as string;
    if (req.query.notification_type) filters.notification_type = req.query.notification_type as string;
    if (req.query.delivery_channel) filters.delivery_channel = req.query.delivery_channel as string;
    if (req.query.delivery_status) filters.delivery_status = req.query.delivery_status as string;
    if (req.query.unread_only === 'true') filters.unread_only = true;
    if (req.query.created_after) filters.created_after = req.query.created_after as string;
    if (req.query.created_before) filters.created_before = req.query.created_before as string;

    const [notifications, totalCount] = await Promise.all([
      NotificationModel.getNotifications(limit, offset, filters),
      NotificationModel.getNotificationCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get user's notifications
router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    const filters: NotificationFilters = {
      user_id: req.user!.id
    };
    
    if (req.query.notification_type) filters.notification_type = req.query.notification_type as string;
    if (req.query.delivery_channel) filters.delivery_channel = req.query.delivery_channel as string;
    if (req.query.unread_only === 'true') filters.unread_only = true;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      NotificationModel.getNotifications(limit, offset, filters),
      NotificationModel.getNotificationCount(filters),
      NotificationModel.getUnreadCount(req.user!.id)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'User notifications retrieved successfully',
      data: {
        notifications,
        unread_count: unreadCount,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get notification by ID
router.get('/:id', authenticate, requirePermission('notifications.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification ID');
    }

    const notification = await NotificationModel.getNotificationById(notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      success: true,
      message: 'Notification retrieved successfully',
      data: {
        notification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.post('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification ID');
    }

    // Check if user owns this notification (unless admin)
    const notification = await NotificationModel.getNotificationById(notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const isAdmin = req.user?.role_name?.includes('admin') || false;
    if (!isAdmin && notification.user_id !== req.user!.id) {
      throw new ValidationError('Cannot mark other users\' notifications as read');
    }

    const success = await NotificationModel.markAsRead(notificationId);
    if (!success) {
      throw new Error('Failed to mark notification as read');
    }

    const updatedNotification = await NotificationModel.getNotificationById(notificationId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification: updatedNotification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Mark multiple notifications as read
router.post('/mark-read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notification_ids } = req.body;
    
    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      throw new ValidationError('notification_ids must be a non-empty array');
    }

    const ids = notification_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (ids.length === 0) {
      throw new ValidationError('No valid notification IDs provided');
    }

    // For non-admin users, only allow marking their own notifications
    const isAdmin = req.user?.role_name?.includes('admin') || false;
    if (!isAdmin) {
      // Verify all notifications belong to the user
      const userNotifications = await NotificationModel.getNotifications(1000, 0, { user_id: req.user!.id });
      const userNotificationIds = userNotifications.map(n => n.id);
      
      const invalidIds = ids.filter(id => !userNotificationIds.includes(id));
      if (invalidIds.length > 0) {
        throw new ValidationError('Cannot mark other users\' notifications as read');
      }
    }

    const success = await NotificationModel.markMultipleAsRead(ids);
    if (!success) {
      throw new Error('Failed to mark notifications as read');
    }

    res.json({
      success: true,
      message: `${ids.length} notifications marked as read`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Send notification immediately
router.post('/:id/send', authenticate, requirePermission('notifications.send'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification ID');
    }

    const success = await NotificationModel.sendNotification(notificationId);
    if (!success) {
      throw new Error('Failed to send notification');
    }

    const notification = await NotificationModel.getNotificationById(notificationId);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        notification
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Send pending notifications
router.post('/send-pending', authenticate, requirePermission('notifications.send'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await NotificationModel.sendPendingNotifications();

    res.json({
      success: true,
      message: 'Pending notifications processed',
      data: {
        sent: result.sent,
        failed: result.failed
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Send system announcement
router.post('/announcement', authenticate, requirePermission('notifications.send'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = sendAnnouncementSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { recipient_emails, subject, message, is_html } = value;

    const success = await emailService.sendSystemAnnouncement(
      recipient_emails,
      subject,
      message,
      is_html || false
    );

    if (!success) {
      throw new Error('Failed to send system announcement');
    }

    res.json({
      success: true,
      message: `System announcement sent to ${recipient_emails.length} recipients`,
      data: {
        recipient_count: recipient_emails.length,
        subject,
        sent_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Test email configuration
router.get('/test/email', authenticate, requirePermission('system.configure'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await emailService.testEmailConfiguration();

    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticate, requirePermission('notifications.delete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification ID');
    }

    const success = await NotificationModel.deleteNotification(notificationId);
    if (!success) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Test SMS configuration
router.get('/test/sms', authenticate, requirePermission('system.configure'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testPhoneNumber = req.query.phone as string;

    if (!testPhoneNumber) {
      throw new ValidationError('Phone number is required for SMS test');
    }

    // const result = await smsService.testSMS(testPhoneNumber);
    const result = { success: false, error: 'SMS service temporarily disabled', provider: 'mock', messageId: 'mock_123' };

    res.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully' : `SMS test failed: ${result.error}`,
      data: {
        provider: result.provider,
        message_id: result.messageId,
        error: result.error
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Send SMS notification directly
router.post('/send-sms', authenticate, requirePermission('notifications.send'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone_number, message } = req.body;

    if (!phone_number || !message) {
      throw new ValidationError('Phone number and message are required');
    }

    if (message.length > 160) {
      throw new ValidationError('SMS message cannot exceed 160 characters');
    }

    // const result = await smsService.sendSMS(phone_number, message);
    const result = { success: false, error: 'SMS service temporarily disabled', provider: 'mock', messageId: 'mock_456' };

    res.json({
      success: result.success,
      message: result.success ? 'SMS sent successfully' : `SMS failed: ${result.error}`,
      data: {
        provider: result.provider,
        message_id: result.messageId,
        error: result.error
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get SMS provider information
router.get('/sms/provider', authenticate, requirePermission('system.configure'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // const providerName = smsService.getProviderName();
    const providerName = 'Mock SMS Provider (temporarily disabled)';

    res.json({
      success: true,
      message: 'SMS provider information retrieved',
      data: {
        provider: providerName,
        status: 'active'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get notification statistics by delivery channel
router.get('/stats/delivery-channels', authenticate, requirePermission('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: NotificationFilters = {};

    // Apply date filters if provided
    if (req.query.created_after) filters.created_after = req.query.created_after as string;
    if (req.query.created_before) filters.created_before = req.query.created_before as string;

    const [
      emailStats,
      smsStats,
      inAppStats,
      pushStats
    ] = await Promise.all([
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'Email' }),
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'SMS' }),
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'In-App' }),
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'Push' })
    ]);

    const [
      emailSent,
      smsSent,
      inAppSent,
      pushSent
    ] = await Promise.all([
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'Email', delivery_status: 'Sent' }),
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'SMS', delivery_status: 'Sent' }),
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'In-App', delivery_status: 'Sent' }),
      NotificationModel.getNotificationCount({ ...filters, delivery_channel: 'Push', delivery_status: 'Sent' })
    ]);

    res.json({
      success: true,
      message: 'Delivery channel statistics retrieved successfully',
      data: {
        statistics: {
          email: {
            total: emailStats,
            sent: emailSent,
            success_rate: emailStats > 0 ? ((emailSent / emailStats) * 100).toFixed(2) + '%' : '0%'
          },
          sms: {
            total: smsStats,
            sent: smsSent,
            success_rate: smsStats > 0 ? ((smsSent / smsStats) * 100).toFixed(2) + '%' : '0%'
          },
          in_app: {
            total: inAppStats,
            sent: inAppSent,
            success_rate: inAppStats > 0 ? ((inAppSent / inAppStats) * 100).toFixed(2) + '%' : '0%'
          },
          push: {
            total: pushStats,
            sent: pushSent,
            success_rate: pushStats > 0 ? ((pushSent / pushStats) * 100).toFixed(2) + '%' : '0%'
          }
        },
        total_notifications: emailStats + smsStats + inAppStats + pushStats,
        total_sent: emailSent + smsSent + inAppSent + pushSent
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
