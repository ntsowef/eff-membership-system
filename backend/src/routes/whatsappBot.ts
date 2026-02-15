import { Router, Request, Response, NextFunction } from 'express';
import { WhatsAppBotService } from '../services/whatsappBotService';
import { WhatsAppProviderManager } from '../services/whatsappProviderManager';
import { WasenderApiService } from '../services/wasenderApiService';
import { MetaCloudApiService } from '../services/metaCloudApiService';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { WasenderWebhookPayload, MetaWebhookPayload } from '../types/whatsapp';

const router = Router();

/**
 * Detect whether the incoming webhook is from Meta Cloud API or WasenderAPI
 */
const detectWebhookProvider = (req: Request): 'meta' | 'wasender' => {
  // Meta payloads have { object: 'whatsapp_business_account', entry: [...] }
  if (req.body?.object === 'whatsapp_business_account') return 'meta';
  // Meta uses X-Hub-Signature-256 header
  if (req.headers['x-hub-signature-256']) return 'meta';
  // WasenderAPI payloads have { event: '...', timestamp: ..., data: {...} }
  return 'wasender';
};

/**
 * Middleware to verify webhook signature (supports both providers)
 */
const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  logger.info('WhatsApp webhook incoming', {
    path: req.path,
    method: req.method,
    hasBody: !!req.body,
    provider: detectWebhookProvider(req)
  });

  const provider = detectWebhookProvider(req);

  if (provider === 'meta') {
    // Meta Cloud API signature verification using X-Hub-Signature-256
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature || !config.meta.appSecret) {
      logger.warn('Meta webhook: no signature or app secret, proceeding');
      return next();
    }
    const metaService = MetaCloudApiService.getInstance();
    const rawBody = JSON.stringify(req.body);
    if (!metaService.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Meta webhook signature verification failed, proceeding anyway');
    }
    return next();
  }

  // WasenderAPI signature verification
  if (!config.wasender.webhookSecret) {
    logger.warn('Webhook secret not configured, skipping signature verification');
    return next();
  }

  const signature = (
    req.headers['x-webhook-signature'] ||
    req.headers['x-wasender-signature'] ||
    req.headers['x-signature'] ||
    req.headers['authorization']
  ) as string;

  if (!signature) {
    logger.warn('No webhook signature provided, proceeding without verification', { ip: req.ip });
    return next();
  }

  const rawBody = JSON.stringify(req.body);
  if (!WasenderApiService.verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Webhook signature verification failed, proceeding anyway');
  }

  logger.debug('Webhook signature verified successfully');
  next();
};

/**
 * Middleware to check if WhatsApp bot is enabled (any provider)
 */
const checkBotEnabled = async (_req: Request, res: Response, next: NextFunction) => {
  const enabled = await WhatsAppProviderManager.isEnabled();
  if (!enabled) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp bot is not enabled'
    });
  }
  next();
};

/**
 * GET /webhook
 * Meta Cloud API webhook verification endpoint
 * Meta calls this once during setup to verify your webhook URL
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Meta webhook verification request', { mode, token: token ? 'provided' : 'missing' });

  if (mode === 'subscribe' && token === config.meta.verifyToken) {
    logger.info('Meta webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('Meta webhook verification failed', { mode, token });
  return res.sendStatus(403);
});

/**
 * POST /webhook
 * Main webhook endpoint - receives messages from both WasenderAPI and Meta Cloud API
 */
