import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import type {
  MessageTemplate,
  CreateTemplateData,
  UpdateTemplateData,
  CommunicationCampaign,
  CreateCampaignData,
  UpdateCampaignData,
  Message,
  CreateMessageData,
  UpdateMessageData,
  MessageDelivery,
  CommunicationPreferences,
  UpdatePreferencesData,
  TargetCriteria,
  CampaignFilters,
  MessageFilters,
  TemplateFilters
} from '../types/communication';

// Message Templates Model
export class MessageTemplateModel {
  // Get all templates with filtering
  static async getAllTemplates(
    filters: TemplateFilters = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<MessageTemplate[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.template_type && filters.template_type.length > 0) {
        whereClause += ` AND template_type IN (${filters.template_type.map(() => '?').join(',')})`;
        params.push(...filters.template_type);
      }

      if (filters.category && filters.category.length > 0) {
        whereClause += ` AND category IN (${filters.category.map(() => '?').join(',')})`;
        params.push(...filters.category);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.created_by) {
        whereClause += ' AND created_by = ?';
        params.push(filters.created_by);
      }

      const query = `
        SELECT * FROM message_templates
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch message templates', error);
    }
  }

  // Get template by ID
  static async getTemplateById(id: number): Promise<MessageTemplate | null> {
    try {
      const query = 'SELECT * FROM message_templates WHERE id = ?';
      return await executeQuerySingle(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch message template', error);
    }
  }

  // Create new template
  static async createTemplate(templateData: CreateTemplateData): Promise<number> {
    try {
      const query = `
        INSERT INTO message_templates (
          name, description, template_type, category, subject, content, 
          variables, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        templateData.name,
        templateData.description || null,
        templateData.template_type,
        templateData.category,
        templateData.subject || null,
        templateData.content,
        templateData.variables ? JSON.stringify(templateData.variables) : null,
        templateData.is_active ?? true,
        (templateData as any).created_by || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create message template', error);
    }
  }

  // Update template
  static async updateTemplate(id: number, templateData: UpdateTemplateData): Promise<boolean> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      Object.entries(templateData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'variables' && value !== null) {
            updates.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }
      });

      if (updates.length === 0) return false;

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE message_templates SET ${updates.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update message template', error);
    }
  }

  // Delete template
  static async deleteTemplate(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM message_templates WHERE id = ?';
      const result = await executeQuery(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete message template', error);
    }
  }

  // Get templates count
  static async getTemplatesCount(filters: TemplateFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.template_type && filters.template_type.length > 0) {
        whereClause += ` AND template_type IN (${filters.template_type.map(() => '?').join(',')})`;
        params.push(...filters.template_type);
      }

      if (filters.category && filters.category.length > 0) {
        whereClause += ` AND category IN (${filters.category.map(() => '?').join(',')})`;
        params.push(...filters.category);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      const query = `SELECT COUNT(*) as count FROM message_templates ${whereClause}`;
      const result = await executeQuerySingle(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to count message templates', error);
    }
  }
}

