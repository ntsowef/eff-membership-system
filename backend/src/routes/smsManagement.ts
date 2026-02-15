import { Router, Request, Response } from 'express';
import { SMSManagementService, SMSTemplate, SMSCampaign } from '../services/smsManagementService';
import { executeQuery } from '../config/database';
import { authenticate, requireSMSPermission } from '../middleware/auth';

const router = Router();

// SMS Templates Endpoints

// Get all SMS templates
router.get('/templates', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      search: req.query.search as string
    };

    const templates = await SMSManagementService.getTemplates(filters);

    res.json({
      success: true,
      data: {
        templates,
        total: templates.length
      }
    });
  } catch (error: any) {
    console.error('Failed to get SMS templates:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve SMS templates',
        details: error.message
      }
    });
  }
});

// Get SMS template by ID
router.get('/templates/:id', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const template = await SMSManagementService.getTemplateById(id);

    if (!template) {
      res.status(404).json({
        success: false,
        error: {
          message: 'SMS template not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: { template }
    });
  } catch (error: any) {
    console.error('Failed to get SMS template:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve SMS template',
        details: error.message
      }
    });
  }
});

// Create new SMS template
router.post('/templates', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const templateData: SMSTemplate = {
      name: req.body.name,
      description: req.body.description,
      content: req.body.content,
      variables: req.body.variables || [],
      category: req.body.category || 'custom',
      is_active: req.body.is_active !== false,
      created_by: req.body.created_by || 1 // Default to user 1 for development
    };

    const templateId = await SMSManagementService.createTemplate(templateData);

    res.status(201).json({
      success: true,
      data: {
        template_id: templateId,
        message: 'SMS template created successfully'
      }
    });
  } catch (error: any) {
    console.error('Failed to create SMS template:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create SMS template',
        details: error.message
      }
    });
  }
});

// Update SMS template
router.put('/templates/:id', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;

    const success = await SMSManagementService.updateTemplate(id, updates);

    if (!success) {
      res.status(404).json({
        success: false,
        error: {
          message: 'SMS template not found or no changes made'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'SMS template updated successfully'
      }
    });
  } catch (error: any) {
    console.error('Failed to update SMS template:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update SMS template',
        details: error.message
      }
    });
  }
});

// Delete SMS template
router.delete('/templates/:id', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const success = await SMSManagementService.deleteTemplate(id);

    if (!success) {
      res.status(404).json({
        success: false,
        error: {
          message: 'SMS template not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'SMS template deleted successfully'
      }
    });
  } catch (error: any) {
    console.error('Failed to delete SMS template:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete SMS template',
        details: error.message
      }
    });
  }
});

// SMS Campaigns Endpoints

// Get all SMS campaigns
router.get('/campaigns', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      target_type: req.query.target_type as string,
      created_by: req.query.created_by ? parseInt(req.query.created_by as string) : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await SMSManagementService.getCampaigns(filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Failed to get SMS campaigns:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve SMS campaigns',
        details: error.message
      }
    });
  }
});

// Get SMS campaign by ID
router.get('/campaigns/:id', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const campaign = await SMSManagementService.getCampaignById(id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: {
          message: 'SMS campaign not found'
        }
      });
      return;
    }

    // Get campaign statistics
    const statistics = await SMSManagementService.getCampaignStatistics(id);

    res.json({
      success: true,
      data: {
        campaign,
        statistics
      }
    });
  } catch (error: any) {
    console.error('Failed to get SMS campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve SMS campaign',
        details: error.message
      }
    });
  }
});

// Create new SMS campaign
router.post('/campaigns', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const campaignData: SMSCampaign = {
      name: req.body.name,
      description: req.body.description,
      template_id: req.body.template_id,
      message_content: req.body.message_content,
      target_type: req.body.target_type || 'custom',
      target_criteria: req.body.target_criteria || {},
      status: req.body.status || 'draft',
      scheduled_at: req.body.scheduled_at ? new Date(req.body.scheduled_at) : null,
      priority: req.body.priority || 'normal',
      send_rate_limit: req.body.send_rate_limit || 100,
      retry_failed: req.body.retry_failed !== false,
      max_retries: req.body.max_retries || 3,
      created_by: req.body.created_by || 1 // Default to user 1 for development
    };

    const campaignId = await SMSManagementService.createCampaign(campaignData);

    res.status(201).json({
      success: true,
      data: {
        campaign_id: campaignId,
        message: 'SMS campaign created successfully'
      }
    });
  } catch (error: any) {
    console.error('Failed to create SMS campaign:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create SMS campaign',
        details: error.message
      }
    });
  }
});

