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

    res.json({
      success: true,
      data: {
        campaign_statistics: campaignStats[0] || {},
        template_statistics: templateStats[0] || {},
        recent_campaigns: recentCampaigns
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

export default router;
