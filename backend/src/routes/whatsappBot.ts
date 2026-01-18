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

export default router;