// Communication Campaigns Model
export class CommunicationCampaignModel {
  // Get all campaigns with filtering
  static async getAllCampaigns(
    filters: CampaignFilters = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<CommunicationCampaign[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.status && filters.status.length > 0) {
        whereClause += ` AND c.status IN (${filters.status.map(() => '?').join(',')})`;
        params.push(...filters.status);
      }

      if (filters.campaign_type && filters.campaign_type.length > 0) {
        whereClause += ` AND c.campaign_type IN (${filters.campaign_type.map(() => '?').join(',')})`;
        params.push(...filters.campaign_type);
      }

      if (filters.created_by) {
        whereClause += ' AND c.created_by = ?';
        params.push(filters.created_by);
      }

      if (filters.date_from) {
        whereClause += ' AND c.created_at >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND c.created_at <= ?';
        params.push(filters.date_to);
      }

      if (filters.template_id) {
        whereClause += ' AND c.template_id = ?';
        params.push(filters.template_id);
      }

      const query = `
        SELECT 
          c.*,
          t.name as template_name,
          t.template_type as template_type
        FROM communication_campaigns c
        LEFT JOIN message_templates t ON c.template_id = t.id
        ${whereClause}
        ORDER BY c.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const campaigns = await executeQuery(query, params);

      // Parse JSON fields
      return campaigns.map((campaign: any) => ({
        ...campaign,
        delivery_channels: JSON.parse(campaign.delivery_channels || '[]'),
        target_criteria: campaign.target_criteria ? JSON.parse(campaign.target_criteria) : null,
        template: campaign.template_name ? {
          id: campaign.template_id,
          name: campaign.template_name,
          template_type: campaign.template_type
        } : undefined
      }));
    } catch (error) {
      throw createDatabaseError('Failed to fetch communication campaigns', error);
    }
  }

  // Get campaign by ID
  static async getCampaignById(id: number): Promise<CommunicationCampaign | null> {
    try {
      const query = `
        SELECT 
          c.*,
          t.name as template_name,
          t.template_type as template_type,
          t.content as template_content
        FROM communication_campaigns c
        LEFT JOIN message_templates t ON c.template_id = t.id
        WHERE c.id = ?
      `;

      const campaign = await executeQuerySingle(query, [id]);
      if (!campaign) return null;

      return {
        ...campaign,
        delivery_channels: JSON.parse(campaign.delivery_channels || '[]'),
        target_criteria: campaign.target_criteria ? JSON.parse(campaign.target_criteria) : null,
        template: campaign.template_name ? {
          id: campaign.template_id,
          name: campaign.template_name,
          template_type: campaign.template_type,
          content: campaign.template_content
        } : undefined
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch communication campaign', error);
    }
  }

  // Create new campaign
  static async createCampaign(campaignData: CreateCampaignData, createdBy: number): Promise<number> {
    try {
      const query = `
        INSERT INTO communication_campaigns (
          name, description, campaign_type, template_id, delivery_channels,
          target_criteria, scheduled_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        campaignData.name,
        campaignData.description || null,
        campaignData.campaign_type,
        campaignData.template_id || null,
        JSON.stringify(campaignData.delivery_channels),
        campaignData.target_criteria ? JSON.stringify(campaignData.target_criteria) : null,
        campaignData.scheduled_at || null,
        createdBy
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create communication campaign', error);
    }
  }

  // Update campaign
  static async updateCampaign(id: number, campaignData: UpdateCampaignData): Promise<boolean> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      Object.entries(campaignData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'delivery_channels' || key === 'target_criteria') {
            updates.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }
      });

      if (updates.length === 0) return false;

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE communication_campaigns SET ${updates.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update communication campaign', error);
    }
  }

  // Get campaigns count
  static async getCampaignsCount(filters: CampaignFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.status && filters.status.length > 0) {
        whereClause += ` AND status IN (${filters.status.map(() => '?').join(',')})`;
        params.push(...filters.status);
      }

      if (filters.campaign_type && filters.campaign_type.length > 0) {
        whereClause += ` AND campaign_type IN (${filters.campaign_type.map(() => '?').join(',')})`;
        params.push(...filters.campaign_type);
      }

      if (filters.created_by) {
        whereClause += ' AND created_by = ?';
        params.push(filters.created_by);
      }

      const query = `SELECT COUNT(*) as count FROM communication_campaigns ${whereClause}`;
      const result = await executeQuerySingle(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to count communication campaigns', error);
    }
  }
}

