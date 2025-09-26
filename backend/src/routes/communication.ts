import { Router, Request, Response, NextFunction } from 'express';
import { 
  MessageTemplateModel, 
  CommunicationCampaignModel, 
  MessageModel,
  CommunicationPreferencesModel 
} from '../models/communication';
import { TemplateService, CampaignService, MessageService } from '../services/communicationService';
import { asyncHandler, sendSuccess, sendPaginatedSuccess, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticate, requirePermission, requireSMSPermission } from '../middleware/auth';
import Joi from 'joi';
import type {
  CreateTemplateData,
  UpdateTemplateData,
  CreateCampaignData,
  UpdateCampaignData,
  CreateMessageData,
  TemplateFilters,
  CampaignFilters,
  MessageFilters
} from '../types/communication';

const router = Router();

// Middleware to check SMS permissions when SMS is involved
const checkSMSPermissions = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check if SMS is being used in the request
    const hasSMS =
      (req.body.template_type === 'SMS') ||
      (req.body.delivery_channels && req.body.delivery_channels.includes('SMS')) ||
      (req.body.sms_enabled !== undefined);

    if (hasSMS) {
      // Apply SMS permission check
      return requireSMSPermission()(req, res, next);
    }

    // No SMS involved, continue
    next();
  } catch (error) {
    next(error);
  }
};

// Validation schemas
const templateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  template_type: Joi.string().valid('Email', 'SMS', 'In-App', 'Push').required(),
  category: Joi.string().valid('System', 'Marketing', 'Announcement', 'Reminder', 'Welcome', 'Custom').default('Custom'),
  subject: Joi.string().max(500).optional(),
  content: Joi.string().min(1).required(),
  variables: Joi.object().optional(),
  is_active: Joi.boolean().default(true)
});

const campaignSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  campaign_type: Joi.string().valid('Mass', 'Targeted', 'Individual').required(),
  template_id: Joi.number().integer().positive().optional(),
  delivery_channels: Joi.array().items(Joi.string().valid('Email', 'SMS', 'In-App', 'Push')).min(1).required(),
  target_criteria: Joi.object({
    province_codes: Joi.array().items(Joi.string()).optional(),
    district_codes: Joi.array().items(Joi.string()).optional(),
    municipality_codes: Joi.array().items(Joi.string()).optional(),
    ward_codes: Joi.array().items(Joi.string()).optional(),
    gender_ids: Joi.array().items(Joi.number().integer()).optional(),
    race_ids: Joi.array().items(Joi.number().integer()).optional(),
    age_min: Joi.number().integer().min(0).max(120).optional(),
    age_max: Joi.number().integer().min(0).max(120).optional(),
    membership_status_ids: Joi.array().items(Joi.number().integer()).optional(),
    subscription_type_ids: Joi.array().items(Joi.number().integer()).optional(),
    has_email: Joi.boolean().optional(),
    has_cell_number: Joi.boolean().optional(),
    member_ids: Joi.array().items(Joi.number().integer().positive()).optional()
  }).optional(),
  scheduled_at: Joi.date().iso().optional()
});

const messageSchema = Joi.object({
  conversation_id: Joi.string().optional(),
  campaign_id: Joi.number().integer().positive().optional(),
  sender_type: Joi.string().valid('Admin', 'Member', 'System').required(),
  sender_id: Joi.number().integer().positive().optional(),
  recipient_type: Joi.string().valid('Admin', 'Member', 'All').required(),
  recipient_id: Joi.number().integer().positive().optional(),
  subject: Joi.string().max(500).optional(),
  content: Joi.string().min(1).required(),
  message_type: Joi.string().valid('Text', 'HTML', 'Template').default('Text'),
  template_id: Joi.number().integer().positive().optional(),
  template_data: Joi.object().optional(),
  delivery_channels: Joi.array().items(Joi.string().valid('Email', 'SMS', 'In-App', 'Push')).min(1).required(),
  priority: Joi.string().valid('Low', 'Normal', 'High', 'Urgent').default('Normal'),
  is_reply: Joi.boolean().default(false),
  parent_message_id: Joi.number().integer().positive().optional(),
  send_immediately: Joi.boolean().default(false)
});

