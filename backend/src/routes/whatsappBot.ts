import { Router, Request, Response, NextFunction } from 'express';
import { WhatsAppBotService } from '../services/whatsappBotService';
import { WasenderApiService } from '../services/wasenderApiService';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { WasenderWebhookPayload } from '../types/whatsapp';

const router = Router();

/**
 * Middleware to verify webhook signature from WasenderAPI
 * NOTE: Signature verification is optional - if secret is not configured or signature is missing,
 * the webhook will still be processed (for testing/development flexibility)
 */
const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  // Log incoming webhook for debugging
  logger.info('WhatsApp webhook incoming', {
    path: req.path,
    method: req.method,
    hasBody: !!req.body,
    event: req.body?.event
  });

  // Skip verification if webhook secret is not configured
  if (!config.wasender.webhookSecret) {
    logger.warn('Webhook secret not configured, skipping signature verification');
    return next();
  }

  // Log all headers for debugging
  logger.debug('Webhook headers received', {
    headers: Object.keys(req.headers),
    signature: req.headers['x-webhook-signature'] || req.headers['x-wasender-signature'] || 'none'
  });

  // Try multiple possible header names that WasenderAPI might use
  const signature = (
    req.headers['x-webhook-signature'] ||
    req.headers['x-wasender-signature'] ||
    req.headers['x-signature'] ||
    req.headers['authorization']
  ) as string;

  // If no signature provided, allow but log warning
  if (!signature) {
    logger.warn('No webhook signature provided, proceeding without verification', { ip: req.ip });
    return next();
  }

  // Verify signature using the service method
  const rawBody = JSON.stringify(req.body);
  if (!WasenderApiService.verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Webhook signature verification failed, proceeding anyway', {
      ip: req.ip,
      signatureProvided: signature.substring(0, 10) + '...'
    });
    // Allow anyway - signature verification is not strict
    return next();
  }

  logger.debug('Webhook signature verified successfully');
  next();
};

/**
 * Middleware to check if WhatsApp bot is enabled
 */
const checkBotEnabled = (_req: Request, res: Response, next: NextFunction) => {
  if (!WasenderApiService.isEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp bot is not enabled'
    });
  }
  next();
};

/**
 * POST /webhook
 * Main webhook endpoint - receives messages from WasenderAPI
 */
router.post('/webhook', verifyWebhookSignature, async (req: Request, res: Response) => {
  console.log('📱 [Webhook Route] Received webhook POST');
  console.log('📱 [Webhook Route] Body:', JSON.stringify(req.body, null, 2));

  // Always respond 200 quickly to acknowledge receipt
  res.status(200).json({ received: true });

  try {
    const payload: WasenderWebhookPayload = req.body;
    const event = payload.event;

    console.log('📱 [Webhook Route] Event:', event);
    logger.info('WhatsApp webhook received', {
      event,
      timestamp: payload.timestamp
    });

    switch (event) {
      case 'messages.received':
      case 'messages.upsert':
        console.log('📱 [Webhook Route] Processing message event');
        if (payload.data.messages) {
          console.log('📱 [Webhook Route] Calling handleIncomingMessage');
          await WhatsAppBotService.handleIncomingMessage(payload.data.messages);
        }
        break;

      case 'messages.status':
        await WhatsAppBotService.handleMessageStatus(payload.data);
        break;

      case 'session.status':
        logger.info('WhatsApp session status update', {
          status: payload.data.status
        });
        break;

      case 'qr.updated':
        logger.info('WhatsApp QR code updated');
        break;

      default:
        logger.debug('Unhandled webhook event', { event });
    }
  } catch (error: any) {
    logger.error('Error processing WhatsApp webhook', {
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * GET /status
 * Get WhatsApp bot service status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [botStatus, sessionStatus] = await Promise.all([
      WhatsAppBotService.getServiceStatus(),
      WasenderApiService.getSessionStatus()
    ]);

    res.json({
      success: true,
      data: {
        bot: botStatus,
        session: sessionStatus.data,
        enabled: WasenderApiService.isEnabled()
      }
    });
  } catch (error: any) {
    logger.error('Error getting WhatsApp status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
});

/**
 * POST /send
 * Send a WhatsApp message (admin endpoint)
 */
router.post('/send', checkBotEnabled, async (req: Request, res: Response) => {
  try {
    const { to, message, type = 'text' } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, message'
      });
    }

    let result: { success: boolean; data?: any; error?: string };
    switch (type) {
      case 'text':
        result = await WasenderApiService.sendTextMessage(to, message);
        break;
      case 'image':
        result = await WasenderApiService.sendImageMessage(to, message, req.body.caption);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid message type'
        });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error sending WhatsApp message', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * POST /check-number
 * Check if a phone number is on WhatsApp
 */
router.post('/check-number', checkBotEnabled, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing phoneNumber'
      });
    }


    const exists = await WasenderApiService.checkNumberOnWhatsApp(phoneNumber);
    res.json({ success: true, data: { phoneNumber, onWhatsApp: exists } });
  } catch (error: any) {
    logger.error('Error checking WhatsApp number', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to check number'
    });
  }
});

// ==========================================
// Group Management Routes
// ==========================================

import { CommunicationGroupService } from '../services/communicationGroupService';
import { executeQuery } from '../config/database';

/**
 * GET /groups
 * List all communication groups
 */