// Messages Model
export class MessageModel {
  // Get all messages with filtering
  static async getAllMessages(
    filters: MessageFilters = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<Message[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.conversation_id) {
        whereClause += ' AND m.conversation_id = ?';
        params.push(filters.conversation_id);
      }

      if (filters.sender_type) {
        whereClause += ' AND m.sender_type = ?';
        params.push(filters.sender_type);
      }

      if (filters.sender_id) {
        whereClause += ' AND m.sender_id = ?';
        params.push(filters.sender_id);
      }

      if (filters.recipient_type) {
        whereClause += ' AND m.recipient_type = ?';
        params.push(filters.recipient_type);
      }

      if (filters.recipient_id) {
        whereClause += ' AND m.recipient_id = ?';
        params.push(filters.recipient_id);
      }

      if (filters.delivery_status && filters.delivery_status.length > 0) {
        whereClause += ` AND m.delivery_status IN (${filters.delivery_status.map(() => '?').join(',')})`;
        params.push(...filters.delivery_status);
      }

      if (filters.date_from) {
        whereClause += ' AND m.created_at >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND m.created_at <= ?';
        params.push(filters.date_to);
      }

      if (filters.priority && filters.priority.length > 0) {
        whereClause += ` AND m.priority IN (${filters.priority.map(() => '?').join(',')})`;
        params.push(...filters.priority);
      }

      const query = `
        SELECT
          m.*,
          t.name as template_name,
          t.template_type as template_type,
          c.name as campaign_name
        FROM messages m
        LEFT JOIN message_templates t ON m.template_id = t.id
        LEFT JOIN communication_campaigns c ON m.campaign_id = c.id
        ${whereClause}
        ORDER BY m.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const messages = await executeQuery(query, params);

      // Parse JSON fields
      return messages.map((message: any) => ({
        ...message,
        delivery_channels: JSON.parse(message.delivery_channels || '[]'),
        template_data: message.template_data ? JSON.parse(message.template_data) : null,
        template: message.template_name ? {
          id: message.template_id,
          name: message.template_name,
          template_type: message.template_type
        } : undefined,
        campaign: message.campaign_name ? {
          id: message.campaign_id,
          name: message.campaign_name
        } : undefined
      }));
    } catch (error) {
      throw createDatabaseError('Failed to fetch messages', error);
    }
  }

  // Get message by ID
  static async getMessageById(id: number): Promise<Message | null> {
    try {
      const query = `
        SELECT
          m.*,
          t.name as template_name,
          t.template_type as template_type,
          t.content as template_content,
          c.name as campaign_name
        FROM messages m
        LEFT JOIN message_templates t ON m.template_id = t.id
        LEFT JOIN communication_campaigns c ON m.campaign_id = c.id
        WHERE m.id = ?
      `;

      const message = await executeQuerySingle(query, [id]);
      if (!message) return null;

      return {
        ...message,
        delivery_channels: JSON.parse(message.delivery_channels || '[]'),
        template_data: message.template_data ? JSON.parse(message.template_data) : null,
        template: message.template_name ? {
          id: message.template_id,
          name: message.template_name,
          template_type: message.template_type,
          content: message.template_content
        } : undefined,
        campaign: message.campaign_name ? {
          id: message.campaign_id,
          name: message.campaign_name
        } : undefined
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch message', error);
    }
  }

  // Create new message
  static async createMessage(messageData: CreateMessageData): Promise<number> {
    try {
      // Generate conversation ID if not provided
      const conversationId = messageData.conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      const query = `
        INSERT INTO messages (
          conversation_id, campaign_id, sender_type, sender_id, recipient_type, recipient_id,
          subject, content, message_type, template_id, template_data, delivery_channels,
          priority, is_reply, parent_message_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        conversationId,
        messageData.campaign_id || null,
        messageData.sender_type,
        messageData.sender_id || null,
        messageData.recipient_type,
        messageData.recipient_id || null,
        messageData.subject || null,
        messageData.content,
        messageData.message_type || 'Text',
        messageData.template_id || null,
        messageData.template_data ? JSON.stringify(messageData.template_data) : null,
        JSON.stringify(messageData.delivery_channels),
        messageData.priority || 'Normal',
        messageData.is_reply || false,
        messageData.parent_message_id || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create message', error);
    }
  }

