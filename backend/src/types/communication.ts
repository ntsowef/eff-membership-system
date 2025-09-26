// Communication Module Type Definitions

export type DeliveryChannel = 'Email' | 'SMS' | 'In-App' | 'Push';
export type MessageType = 'Text' | 'HTML' | 'Template';
export type SenderType = 'Admin' | 'Member' | 'System';
export type RecipientType = 'Admin' | 'Member' | 'All';
export type CampaignType = 'Mass' | 'Targeted' | 'Individual';
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Sending' | 'Completed' | 'Cancelled' | 'Failed';
export type DeliveryStatus = 'Queued' | 'Sending' | 'Sent' | 'Delivered' | 'Failed' | 'Bounced' | 'Opened' | 'Clicked';
export type MessageStatus = 'Draft' | 'Queued' | 'Sending' | 'Sent' | 'Delivered' | 'Failed' | 'Read';
export type Priority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type TemplateCategory = 'System' | 'Marketing' | 'Announcement' | 'Reminder' | 'Welcome' | 'Custom';
export type DigestFrequency = 'Immediate' | 'Daily' | 'Weekly' | 'Monthly';

// Message Template Interfaces
export interface MessageTemplate {
  id: number;
  name: string;
  description?: string;
  template_type: DeliveryChannel;
  category: TemplateCategory;
  subject?: string;
  content: string;
  variables?: Record<string, any>;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  template_type: DeliveryChannel;
  category: TemplateCategory;
  subject?: string;
  content: string;
  variables?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {}

// Campaign Interfaces
export interface CommunicationCampaign {
  id: number;
  name: string;
  description?: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  template_id?: number;
  delivery_channels: DeliveryChannel[];
  target_criteria?: TargetCriteria;
  recipient_count: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  template?: MessageTemplate;
}

export interface TargetCriteria {
  // Geographic filters
  province_codes?: string[];
  district_codes?: string[];
  municipality_codes?: string[];
  ward_codes?: string[];
  
  // Demographic filters
  gender_ids?: number[];
  race_ids?: number[];
  age_min?: number;
  age_max?: number;
  
  // Membership filters
  membership_status_ids?: number[];
  subscription_type_ids?: number[];
  membership_expires_within_days?: number;
  
  // Contact filters
  has_email?: boolean;
  has_cell_number?: boolean;
  
  // Custom member IDs (for targeted campaigns)
  member_ids?: number[];
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  template_id?: number;
  delivery_channels: DeliveryChannel[];
  target_criteria?: TargetCriteria;
  scheduled_at?: string;
}

export interface UpdateCampaignData extends Partial<CreateCampaignData> {
  status?: CampaignStatus;
  recipient_count?: number;
  started_at?: string;
  completed_at?: string;
  total_sent?: number;
  total_delivered?: number;
  total_failed?: number;
  total_opened?: number;
  total_clicked?: number;
}

// Message Interfaces
export interface Message {
  id: number;
  conversation_id: string;
  campaign_id?: number;
  sender_type: SenderType;
  sender_id?: number;
  recipient_type: RecipientType;
  recipient_id?: number;
  subject?: string;
  content: string;
  message_type: MessageType;
  template_id?: number;
  template_data?: Record<string, any>;
  delivery_channels: DeliveryChannel[];
  delivery_status: MessageStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_reason?: string;
  priority: Priority;
  is_reply: boolean;
  parent_message_id?: number;
  created_at: string;
  updated_at: string;
  template?: MessageTemplate;
  campaign?: CommunicationCampaign;
}

export interface CreateMessageData {
  conversation_id?: string;
  campaign_id?: number;
  sender_type: SenderType;
  sender_id?: number;
  recipient_type: RecipientType;
  recipient_id?: number;
  subject?: string;
  content: string;
  message_type?: MessageType;
  template_id?: number;
  template_data?: Record<string, any>;
  delivery_channels: DeliveryChannel[];
  priority?: Priority;
  is_reply?: boolean;
  parent_message_id?: number;
  send_immediately?: boolean;
}

export interface UpdateMessageData extends Partial<CreateMessageData> {
  delivery_status?: MessageStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_reason?: string;
}

// Message Delivery Interfaces
export interface MessageDelivery {
  id: number;
  message_id: number;
  campaign_id?: number;
  recipient_type: 'Member' | 'Admin';
  recipient_id: number;
  recipient_email?: string;
  recipient_phone?: string;
  delivery_channel: DeliveryChannel;
  delivery_status: DeliveryStatus;
  queued_at: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  external_message_id?: string;
  tracking_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Communication Preferences
export interface CommunicationPreferences {
  id: number;
  member_id: number;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;
  marketing_emails: boolean;
  system_notifications: boolean;
  membership_reminders: boolean;
  event_notifications: boolean;
  newsletter: boolean;
  digest_frequency: DigestFrequency;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesData extends Partial<Omit<CommunicationPreferences, 'id' | 'member_id' | 'created_at' | 'updated_at'>> {}

// Analytics Interfaces
export interface CommunicationAnalytics {
  id: number;
  date: string;
  campaigns_sent: number;
  campaigns_completed: number;
  campaigns_failed: number;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  sms_sent: number;
  sms_delivered: number;
  sms_failed: number;
  in_app_sent: number;
  in_app_delivered: number;
  in_app_read: number;
  province_breakdown: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Queue Interfaces
export interface MessageQueue {
  id: number;
  campaign_id?: number;
  message_id: number;
  queue_type: 'Immediate' | 'Scheduled' | 'Batch' | 'Retry';
  priority: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  scheduled_for?: string;
  processed_at?: string;
  retry_count: number;
  max_retries: number;
  retry_after?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface CampaignWithStats extends CommunicationCampaign {
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

export interface ConversationSummary {
  conversation_id: string;
  participant_count: number;
  message_count: number;
  last_message_at: string;
  unread_count: number;
  participants: Array<{
    type: SenderType;
    id: number;
    name: string;
    avatar?: string;
  }>;
}

// Filter and Search Types
export interface CampaignFilters {
  status?: CampaignStatus[];
  campaign_type?: CampaignType[];
  created_by?: number;
  date_from?: string;
  date_to?: string;
  template_id?: number;
}

export interface MessageFilters {
  conversation_id?: string;
  sender_type?: SenderType;
  sender_id?: number;
  recipient_type?: RecipientType;
  recipient_id?: number;
  delivery_status?: MessageStatus[];
  date_from?: string;
  date_to?: string;
  priority?: Priority[];
}

export interface TemplateFilters {
  template_type?: DeliveryChannel[];
  category?: TemplateCategory[];
  is_active?: boolean;
  created_by?: number;
}
