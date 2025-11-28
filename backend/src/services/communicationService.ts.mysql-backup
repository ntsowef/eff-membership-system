import {
  MessageTemplateModel,
  CommunicationCampaignModel,
  MessageModel,
  CommunicationPreferencesModel
} from '../models/communication';
import { MemberModel } from '../models/members';
import { GeographicModel } from '../models/geographic';
import { emailService } from './emailService';
import { NotificationModel } from '../models/notifications';
import { QueueService } from './queueService';
// import { getWebSocketService } from './websocketService'; // Removed WebSocket
import type {
  CreateTemplateData,
  UpdateTemplateData,
  CreateCampaignData,
  UpdateCampaignData,
  CreateMessageData,
  TargetCriteria,
  MessageTemplate,
  CommunicationCampaign,
  Message,
  DeliveryChannel
} from '../types/communication';

// Template Service
export class TemplateService {
  // Create template with validation
  static async createTemplate(templateData: CreateTemplateData, createdBy?: number): Promise<number> {
    // Validate template content
    if (!templateData.content || templateData.content.trim().length === 0) {
      throw new Error('Template content cannot be empty');
    }

    // Validate variables format
    if (templateData.variables) {
      const variablePattern = /\{\{(\w+)\}\}/g;
      const contentVariables = [...templateData.content.matchAll(variablePattern)].map(match => match[1]);
      const definedVariables = Object.keys(templateData.variables);
      
      // Check for undefined variables in content
      const undefinedVars = contentVariables.filter(v => !definedVariables.includes(v));
      if (undefinedVars.length > 0) {
        throw new Error(`Undefined variables in template: ${undefinedVars.join(', ')}`);
      }
    }

    const templateWithCreator = { ...templateData, created_by: createdBy };
    return await MessageTemplateModel.createTemplate(templateWithCreator);
  }

  // Render template with data
  static renderTemplate(template: MessageTemplate, data: Record<string, any> = {}): { subject?: string; content: string } {
    let renderedContent = template.content;
    let renderedSubject = template.subject;

    // Replace variables in content
    const variablePattern = /\{\{(\w+)\}\}/g;
    renderedContent = renderedContent.replace(variablePattern, (match, varName) => {
      return data[varName] !== undefined ? String(data[varName]) : match;
    });

    // Replace variables in subject if exists
    if (renderedSubject) {
      renderedSubject = renderedSubject.replace(variablePattern, (match, varName) => {
        return data[varName] !== undefined ? String(data[varName]) : match;
      });
    }

    return {
      subject: renderedSubject,
      content: renderedContent
    };
  }

  // Get template with common member variables
  static getCommonTemplateVariables(member?: any): Record<string, any> {
    if (!member) return {};

    return {
      member_name: `${member.firstname} ${member.surname || ''}`.trim(),
      first_name: member.firstname,
      last_name: member.surname || '',
      member_id: member.member_id,
      id_number: member.id_number,
      email: member.email || '',
      cell_number: member.cell_number || '',
      ward_code: member.ward_code,
      current_date: new Date().toLocaleDateString(),
      current_year: new Date().getFullYear().toString()
    };
  }
}

// Campaign Service
export class CampaignService {
  // Create campaign with recipient calculation
  static async createCampaign(campaignData: CreateCampaignData, createdBy: number): Promise<number> {
    // Calculate recipient count based on target criteria
    const recipientCount = await this.calculateRecipientCount(campaignData.target_criteria);
    
    const campaignId = await CommunicationCampaignModel.createCampaign(campaignData, createdBy);
    
    // Update recipient count
    await CommunicationCampaignModel.updateCampaign(campaignId, { recipient_count: recipientCount });
    
    return campaignId;
  }

  // Calculate recipient count based on criteria
  static async calculateRecipientCount(criteria?: TargetCriteria): Promise<number> {
    if (!criteria) {
      // Count all members if no criteria
      return await MemberModel.getMembersCount({});
    }

    // Build member filters from target criteria
    const memberFilters: any = {};

    if (criteria.province_codes?.length) {
      memberFilters.province_code = criteria.province_codes[0]; // For now, handle single province
    }

    if (criteria.district_codes?.length) {
      memberFilters.district_code = criteria.district_codes[0];
    }

    if (criteria.municipality_codes?.length) {
      memberFilters.municipality_code = criteria.municipality_codes[0];
    }

    if (criteria.ward_codes?.length) {
      memberFilters.ward_code = criteria.ward_codes[0];
    }

    if (criteria.gender_ids?.length) {
      memberFilters.gender_id = criteria.gender_ids[0];
    }

    if (criteria.race_ids?.length) {
      memberFilters.race_id = criteria.race_ids[0];
    }

    if (criteria.age_min) {
      memberFilters.age_min = criteria.age_min;
    }

    if (criteria.age_max) {
      memberFilters.age_max = criteria.age_max;
    }

    if (criteria.has_email !== undefined) {
      memberFilters.has_email = criteria.has_email;
    }

    if (criteria.has_cell_number !== undefined) {
      memberFilters.has_cell_number = criteria.has_cell_number;
    }

    return await MemberModel.getMembersCount(memberFilters);
  }