  // Update message
  static async updateMessage(id: number, messageData: UpdateMessageData): Promise<boolean> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      Object.entries(messageData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'delivery_channels' || key === 'template_data') {
            updates.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }
      });

      if (updates.length === 0) return false;

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE messages SET ${updates.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update message', error);
    }
  }

  // Get messages count
  static async getMessagesCount(filters: MessageFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.conversation_id) {
        whereClause += ' AND conversation_id = ?';
        params.push(filters.conversation_id);
      }

      if (filters.sender_type) {
        whereClause += ' AND sender_type = ?';
        params.push(filters.sender_type);
      }

      if (filters.recipient_type) {
        whereClause += ' AND recipient_type = ?';
        params.push(filters.recipient_type);
      }

      const query = `SELECT COUNT(*) as count FROM messages ${whereClause}`;
      const result = await executeQuerySingle(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to count messages', error);
    }
  }

  // Get conversation messages
  static async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const query = `
        SELECT
          m.*,
          t.name as template_name,
          t.template_type as template_type
        FROM messages m
        LEFT JOIN message_templates t ON m.template_id = t.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
        LIMIT ? OFFSET ?
      `;

      const messages = await executeQuery(query, [conversationId, limit, offset]);

      return messages.map((message: any) => ({
        ...message,
        delivery_channels: JSON.parse(message.delivery_channels || '[]'),
        template_data: message.template_data ? JSON.parse(message.template_data) : null,
        template: message.template_name ? {
          id: message.template_id,
          name: message.template_name,
          template_type: message.template_type
        } : undefined
      }));
    } catch (error) {
      throw createDatabaseError('Failed to fetch conversation messages', error);
    }
  }
}

// Communication Preferences Model
export class CommunicationPreferencesModel {
  // Get member preferences
  static async getMemberPreferences(memberId: number): Promise<CommunicationPreferences | null> {
    try {
      const query = 'SELECT * FROM communication_preferences WHERE member_id = ?';
      return await executeQuerySingle(query, [memberId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch communication preferences', error);
    }
  }

  // Create or update member preferences
  static async upsertMemberPreferences(
    memberId: number,
    preferences: UpdatePreferencesData
  ): Promise<boolean> {
    try {
      const existingPrefs = await this.getMemberPreferences(memberId);

      if (existingPrefs) {
        // Update existing preferences
        const updates: string[] = [];
        const params: any[] = [];

        Object.entries(preferences).forEach(([key, value]) => {
          if (value !== undefined) {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        });

        if (updates.length === 0) return false;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(memberId);

        const query = `UPDATE communication_preferences SET ${updates.join(', ')} WHERE member_id = ?`;
        const result = await executeQuery(query, params);
        return result.affectedRows > 0;
      } else {
        // Create new preferences with defaults
        const query = `
          INSERT INTO communication_preferences (
            member_id, email_enabled, sms_enabled, in_app_enabled, push_enabled,
            marketing_emails, system_notifications, membership_reminders,
            event_notifications, newsletter, digest_frequency, quiet_hours_start, quiet_hours_end
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          memberId,
          preferences.email_enabled ?? true,
          preferences.sms_enabled ?? true,
          preferences.in_app_enabled ?? true,
          preferences.push_enabled ?? true,
          preferences.marketing_emails ?? true,
          preferences.system_notifications ?? true,
          preferences.membership_reminders ?? true,
          preferences.event_notifications ?? true,
          preferences.newsletter ?? true,
          preferences.digest_frequency ?? 'Immediate',
          preferences.quiet_hours_start ?? '22:00:00',
          preferences.quiet_hours_end ?? '08:00:00'
        ];

        const result = await executeQuery(query, params);
        return result.affectedRows > 0;
      }
    } catch (error) {
      throw createDatabaseError('Failed to upsert communication preferences', error);
    }
  }
}