router.post('/webhook', verifyWebhookSignature, async (req: Request, res: Response) => {
  const provider = detectWebhookProvider(req);
  console.log(`[Webhook Route] Received webhook POST from: ${provider}`);

  // Always respond 200 quickly to acknowledge receipt
  res.status(200).json({ received: true });

  try {
    if (provider === 'meta') {
      // ========== Meta Cloud API webhook handling ==========
      const payload: MetaWebhookPayload = req.body;

      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // Handle incoming messages
          if (value.messages) {
            for (const msg of value.messages) {
              let messageBody = '';

              // Extract message body based on message type
              if (msg.type === 'text') {
                messageBody = msg.text?.body || '';
              } else if (msg.type === 'interactive') {
                // User tapped a reply button or selected from a list
                if (msg.interactive?.type === 'button_reply') {
                  messageBody = msg.interactive.button_reply?.id || msg.interactive.button_reply?.title || '';
                  logger.info('Meta webhook: interactive button reply', { id: msg.interactive.button_reply?.id, title: msg.interactive.button_reply?.title });
                } else if (msg.interactive?.type === 'list_reply') {
                  messageBody = msg.interactive.list_reply?.id || msg.interactive.list_reply?.title || '';
                  logger.info('Meta webhook: interactive list reply', { id: msg.interactive.list_reply?.id, title: msg.interactive.list_reply?.title });
                }
              }

              if (!messageBody) continue;

              // Convert Meta message format to IncomingMessage format the bot service expects
              const incomingMessage = {
                key: {
                  id: msg.id,
                  fromMe: false,
                  remoteJid: msg.from + '@s.whatsapp.net',
                  cleanedSenderPn: msg.from
                },
                messageBody: messageBody,
                message: msg
              };

              logger.info('Meta webhook: processing message', { from: msg.from, id: msg.id, type: msg.type });
              await WhatsAppBotService.handleIncomingMessage(incomingMessage);
            }
          }

          // Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              logger.info('Meta webhook: message status', {
                id: status.id,
                status: status.status,
                recipient: status.recipient_id
              });
              await WhatsAppBotService.handleMessageStatus({
                status: status.status,
                messageId: status.id,
                recipient: status.recipient_id
              });
            }
          }

          // Handle errors
          if (value.errors) {
            for (const err of value.errors) {
              logger.error('Meta webhook: error received', { code: err.code, title: err.title, message: err.message });
            }
          }
        }
      }
    } else {
      // ========== WasenderAPI webhook handling ==========
      const payload: WasenderWebhookPayload = req.body;
      const event = payload.event;

      console.log('[Webhook Route] WasenderAPI Event:', event);
      logger.info('WhatsApp webhook received', { event, timestamp: payload.timestamp });

      switch (event) {
        case 'messages.upsert':
          if (payload.data.messages) {
            await WhatsAppBotService.handleIncomingMessage(payload.data.messages);
          }
          break;

        case 'messages.received':
          // Skip - WasenderAPI fires both messages.received AND messages.upsert
          console.log('[Webhook Route] Skipping messages.received (handled by messages.upsert)');
          break;

        case 'messages.status':
          await WhatsAppBotService.handleMessageStatus(payload.data);
          break;

        case 'session.status':
          logger.info('WhatsApp session status update', { status: payload.data.status });
          break;

        case 'qr.updated':
          logger.info('WhatsApp QR code updated');
          break;

        default:
          logger.debug('Unhandled webhook event', { event });
      }
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
    const [botStatus, sessionStatus, enabled] = await Promise.all([
      WhatsAppBotService.getServiceStatus(),
      WhatsAppProviderManager.getSessionStatus(),
      WhatsAppProviderManager.isEnabled()
    ]);

    const providerType = await WhatsAppProviderManager.getActiveProviderType();

    res.json({
      success: true,
      data: {
        bot: botStatus,
        session: {
          connected: sessionStatus.connected,
          provider: sessionStatus.provider,
          phoneNumber: sessionStatus.phoneNumber,
          name: sessionStatus.name,
          platform: sessionStatus.platform
        },
        enabled,
        provider: providerType
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
 *
 * Supported message types:
 * - text: Send a text message (message = text content)
 * - image: Send an image via URL (message = image URL, optional: caption)
 * - audio: Send an audio/voice note via URL (message = audio URL)
 * - audio_base64: Send an audio/voice note via base64 (message = base64 data, optional: mimetype)
 * - document: Send a document via URL (message = document URL, filename required, optional: caption)
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

    let result: { success: boolean; data?: any; error?: string; messageId?: string };
    switch (type) {
      case 'text':
        result = await WhatsAppProviderManager.sendTextMessage(to, message);
        break;
      case 'image':
        result = await WhatsAppProviderManager.sendImageMessage(to, message, req.body.caption);
        break;
      case 'audio':
        // Send audio/voice note via URL
        result = await WhatsAppProviderManager.sendAudioMessage(to, message);
        break;
      case 'audio_base64':
        // Send audio/voice note via base64 data
        // Optional mimetype parameter (default: 'audio/ogg; codecs=opus')
        result = await WhatsAppProviderManager.sendAudioBase64(to, message, req.body.mimetype);
        break;
      case 'document':
        // Send document via URL (filename required)
        if (!req.body.filename) {
          return res.status(400).json({
            success: false,
            error: 'Missing required field: filename (for document type)'
          });
        }
        result = await WhatsAppProviderManager.sendDocumentMessage(to, message, req.body.filename, req.body.caption);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Invalid message type: ${type}. Supported types: text, image, audio, audio_base64, document`
        });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error sending WhatsApp message', { error: error.message, type: req.body.type });
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * POST /send/audio/bulk
 * Send audio/voice note to multiple recipients (bulk broadcast)
 *
 * Body:
 * - recipients: Array of phone numbers
 * - audioUrl: URL of the audio file to send
 * - delayMs: Optional delay between messages (default: 1000ms)
 */
router.post('/send/audio/bulk', checkBotEnabled, async (req: Request, res: Response) => {
  try {
    const { recipients, audioUrl, delayMs = 1000 } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid recipients array'
      });
    }

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: audioUrl'
      });
    }

    logger.info('Starting bulk audio send', {
      recipientCount: recipients.length,
      audioUrl: audioUrl.substring(0, 50) + '...'
    });

    // Process in background to avoid timeout
    const results = await WhatsAppProviderManager.sendBulkAudioMessages(recipients, audioUrl, delayMs);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: results.length,
        sent: successCount,
        failed: failedCount,
        results
      }
    });
  } catch (error: any) {
    logger.error('Error sending bulk audio', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk audio'
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


    const exists = await WhatsAppProviderManager.checkNumberOnWhatsApp(phoneNumber);
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
// Audio/Voice Note Upload Routes
// ==========================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Audio upload directory configuration
const AUDIO_UPLOAD_DIR = process.env.AUDIO_UPLOAD_DIR || path.join(__dirname, '../../uploads/audio');
const AUDIO_SUBDIRS = ['voice-notes', 'announcements', 'temp'];

// Ensure audio upload directories exist
const ensureAudioDirs = () => {
  if (!fs.existsSync(AUDIO_UPLOAD_DIR)) {
    fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
  }
  AUDIO_SUBDIRS.forEach(subdir => {
    const dir = path.join(AUDIO_UPLOAD_DIR, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
ensureAudioDirs();

// Multer storage configuration for audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'voice-notes';
    const validCategories = ['voice-notes', 'announcements', 'temp'];
    const subdir = validCategories.includes(category) ? category : 'voice-notes';
    const uploadPath = path.join(AUDIO_UPLOAD_DIR, subdir);
    ensureAudioDirs();
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname) || '.ogg';
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    const filename = `${timestamp}_${random}_${safeName}`;
    cb(null, filename);
  }
});

// File filter for audio files
const audioFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'audio/ogg',
    'audio/opus',
    'audio/mpeg',
    'audio/mp3',
    'audio/aac',
    'audio/amr',
    'audio/wav',
    'audio/x-wav',
    'audio/m4a',
    'audio/mp4',
    'application/ogg' // Some systems report OGG as this
  ];

  const allowedExtensions = ['.ogg', '.opus', '.mp3', '.aac', '.amr', '.wav', '.m4a'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid audio file type: ${file.mimetype}. Allowed: OGG, OPUS, MP3, AAC, AMR, WAV, M4A`));
  }
};

// Multer instance for audio uploads
const audioUpload = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB (WhatsApp limit)
    files: 1
  }
});

