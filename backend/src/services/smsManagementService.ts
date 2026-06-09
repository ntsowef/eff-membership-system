import { executeQuery, executeQuerySingle, executeUpdate } from '../config/database';
import { getConnection } from '../config/database-hybrid';
import axios from 'axios';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { renderTemplateString } from '../utils/templateRenderer';
import { SMSBulkService, BulkSMSRecipient, BulkSMSBatchParams } from './smsBulkService';
import { ImportResult, ImportError } from './importExportService';

// Create a simple logger if it doesn't exist
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
};

export interface SMSTemplate {
  id?: number;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  category: 'campaign' | 'notification' | 'reminder' | 'announcement' | 'custom';
  is_active: boolean;
  created_by?: number;
}

export interface SMSCampaign {
  id?: number;
  name: string;
  description?: string;
  template_id?: number;
  message_content: string;
  target_type: 'all' | 'province' | 'district' | 'municipality' | 'ward' | 'custom' | 'list';
  target_criteria: any;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  scheduled_at?: Date | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  send_rate_limit: number;
  retry_failed: boolean;
  max_retries: number;
  created_by?: number;
  messages_sent?: number;
  messages_delivered?: number;
  messages_failed?: number;
}

export interface SMSMessage {
  id?: number;
  campaign_id?: number;
  recipient_phone: string;
  recipient_name?: string;
  recipient_member_id?: number;
  message_content: string;
  status: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired';
  provider_message_id?: string;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  cost_per_sms: number;
  total_cost: number;
}

export interface SMSContactList {
  id?: number;
  name: string;
  description?: string;
  total_contacts: number;
  active_contacts: number;
  is_active: boolean;
  allow_duplicates: boolean;
  created_by?: number;
}

export class SMSManagementService {
  // Template Management
  static async createTemplate(template: SMSTemplate): Promise<number> {
    try {
      const result = await executeQuery(`
        INSERT INTO sms_templates (template_name, template_code, message_template, category, subject, variables, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING template_id
      `, [
        template.name,
        template.name.toUpperCase().replace(/\s+/g, '_'), // Generate template_code from name
        template.content,
        template.category,
        template.description || '',
        JSON.stringify(template.variables || []),
        template.is_active,
        template.created_by
      ]);

      const insertResult = Array.isArray(result) ? result[0] : result;
      logger.info('SMS template created: ' + template.name + '', { templateId: insertResult.template_id });
      return insertResult.template_id;
    } catch (error: any) {
      logger.error('Failed to create SMS template', { error: error.message, template });
      throw error;
    }
  }