  // Get campaign recipients
  static async getCampaignRecipients(campaignId: number): Promise<any[]> {
    const campaign = await CommunicationCampaignModel.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.target_criteria?.member_ids?.length) {
      // Specific member IDs
      const recipients: any[] = [];
      for (const memberId of campaign.target_criteria.member_ids) {
        const member = await MemberModel.getMemberById(memberId);
        if (member) recipients.push(member);
      }
      return recipients;
    }

    // Build filters and get members
    const memberFilters: any = {};
    const criteria = campaign.target_criteria;

    if (criteria?.province_codes?.length) {
      memberFilters.province_code = criteria.province_codes[0];
    }

    if (criteria?.district_codes?.length) {
      memberFilters.district_code = criteria.district_codes[0];
    }

    if (criteria?.municipality_codes?.length) {
      memberFilters.municipality_code = criteria.municipality_codes[0];
    }

    if (criteria?.ward_codes?.length) {
      memberFilters.ward_code = criteria.ward_codes[0];
    }

    if (criteria?.gender_ids?.length) {
      memberFilters.gender_id = criteria.gender_ids[0];
    }

    if (criteria?.has_email !== undefined) {
      memberFilters.has_email = criteria.has_email;
    }

    if (criteria?.has_cell_number !== undefined) {
      memberFilters.has_cell_number = criteria.has_cell_number;
    }

    // Get all matching members (we'll implement pagination later for large campaigns)
    return await MemberModel.getAllMembers(memberFilters, 10000, 0); // Large limit for now
  }

  // Launch campaign with queue-based processing
  static async launchCampaign(campaignId: number): Promise<boolean> {
    const campaign = await CommunicationCampaignModel.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'Draft' && campaign.status !== 'Scheduled') {
      throw new Error('Campaign cannot be launched in current status');
    }

    // Update campaign status
    await CommunicationCampaignModel.updateCampaign(campaignId, {
      status: 'Sending',
      started_at: new Date().toISOString()
    });

    try {
      // Get recipients with communication preferences
      const recipients = await this.getCampaignRecipientsWithPreferences(campaignId);
      console.log(`🚀 Launching campaign ${campaignId} for ${recipients.length} recipients`);

      // Create messages and add to queue in batches
      let successCount = 0;
      let failureCount = 0;
      const batchSize = 100; // Process in batches to avoid memory issues

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        for (const recipient of batch) {
          try {
            // Check communication preferences
            if (!this.shouldSendToRecipient(recipient, campaign.delivery_channels)) {
              console.log(`Skipping recipient ${recipient.member_id} due to preferences`);
              continue;
            }

            // Create message
            const messageId = await this.createCampaignMessage(campaign, recipient);

            // Add to queue with appropriate priority
            const priority = this.getCampaignPriority(campaign);
            await QueueService.addToQueue(messageId, campaignId, 'Batch', priority);

            successCount++;
          } catch (error) {
            console.error(`Failed to create message for recipient ${recipient.member_id}:`, error);
            failureCount++;
          }
        }

        // Small delay between batches
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Update campaign with initial results
      await CommunicationCampaignModel.updateCampaign(campaignId, {
        total_sent: successCount,
        total_failed: failureCount
      });

      // Real-time updates removed (WebSocket service removed)
      console.log(`Campaign ${campaignId} progress: ${successCount}/${recipients.length} sent, ${failureCount} failed`);

      console.log(`✅ Campaign ${campaignId} queued: ${successCount} messages created, ${failureCount} failed`);
      return successCount > 0;

    } catch (error) {
      // Update campaign status to failed
      await CommunicationCampaignModel.updateCampaign(campaignId, {
        status: 'Failed',
        completed_at: new Date().toISOString()
      });
      throw error;
    }
  }

  // Get campaign recipients with communication preferences
  static async getCampaignRecipientsWithPreferences(campaignId: number): Promise<any[]> {
    const campaign = await CommunicationCampaignModel.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get base recipients
    const recipients = await this.getCampaignRecipients(campaignId);

    // Enhance with communication preferences
    const enhancedRecipients: any[] = [];
    for (const recipient of recipients) {
      try {
        // Get communication preferences
        const preferences = await CommunicationPreferencesModel.getMemberPreferences(recipient.member_id);
        enhancedRecipients.push({
          ...recipient,
          preferences: preferences || {
            email_enabled: true,
            sms_enabled: true,
            in_app_enabled: true,
            marketing_emails: true,
            system_notifications: true
          }
        });
      } catch (error) {
        // If preferences can't be loaded, use defaults
        enhancedRecipients.push({
          ...recipient,
          preferences: {
            email_enabled: true,
            sms_enabled: true,
            in_app_enabled: true,
            marketing_emails: true,
            system_notifications: true
          }
        });
      }
    }

    return enhancedRecipients;
  }

  // Check if message should be sent to recipient based on preferences
  static shouldSendToRecipient(recipient: any, deliveryChannels: string[]): boolean {
    const prefs = recipient.preferences;

    // Check if any delivery channel is enabled for this recipient
    for (const channel of deliveryChannels) {
      switch (channel) {
        case 'Email':
          if (prefs.email_enabled && recipient.email) return true;
          break;
        case 'SMS':
          if (prefs.sms_enabled && recipient.cell_number) return true;
          break;
        case 'In-App':
          if (prefs.in_app_enabled) return true;
          break;
      }
    }

    return false;
  }

  // Get campaign priority for queue processing
  static getCampaignPriority(campaign: any): number {
    // System messages get highest priority
    if (campaign.template?.category === 'System') return 10;

    // Reminders get high priority
    if (campaign.template?.category === 'Reminder') return 8;

    // Announcements get medium-high priority
    if (campaign.template?.category === 'Announcement') return 6;

    // Marketing gets normal priority
    if (campaign.template?.category === 'Marketing') return 4;

    // Default priority
    return 5;
  }

  // Create individual campaign message
  private static async createCampaignMessage(campaign: CommunicationCampaign, recipient: any): Promise<number> {
    const messageData: CreateMessageData = {
      campaign_id: campaign.id,
      sender_type: 'System',
      recipient_type: 'Member',
      recipient_id: recipient.member_id,
      content: campaign.template?.content || 'Default message content',
      delivery_channels: campaign.delivery_channels,
      template_id: campaign.template_id,
      template_data: TemplateService.getCommonTemplateVariables(recipient),
      send_immediately: true
    };

    // Render template if available
    if (campaign.template) {
      const rendered = TemplateService.renderTemplate(
        campaign.template, 
        TemplateService.getCommonTemplateVariables(recipient)
      );
      messageData.content = rendered.content;
      messageData.subject = rendered.subject;
    }

    const messageId = await MessageModel.createMessage(messageData);

    return messageId;
  }
}