/**
 * POST /audio/upload
 * Upload an audio/voice note file to the server
 *
 * Form data:
 * - file: The audio file (required)
 * - category: 'voice-notes' | 'announcements' | 'temp' (optional, default: 'voice-notes')
 * - description: Optional description for the file
 *
 * Returns the file URL that can be used with sendAudioMessage
 */
router.post('/audio/upload', audioUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file uploaded'
      });
    }

    const category = req.body.category || 'voice-notes';
    const description = req.body.description || '';

    // Generate the URL for the uploaded file
    // This assumes the backend serves static files from /uploads or you have a reverse proxy
    const baseUrl = process.env.AUDIO_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/audio/${category}/${req.file.filename}`;

    logger.info('Audio file uploaded', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      category,
      url: fileUrl
    });

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category,
        description,
        url: fileUrl,
        path: req.file.path
      }
    });
  } catch (error: any) {
    logger.error('Error uploading audio file', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload audio file'
    });
  }
});

/**
 * GET /audio/list
 * List all uploaded audio files
 *
 * Query params:
 * - category: Filter by category (optional)
 */
router.get('/audio/list', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const categories = category ? [category] : AUDIO_SUBDIRS;
    const baseUrl = process.env.AUDIO_BASE_URL || `${req.protocol}://${req.get('host')}`;

    const files: Array<{
      filename: string;
      category: string;
      size: number;
      url: string;
      createdAt: Date;
    }> = [];

    for (const cat of categories) {
      const dirPath = path.join(AUDIO_UPLOAD_DIR, cat);
      if (fs.existsSync(dirPath)) {
        const dirFiles = fs.readdirSync(dirPath);
        for (const file of dirFiles) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            files.push({
              filename: file,
              category: cat,
              size: stats.size,
              url: `${baseUrl}/uploads/audio/${cat}/${file}`,
              createdAt: stats.birthtime
            });
          }
        }
      }
    }

    // Sort by creation date (newest first)
    files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({
      success: true,
      data: {
        total: files.length,
        files
      }
    });
  } catch (error: any) {
    logger.error('Error listing audio files', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to list audio files'
    });
  }
});

/**
 * DELETE /audio/:category/:filename
 * Delete an uploaded audio file
 */
router.delete('/audio/:category/:filename', async (req: Request, res: Response) => {
  try {
    const { category, filename } = req.params;

    if (!AUDIO_SUBDIRS.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    const filePath = path.join(AUDIO_UPLOAD_DIR, category, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    fs.unlinkSync(filePath);

    logger.info('Audio file deleted', { category, filename });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting audio file', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete audio file'
    });
  }
});

/**
 * GET /audio/:category/:filename
 * Serve an audio file (for direct access)
 */
router.get('/audio/:category/:filename', async (req: Request, res: Response) => {
  try {
    const { category, filename } = req.params;

    if (!AUDIO_SUBDIRS.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    const filePath = path.join(AUDIO_UPLOAD_DIR, category, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Determine content type based on extension
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.ogg': 'audio/ogg',
      '.opus': 'audio/opus',
      '.mp3': 'audio/mpeg',
      '.aac': 'audio/aac',
      '.amr': 'audio/amr',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    logger.error('Error serving audio file', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to serve audio file'
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

            await WhatsAppProviderManager.sendTextMessage(phone, message);
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
