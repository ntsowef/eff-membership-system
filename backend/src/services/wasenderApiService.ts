import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { WasenderSendResponse, WasenderSessionStatus } from '../types/whatsapp';

/**
 * WasenderAPI Service
 * Handles all communication with WasenderAPI for WhatsApp messaging
 */
export class WasenderApiService {
  private static client: AxiosInstance;

  // Rate limiting: Track last message time and message queue
  private static lastMessageTime: number = 0;
  private static readonly MESSAGE_DELAY_MS = 5500; // 5.5 seconds to be safe
  private static messageQueue: Array<{
    resolve: (value: WasenderSendResponse) => void;
    reject: (error: any) => void;
    sendFn: () => Promise<WasenderSendResponse>;
  }> = [];
  private static isProcessingQueue: boolean = false;

  /**
   * Get or create the Axios client for WasenderAPI
   */
  private static getClient(): AxiosInstance {
    if (!this.client) {
      this.client = axios.create({
        baseURL: config.wasender.apiUrl,
        headers: {
          'Authorization': `Bearer ${config.wasender.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Add response interceptor for logging
      this.client.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
          logger.error('WasenderAPI request failed', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data
          });
          return Promise.reject(error);
        }
      );
    }
    return this.client;
  }

  /**
   * Check if WhatsApp bot is enabled
   */
  static isEnabled(): boolean {
    return config.wasender.enabled && !!config.wasender.apiKey;
  }

  /**
   * Wait for rate limit delay if needed
   */
  private static async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;

    if (timeSinceLastMessage < this.MESSAGE_DELAY_MS) {
      const waitTime = this.MESSAGE_DELAY_MS - timeSinceLastMessage;
      logger.info(`Rate limiting: waiting ${waitTime}ms before sending next message`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastMessageTime = Date.now();
  }

  /**
   * Process the message queue with rate limiting
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift();
      if (!item) continue;

      try {
        await this.waitForRateLimit();
        const result = await item.sendFn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Queue a message to be sent with rate limiting
   */
  private static queueMessage(sendFn: () => Promise<WasenderSendResponse>): Promise<WasenderSendResponse> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ resolve, reject, sendFn });
      this.processQueue();
    });
  }

  /**
   * Format phone number to E.164 format
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Handle South African numbers
    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    }

    // Add + if missing
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Send a text message via WhatsApp (with rate limiting)
   */
  static async sendTextMessage(to: string, text: string): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      logger.warn('WhatsApp bot is disabled, message not sent', { to });
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    const formattedPhone = this.formatPhoneNumber(to);

    return this.queueMessage(async () => {
      try {
        const response = await this.getClient().post('/send-message', {
          to: formattedPhone,
          text: text
        });

        logger.info('WhatsApp message sent', {
          to: formattedPhone,
          msgId: response.data?.data?.msgId
        });

        return response.data;
      } catch (error: any) {
        logger.error('Failed to send WhatsApp message', {
          to,
          error: error.response?.data || error.message
        });
        throw error;
      }
    });
  }

  /**
   * Upload a media file (base64) to Wasender and get a public URL
   * Uses the POST /api/upload endpoint
   * The returned URL is active for 24 hours.
   *
   * @param base64Data - Base64 encoded file data (without data URL prefix)
   * @param mimetype - MIME type of the file (e.g., 'image/png', 'audio/ogg')
   * @returns The public URL of the uploaded file
   */
  static async uploadMedia(base64Data: string, mimetype: string): Promise<string> {
    try {
      const response = await this.getClient().post('/upload', {
        mimetype: mimetype,
        base64: base64Data
      });

      const publicUrl = response.data?.publicUrl;
      if (!publicUrl) {
        throw new Error('Upload succeeded but no publicUrl returned');
      }

      logger.info('Media file uploaded to Wasender', { mimetype, publicUrl: publicUrl.substring(0, 80) });
      return publicUrl;
    } catch (error: any) {
      logger.error('Failed to upload media to Wasender', {
        mimetype,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Send an image message via WhatsApp (using URL) - with rate limiting
   * Uses the correct Wasender API format: { to, imageUrl, text }
   */
  static async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    const formattedPhone = this.formatPhoneNumber(to);

    return this.queueMessage(async () => {
      try {
        const response = await this.getClient().post('/send-message', {
          to: formattedPhone,
          imageUrl: imageUrl,
          text: caption || undefined
        });

        logger.info('WhatsApp image sent', { to: formattedPhone });
        return response.data;
      } catch (error: any) {
        logger.error('Failed to send WhatsApp image', {
          to,
          error: error.response?.data || error.message
        });
        throw error;
      }
    });
  }

  /**
   * Send an image message via WhatsApp using base64 data (with rate limiting)
   * This is useful for sending dynamically generated images like membership cards.
   *
   * Two-step process:
   * 1. Upload the base64 image via POST /api/upload to get a public URL
   * 2. Send the image message using the public URL via POST /api/send-message
   */
  static async sendImageBase64(
    to: string,
    base64Data: string,
    mimetype: string = 'image/png',
    caption?: string
  ): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    try {
      // Step 1: Upload the base64 image to get a public URL
      logger.info('Uploading image to Wasender for WhatsApp delivery...', { mimetype });
      const publicUrl = await this.uploadMedia(base64Data, mimetype);

      // Step 2: Send the image message using the public URL
      logger.info('Image uploaded, sending via WhatsApp...', { publicUrl: publicUrl.substring(0, 80) });
      return await this.sendImageMessage(to, publicUrl, caption);
    } catch (error: any) {
      logger.error('Failed to send WhatsApp image (base64 upload+send)', {
        to,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Send a document via WhatsApp (using URL) - with rate limiting
   */
  static async sendDocumentMessage(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    const formattedPhone = this.formatPhoneNumber(to);

    return this.queueMessage(async () => {
      const response = await this.getClient().post('/send-message', {
        to: formattedPhone,
        document: { url: documentUrl, filename },
        caption: caption
      });

      logger.info('WhatsApp document sent', { to: formattedPhone, filename });
      return response.data;
    });
  }

  /**
   * Send a document via WhatsApp using base64 data (with rate limiting)
   * This is useful for sending dynamically generated PDFs
   */
  static async sendDocumentBase64(
    to: string,
    base64Data: string,
    filename: string,
    mimetype: string = 'application/pdf',
    caption?: string
  ): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    const formattedPhone = this.formatPhoneNumber(to);

    return this.queueMessage(async () => {
      try {
        const response = await this.getClient().post('/send-message', {
          to: formattedPhone,
          document: {
            base64: base64Data,
            filename: filename,
            mimetype: mimetype
          },
          caption: caption
        });

        logger.info('WhatsApp document (base64) sent', { to: formattedPhone, filename });
        return response.data;
      } catch (error: any) {
        logger.error('Failed to send WhatsApp document (base64)', {
          to,
          filename,
          error: error.response?.data || error.message
        });
        throw error;
      }
    });
  }

  /**
   * Check if a phone number is registered on WhatsApp
   */
  static async checkNumberOnWhatsApp(phoneNumber: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const response = await this.getClient().get(`/on-whatsapp/${formattedPhone.replace('+', '')}`);
      return response.data?.data?.exists || false;
    } catch {
      return false;
    }
  }

  /**
   * Get the current session status
   */
  static async getSessionStatus(): Promise<WasenderSessionStatus> {
    if (!this.isEnabled()) {
      return { success: false, data: { status: 'disconnected' } };
    }

    try {
      const response = await this.getClient().get('/status');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get session status', { error: error.message });
      return { success: false, data: { status: 'disconnected' } };
    }
  }

  /**
   * Verify webhook signature from WasenderAPI
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!config.wasender.webhookSecret) {
      logger.warn('Webhook secret not configured, skipping signature verification');
      return true; // Allow in development
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', config.wasender.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Send bulk messages (with rate limiting)
   */
  static async sendBulkMessages(
    messages: Array<{ to: string; text: string }>,
    delayMs: number = 1000
  ): Promise<Array<{ to: string; success: boolean; error?: string }>> {
    const results: Array<{ to: string; success: boolean; error?: string }> = [];

    for (const msg of messages) {
      try {
        await this.sendTextMessage(msg.to, msg.text);
        results.push({ to: msg.to, success: true });
      } catch (error: any) {
        results.push({
          to: msg.to,
          success: false,
          error: error.message
        });
      }

      // Rate limiting delay
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  // ==========================================
  // Audio/Voice Note Methods
  // ==========================================

  /**
   * Send an audio/voice note via WhatsApp (using URL) - with rate limiting
   *
   * @param to - Recipient phone number (E.164 format or local format)
   * @param audioUrl - Publicly accessible URL of the audio file
   * @returns WasenderSendResponse
   *
   * Supported formats: AAC, MP3, OGG, AMR
   * Maximum file size: 16MB
   *
   * Note: For best compatibility as a voice note, use OGG with OPUS codec
   */
  static async sendAudioMessage(
    to: string,
    audioUrl: string
  ): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      logger.warn('WhatsApp bot is disabled, audio message not sent', { to });
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    const formattedPhone = this.formatPhoneNumber(to);

    return this.queueMessage(async () => {
      try {
        const response = await this.getClient().post('/send-message', {
          to: formattedPhone,
          audioUrl: audioUrl
        });

        logger.info('WhatsApp audio/voice note sent', {
          to: formattedPhone,
          audioUrl: audioUrl.substring(0, 50) + '...',
          msgId: response.data?.data?.msgId
        });

        return response.data;
      } catch (error: any) {
        logger.error('Failed to send WhatsApp audio message', {
          to,
          audioUrl: audioUrl.substring(0, 50) + '...',
          error: error.response?.data || error.message
        });
        throw error;
      }
    });
  }

  /**
   * Send an audio/voice note via WhatsApp using base64 data (with rate limiting)
   * This is useful for sending recorded voice notes or dynamically generated audio
   *
   * @param to - Recipient phone number (E.164 format or local format)
   * @param base64Data - Base64 encoded audio data (without data URL prefix)
   * @param mimetype - Audio MIME type (default: 'audio/ogg; codecs=opus' for voice notes)
   * @returns WasenderSendResponse
   *
   * Recommended MIME types:
   * - 'audio/ogg; codecs=opus' - Native WhatsApp voice note format (recommended)
   * - 'audio/mp3' or 'audio/mpeg' - MP3 audio
   * - 'audio/aac' - AAC audio
   * - 'audio/amr' - AMR audio
   */
  static async sendAudioBase64(
    to: string,
    base64Data: string,
    mimetype: string = 'audio/ogg; codecs=opus'
  ): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      logger.warn('WhatsApp bot is disabled, audio message not sent', { to });
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    const formattedPhone = this.formatPhoneNumber(to);

    return this.queueMessage(async () => {
      try {
        const response = await this.getClient().post('/send-message', {
          to: formattedPhone,
          audio: {
            base64: base64Data,
            mimetype: mimetype
          }
        });

        logger.info('WhatsApp audio (base64) sent', {
          to: formattedPhone,
          mimetype,
          msgId: response.data?.data?.msgId
        });

        return response.data;
      } catch (error: any) {
        logger.error('Failed to send WhatsApp audio (base64)', {
          to,
          mimetype,
          error: error.response?.data || error.message
        });
        throw error;
      }
    });
  }

  /**
   * Send bulk audio/voice note messages (with rate limiting)
   * Broadcasts the same audio file to multiple recipients
   *
   * @param recipients - Array of phone numbers to send to
   * @param audioUrl - Publicly accessible URL of the audio file
   * @param delayMs - Additional delay between messages (on top of built-in rate limiting)
   * @returns Array of results for each recipient
   */
  static async sendBulkAudioMessages(
    recipients: string[],
    audioUrl: string,
    delayMs: number = 1000
  ): Promise<Array<{ to: string; success: boolean; error?: string }>> {
    const results: Array<{ to: string; success: boolean; error?: string }> = [];

    logger.info('Starting bulk audio broadcast', {
      recipientCount: recipients.length,
      audioUrl: audioUrl.substring(0, 50) + '...'
    });

    for (const phone of recipients) {
      try {
        await this.sendAudioMessage(phone, audioUrl);
        results.push({ to: phone, success: true });
      } catch (error: any) {
        results.push({
          to: phone,
          success: false,
          error: error.message
        });
      }

      // Additional rate limiting delay
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Bulk audio broadcast completed', {
      total: recipients.length,
      success: successCount,
      failed: recipients.length - successCount
    });

    return results;
  }

  /**
   * Send bulk audio/voice note messages using base64 data (with rate limiting)
   * Broadcasts the same audio to multiple recipients using base64 encoded data
   *
   * @param recipients - Array of phone numbers to send to
   * @param base64Data - Base64 encoded audio data
   * @param mimetype - Audio MIME type
   * @param delayMs - Additional delay between messages
   * @returns Array of results for each recipient
   */
  static async sendBulkAudioBase64(
    recipients: string[],
    base64Data: string,
    mimetype: string = 'audio/ogg; codecs=opus',
    delayMs: number = 1000
  ): Promise<Array<{ to: string; success: boolean; error?: string }>> {
    const results: Array<{ to: string; success: boolean; error?: string }> = [];

    logger.info('Starting bulk audio (base64) broadcast', {
      recipientCount: recipients.length,
      mimetype
    });

    for (const phone of recipients) {
      try {
        await this.sendAudioBase64(phone, base64Data, mimetype);
        results.push({ to: phone, success: true });
      } catch (error: any) {
        results.push({
          to: phone,
          success: false,
          error: error.message
        });
      }

      // Additional rate limiting delay
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Bulk audio (base64) broadcast completed', {
      total: recipients.length,
      success: successCount,
      failed: recipients.length - successCount
    });

    return results;
  }
}