// Get SMS dashboard statistics
router.get('/dashboard/stats', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    // Get overall SMS statistics
    const campaignStatsResult = await executeQuery(`
      SELECT
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_campaigns,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_campaigns,
        SUM(CASE WHEN status = 'sending' THEN 1 ELSE 0 END) as sending_campaigns,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_campaigns,
        SUM(messages_sent) as total_messages_sent,
        SUM(messages_delivered) as total_messages_delivered,
        SUM(messages_failed) as total_messages_failed
      FROM sms_campaigns
    `);

    const templateStatsResult = await executeQuery(`
      SELECT
        COUNT(*) as total_templates,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_templates
      FROM sms_templates
    `);

    const recentCampaignsResult = await executeQuery(`
      SELECT campaign_id, campaign_name, status, created_at, messages_sent, messages_delivered
      FROM sms_campaigns
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const campaignStats = Array.isArray(campaignStatsResult) ? campaignStatsResult : campaignStatsResult[0] || [];
    const templateStats = Array.isArray(templateStatsResult) ? templateStatsResult : templateStatsResult[0] || [];
    const recentCampaigns = Array.isArray(recentCampaignsResult) ? recentCampaignsResult : recentCampaignsResult[0] || [];
    const processedRecentCampaigns = recentCampaigns.map((c: any) => ({
      ...c,
      id: c.campaign_id,
      name: c.campaign_name
    }));

    res.json({
      success: true,
      data: {
        campaign_statistics: campaignStats[0] || {},
        template_statistics: templateStats[0] || {},
        recent_campaigns: processedRecentCampaigns
      }
    });
  } catch (error: any) {
    console.error('Failed to get SMS dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve SMS dashboard statistics',
        details: error.message
      }
    });
  }
});

// Mock SMS sending endpoint for development
router.post('/mock-send', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const { to, message, from } = req.body;

    // Simulate SMS sending
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mock success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      res.json({
        success: true,
        data: {
          message_id: messageId,
          status: 'sent',
          to,
          message: 'SMS sent successfully (mock)'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: 'Mock SMS delivery failed',
          code: 'DELIVERY_FAILED'
        }
      });
    }
  } catch (error: any) {
    console.error('Failed to send mock SMS:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to send SMS',
        details: error.message
      }
    });
  }
});

// Quick Send SMS endpoint - send to one or multiple recipients
router.post('/quick-send', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const { recipients, message } = req.body;

    // Validate inputs
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Recipients array is required and must not be empty',
          code: 'INVALID_RECIPIENTS'
        }
      });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Message is required and must not be empty',
          code: 'INVALID_MESSAGE'
        }
      });
      return;
    }

    // Validate message length (159 characters max for single SMS)
    if (message.length > 159) {
      res.status(400).json({
        success: false,
        error: {
          message: `Message exceeds maximum length of 159 characters (current: ${message.length})`,
          code: 'MESSAGE_TOO_LONG'
        }
      });
      return;
    }

    // Validate and normalize phone numbers
    const phoneRegex = /^(\+27|27|0)[0-9]{9}$/;
    const normalizedRecipients: string[] = [];
    const invalidNumbers: string[] = [];

    for (const recipient of recipients) {
      const cleaned = recipient.replace(/[\s\-\(\)]/g, '').trim();

      if (!phoneRegex.test(cleaned)) {
        invalidNumbers.push(recipient);
        continue;
      }

      // Normalize to international format (27...)
      let normalized = cleaned;
      if (normalized.startsWith('+27')) {
        normalized = normalized.substring(1); // Remove +
      } else if (normalized.startsWith('0')) {
        normalized = '27' + normalized.substring(1); // Replace 0 with 27
      }

      normalizedRecipients.push(normalized);
    }

    if (invalidNumbers.length > 0 && normalizedRecipients.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'All phone numbers are invalid',
          code: 'ALL_INVALID_NUMBERS',
          invalid_numbers: invalidNumbers
        }
      });
      return;
    }

    // Import SMS service and SMS Log service
    const { SMSService } = await import('../services/smsService');
    const { SMSLogService } = await import('../services/smsLogService');

    // Get sender info from authenticated user
    const user = (req as any).user;
    const senderId = user?.id;
    const senderName = user?.name || user?.username;

    // Send SMS to each recipient with logging
    const results: Array<{
      recipient: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    for (const recipient of normalizedRecipients) {
      // Generate unique message ID for tracking
      const messageId = SMSLogService.generateMessageId('quick_send');

      try {
        // Log the SMS send attempt
        await SMSLogService.logSMSSend({
          message_id: messageId,
          source_type: 'quick_send',
          recipient_phone: recipient,
          message_content: message,
          sender_id: senderId,
          sender_name: senderName,
          status: 'sending'
        });

        // Send the SMS
        const result = await SMSService.sendSMS(recipient, message, 'EFF');

        // Update log with result
        await SMSLogService.updateSMSLog(messageId, {
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId,
          error_message: result.error
        });

        results.push({
          recipient,
          success: result.success,
          messageId: messageId,
          error: result.error
        });
      } catch (err: any) {
        // Update log with failure
        await SMSLogService.updateSMSLog(messageId, {
          status: 'failed',
          error_message: err.message || 'Unknown error'
        });

        results.push({
          recipient,
          success: false,
          messageId: messageId,
          error: err.message || 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        total_recipients: normalizedRecipients.length,
        successful: successCount,
        failed: failedCount,
        invalid_numbers: invalidNumbers,
        results,
        message: `SMS sent to ${successCount} of ${normalizedRecipients.length} recipients`
      }
    });
  } catch (error: any) {
    console.error('Failed to send quick SMS:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to send SMS',
        details: error.message
      }
    });
  }
});

// ============================================
// SMS Delivery Status / Logs Endpoints
// ============================================

// Get SMS send logs with filters
router.get('/logs', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const { SMSLogService } = await import('../services/smsLogService');

    const options = {
      limit: parseInt(req.query.limit as string) || 100,
      sourceType: req.query.source_type as any,
      recipientPhone: req.query.recipient_phone as string,
      memberId: req.query.member_id as string,
      status: req.query.status as any,
      startDate: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
      endDate: req.query.end_date ? new Date(req.query.end_date as string) : undefined
    };

    const logs = await SMSLogService.getRecentSMSLogs(options);

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
        filters: {
          source_type: options.sourceType,
          status: options.status,
          limit: options.limit
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to get SMS logs:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get SMS logs', details: error.message }
    });
  }
});

// Get SMS delivery status by message ID
router.get('/logs/:messageId', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const { SMSLogService } = await import('../services/smsLogService');
    const { messageId } = req.params;

    const log = await SMSLogService.getSMSLogByMessageId(messageId);

    if (!log) {
      res.status(404).json({
        success: false,
        error: { message: 'SMS log not found', code: 'NOT_FOUND' }
      });
      return;
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error: any) {
    console.error('Failed to get SMS log:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get SMS log', details: error.message }
    });
  }
});

// Get SMS logs by source type with pagination
router.get('/logs/source/:sourceType', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const { SMSLogService } = await import('../services/smsLogService');
    const { sourceType } = req.params;

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      status: req.query.status as any
    };

    const result = await SMSLogService.getSMSLogsBySource(sourceType as any, options);

    res.json({
      success: true,
      data: {
        logs: result.logs,
        total: result.total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(result.total / options.limit)
      }
    });
  } catch (error: any) {
    console.error('Failed to get SMS logs by source:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get SMS logs', details: error.message }
    });
  }
});

// Get SMS delivery statistics by source
router.get('/delivery-stats', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const { SMSLogService } = await import('../services/smsLogService');

    const stats = await SMSLogService.getDeliveryStatsBySource();

    res.json({
      success: true,
      data: {
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to get delivery stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get delivery statistics', details: error.message }
    });
  }
});

// Get multiple SMS statuses by message IDs (batch lookup)
router.post('/logs/batch', authenticate, requireSMSPermission(), async (req: Request, res: Response) => {
  try {
    const { SMSLogService } = await import('../services/smsLogService');
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'messageIds array is required', code: 'INVALID_INPUT' }
      });
      return;
    }

    // Limit batch size
    if (messageIds.length > 100) {
      res.status(400).json({
        success: false,
        error: { message: 'Maximum 100 message IDs per request', code: 'BATCH_TOO_LARGE' }
      });
      return;
    }

    const results: any[] = [];
    for (const messageId of messageIds) {
      const log = await SMSLogService.getSMSLogByMessageId(messageId);
      results.push({
        message_id: messageId,
        found: !!log,
        status: log?.status || null,
        delivery_timestamp: log?.delivery_timestamp || null,
        error_message: log?.error_message || null
      });
    }

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        found: results.filter(r => r.found).length
      }
    });
  } catch (error: any) {
    console.error('Failed to batch lookup SMS logs:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to batch lookup SMS logs', details: error.message }
    });
  }
});

export default router;