  static async getTemplates(filters: {
    category?: string;
    is_active?: boolean;
    search?: string;
  } = {}): Promise<SMSTemplate[]> {
    try {
      let query = 'SELECT * FROM sms_templates WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.category) {
        query += ` AND category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(filters.is_active);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (template_name ILIKE $${paramIndex} OR message_template ILIKE $${paramIndex + 1})`;
        const searchTerm = '%' + filters.search + '%';
        params.push(searchTerm, searchTerm);
        paramIndex += 2;
      }

      query += ' ORDER BY created_at DESC';

      const result = await executeQuery(query, params);
      const templates = Array.isArray(result) ? result : result[0] || [];

      return templates.map((template: any) => ({
        id: template.template_id,
        name: template.template_name,
        description: template.subject || '',
        content: template.message_template,
        variables: template.variables ? (typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables) : [],
        category: template.category,
        is_active: template.is_active,
        created_by: template.created_by
      }));
    } catch (error: any) {
      logger.error('Failed to get SMS templates', { error: error.message, filters });
      throw error;
    }
  }

  static async getTemplateById(id: number): Promise<SMSTemplate | null> {
    try {
      const result = await executeQuery(
        'SELECT * FROM sms_templates WHERE template_id = $1',
        [id]
      );

      const templates = Array.isArray(result) ? result : result[0] || [];
      if (templates.length === 0) return null;

      const template = templates[0];
      return {
        id: template.template_id,
        name: template.template_name,
        description: template.subject || '',
        content: template.message_template,
        variables: template.variables ? (typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables) : [],
        category: template.category,
        is_active: template.is_active,
        created_by: template.created_by
      };
    } catch (error: any) {
      logger.error('Failed to get SMS template by ID', { error: error.message, id });
      throw error;
    }
  }

  static async updateTemplate(id: number, updates: Partial<SMSTemplate>): Promise<boolean> {
    try {
      const setClause: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClause.push(`template_name = $${paramIndex}`);
        params.push(updates.name);
        paramIndex++;
      }
      if (updates.content !== undefined) {
        setClause.push(`message_template = $${paramIndex}`);
        params.push(updates.content);
        paramIndex++;
      }
      if (updates.description !== undefined) {
        setClause.push(`subject = $${paramIndex}`);
        params.push(updates.description);
        paramIndex++;
      }
      if (updates.variables !== undefined) {
        setClause.push(`variables = $${paramIndex}`);
        params.push(JSON.stringify(updates.variables));
        paramIndex++;
      }
      if (updates.category !== undefined) {
        setClause.push(`category = $${paramIndex}`);
        params.push(updates.category);
        paramIndex++;
      }
      if (updates.is_active !== undefined) {
        setClause.push(`is_active = $${paramIndex}`);
        params.push(updates.is_active);
        paramIndex++;
      }

      if (setClause.length === 0) return false;

      setClause.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const result = await executeUpdate(`
        UPDATE sms_templates
        SET ${setClause.join(', ')}
        WHERE template_id = $${paramIndex}
      `, params) || { affectedRows: 0 };

      const affectedRows = result.affectedRows || 0;

      logger.info(`SMS template updated: ${id}`, { affectedRows });
      return affectedRows > 0;
    } catch (error: any) {
      logger.error('Failed to update SMS template', { error: error.message, id, updates });
      throw error;
    }
  }

  static async deleteTemplate(id: number): Promise<boolean> {
    try {
      const result = await executeUpdate(
        'DELETE FROM sms_templates WHERE template_id = $1',
        [id]
      ) || { affectedRows: 0 };

      const affectedRows = result.affectedRows || 0;
      logger.info('SMS template deleted: ' + id, { affectedRows });
      return affectedRows > 0;
    } catch (error: any) {
      logger.error('Failed to delete SMS template', { error: error.message, id });
      throw error;
    }
  }

  // Helper to capitalize first letter for PostgreSQL check constraints
  private static capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  // Map frontend target_type values to PostgreSQL check constraint values
  private static mapTargetType(targetType: string): string {
    const targetTypeMap: Record<string, string> = {
      'all': 'National',
      'province': 'Province',
      'district': 'District',
      'municipality': 'Municipality',
      'ward': 'Ward',
      'custom': 'Custom',
      'list': 'Manual',
      'status': 'Status',
      'good-standing': 'Good Standing',
    };
    return targetTypeMap[targetType.toLowerCase()] || SMSManagementService.capitalize(targetType);
  }

  // Map frontend status values to PostgreSQL check constraint values
  private static mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'scheduled': 'Scheduled',
      'sending': 'Running',
      'sent': 'Completed',
      'paused': 'Cancelled',
      'cancelled': 'Cancelled',
      'failed': 'Failed',
    };
    return statusMap[status.toLowerCase()] || SMSManagementService.capitalize(status);
  }

  // ==================================================================================
  // Phone number normalization (SA country code 27)
  // ==================================================================================
  static formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    // Strip all non-digit characters
    let num = phone.replace(/[^0-9]/g, '');
    // Must be digits only and between 9-12 digits long
    if (!/^[0-9]{9,12}$/.test(num)) return '';
    // 0xx... → 27xx...
    if (num.startsWith('0')) num = '27' + num.substring(1);
    // 9 digits starting with 6/7/8 → prepend 27
    if (/^[678]/.test(num) && num.length === 9) num = '27' + num;
    // Final validation: must be 11 digits starting with 27
    if (!/^27[0-9]{9}$/.test(num)) return '';
    return num;
  }

  // ==================================================================================
  // Resolve Good Standing recipients from members_consolidated
  // Active members (status_id=1), not expired, with valid cell numbers
  // ==================================================================================
  static async resolveGoodStandingRecipients(options: {
    page?: number;
    limit?: number;
    province?: string;
    countOnly?: boolean;
  } = {}): Promise<{ recipients: Array<{ member_id: number; firstname: string; surname: string; cell_number: string; province_name: string }>; total: number }> {
    try {
      const conditions = [
        "membership_status_id = 1",
        "expiry_date >= CURRENT_DATE",
        "cell_number IS NOT NULL",
        "TRIM(cell_number) != ''",
        "REGEXP_REPLACE(cell_number, '[^0-9]', '', 'g') ~ '^[0-9]{9,12}$'",
      ];
      const params: any[] = [];
      let idx = 1;

      if (options.province) {
        conditions.push(`province_name ILIKE $${idx++}`);
        params.push(`%${options.province}%`);
      }

      const where = `WHERE ${conditions.join(' AND ')}`;

      // Count query
      const countResult = await executeQuerySingle(
        `SELECT COUNT(*) AS total FROM members_consolidated ${where}`, params
      );
      const total = parseInt(countResult?.total || '0');

      if (options.countOnly) {
        return { recipients: [], total };
      }

      // Data query with pagination
      const page = options.page || 1;
      const limit = options.limit || 1000;
      const offset = (page - 1) * limit;

      const dataParams = [...params, limit, offset];
      const rows = await executeQuery(
        `SELECT member_id, firstname, surname, cell_number, province_name
         FROM members_consolidated ${where}
         ORDER BY province_name, surname, firstname
         LIMIT $${idx++} OFFSET $${idx}`,
        dataParams
      );

      const recipients = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        member_id: r.member_id,
        firstname: r.firstname,
        surname: r.surname,
        cell_number: SMSManagementService.formatPhoneNumber(r.cell_number),
        province_name: r.province_name,
      }));

      return { recipients, total };
    } catch (error: any) {
      logger.error('Failed to resolve good standing recipients', { error: error.message });
      throw error;
    }
  }

  // ==================================================================================
  // Resolve Custom Criteria recipients from members_consolidated
  // Dynamically builds WHERE clause from target_criteria JSON filters
  // ==================================================================================
  static async resolveCustomCriteriaRecipients(criteria: Record<string, any>): Promise<{ recipients: Array<{ member_id: number; firstname: string; surname: string; cell_number: string }>; total: number }> {
    try {
      const conditions: string[] = [
        "mc.cell_number IS NOT NULL",
        "TRIM(mc.cell_number) != ''",
        "REGEXP_REPLACE(mc.cell_number, '[^0-9]', '', 'g') ~ '^[0-9]{9,12}$'",
      ];
      const params: any[] = [];
      let idx = 1;
      let needsLeadershipJoin = false;

      // Province filter
      if (criteria.province_name) {
        conditions.push(`mc.province_name ILIKE $${idx++}`);
        params.push(`%${criteria.province_name}%`);
      }

      // Municipality filter
      if (criteria.municipality_code) {
        conditions.push(`mc.municipality_code = $${idx++}`);
        params.push(criteria.municipality_code);
      }

      // Ward filter
      if (criteria.ward_code) {
        conditions.push(`mc.ward_code = $${idx++}`);
        params.push(criteria.ward_code);
      }

      // Membership status filter
      if (criteria.membership_status_id) {
        conditions.push(`mc.membership_status_id = $${idx++}`);
        params.push(parseInt(criteria.membership_status_id, 10));
      }

      // Gender filter
      if (criteria.gender_id) {
        conditions.push(`mc.gender_id = $${idx++}`);
        params.push(parseInt(criteria.gender_id, 10));
      }

      // Age range filter
      if (criteria.min_age) {
        conditions.push(`mc.age >= $${idx++}`);
        params.push(parseInt(criteria.min_age, 10));
      }
      if (criteria.max_age) {
        conditions.push(`mc.age <= $${idx++}`);
        params.push(parseInt(criteria.max_age, 10));
      }

      // Leadership filter
      if (criteria.has_leadership_role) {
        needsLeadershipJoin = true;
        conditions.push("la.appointment_status = 'Active'");

        if (criteria.leadership_level) {
          conditions.push(`la.hierarchy_level = $${idx++}`);
          params.push(criteria.leadership_level);
        }
      }

      const joinClause = needsLeadershipJoin
        ? 'INNER JOIN leadership_appointments la ON mc.member_id = la.member_id'
        : '';

      const where = `WHERE ${conditions.join(' AND ')}`;

      // Count
      const countResult = await executeQuerySingle<{ total: string }>(
        `SELECT COUNT(DISTINCT mc.member_id) AS total FROM members_consolidated mc ${joinClause} ${where}`,
        params
      );
      const total = parseInt(countResult?.total || '0', 10);

      // Data
      const rows = await executeQuery(
        `SELECT DISTINCT mc.member_id, mc.firstname, mc.surname, mc.cell_number
         FROM members_consolidated mc ${joinClause}
         ${where}
         ORDER BY mc.surname, mc.firstname`,
        params
      );

      const recipients = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        member_id: r.member_id,
        firstname: r.firstname,
        surname: r.surname,
        cell_number: SMSManagementService.formatPhoneNumber(r.cell_number),
      }));

      logger.info(`Custom criteria resolved ${recipients.length} recipients`, { criteria });
      return { recipients, total };
    } catch (error: any) {
      logger.error('Failed to resolve custom criteria recipients', { error: error.message, criteria });
      throw error;
    }
  }

  // Campaign Management
  static async createCampaign(campaign: SMSCampaign): Promise<number> {
    try {
      // Map values to match PostgreSQL check constraints (capitalized values)
      const dbPriority = SMSManagementService.capitalize(campaign.priority);
      const dbTargetType = SMSManagementService.mapTargetType(campaign.target_type);
      const dbStatus = SMSManagementService.mapStatus(campaign.status);

      const createResult = await executeQuery(`
        INSERT INTO sms_campaigns (
          campaign_name, description, template_id, message_content, target_type, target_criteria,
          status, scheduled_at, priority, send_rate_limit, retry_failed, max_retries, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING campaign_id
      `, [
        campaign.name,
        campaign.description || null,
        campaign.template_id || null,
        campaign.message_content,
        dbTargetType,
        JSON.stringify(campaign.target_criteria || {}),
        dbStatus,
        campaign.scheduled_at || null,
        dbPriority,
        campaign.send_rate_limit,
        campaign.retry_failed,
        campaign.max_retries,
        campaign.created_by || null
      ]);

      const result = Array.isArray(createResult) ? createResult[0] : createResult;
      logger.info('SMS campaign created: ' + campaign.name, { campaignId: result.campaign_id });
      return result.campaign_id;
    } catch (error: any) {
      logger.error('Failed to create SMS campaign', { error: error.message, campaign });
      throw error;
    }
  }

  static async getCampaigns(filters: {
    status?: string;
    target_type?: string;
    created_by?: number;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ campaigns: SMSCampaign[]; total: number; pagination: any }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.target_type) {
        whereClause += ` AND target_type = $${paramIndex}`;
        params.push(filters.target_type);
        paramIndex++;
      }

      if (filters.created_by) {
        whereClause += ` AND created_by = $${paramIndex}`;
        params.push(filters.created_by);
        paramIndex++;
      }

      if (filters.search) {
        whereClause += ` AND (campaign_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`;
        const searchTerm = '%' + filters.search + '%';
        params.push(searchTerm, searchTerm);
        paramIndex += 2;
      }

      // Get total count
      const countResultData = await executeQuery(`
        SELECT COUNT(*) as total FROM sms_campaigns ${whereClause}
      `, params);

      const countResult = Array.isArray(countResultData) ? countResultData : countResultData[0] || [];
      const total = countResult[0]?.total || 0;

      // Get campaigns
      const limitOffset = params.length + 1;
      const campaignsResultData = await executeQuery(`
        SELECT c.*, t.template_name as template_name
        FROM sms_campaigns c
        LEFT JOIN sms_templates t ON c.template_id = t.template_id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${limitOffset} OFFSET $${limitOffset + 1}
      `, [...params, limit, offset]);

      const campaigns = Array.isArray(campaignsResultData) ? campaignsResultData : campaignsResultData[0] || [];
      const processedCampaigns = campaigns.map((campaign: any) => ({
        ...campaign,
        id: campaign.campaign_id,
        name: campaign.campaign_name,
        target_criteria: typeof campaign.target_criteria === 'string' ? JSON.parse(campaign.target_criteria || '{}') : (campaign.target_criteria || {})
      }));

      return {
        campaigns: processedCampaigns,
        total,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      logger.error('Failed to get SMS campaigns', { error: error.message, filters });
      throw error;
    }
  }

  static async getCampaignById(id: number): Promise<SMSCampaign | null> {
    try {
      const campaignsResultData = await executeQuery(`
        SELECT c.*, t.template_name as template_name
        FROM sms_campaigns c
        LEFT JOIN sms_templates t ON c.template_id = t.template_id
        WHERE c.campaign_id = $1
      `, [id]);

      const campaigns = Array.isArray(campaignsResultData) ? campaignsResultData : campaignsResultData[0] || [];
      if (campaigns.length === 0) return null;

      const campaign = campaigns[0];
      return {
        ...campaign,
        id: campaign.campaign_id,
        name: campaign.campaign_name,
        target_criteria: typeof campaign.target_criteria === 'string' ? JSON.parse(campaign.target_criteria || '{}') : (campaign.target_criteria || {})
      };
    } catch (error: any) {
      logger.error('Failed to get SMS campaign by ID', { error: error.message, id });
      throw error;
    }
  }

  static async sendCampaign(campaignId: number): Promise<{ success: boolean; jobId?: string; totalRecipients?: number; message?: string }> {
    try {
      const campaign = await this.getCampaignById(campaignId);
      if (!campaign) {
        return { success: false, message: 'Campaign not found' };
      }

      if (campaign.status === 'sending' || campaign.status === 'sent') {
        return { success: false, message: `Cannot send campaign with status: ${campaign.status}` };
      }

      let recipientsData: { member_id: number; firstname: string; surname: string; cell_number: string; }[] = [];

      // Target resolution logic based on target_type
      const targetTypeLower = campaign.target_type.toLowerCase();

      if (targetTypeLower === 'good-standing' || targetTypeLower === 'good standing') {
        const criteria = campaign.target_criteria || {};
        const res = await this.resolveGoodStandingRecipients({
          province: criteria.province || undefined,
          limit: 9999999
        });
        recipientsData = res.recipients;
      } else if (targetTypeLower === 'custom') {
        // Custom criteria – dynamic filters from target_criteria JSON
        const res = await this.resolveCustomCriteriaRecipients(campaign.target_criteria || {});
        recipientsData = res.recipients;
      } else {
        // For 'all', 'province', 'district', etc.
        const conditions = [
          "membership_status_id = 1",
          "cell_number IS NOT NULL",
          "TRIM(cell_number) != ''",
          "REGEXP_REPLACE(cell_number, '[^0-9]', '', 'g') ~ '^[0-9]{9,12}$'",
        ];
        const params: any[] = [];
        let paramIndex = 1;

        if (targetTypeLower === 'province' && campaign.target_criteria?.province) {
          conditions.push(`province_name ILIKE $${paramIndex++}`);
          params.push(`%${campaign.target_criteria.province}%`);
        }

        const res = await executeQuery(`
                  SELECT member_id, firstname, surname, cell_number 
                  FROM members_consolidated 
                  WHERE ${conditions.join(' AND ')}
              `, params);

        const rows = Array.isArray(res) ? res : res[0] || [];
        recipientsData = rows.map((r: any) => ({
          ...r,
          cell_number: this.formatPhoneNumber(r.cell_number)
        }));
      }

      if (!recipientsData || recipientsData.length === 0) {
        await executeQuery(`UPDATE sms_campaigns SET status = 'Failed' WHERE campaign_id = $1`, [campaignId]);
        return { success: false, message: 'No valid recipients found matching the campaign targeting criteria' };
      }

      // Build bulk payload
      const bulkRecipients: BulkSMSRecipient[] = [];
      for (const r of recipientsData) {
        // Render template for each user (to support personalization like {{firstname}})
        const personalizedMsg = await this.processMessageVariables(campaign.message_content, {
          firstname: r.firstname || '',
          surname: r.surname || '',
          name: r.firstname || '',
        });

        bulkRecipients.push({
          msisdn: r.cell_number,
          message: personalizedMsg,
          member_id: r.member_id,
          name: `${r.firstname || ''} ${r.surname || ''}`.trim()
        });
      }

      const params: BulkSMSBatchParams = {
        source_type: 'campaign',
        campaign_id: campaignId,
        recipients: bulkRecipients
      };

      const jobId = await SMSBulkService.dispatchBulkJob(params);
      return { success: true, jobId, totalRecipients: bulkRecipients.length, message: 'Campaign sending started successfully' };

    } catch (error: any) {
      logger.error('Failed to send campaign', { error: error.message, campaignId });
      await executeQuery(`UPDATE sms_campaigns SET status = 'Failed' WHERE campaign_id = $1`, [campaignId]);
      return { success: false, message: `Failed to begin dispatching campaign: ${error.message}` };
    }
  }

  static async deleteCampaign(campaignId: number): Promise<boolean> {
    try {
      const campaign = await this.getCampaignById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      if (campaign.status === 'sending') {
        throw new Error('Cannot delete a campaign that is currently sending');
      }
      const result = await executeQuery(
        `DELETE FROM sms_campaigns WHERE campaign_id = $1`,
        [campaignId]
      );
      return true;
    } catch (error: any) {
      logger.error('Failed to delete SMS campaign', { error: error.message, campaignId });
      throw error;
    }
  }

  // Message Processing
  static async processMessageVariables(content: string, variables: any): Promise<string> {
    return renderTemplateString(content, variables || {}, { keepUnmatched: true });
  }

  static async calculateSMSParts(content: string): Promise<number> {
    // Basic SMS part calculation (160 chars for GSM, 70 for Unicode)
    const hasUnicode = /[^\x00-\x7F]/.test(content);
    const maxLength = hasUnicode ? 70 : 160;
    return Math.ceil(content.length / maxLength);
  }

  static async getCampaignStatistics(campaignId: number): Promise<any> {
    try {
      const statsResultData = await executeQuery(`
        SELECT
          COUNT(*) as total_messages,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(cost_per_message) as total_cost,
          NULL as avg_sms_parts
        FROM sms_messages
        WHERE campaign_id = $1
      `, [campaignId]);

      const stats = Array.isArray(statsResultData) ? statsResultData : statsResultData[0] || [];
      return stats[0] || {
        total_messages: 0,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        pending_count: 0,
        total_cost: 0,
        avg_sms_parts: 0
      };
    } catch (error: any) {
      logger.error('Failed to get campaign statistics', { error: error.message, campaignId });
      throw error;
    }
  }

  static async getDashboardStats(): Promise<any> {
    try {
      // Get overall SMS statistics
      const totalMessagesResult = await executeQuery(`
        SELECT COUNT(*) as count FROM sms_messages
      `);
      const totalMessages = Array.isArray(totalMessagesResult) ? totalMessagesResult[0]?.count || 0 : 0;

      const sentTodayResult = await executeQuery(`
        SELECT COUNT(*) as count FROM sms_messages
        WHERE created_at::date = CURRENT_DATE AND status = 'sent'
      `);
      const sentToday = Array.isArray(sentTodayResult) ? sentTodayResult[0]?.count || 0 : 0;

      const activeCampaignsResult = await executeQuery(`
        SELECT COUNT(*) as count FROM sms_campaigns
        WHERE status IN ('scheduled', 'sending')
      `);
      const activeCampaigns = Array.isArray(activeCampaignsResult) ? activeCampaignsResult[0]?.count || 0 : 0;

      const totalCostResult = await executeQuery(`
        SELECT SUM(cost_per_message) as total FROM sms_messages
      `);
      const totalCost = Array.isArray(totalCostResult) ? totalCostResult[0]?.total || 0 : 0;

      return {
        totalMessages,
        sentToday,
        activeCampaigns,
        totalCost,
        deliveryRate: totalMessages > 0 ? 0.95 : 0 // Mock delivery rate
      };
    } catch (error: any) {
      logger.error('Failed to get dashboard stats', { error: error.message });
      return {
        totalMessages: 0,
        sentToday: 0,
        activeCampaigns: 0,
        totalCost: 0,
        deliveryRate: 0
      };
    }
  }

  // Mock SMS sending for development
  static async sendSMSMessage(message: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Mock SMS sending - in production, integrate with real SMS provider
      const messageId = 'mock_${Date.now()}_' + Math.random().toString(36).substr(2, 9) + '';

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock success/failure (90% success rate)
      const success = Math.random() > 0.1;

      if (success) {
        logger.info(`Mock SMS sent successfully`, {
          phone: message.recipient_phone,
          messageId,
          content: message.message_content.substring(0, 50) + '...'
        });

        return { success: true, messageId };
      } else {
        const error = 'Mock SMS delivery failed';
        logger.error(`Mock SMS failed`, {
          phone: message.recipient_phone,
          error,
          content: message.message_content.substring(0, 50) + '...'
        });

        return { success: false, error };
      }
    } catch (error: any) {
      logger.error('Failed to send SMS message', { error: error.message, message });
      return { success: false, error: error.message };
    }
  }
  // ─── Phone normalisation helpers ─────────────────────────────────────────

  /** SA phone regex — accepts +27 / 27 / 0 prefix followed by 9 digits */
  private static readonly SA_PHONE_RE = /^(\+27|27|0)[0-9]{9}$/;

  /** Strip whitespace/dashes/brackets then validate and normalise to 27XXXXXXXXX */
  static normalisePhone(raw: string): { normalized: string | null; error: string | null } {
    const cleaned = String(raw ?? '').replace(/[\s\-\(\)]/g, '').trim();
    if (!cleaned) return { normalized: null, error: 'Empty phone number' };
    if (!this.SA_PHONE_RE.test(cleaned)) {
      return { normalized: null, error: `Invalid phone format: "${cleaned}"` };
    }
    let normalized = cleaned;
    if (normalized.startsWith('+27')) normalized = normalized.slice(1);   // +27… → 27…
    else if (normalized.startsWith('0')) normalized = '27' + normalized.slice(1); // 0… → 27…
    return { normalized, error: null };
  }

  // ─── Contact List Upload ──────────────────────────────────────────────────

  /**
   * Parse an uploaded CSV/XLSX contact-list file, validate every row, bulk-insert
   * valid contacts into sms_contact_list_members (linked to a new sms_contact_lists
   * record), and return an ImportResult summary.
   *
   * Expected columns (case-insensitive):
   *   • "cell number" | "phone" | "phone_number" | "cell"  → phone_number  (required)
   *   • "name" | "recipient_name"                           → name          (optional)
   *   • "province" | "region" | "municipality" | "ward" | "voting station" → metadata (optional)
   */
  static async processContactListUpload(
    filePath: string,
    userId: number,
    listMetadata: { name: string; description?: string; allow_duplicates?: boolean }
  ): Promise<ImportResult> {
    const importId = `CLIST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const result: ImportResult = {
      total_records: 0,
      successful_imports: 0,
      failed_imports: 0,
      errors: [],
      import_id: importId,
    };

    // ── 1. Parse file ──────────────────────────────────────────────────────
    const ext = path.extname(filePath).toLowerCase();
    let rows: any[] = [];
    try {
      if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (err: any) {
      throw new Error(`Failed to parse contact list file: ${err.message}`);
    }

    result.total_records = rows.length;
    if (rows.length === 0) {
      throw new Error('The uploaded file contains no data rows.');
    }

    // ── 2. Normalise column headers (case-insensitive fuzzy match) ─────────
    const findCol = (row: Record<string, any>, candidates: string[]): string | undefined =>
      Object.keys(row).find(k => candidates.includes(k.toLowerCase().trim()));

    // ── 3. Validate rows ───────────────────────────────────────────────────
    interface ValidRow {
      phone_number: string;
      name: string | null;
      metadata: Record<string, string>;
    }
    const validRows: ValidRow[] = [];
    const seenPhones = new Set<string>();

    rows.forEach((row: any, idx: number) => {
      const rowNum = idx + 2; // 1-indexed, header is row 1

      // -- phone (required) --
      const phoneCol = findCol(row, ['cell number', 'cell_number', 'phone_number', 'phone', 'cell', 'mobile', 'contact number', 'contact_number']);
      const rawPhone = phoneCol ? String(row[phoneCol]) : '';
      const { normalized, error: phoneError } = this.normalisePhone(rawPhone);

      if (phoneError || !normalized) {
        result.failed_imports++;
        result.errors.push({
          row: rowNum,
          field: 'cell number',
          value: rawPhone,
          error: phoneError || 'Invalid phone number',
        } as ImportError);
        return;
      }

      // -- duplicate check (within this upload) --
      if (!listMetadata.allow_duplicates && seenPhones.has(normalized)) {
        result.failed_imports++;
        result.errors.push({
          row: rowNum,
          field: 'cell number',
          value: rawPhone,
          error: `Duplicate phone number: ${normalized}`,
        } as ImportError);
        return;
      }
      seenPhones.add(normalized);

      // -- name (optional) --
      const nameCol = findCol(row, ['name', 'recipient_name', 'full_name', 'fullname', 'full name']);
      const name = nameCol ? String(row[nameCol]).trim() || null : null;

      // -- metadata columns (optional) --
      const metaCols: Record<string, string[]> = {
        province:        ['province'],
        region:          ['region'],
        municipality:    ['municipality'],
        ward:            ['ward'],
        voting_station:  ['voting station', 'voting_station', 'votingstation'],
      };
      const metadata: Record<string, string> = {};
      for (const [key, candidates] of Object.entries(metaCols)) {
        const col = findCol(row, candidates);
        if (col && String(row[col]).trim()) metadata[key] = String(row[col]).trim();
      }

      validRows.push({ phone_number: normalized, name, metadata });
    });

    if (validRows.length === 0) {
      // All rows failed — nothing to insert, return with errors only
      return result;
    }

    // ── 4. Database operations (transaction) ──────────────────────────────
    const client = await getConnection();
    try {
      await client.query('BEGIN');

      // 4a. Create the contact list record
      const listInsert = await client.query(
        `INSERT INTO sms_contact_lists (name, description, allow_duplicates, created_by, total_contacts, active_contacts)
         VALUES ($1, $2, $3, $4, 0, 0)
         RETURNING id`,
        [
          listMetadata.name,
          listMetadata.description || null,
          listMetadata.allow_duplicates ?? false,
          userId,
        ]
      );
      const listId: number = listInsert.rows[0].id;

      // 4b. Bulk insert members (chunked to avoid huge parameter lists)
      const CHUNK = 500;
      let inserted = 0;
      for (let i = 0; i < validRows.length; i += CHUNK) {
        const chunk = validRows.slice(i, i + CHUNK);
        const valuePlaceholders: string[] = [];
        const params: any[] = [];
        let p = 1;

        chunk.forEach(r => {
          valuePlaceholders.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
          params.push(listId, r.phone_number, r.name, Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : null);
        });

        const insertSQL = `
          INSERT INTO sms_contact_list_members (list_id, phone_number, name, metadata)
          VALUES ${valuePlaceholders.join(', ')}
          ON CONFLICT (list_id, phone_number) DO NOTHING
        `;
        const insertResult = await client.query(insertSQL, params);
        inserted += insertResult.rowCount ?? chunk.length;
      }

      // 4c. Update counters on the list record
      await client.query(
        `UPDATE sms_contact_lists
         SET total_contacts = $1, active_contacts = $1, updated_at = NOW()
         WHERE id = $2`,
        [inserted, listId]
      );

      await client.query('COMMIT');

      result.successful_imports = inserted;
      // Rows that passed validation but were skipped by ON CONFLICT count as failed
      const skipped = validRows.length - inserted;
      result.failed_imports += skipped;
      if (skipped > 0) {
        result.errors.push({
          row: -1,
          field: 'cell number',
          value: '',
          error: `${skipped} duplicate phone number(s) already existed in the list and were skipped.`,
        } as ImportError);
      }
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error('Contact list upload transaction failed', { error: err.message });
      throw new Error(`Database error while saving contact list: ${err.message}`);
    } finally {
      client.release();
    }

    return result;
  }

  // ─── Contact List Management ──────────────────────────────────────────────

  static async getContactLists(filters: { is_active?: boolean; created_by?: number } = {}): Promise<any[]> {
    let query = `
      SELECT id, name, description, total_contacts, active_contacts, is_active, allow_duplicates, created_by, created_at
      FROM sms_contact_lists
      WHERE 1=1
    `;
    const params: any[] = [];
    let p = 1;
    if (filters.is_active !== undefined) { query += ` AND is_active = $${p++}`; params.push(filters.is_active); }
    if (filters.created_by !== undefined) { query += ` AND created_by = $${p++}`; params.push(filters.created_by); }
    query += ' ORDER BY created_at DESC';
    const rows = await executeQuery(query, params);
    return Array.isArray(rows) ? rows : [];
  }
}

export default SMSManagementService;
