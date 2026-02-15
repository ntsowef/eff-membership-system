/**
 * WhatsApp Provider Interface
 * Abstract interface that both WasenderAPI and Meta Cloud API implement.
 * All callers use this interface via the WhatsAppProviderManager.
 */

export type WhatsAppProviderType = 'wasender' | 'meta';

export interface WhatsAppSendResponse {
  success: boolean;
  messageId?: string;
  data?: any;
  error?: string;
}

export interface WhatsAppBulkResult {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppSessionStatus {
  connected: boolean;
  provider: WhatsAppProviderType;
  phoneNumber?: string;
  name?: string;
  platform?: string;
  details?: any;
}

// ============================================
// Interactive Message Types
// ============================================

/** A reply button for interactive messages (max 3 per message) */
export interface InteractiveButton {
  /** Unique button ID (returned in webhook when user taps) */
  id: string;
  /** Button display text (max 20 characters) */
  title: string;
}

/** A row in an interactive list section */
export interface InteractiveListRow {
  /** Unique row ID (returned in webhook when user selects) */
  id: string;
  /** Row title (max 24 characters) */
  title: string;
  /** Optional description (max 72 characters) */
  description?: string;
}

/** A section in an interactive list message */
export interface InteractiveListSection {
  /** Section title (max 24 characters) */
  title: string;
  /** Rows in this section (max 10 rows total across all sections) */
  rows: InteractiveListRow[];
}

/** Options for interactive messages */
export interface InteractiveMessageOptions {
  /** Optional header text */
  header?: string;
  /** Optional footer text */
  footer?: string;
}

export interface WhatsAppProvider {
  /** Provider identifier */
  getProviderName(): WhatsAppProviderType;

  /** Check if this provider is enabled and configured */
  isEnabled(): boolean;

  /** Send a text message */
  sendTextMessage(to: string, text: string): Promise<WhatsAppSendResponse>;

  /** Send an image via URL */
  sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResponse>;

  /** Send an image via base64 data */
  sendImageBase64(to: string, base64Data: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse>;

  /** Send a document via URL */
  sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string): Promise<WhatsAppSendResponse>;

  /** Send a document via base64 data */
  sendDocumentBase64(to: string, base64Data: string, filename: string, mimetype?: string, caption?: string): Promise<WhatsAppSendResponse>;

  /** Send an audio message via URL */
  sendAudioMessage(to: string, audioUrl: string): Promise<WhatsAppSendResponse>;

  /** Send an audio message via base64 data */
  sendAudioBase64(to: string, base64Data: string, mimetype?: string): Promise<WhatsAppSendResponse>;

  /** Send interactive reply buttons (max 3 buttons). Falls back to text on unsupported providers. */
  sendInteractiveButtons(to: string, body: string, buttons: InteractiveButton[], options?: InteractiveMessageOptions): Promise<WhatsAppSendResponse>;

  /** Send interactive list message (max 10 rows across sections). Falls back to text on unsupported providers. */
  sendInteractiveList(to: string, body: string, buttonText: string, sections: InteractiveListSection[], options?: InteractiveMessageOptions): Promise<WhatsAppSendResponse>;

  /** Send text messages to multiple recipients */
  sendBulkMessages(messages: Array<{ to: string; text: string }>, delayMs?: number): Promise<WhatsAppBulkResult[]>;

  /** Send audio to multiple recipients */
  sendBulkAudioMessages(recipients: string[], audioUrl: string, delayMs?: number): Promise<WhatsAppBulkResult[]>;

  /** Send base64 audio to multiple recipients */
  sendBulkAudioBase64(recipients: string[], base64Data: string, mimetype?: string, delayMs?: number): Promise<WhatsAppBulkResult[]>;

  /** Check if a phone number is on WhatsApp */
  checkNumberOnWhatsApp(phoneNumber: string): Promise<boolean>;

  /** Get session/connection status */
  getSessionStatus(): Promise<WhatsAppSessionStatus>;

  /** Verify webhook signature */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /** Format phone number to E.164 format */
  formatPhoneNumber(phone: string): string;

  /** Upload media (returns media URL or ID) */
  uploadMedia(base64Data: string, mimetype: string): Promise<{ success: boolean; url?: string; mediaId?: string; error?: string }>;
}