const templateFilterSchema = Joi.object({
  template_type: Joi.array().items(Joi.string().valid('Email', 'SMS', 'In-App', 'Push')).optional(),
  category: Joi.array().items(Joi.string().valid('System', 'Marketing', 'Announcement', 'Reminder', 'Welcome', 'Custom')).optional(),
  is_active: Joi.boolean().optional(),
  created_by: Joi.number().integer().positive().optional()
}).concat(commonSchemas.pagination);

const campaignFilterSchema = Joi.object({
  status: Joi.array().items(Joi.string().valid('Draft', 'Scheduled', 'Sending', 'Completed', 'Cancelled', 'Failed')).optional(),
  campaign_type: Joi.array().items(Joi.string().valid('Mass', 'Targeted', 'Individual')).optional(),
  created_by: Joi.number().integer().positive().optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  template_id: Joi.number().integer().positive().optional()
}).concat(commonSchemas.pagination);

const messageFilterSchema = Joi.object({
  conversation_id: Joi.string().optional(),
  sender_type: Joi.string().valid('Admin', 'Member', 'System').optional(),
  sender_id: Joi.number().integer().positive().optional(),
  recipient_type: Joi.string().valid('Admin', 'Member', 'All').optional(),
  recipient_id: Joi.number().integer().positive().optional(),
  delivery_status: Joi.array().items(Joi.string().valid('Draft', 'Queued', 'Sending', 'Sent', 'Delivered', 'Failed', 'Read')).optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  priority: Joi.array().items(Joi.string().valid('Low', 'Normal', 'High', 'Urgent')).optional()
}).concat(commonSchemas.pagination);

// =============================================================================
// MESSAGE TEMPLATES ROUTES
// =============================================================================

// Get all templates
router.get('/templates',
  authenticate,
  requirePermission('communication.templates.read'),
  validate({ query: templateFilterSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      template_type,
      category,
      is_active,
      created_by
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const filters: TemplateFilters = {
      template_type: template_type as any,
      category: category as any,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      created_by: created_by ? parseInt(created_by as string) : undefined
    };

    const [templates, total] = await Promise.all([
      MessageTemplateModel.getAllTemplates(filters, limitNum, offset, sortBy as string, sortOrder as any),
      MessageTemplateModel.getTemplatesCount(filters)
    ]);

    sendPaginatedSuccess(res, templates, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }, 'Templates retrieved successfully');
  })
);

// Get template by ID
router.get('/templates/:id',
  authenticate,
  requirePermission('communication.templates.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const template = await MessageTemplateModel.getTemplateById(parseInt(id));
    
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    sendSuccess(res, template, 'Template retrieved successfully');
  })
);

// Create new template
router.post('/templates',
  authenticate,
  requirePermission('communication.templates.create'),
  checkSMSPermissions, // Check SMS permissions if template_type is SMS
  validate({ body: templateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const templateData: CreateTemplateData = req.body;
    const createdBy = (req as any).user?.id; // From auth middleware
    
    const templateId = await TemplateService.createTemplate(templateData, createdBy);
    const template = await MessageTemplateModel.getTemplateById(templateId);

    sendSuccess(res, template, 'Template created successfully', 201);
  })
);

// Update template
router.put('/templates/:id',
  authenticate,
  requirePermission('communication.templates.update'),
  checkSMSPermissions, // Check SMS permissions if template_type is SMS
  validate({ body: templateSchema.fork(['name', 'template_type', 'content'], (schema) => schema.optional()) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const templateData: UpdateTemplateData = req.body;
    
    const updated = await MessageTemplateModel.updateTemplate(parseInt(id), templateData);
    if (!updated) {
      throw new NotFoundError('Template not found');
    }

    const template = await MessageTemplateModel.getTemplateById(parseInt(id));
    sendSuccess(res, template, 'Template updated successfully');
  })
);