router.get('/groups', async (req: Request, res: Response) => {
  try {
    const groups = await CommunicationGroupService.getAllGroups();
    res.json({ success: true, data: groups });
  } catch (error: any) {
    logger.error('Error getting groups', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

/**
 * POST /groups
 * Create a new group
 */
router.post('/groups', async (req: Request, res: Response) => {
  try {
    const { name, description, group_type, query_config, created_by } = req.body;

    // Basic validation
    if (!name || !group_type) {
      return res.status(400).json({ success: false, error: 'Name and group_type are required' });
    }

    const group = await CommunicationGroupService.createGroup({
      name,
      description,
      group_type,
      query_config,
      created_by: created_by || 1 // Default to admin if not provided (should come from auth)
    });

    res.json({ success: true, data: group });
  } catch (error: any) {
    logger.error('Error creating group', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
});

/**
 * POST /groups/:id/members
 * Add members to a static group
 */
router.post('/groups/:id/members', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const { memberIds } = req.body; // Array of member IDs

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No members provided' });
    }

    await CommunicationGroupService.addMembersToGroup(groupId, memberIds);
    res.json({ success: true, message: `${memberIds.length} members added` });

  } catch (error: any) {
    logger.error('Error adding members to group', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add members' });
  }
});

/**
 * DELETE /groups/:id
 * Delete a communication group
 */
router.delete('/groups/:id', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    await executeQuery('UPDATE communication_groups SET is_active = false WHERE id = $1', [groupId]);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting group', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete group' });
  }
});

/**
 * POST /send/group
 * Send a message to a group
 */
router.post('/send/group', checkBotEnabled, async (req: Request, res: Response) => {
  try {
    const { groupId, message, type = 'text' } = req.body;

    if (!groupId || !message) {
      return res.status(400).json({ success: false, error: 'groupId and message are required' });
    }

    // 1. Get recipients
    const recipients = await CommunicationGroupService.getGroupMembers(groupId);
    console.log(`Sending group message to ${recipients.length} recipients`);

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Group has no valid members with phone numbers' });
    }

    // 2. Queue/Send messages (For now, loop and send individually - in production should use a queue)
    let sentCount = 0;
    let failedCount = 0;

    // Async processing to avoid timeout
    // But for response, we'll just acknowledge start

    // We will process the batch asynchronously
    (async () => {
      for (const recipient of recipients) {
        try {
          if (recipient.cell_number) {
            const phone = recipient.cell_number.replace(/\D/g, ''); // Basic clean
            // TODO: Better phone validation

            await WasenderApiService.sendTextMessage(phone, message);
            sentCount++;

            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (e) {
          console.error(`Failed to send to ${recipient.id}`, e);
          failedCount++;
        }
      }
      console.log(`Group send complete: ${sentCount} sent, ${failedCount} failed`);
    })();

    res.json({
      success: true,
      message: `Processing ${recipients.length} messages in background`,
      recipient_count: recipients.length
    });

  } catch (error: any) {
    logger.error('Error sending group message', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to initiate group send' });
  }
});

/**
 * GET /leadership-positions
 * Helper to get positions for dynamic group creation
 */
router.get('/leadership-positions', async (req: Request, res: Response) => {
  try {
    const positions = await CommunicationGroupService.getLeadershipPositions();
    res.json({ success: true, data: positions });
  } catch (error: any) {
    logger.error('Error getting positions', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get positions' });
  }
});

/**
 * GET /messages/outbound
 * Get outbound WhatsApp message history from whatsapp_bot_logs and whatsapp_notification_queue
 */
router.get('/messages/outbound', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const messageType = req.query.message_type as string;

    // Build WHERE clause for filtering
    let whereClause = "WHERE direction = 'outbound'";
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (messageType) {
      whereClause += ` AND message_type = $${paramIndex}`;
      params.push(messageType);
      paramIndex++;
    }

    // Query outbound messages from whatsapp_bot_logs
    const botLogsQuery = `
      SELECT
        id,
        'bot_message' as source,
        phone_number,
        member_id,
        message_type,
        message_content,
        response_sent as message_text,
        status,
        error_message,
        wasender_message_id,
        created_at,
        updated_at
      FROM whatsapp_bot_logs
      ${whereClause}
    `;

    // Query messages from whatsapp_notification_queue
    const notificationQuery = `
      SELECT
        id,
        'notification' as source,
        phone_number,
        member_id,
        notification_type as message_type,
        message_content,
        message_content as message_text,
        status,
        error_message,
        wasender_message_id,
        COALESCE(sent_at, created_at) as created_at,
        updated_at
      FROM whatsapp_notification_queue
      WHERE 1=1
      ${status ? `AND status = $${params.length > 0 ? params.length : 1}` : ''}
    `;

    // Combined query with UNION ALL
    const combinedQuery = `
      WITH combined_messages AS (
        (${botLogsQuery})
        UNION ALL
        (${notificationQuery})
      )
      SELECT * FROM combined_messages
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const messages = await executeQuery(combinedQuery, params);

    // Get total count
    const countQuery = `
      SELECT
        (SELECT COUNT(*) FROM whatsapp_bot_logs WHERE direction = 'outbound') +
        (SELECT COUNT(*) FROM whatsapp_notification_queue) as total
    `;
    const countResult = await executeQuery(countQuery, []);
    const total = parseInt(countResult[0]?.total || '0');

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching outbound messages', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch outbound messages'
    });
  }
});

export default router;
