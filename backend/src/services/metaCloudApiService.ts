import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import {
  WhatsAppProvider,
  WhatsAppSendResponse,
  WhatsAppBulkResult,
  WhatsAppSessionStatus,
  WhatsAppProviderType,
  InteractiveButton,
  InteractiveListSection,
  InteractiveMessageOptions
} from '../types/whatsappProvider';
import { MetaSendResponse, MetaMediaUploadResponse } from '../types/whatsapp';

/**
 * Meta Cloud API Service
 * Implements WhatsAppProvider interface for Meta's official WhatsApp Business Cloud API
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class MetaCloudApiService implements WhatsAppProvider {
  private client: AxiosInstance | null = null;
  private static instance: MetaCloudApiService;

  private constructor() {}

  static getInstance(): MetaCloudApiService {
    if (!MetaCloudApiService.instance) {
      MetaCloudApiService.instance = new MetaCloudApiService();
    }
    return MetaCloudApiService.instance;
  }

  private getBaseUrl(): string {
    return `https://graph.facebook.com/${config.meta.apiVersion}`;
  }

  private getMessagesUrl(): string {
    return `${this.getBaseUrl()}/${config.meta.phoneNumberId}/messages`;
  }

  private getMediaUrl(): string {
    return `${this.getBaseUrl()}/${config.meta.phoneNumberId}/media`;
  }

  private getClient(): AxiosInstance {
    if (!this.client) {
      this.client = axios.create({
        baseURL: this.getBaseUrl(),
        headers: {
          'Authorization': `Bearer ${config.meta.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      this.client.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
          logger.error('Meta Cloud API request failed', {
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

  getProviderName(): WhatsAppProviderType {
    return 'meta';
  }

  isEnabled(): boolean {
    return config.meta.enabled && !!config.meta.accessToken && !!config.meta.phoneNumberId;
  }

  formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    // South African numbers
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '27' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('27') && cleaned.length === 9) {
      cleaned = '27' + cleaned;
    }
    return cleaned;
  }

  async sendTextMessage(to: string, text: string): Promise<WhatsAppSendResponse> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      const response = await this.getClient().post(this.getMessagesUrl(), {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: { preview_url: false, body: text }
      });

      const data: MetaSendResponse = response.data;
      logger.info('Meta Cloud API: Text message sent', { to: formattedTo, messageId: data.messages?.[0]?.id });

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        data: data
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send text message', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResponse> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'image',
        image: { link: imageUrl }
      };
      if (caption) payload.image.caption = caption;

      const response = await this.getClient().post(this.getMessagesUrl(), payload);
      const data: MetaSendResponse = response.data;

      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send image message', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendImageBase64(to: string, base64Data: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse> {
    try {
      // Step 1: Upload media to Meta
      const uploadResult = await this.uploadMedia(base64Data, mimetype || 'image/png');
      if (!uploadResult.success || !uploadResult.mediaId) {
        return { success: false, error: uploadResult.error || 'Media upload failed' };
      }
      // Step 2: Send message with media ID
      const formattedTo = this.formatPhoneNumber(to);
      const payload: any = {
        messaging_product: 'whatsapp', recipient_type: 'individual',
        to: formattedTo, type: 'image',
        image: { id: uploadResult.mediaId }
      };
      if (caption) payload.image.caption = caption;

      const response = await this.getClient().post(this.getMessagesUrl(), payload);
      const data: MetaSendResponse = response.data;
      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send image base64', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string): Promise<WhatsAppSendResponse> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      const payload: any = {
        messaging_product: 'whatsapp', recipient_type: 'individual',
        to: formattedTo, type: 'document',
        document: { link: documentUrl, filename }
      };
      if (caption) payload.document.caption = caption;

      const response = await this.getClient().post(this.getMessagesUrl(), payload);
      const data: MetaSendResponse = response.data;
      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send document', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendDocumentBase64(to: string, base64Data: string, filename: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse> {
    try {
      const uploadResult = await this.uploadMedia(base64Data, mimetype || 'application/pdf');
      if (!uploadResult.success || !uploadResult.mediaId) {
        return { success: false, error: uploadResult.error || 'Media upload failed' };
      }
      const formattedTo = this.formatPhoneNumber(to);
      const payload: any = {
        messaging_product: 'whatsapp', recipient_type: 'individual',
        to: formattedTo, type: 'document',
        document: { id: uploadResult.mediaId, filename }
      };
      if (caption) payload.document.caption = caption;

      const response = await this.getClient().post(this.getMessagesUrl(), payload);
      const data: MetaSendResponse = response.data;
      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send document base64', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendAudioMessage(to: string, audioUrl: string): Promise<WhatsAppSendResponse> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      const response = await this.getClient().post(this.getMessagesUrl(), {
        messaging_product: 'whatsapp', recipient_type: 'individual',
        to: formattedTo, type: 'audio',
        audio: { link: audioUrl }
      });
      const data: MetaSendResponse = response.data;
      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send audio', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendAudioBase64(to: string, base64Data: string, mimetype?: string): Promise<WhatsAppSendResponse> {
    try {
      const uploadResult = await this.uploadMedia(base64Data, mimetype || 'audio/ogg');
      if (!uploadResult.success || !uploadResult.mediaId) {
        return { success: false, error: uploadResult.error || 'Media upload failed' };
      }
      const formattedTo = this.formatPhoneNumber(to);
      const response = await this.getClient().post(this.getMessagesUrl(), {
        messaging_product: 'whatsapp', recipient_type: 'individual',
        to: formattedTo, type: 'audio',
        audio: { id: uploadResult.mediaId }
      });
      const data: MetaSendResponse = response.data;
      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send audio base64', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendInteractiveButtons(
    to: string,
    body: string,
    buttons: InteractiveButton[],
    options?: InteractiveMessageOptions
  ): Promise<WhatsAppSendResponse> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      const interactive: any = {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title.substring(0, 20) }
          }))
        }
      };
      if (options?.header) interactive.header = { type: 'text', text: options.header };
      if (options?.footer) interactive.footer = { text: options.footer };

      const response = await this.getClient().post(this.getMessagesUrl(), {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'interactive',
        interactive
      });

      const data: MetaSendResponse = response.data;
      logger.info('Meta Cloud API: Interactive buttons sent', { to: formattedTo, messageId: data.messages?.[0]?.id });
      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send interactive buttons', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendInteractiveList(
    to: string,
    body: string,
    buttonText: string,
    sections: InteractiveListSection[],
    options?: InteractiveMessageOptions
  ): Promise<WhatsAppSendResponse> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      const interactive: any = {
        type: 'list',
        body: { text: body },
        action: {
          button: buttonText.substring(0, 20),
          sections: sections.map(section => ({
            title: section.title.substring(0, 24),
            rows: section.rows.map(row => ({
              id: row.id,
              title: row.title.substring(0, 24),
              ...(row.description ? { description: row.description.substring(0, 72) } : {})
            }))
          }))
        }
      };
      if (options?.header) interactive.header = { type: 'text', text: options.header };
      if (options?.footer) interactive.footer = { text: options.footer };

      const response = await this.getClient().post(this.getMessagesUrl(), {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'interactive',
        interactive
      });

      const data: MetaSendResponse = response.data;
      logger.info('Meta Cloud API: Interactive list sent', { to: formattedTo, messageId: data.messages?.[0]?.id });
      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Failed to send interactive list', { to, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendBulkMessages(messages: Array<{ to: string; text: string }>, delayMs: number = 100): Promise<WhatsAppBulkResult[]> {
    const results: WhatsAppBulkResult[] = [];
    for (const msg of messages) {
      try {
        const result = await this.sendTextMessage(msg.to, msg.text);
        results.push({ to: msg.to, success: result.success, messageId: result.messageId, error: result.error });
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error: any) {
        results.push({ to: msg.to, success: false, error: error.message });
      }
    }
    return results;
  }

  async sendBulkAudioMessages(recipients: string[], audioUrl: string, delayMs: number = 100): Promise<WhatsAppBulkResult[]> {
    const results: WhatsAppBulkResult[] = [];
    for (const recipient of recipients) {
      try {
        const result = await this.sendAudioMessage(recipient, audioUrl);
        results.push({ to: recipient, success: result.success, messageId: result.messageId, error: result.error });
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error: any) {
        results.push({ to: recipient, success: false, error: error.message });
      }
    }
    return results;
  }

  async sendBulkAudioBase64(recipients: string[], base64Data: string, mimetype?: string, delayMs: number = 100): Promise<WhatsAppBulkResult[]> {
    // Upload media once, then send to all recipients using media ID
    const uploadResult = await this.uploadMedia(base64Data, mimetype || 'audio/ogg');
    if (!uploadResult.success || !uploadResult.mediaId) {
      return recipients.map(r => ({ to: r, success: false, error: uploadResult.error || 'Media upload failed' }));
    }

    const results: WhatsAppBulkResult[] = [];
    for (const recipient of recipients) {
      try {
        const formattedTo = this.formatPhoneNumber(recipient);
        const response = await this.getClient().post(this.getMessagesUrl(), {
          messaging_product: 'whatsapp', recipient_type: 'individual',
          to: formattedTo, type: 'audio',
          audio: { id: uploadResult.mediaId }
        });
        const data: MetaSendResponse = response.data;
        results.push({ to: recipient, success: true, messageId: data.messages?.[0]?.id });
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error: any) {
        results.push({ to: recipient, success: false, error: error.message });
      }
    }
    return results;
  }

  async checkNumberOnWhatsApp(_phoneNumber: string): Promise<boolean> {
    // Meta Cloud API doesn't have a direct "check number" endpoint.
    // Numbers are validated when you attempt to send a message.
    logger.warn('Meta Cloud API: checkNumberOnWhatsApp not directly supported, assuming valid');
    return true;
  }

  async getSessionStatus(): Promise<WhatsAppSessionStatus> {
    if (!this.isEnabled()) {
      return { connected: false, provider: 'meta', details: { reason: 'Not configured' } };
    }

    try {
      const response = await this.getClient().get(`${this.getBaseUrl()}/${config.meta.phoneNumberId}`);
      return {
        connected: true,
        provider: 'meta',
        phoneNumber: response.data?.display_phone_number,
        name: response.data?.verified_name,
        platform: 'Meta Cloud API',
        details: response.data
      };
    } catch (error: any) {
      logger.error('Meta Cloud API: Failed to get status', { error: error.message });
      return { connected: false, provider: 'meta', details: { error: error.message } };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!config.meta.appSecret) {
      logger.warn('Meta app secret not configured, skipping signature verification');
      return true;
    }
    const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    const expectedSig = crypto.createHmac('sha256', config.meta.appSecret).update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
    } catch {
      return false;
    }
  }

  async uploadMedia(base64Data: string, mimetype: string): Promise<{ success: boolean; url?: string; mediaId?: string; error?: string }> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mimetype);
      form.append('file', buffer, {
        filename: `upload.${mimetype.split('/')[1] || 'bin'}`,
        contentType: mimetype,
      });

      const response = await axios.post(this.getMediaUrl(), form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${config.meta.accessToken}`,
        },
        timeout: 60000
      });

      const data: MetaMediaUploadResponse = response.data;
      logger.info('Meta Cloud API: Media uploaded', { mediaId: data.id });
      return { success: true, mediaId: data.id };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error('Meta Cloud API: Media upload failed', { error: errMsg });
      return { success: false, error: errMsg };
    }
  }
}