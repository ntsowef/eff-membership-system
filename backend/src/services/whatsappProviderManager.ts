import { config } from '../config/config';
import { logger } from '../utils/logger';
import { executeQuerySingle } from '../config/database';
import {
  WhatsAppProvider,
  WhatsAppProviderType,
  WhatsAppSendResponse,
  WhatsAppBulkResult,
  WhatsAppSessionStatus,
  InteractiveButton,
  InteractiveListSection,
  InteractiveMessageOptions
} from '../types/whatsappProvider';
import { WasenderProviderAdapter } from './wasenderProviderAdapter';
import { MetaCloudApiService } from './metaCloudApiService';

/**
 * WhatsApp Provider Manager
 * Singleton that manages provider selection and delegates to the active provider.
 * Provider can be switched via system_settings table or environment variable.
 */
export class WhatsAppProviderManager {
  private static activeProviderType: WhatsAppProviderType | null = null;
  private static providers: Map<WhatsAppProviderType, WhatsAppProvider> = new Map();

  /**
   * Initialize providers
   */
  private static initProviders(): void {
    if (this.providers.size === 0) {
      this.providers.set('wasender', WasenderProviderAdapter.getInstance());
      this.providers.set('meta', MetaCloudApiService.getInstance());
    }
  }

  /**
   * Get the currently active provider type.
   * Checks DB setting first, then falls back to env/config.
   */
  static async getActiveProviderType(): Promise<WhatsAppProviderType> {
    // If cached, return cached
    if (this.activeProviderType) return this.activeProviderType;

    try {
      // Try to read from system_settings table
      const setting = await executeQuerySingle<{ setting_value: string }>(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'whatsapp_provider'`
      );
      if (setting && (setting.setting_value === 'wasender' || setting.setting_value === 'meta')) {
        this.activeProviderType = setting.setting_value as WhatsAppProviderType;
        logger.info(`WhatsApp provider loaded from DB: ${this.activeProviderType}`);
        return this.activeProviderType;
      }
    } catch (error) {
      // DB may not have the setting yet, fall through
    }

    // Fall back to config/env
    this.activeProviderType = config.whatsappProvider || 'wasender';
    logger.info(`WhatsApp provider loaded from config: ${this.activeProviderType}`);
    return this.activeProviderType;
  }

  /**
   * Get the active provider instance
   */
  static async getProvider(): Promise<WhatsAppProvider> {
    this.initProviders();
    const providerType = await this.getActiveProviderType();
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`WhatsApp provider '${providerType}' not found`);
    }
    return provider;
  }

  /**
   * Get a specific provider by type
   */
  static getProviderByType(type: WhatsAppProviderType): WhatsAppProvider {
    this.initProviders();
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`WhatsApp provider '${type}' not found`);
    }
    return provider;
  }

  /**
   * Switch the active provider (updates cache, DB is updated by the API route)
   */
  static setActiveProvider(providerType: WhatsAppProviderType): void {
    this.activeProviderType = providerType;
    logger.info(`WhatsApp provider switched to: ${providerType}`);
  }

  /**
   * Clear cached provider type (forces re-read from DB on next call)
   */
  static clearCache(): void {
    this.activeProviderType = null;
  }

  // ============================================
  // Convenience static methods that delegate to active provider
  // ============================================

  static async sendTextMessage(to: string, text: string): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendTextMessage(to, text);
  }

  static async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendImageMessage(to, imageUrl, caption);
  }

  static async sendImageBase64(to: string, base64Data: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendImageBase64(to, base64Data, mimetype, caption);
  }

  static async sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendDocumentMessage(to, documentUrl, filename, caption);
  }

  static async sendDocumentBase64(to: string, base64Data: string, filename: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendDocumentBase64(to, base64Data, filename, mimetype, caption);
  }

  static async sendAudioMessage(to: string, audioUrl: string): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendAudioMessage(to, audioUrl);
  }

  static async sendAudioBase64(to: string, base64Data: string, mimetype?: string): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendAudioBase64(to, base64Data, mimetype);
  }


  static async sendInteractiveButtons(to: string, body: string, buttons: InteractiveButton[], options?: InteractiveMessageOptions): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendInteractiveButtons(to, body, buttons, options);
  }

  static async sendInteractiveList(to: string, body: string, buttonText: string, sections: InteractiveListSection[], options?: InteractiveMessageOptions): Promise<WhatsAppSendResponse> {
    const provider = await this.getProvider();
    return provider.sendInteractiveList(to, body, buttonText, sections, options);
  }

  static async sendBulkMessages(messages: Array<{ to: string; text: string }>, delayMs?: number): Promise<WhatsAppBulkResult[]> {
    const provider = await this.getProvider();
    return provider.sendBulkMessages(messages, delayMs);
  }

  static async sendBulkAudioMessages(recipients: string[], audioUrl: string, delayMs?: number): Promise<WhatsAppBulkResult[]> {
    const provider = await this.getProvider();
    return provider.sendBulkAudioMessages(recipients, audioUrl, delayMs);
  }

  static async sendBulkAudioBase64(recipients: string[], base64Data: string, mimetype?: string, delayMs?: number): Promise<WhatsAppBulkResult[]> {
    const provider = await this.getProvider();
    return provider.sendBulkAudioBase64(recipients, base64Data, mimetype, delayMs);
  }

  static async checkNumberOnWhatsApp(phoneNumber: string): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.checkNumberOnWhatsApp(phoneNumber);
  }

  static async getSessionStatus(): Promise<WhatsAppSessionStatus> {
    const provider = await this.getProvider();
    return provider.getSessionStatus();
  }

  static async isEnabled(): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.isEnabled();
  }

  static async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.verifyWebhookSignature(payload, signature);
  }

  static formatPhoneNumber(phone: string): string {
    // Use wasender adapter for phone formatting (same logic for both)
    return WasenderProviderAdapter.getInstance().formatPhoneNumber(phone);
  }
}