// Delete template
router.delete('/templates/:id',
  authenticate,
  requirePermission('communication.templates.delete'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const deleted = await MessageTemplateModel.deleteTemplate(parseInt(id));
    if (!deleted) {
      throw new NotFoundError('Template not found');
    }

    sendSuccess(res, null, 'Template deleted successfully');
  })
);

// Preview template
router.post('/templates/:id/preview',
  authenticate,
  requirePermission('communication.templates.read'),
  validate({ 
    body: Joi.object({
      template_data: Joi.object().optional()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { template_data = {} } = req.body;
    
    const template = await MessageTemplateModel.getTemplateById(parseInt(id));
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const rendered = TemplateService.renderTemplate(template, template_data);
    sendSuccess(res, rendered, 'Template preview generated successfully');
  })
);

// =============================================================================
// CAMPAIGNS ROUTES
// =============================================================================

// Get all campaigns
router.get('/campaigns',
  authenticate,
  requirePermission('communication.campaigns.read'),
  validate({ query: campaignFilterSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      campaign_type,
      created_by,
      date_from,
      date_to,
      template_id
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const filters: CampaignFilters = {
      status: status as any,
      campaign_type: campaign_type as any,
      created_by: created_by ? parseInt(created_by as string) : undefined,
      date_from: date_from as string,
      date_to: date_to as string,
      template_id: template_id ? parseInt(template_id as string) : undefined
    };

    const [campaigns, total] = await Promise.all([
      CommunicationCampaignModel.getAllCampaigns(filters, limitNum, offset, sortBy as string, sortOrder as any),
      CommunicationCampaignModel.getCampaignsCount(filters)
    ]);

    sendPaginatedSuccess(res, campaigns, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }, 'Campaigns retrieved successfully');
  })
);

// Get campaign by ID
router.get('/campaigns/:id',
  authenticate,
  requirePermission('communication.campaigns.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const campaign = await CommunicationCampaignModel.getCampaignById(parseInt(id));
    
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    sendSuccess(res, campaign, 'Campaign retrieved successfully');
  })
);

// Create new campaign
router.post('/campaigns',
  authenticate,
  requirePermission('communication.campaigns.create'),
  checkSMSPermissions, // Check SMS permissions if delivery_channels includes SMS
  validate({ body: campaignSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const campaignData: CreateCampaignData = req.body;
    const createdBy = (req as any).user?.id || 1; // From auth middleware
    
    const campaignId = await CampaignService.createCampaign(campaignData, createdBy);
    const campaign = await CommunicationCampaignModel.getCampaignById(campaignId);

    sendSuccess(res, campaign, 'Campaign created successfully', 201);
  })
);

// Update campaign
router.put('/campaigns/:id',
  authenticate,
  requirePermission('communication.campaigns.update'),
  validate({ body: campaignSchema.fork(['name', 'campaign_type', 'delivery_channels'], (schema) => schema.optional()) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const campaignData: UpdateCampaignData = req.body;
    
    const updated = await CommunicationCampaignModel.updateCampaign(parseInt(id), campaignData);
    if (!updated) {
      throw new NotFoundError('Campaign not found');
    }

    const campaign = await CommunicationCampaignModel.getCampaignById(parseInt(id));
    sendSuccess(res, campaign, 'Campaign updated successfully');
  })
);

// Launch campaign
router.post('/campaigns/:id/launch',
  authenticate,
  requirePermission('communication.campaigns.send'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const success = await CampaignService.launchCampaign(parseInt(id));
    if (!success) {
      throw new Error('Failed to launch campaign');
    }

    const campaign = await CommunicationCampaignModel.getCampaignById(parseInt(id));
    sendSuccess(res, campaign, 'Campaign launched successfully');
  })
);