// Message Service
export class MessageService {
  // Send individual message
  static async sendMessage(messageId: number): Promise<boolean> {
    const message = await MessageModel.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.delivery_status !== 'Draft' && message.delivery_status !== 'Queued') {
      throw new Error('Message cannot be sent in current status');
    }

    // Update message status
    await MessageModel.updateMessage(messageId, {
      delivery_status: 'Sending',
      sent_at: new Date().toISOString()
    });

    let success = false;

    // Send via each delivery channel
    for (const channel of message.delivery_channels) {
      try {
        const channelSuccess = await this.sendViaChannel(message, channel);
        if (channelSuccess) success = true;
      } catch (error) {
        console.error(`Failed to send message ${messageId} via ${channel}:`, error);
      }
    }

    // Update final status
    await MessageModel.updateMessage(messageId, {
      delivery_status: success ? 'Sent' : 'Failed',
      delivered_at: success ? new Date().toISOString() : undefined,
      failed_reason: success ? undefined : 'Failed to send via any channel'
    });

    return success;
  }

  // Send message via specific channel
  private static async sendViaChannel(message: Message, channel: DeliveryChannel): Promise<boolean> {
    // Get recipient details
    let recipientEmail: string | undefined;
    let recipientPhone: string | undefined;
    let recipientName: string = 'Member';

    if (message.recipient_type === 'Member' && message.recipient_id) {
      const member = await MemberModel.getMemberById(message.recipient_id);
      if (member) {
        recipientEmail = member.email;
        recipientPhone = member.cell_number;
        recipientName = `${member.firstname} ${member.surname || ''}`.trim();
      }
    }

    switch (channel) {
      case 'Email':
        if (!recipientEmail) {
          throw new Error('No email address for recipient');
        }
        return await emailService.sendEmail({
          to: recipientEmail,
          subject: message.subject || 'Message from Organization',
          html: message.content
        });

      case 'SMS':
        if (!recipientPhone) {
          throw new Error('No phone number for recipient');
        }
        // SMS implementation would go here
        // For now, create a notification record
        await NotificationModel.createNotification({
          member_id: message.recipient_id,
          recipient_type: 'Member',
          notification_type: 'System',
          delivery_channel: 'SMS',
          title: message.subject || 'SMS Message',
          message: message.content.substring(0, 160), // SMS length limit
          send_immediately: true
        });
        return true;

      case 'In-App':
        // Create in-app notification
        await NotificationModel.createNotification({
          member_id: message.recipient_id,
          recipient_type: 'Member',
          notification_type: 'System',
          delivery_channel: 'In-App',
          title: message.subject || 'New Message',
          message: message.content,
          send_immediately: true
        });
        return true;

      default:
        throw new Error(`Unsupported delivery channel: ${channel}`);
    }
  }
}
