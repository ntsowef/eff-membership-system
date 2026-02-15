import { WasenderApiService } from './wasenderApiService';
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
import { logger } from '../utils/logger';

/**
 * Adapter that wraps the existing static WasenderApiService
 * to conform to the WhatsAppProvider interface.
 */
export class WasenderProviderAdapter implements WhatsAppProvider {
  private static instance: WasenderProviderAdapter;

  private constructor() {}

  static getInstance(): WasenderProviderAdapter {
    if (!WasenderProviderAdapter.instance) {
      WasenderProviderAdapter.instance = new WasenderProviderAdapter();
    }
    return WasenderProviderAdapter.instance;
  }

  getProviderName(): WhatsAppProviderType {
    return 'wasender';
  }

  isEnabled(): boolean {
    return WasenderApiService.isEnabled();
  }

  formatPhoneNumber(phone: string): string {
    // Replicate the WasenderApiService phone formatting logic
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  async sendTextMessage(to: string, text: string): Promise<WhatsAppSendResponse> {
    const result = await WasenderApiService.sendTextMessage(to, text);
    return { success: result.success, messageId: result.data?.msgId?.toString(), data: result.data, error: result.error };
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResponse> {
    const result = await WasenderApiService.sendImageMessage(to, imageUrl, caption);
    return { success: result.success, messageId: result.data?.msgId?.toString(), data: result.data, error: result.error };
  }

  async sendImageBase64(to: string, base64Data: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse> {
    const result = await WasenderApiService.sendImageBase64(to, base64Data, mimetype || 'image/png', caption);
    return { success: result.success, messageId: result.data?.msgId?.toString(), data: result.data, error: result.error };
  }

  async sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string): Promise<WhatsAppSendResponse> {
    const result = await WasenderApiService.sendDocumentMessage(to, documentUrl, filename, caption);
    return { success: result.success, messageId: result.data?.msgId?.toString(), data: result.data, error: result.error };
  }

  async sendDocumentBase64(to: string, base64Data: string, filename: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse> {
    const result = await WasenderApiService.sendDocumentBase64(to, base64Data, filename, mimetype || 'application/pdf', caption);
    return { success: result.success, messageId: result.data?.msgId?.toString(), data: result.data, error: result.error };
  }

  async sendAudioMessage(to: string, audioUrl: string): Promise<WhatsAppSendResponse> {
    const result = await WasenderApiService.sendAudioMessage(to, audioUrl);
    return { success: result.success, messageId: result.data?.msgId?.toString(), data: result.data, error: result.error };
  }

  async sendAudioBase64(to: string, base64Data: string, mimetype?: string): Promise<WhatsAppSendResponse> {
    const result = await WasenderApiService.sendAudioBase64(to, base64Data, mimetype);
    return { success: result.success, messageId: result.data?.msgId?.toString(), data: result.data, error: result.error };
  }

  /**
   * Fallback: Convert interactive buttons to plain text and send via sendTextMessage.
   * WasenderAPI does not support interactive messages natively.
   */
  async sendInteractiveButtons(
    to: string,
    body: string,
    buttons: InteractiveButton[],
    options?: InteractiveMessageOptions
  ): Promise<WhatsAppSendResponse> {
    logger.info('WasenderAdapter: Falling back to text for interactive buttons', { to, buttonCount: buttons.length });
    const buttonLines = buttons.map((btn, i) => `${i + 1}. ${btn.title}`).join('\n');
    const text = `${options?.header ? `*${options.header}*\n\n` : ''}${body}\n\n${buttonLines}${options?.footer ? `\n\n_${options.footer}_` : ''}`;
    return this.sendTextMessage(to, text);
  }

  /**
   * Fallback: Convert interactive list to plain text and send via sendTextMessage.
   * WasenderAPI does not support interactive messages natively.
   */
  async sendInteractiveList(
    to: string,
    body: string,
    _buttonText: string,
    sections: InteractiveListSection[],
    options?: InteractiveMessageOptions
  ): Promise<WhatsAppSendResponse> {
    logger.info('WasenderAdapter: Falling back to text for interactive list', { to, sectionCount: sections.length });
    const sectionTexts = sections.map(section => {
      const rowLines = section.rows.map(row => `- *${row.title}*${row.description ? ` - ${row.description}` : ''}`).join('\n');
      return `*${section.title}*\n${rowLines}`;
    }).join('\n\n');
    const text = `${options?.header ? `*${options.header}*\n\n` : ''}${body}\n\n${sectionTexts}${options?.footer ? `\n\n_${options.footer}_` : ''}`;
    return this.sendTextMessage(to, text);
  }

  async sendBulkMessages(messages: Array<{ to: string; text: string }>, delayMs?: number): Promise<WhatsAppBulkResult[]> {
    const results = await WasenderApiService.sendBulkMessages(messages, delayMs);
    return results.map((r: any) => ({ to: r.to, success: r.success, error: r.error }));
  }

  async sendBulkAudioMessages(recipients: string[], audioUrl: string, delayMs?: number): Promise<WhatsAppBulkResult[]> {
    const results = await WasenderApiService.sendBulkAudioMessages(recipients, audioUrl, delayMs);
    return results.map((r: any) => ({ to: r.to, success: r.success, error: r.error }));
  }

  async sendBulkAudioBase64(recipients: string[], base64Data: string, mimetype?: string, delayMs?: number): Promise<WhatsAppBulkResult[]> {
    const results = await WasenderApiService.sendBulkAudioBase64(recipients, base64Data, mimetype, delayMs);
    return results.map((r: any) => ({ to: r.to, success: r.success, error: r.error }));
  }

  async checkNumberOnWhatsApp(phoneNumber: string): Promise<boolean> {
    return WasenderApiService.checkNumberOnWhatsApp(phoneNumber);
  }

  async getSessionStatus(): Promise<WhatsAppSessionStatus> {
    const result = await WasenderApiService.getSessionStatus();
    return {
      connected: result.data?.status === 'connected',
      provider: 'wasender',
      phoneNumber: result.data?.phoneNumber,
      name: undefined,
      platform: 'WasenderAPI',
      details: result.data
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return WasenderApiService.verifyWebhookSignature(payload, signature);
  }

  async uploadMedia(base64Data: string, mimetype: string): Promise<{ success: boolean; url?: string; mediaId?: string; error?: string }> {
    try {
      const publicUrl = await WasenderApiService.uploadMedia(base64Data, mimetype);
      return { success: true, url: publicUrl };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