// Get campaign recipients preview
router.get('/campaigns/:id/recipients',
  authenticate,
  requirePermission('communication.campaigns.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    
    const recipients = await CampaignService.getCampaignRecipients(parseInt(id));
    const preview = recipients.slice(0, parseInt(limit as string));
    
    sendSuccess(res, {
      total_recipients: recipients.length,
      preview_recipients: preview
    }, 'Campaign recipients retrieved successfully');
  })
);

// =============================================================================
// MESSAGES ROUTES
// =============================================================================

// Get all messages
router.get('/messages',
  authenticate,
  requirePermission('communication.messages.read'),
  validate({ query: messageFilterSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      conversation_id,
      sender_type,
      sender_id,
      recipient_type,
      recipient_id,
      delivery_status,
      date_from,
      date_to,
      priority
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const filters: MessageFilters = {
      conversation_id: conversation_id as string,
      sender_type: sender_type as any,
      sender_id: sender_id ? parseInt(sender_id as string) : undefined,
      recipient_type: recipient_type as any,
      recipient_id: recipient_id ? parseInt(recipient_id as string) : undefined,
      delivery_status: delivery_status as any,
      date_from: date_from as string,
      date_to: date_to as string,
      priority: priority as any
    };

    const [messages, total] = await Promise.all([
      MessageModel.getAllMessages(filters, limitNum, offset, sortBy as string, sortOrder as any),
      MessageModel.getMessagesCount(filters)
    ]);

    sendPaginatedSuccess(res, messages, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }, 'Messages retrieved successfully');
  })
);

// Get message by ID
router.get('/messages/:id',
  authenticate,
  requirePermission('communication.messages.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const message = await MessageModel.getMessageById(parseInt(id));

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    sendSuccess(res, message, 'Message retrieved successfully');
  })
);

// Create new message
router.post('/messages',
  authenticate,
  requirePermission('communication.messages.create'),
  checkSMSPermissions, // Check SMS permissions if delivery_channels includes SMS
  validate({ body: messageSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const messageData: CreateMessageData = req.body;
    const senderId = (req as any).user?.id; // From auth middleware

    // Set sender info from authenticated user
    if (!messageData.sender_id && messageData.sender_type === 'Admin') {
      messageData.sender_id = senderId;
    }

    const messageId = await MessageModel.createMessage(messageData);

    // Send immediately if requested
    if (messageData.send_immediately) {
      await MessageService.sendMessage(messageId);
    }

    const message = await MessageModel.getMessageById(messageId);
    sendSuccess(res, message, 'Message created successfully', 201);
  })
);

// Send message
router.post('/messages/:id/send',
  authenticate,
  requirePermission('communication.messages.send'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const success = await MessageService.sendMessage(parseInt(id));
    if (!success) {
      throw new Error('Failed to send message');
    }

    const message = await MessageModel.getMessageById(parseInt(id));
    sendSuccess(res, message, 'Message sent successfully');
  })
);

// Get conversation messages
router.get('/conversations/:conversationId/messages',
  authenticate,
  requirePermission('communication.messages.read'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(50)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const messages = await MessageModel.getConversationMessages(conversationId, limitNum, offset);
    const total = await MessageModel.getMessagesCount({ conversation_id: conversationId });

    sendPaginatedSuccess(res, messages, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }, 'Conversation messages retrieved successfully');
  })
);

// =============================================================================
// COMMUNICATION PREFERENCES ROUTES
// =============================================================================

// Get member communication preferences
router.get('/preferences/:memberId',
  authenticate,
  requirePermission('communication.preferences.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { memberId } = req.params;
    const preferences = await CommunicationPreferencesModel.getMemberPreferences(parseInt(memberId));

    if (!preferences) {
      // Return default preferences if none exist
      const defaultPreferences = {
        member_id: parseInt(memberId),
        email_enabled: true,
        sms_enabled: true,
        in_app_enabled: true,
        push_enabled: true,
        marketing_emails: true,
        system_notifications: true,
        membership_reminders: true,
        event_notifications: true,
        newsletter: true,
        digest_frequency: 'Immediate',
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00'
      };
      sendSuccess(res, defaultPreferences, 'Default preferences retrieved');
    } else {
      sendSuccess(res, preferences, 'Preferences retrieved successfully');
    }
  })
);

