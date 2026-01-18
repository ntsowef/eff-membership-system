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
   * Send a text message via WhatsApp
   */
  static async sendTextMessage(to: string, text: string): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      logger.warn('WhatsApp bot is disabled, message not sent', { to });
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);

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
  }

  /**
   * Send an image message via WhatsApp
   */
  static async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<WasenderSendResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'WhatsApp bot is disabled' };
    }

    const formattedPhone = this.formatPhoneNumber(to);

    const response = await this.getClient().post('/send-message', {
      to: formattedPhone,
      image: { url: imageUrl },
      caption: caption
    });

    logger.info('WhatsApp image sent', { to: formattedPhone });
    return response.data;
  }

  /**
   * Send a document via WhatsApp
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

    const response = await this.getClient().post('/send-message', {
      to: formattedPhone,
      document: { url: documentUrl, filename },
      caption: caption
    });

    logger.info('WhatsApp document sent', { to: formattedPhone, filename });
    return response.data;
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
}