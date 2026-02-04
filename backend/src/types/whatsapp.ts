/**
 * WhatsApp Bot Type Definitions
 * Types for WasenderAPI integration and bot functionality
 */

// ============================================
// WasenderAPI Webhook Payload Types
// ============================================

export interface WasenderWebhookPayload {
  event: WasenderEventType;
  timestamp: number;
  data: WasenderEventData;
}

export type WasenderEventType =
  | 'messages.received'
  | 'messages.upsert'
  | 'messages.sent'
  | 'messages.status'
  | 'session.status'
  | 'qr.updated';

export interface WasenderEventData {
  messages?: WasenderMessage;
  status?: string;
  qrCode?: string;
  [key: string]: any;
}

export interface WasenderMessage {
  key: WasenderMessageKey;
  messageBody: string;
  message: WasenderMessageContent;
}

export interface WasenderMessageKey {
  id: string;
  fromMe: boolean;
  remoteJid: string;
  cleanedSenderPn?: string;
  cleanedParticipantPn?: string;
  senderLid?: string;
}

export interface WasenderMessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text: string;
    contextInfo?: any;
  };
  imageMessage?: WasenderMediaMessage;
  videoMessage?: WasenderMediaMessage;
  audioMessage?: WasenderMediaMessage;
  documentMessage?: WasenderMediaMessage;
  stickerMessage?: WasenderMediaMessage;
  [key: string]: any;
}

export interface WasenderMediaMessage {
  url?: string;
  mediaKey?: string;
  mimetype?: string;
  fileName?: string;
  caption?: string;
  [key: string]: any;
}

// ============================================
// WasenderAPI Response Types
// ============================================

export interface WasenderSendResponse {
  success: boolean;
  data?: {
    msgId: number;
    jid: string;
    status: string;
  };
  error?: string;
}

export interface WasenderSessionStatus {
  success: boolean;
  data?: {
    status: 'connected' | 'disconnected' | 'connecting';
    phoneNumber?: string;
  };
}

// ============================================
// Bot Session and State Types
// ============================================

export interface BotSession {
  id?: number;
  phone_number: string;
  member_id?: number;
  current_state: BotState;
  context: BotContext;
  last_intent?: string;
  conversation_count?: number;
  last_activity_at?: Date;
  session_started_at?: Date;
}

export type BotState =
  | 'idle'
  | 'awaiting_id'
  | 'awaiting_confirmation'
  | 'awaiting_selection'
  | 'processing';

export interface BotContext {
  member_id?: number;
  id_number?: string;
  awaiting_input?: string;
  last_query?: string;
  [key: string]: any;
}

export type BotIntent =
  | 'greeting'
  | 'help'
  | 'member_lookup'
  | 'id_provided'
  | 'payment'
  | 'cancel'
  | 'yes'
  | 'no'
  | 'unknown';

// ============================================
// Bot Log Types
// ============================================

export interface BotLogEntry {
  id?: number;
  conversation_id?: string;
  phone_number: string;
  member_id?: number;
  direction: 'inbound' | 'outbound';
  message_type: string;
  message_content: string;
  wasender_message_id?: string;
  intent_detected?: string;
  bot_state?: string;
  response_sent?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;
  metadata?: Record<string, any>;
}

// ============================================
// Member Data Types for Bot
// ============================================

export interface MemberBotInfo {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  cell_number?: string;
  email?: string;
  ward_code: string;
  ward_name?: string;
  province_name?: string;
  municipality_name?: string;
  membership_status_name: string;
  membership_number?: string;
  expiry_date?: Date;
  days_until_expiry?: number;
  last_payment_date?: Date;
  language_name?: string;  // Member's home language
}

export interface ApplicationBotInfo {
  application_id: number;
  id_number: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: Date;
  ward_code: string;
}