// Update member communication preferences
router.put('/preferences/:memberId',
  authenticate,
  requirePermission('communication.preferences.update'),
  validate({
    body: Joi.object({
      email_enabled: Joi.boolean().optional(),
      sms_enabled: Joi.boolean().optional(),
      in_app_enabled: Joi.boolean().optional(),
      push_enabled: Joi.boolean().optional(),
      marketing_emails: Joi.boolean().optional(),
      system_notifications: Joi.boolean().optional(),
      membership_reminders: Joi.boolean().optional(),
      event_notifications: Joi.boolean().optional(),
      newsletter: Joi.boolean().optional(),
      digest_frequency: Joi.string().valid('Immediate', 'Daily', 'Weekly', 'Monthly').optional(),
      quiet_hours_start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
      quiet_hours_end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { memberId } = req.params;
    const preferencesData = req.body;

    const updated = await CommunicationPreferencesModel.upsertMemberPreferences(
      parseInt(memberId),
      preferencesData
    );

    if (!updated) {
      throw new Error('Failed to update preferences');
    }

    const preferences = await CommunicationPreferencesModel.getMemberPreferences(parseInt(memberId));
    sendSuccess(res, preferences, 'Preferences updated successfully');
  })
);

// =============================================================================
// ANALYTICS ROUTES
// =============================================================================

// Get comprehensive communication analytics
router.get('/analytics/summary',
  authenticate,
  requirePermission('communication.analytics.read'),
  validate({
    query: Joi.object({
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().optional(),
      campaign_ids: Joi.array().items(Joi.number().integer()).optional(),
      delivery_channels: Joi.array().items(Joi.string().valid('Email', 'SMS', 'In-App')).optional(),
      province_codes: Joi.array().items(Joi.string()).optional()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { date_from, date_to, campaign_ids, delivery_channels, province_codes } = req.query;
    const { AnalyticsService } = await import('../services/analyticsService');

    const filters = {
      date_from: date_from as string,
      date_to: date_to as string,
      campaign_ids: Array.isArray(campaign_ids) ? campaign_ids.map(id => parseInt(id as string)) : undefined,
      delivery_channels: Array.isArray(delivery_channels) ? delivery_channels as string[] : undefined,
      geographic_filters: province_codes && Array.isArray(province_codes) ? { province_codes: province_codes as string[] } : undefined
    };

    const analytics = await AnalyticsService.getCommunicationAnalytics(filters);
    sendSuccess(res, analytics, 'Analytics summary retrieved successfully');
  })
);

// Get campaign comparison data
router.get('/analytics/campaigns/compare',
  authenticate,
  requirePermission('communication.analytics.read'),
  validate({
    query: Joi.object({
      campaign_ids: Joi.array().items(Joi.number().integer()).min(1).max(10).required()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { campaign_ids } = req.query;
    const { AnalyticsService } = await import('../services/analyticsService');

    const campaignIds = Array.isArray(campaign_ids) ? campaign_ids.map(id => parseInt(id as string)) : [];
    const comparison = await AnalyticsService.getCampaignComparison(campaignIds);
    sendSuccess(res, comparison, 'Campaign comparison data retrieved successfully');
  })
);

// Get engagement trends
router.get('/analytics/engagement-trends',
  authenticate,
  requirePermission('communication.analytics.read'),
  validate({
    query: Joi.object({
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().optional(),
      delivery_channels: Joi.array().items(Joi.string().valid('Email', 'SMS', 'In-App')).optional()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { date_from, date_to, delivery_channels } = req.query;
    const { AnalyticsService } = await import('../services/analyticsService');

    const filters = {
      date_from: date_from as string,
      date_to: date_to as string,
      delivery_channels: Array.isArray(delivery_channels) ? delivery_channels as string[] : undefined
    };

    const trends = await AnalyticsService.getEngagementTrends(filters);
    sendSuccess(res, trends, 'Engagement trends retrieved successfully');
  })
);

// =============================================================================
// QUEUE MANAGEMENT ROUTES
// =============================================================================

// Get queue statistics
router.get('/queue/stats',
  authenticate,
  requirePermission('communication.queue.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { QueueService } = await import('../services/queueService');
    const stats = await QueueService.getQueueStats();
    sendSuccess(res, stats, 'Queue statistics retrieved successfully');
  })
);

// Retry failed messages
router.post('/queue/retry',
  authenticate,
  requirePermission('communication.queue.manage'),
  validate({
    body: Joi.object({
      campaign_id: Joi.number().integer().positive().optional(),
      max_age_hours: Joi.number().integer().min(1).max(168).default(24)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { campaign_id, max_age_hours } = req.body;
    const { DeliveryTrackingService } = await import('../services/deliveryTrackingService');

    const retryCount = await DeliveryTrackingService.retryFailedDeliveries(
      campaign_id,
      max_age_hours
    );

    sendSuccess(res, { retry_count: retryCount }, `${retryCount} messages scheduled for retry`);
  })
);

// Clean up old queue items
router.post('/queue/cleanup',
  authenticate,
  requirePermission('communication.queue.manage'),
  validate({
    body: Joi.object({
      older_than_days: Joi.number().integer().min(1).max(90).default(7)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { older_than_days } = req.body;
    const { QueueService } = await import('../services/queueService');

    const cleanedCount = await QueueService.cleanupQueue(older_than_days);

    sendSuccess(res, { cleaned_count: cleanedCount }, `${cleanedCount} old queue items cleaned up`);
  })
);

// =============================================================================
// DELIVERY TRACKING ROUTES
// =============================================================================

// Get campaign delivery statistics
router.get('/campaigns/:id/delivery-stats',
  authenticate,
  requirePermission('communication.analytics.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { DeliveryTrackingService } = await import('../services/deliveryTrackingService');

    const stats = await DeliveryTrackingService.getCampaignDeliveryStats(parseInt(id));
    sendSuccess(res, stats, 'Campaign delivery statistics retrieved successfully');
  })
);

// Get message delivery records
router.get('/messages/:id/deliveries',
  authenticate,
  requirePermission('communication.messages.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { DeliveryTrackingService } = await import('../services/deliveryTrackingService');

    const deliveries = await DeliveryTrackingService.getMessageDeliveries(parseInt(id));
    sendSuccess(res, deliveries, 'Message deliveries retrieved successfully');
  })
);

// Delivery webhook endpoint (for external services)
router.post('/webhook/delivery',
  // Note: This endpoint might need different authentication for external services
  validate({
    body: Joi.object({
      external_message_id: Joi.string().required(),
      status: Joi.string().valid('Queued', 'Sending', 'Sent', 'Delivered', 'Failed', 'Bounced', 'Opened', 'Clicked').required(),
      timestamp: Joi.date().iso().optional(),
      failure_reason: Joi.string().optional(),
      tracking_data: Joi.object().optional()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { external_message_id, status, timestamp, failure_reason, tracking_data } = req.body;
    const { DeliveryTrackingService } = await import('../services/deliveryTrackingService');

    const success = await DeliveryTrackingService.handleDeliveryWebhook(
      external_message_id,
      status,
      timestamp,
      failure_reason,
      tracking_data
    );

    if (success) {
      sendSuccess(res, null, 'Delivery status updated successfully');
    } else {
      res.status(404).json({ error: 'Delivery record not found' });
    }
  })
);

export default router;
