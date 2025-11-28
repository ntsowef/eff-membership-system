import { executeQuery, executeQuerySingle } from '../config/database';
import { DatabaseError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import axios from 'axios';
import { config } from '../config/config';

// SMS Provider interfaces
export interface LegacySMSMessage {
  to: string;
  message: string;
  from?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

export interface SMSProvider {
  name: string;
  sendSMS(message: LegacySMSMessage): Promise<SMSResponse>;
  healthCheck?(): Promise<{ healthy: boolean; message: string; latency?: number }>;
}

// JSON Applink SMS Provider - Production-ready implementation
class JSONApplinkProvider implements SMSProvider {
  name = 'JSON Applink';
  private apiUrl: string;
  private apiKey: string;
  private username?: string;
  private password?: string;
  private fromNumber?: string;
  private rateLimitPerMinute: number;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;

  constructor(config: {
    apiUrl: string;
    apiKey: string;
    username?: string;
    password?: string;
    fromNumber?: string;
    rateLimitPerMinute?: number;
  }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    this.fromNumber = config.fromNumber;
    this.rateLimitPerMinute = config.rateLimitPerMinute || 100;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter if more than a minute has passed
    if (now - this.lastRequestTime > oneMinute) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    // Check if we've exceeded the rate limit
    if (this.requestCount >= this.rateLimitPerMinute) {
      const waitTime = oneMinute - (now - this.lastRequestTime);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    this.requestCount++;
  }

  async sendSMS(message: LegacySMSMessage): Promise<SMSResponse> {
    try {
      // Apply rate limiting
      await this.checkRateLimit();

      // Prepare request headers
      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EFF-Membership-System/1.0'
      };

      // Add authentication (flexible approach)
      if (this.username && this.password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
      } else if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Prepare request payload (flexible format to accommodate different API structures)
      const payload = {
        // Primary SMS fields
        to: message.to,
        from: message.from || this.fromNumber,
        message: message.message,
        text: message.message, // Alternative field name
        body: message.message, // Alternative field name

        // Authentication fields (some APIs require these in payload)
        api_key: this.apiKey,
        username: this.username,
        password: this.password,

        // Message options
        message_type: 'text',
        encoding: 'UTF-8',
        priority: 'normal',

        // Delivery options
        delivery_report: true,
        callback_url: process.env.SMS_CALLBACK_URL || '',

        // Metadata
        reference: `eff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),

        // Additional fields that might be required by specific providers
        sender_id: this.fromNumber,
        recipient: message.to,
        content: message.message,
        type: 'sms'
      };

      logger.info('Sending SMS via JSON Applink', {
        provider: this.name,
        to: message.to,
        messageLength: message.message.length,
        apiUrl: this.apiUrl
      });

      // Send SMS request with comprehensive error handling
      const response = await axios.post(this.apiUrl, payload, {
        headers,
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      // Handle successful response
      if (response.status >= 200 && response.status < 300) {
        const messageId = this.extractMessageId(response.data);

        logger.info('SMS sent successfully via JSON Applink', {
          provider: this.name,
          to: message.to,
          messageId,
          status: response.status,
          responseData: response.data
        });

        return {
          success: true,
          messageId,
          provider: this.name
        };
      }

      // Handle error response
      const errorMessage = this.extractErrorMessage(response.data) || `HTTP ${response.status}: ${response.statusText}`;

      logger.error('SMS failed via JSON Applink', {
        provider: this.name,
        to: message.to,
        status: response.status,
        error: errorMessage,
        responseData: response.data
      });

      return {
        success: false,
        error: errorMessage,
        provider: this.name
      };

    } catch (error: any) {
      logger.error('JSON Applink SMS error', {
        provider: this.name,
        to: message.to,
        error: error.message,
        code: error.code,
        stack: error.stack
      });

      // Handle specific error types
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'SMS service unavailable - connection refused',
          provider: this.name
        };
      }

      if (error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'SMS service timeout - request took too long',
          provider: this.name
        };
      }

      if (error.response && error.response.status === 401) {
        return {
          success: false,
          error: 'SMS service authentication failed - check API credentials',
          provider: this.name
        };
      }

      if (error.response && error.response.status === 403) {
        return {
          success: false,
          error: 'SMS service access forbidden - insufficient permissions',
          provider: this.name
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown SMS sending error',
        provider: this.name
      };
    }
  }

  private extractMessageId(responseData: any): string {
    // Try common field names for message ID
    const possibleFields = [
      'message_id', 'messageId', 'id', 'reference', 'ref',
      'transaction_id', 'transactionId', 'sms_id', 'smsId',
      'batch_id', 'batchId', 'uuid', 'guid', 'tracking_id'
    ];

    for (const field of possibleFields) {
      if (responseData && responseData[field]) {
        return String(responseData[field]);
      }
    }

    // Try nested objects
    if (responseData && responseData.data) {
      for (const field of possibleFields) {
        if (responseData.data[field]) {
          return String(responseData.data[field]);
        }
      }
    }

    // Try array responses
    if (responseData && Array.isArray(responseData) && responseData.length > 0) {
      for (const field of possibleFields) {
        if (responseData[0][field]) {
          return String(responseData[0][field]);
        }
      }
    }

    // Fallback to generated ID
    return `applink_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractErrorMessage(responseData: any): string {
    // Try common field names for error messages
    const possibleFields = [
      'error', 'message', 'error_message', 'errorMessage',
      'description', 'detail', 'details', 'reason',
      'status_message', 'statusMessage', 'response_message'
    ];

    for (const field of possibleFields) {
      if (responseData && responseData[field]) {
        return String(responseData[field]);
      }
    }

    // Try nested objects
    if (responseData && responseData.error) {
      for (const field of possibleFields) {
        if (responseData.error[field]) {
          return String(responseData.error[field]);
        }
      }
    }

    // Try array responses
    if (responseData && Array.isArray(responseData) && responseData.length > 0) {
      for (const field of possibleFields) {
        if (responseData[0][field]) {
          return String(responseData[0][field]);
        }
      }
    }

    return '';
  }

  // Health check method for monitoring
  async healthCheck(): Promise<{ healthy: boolean; message: string; latency?: number }> {
    try {
      const startTime = Date.now();

      // Try to make a simple request to check connectivity
      const healthUrl = this.apiUrl.replace('/send', '/status').replace('/sms', '/status');

      const response = await axios.get(healthUrl, {
        headers: {
          'X-API-Key': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000,
        validateStatus: () => true // Don't throw on any status
      });

      const latency = Date.now() - startTime;

      if (response.status < 500) {
        return {
          healthy: true,
          message: 'JSON Applink SMS service is healthy',
          latency
        };
      }

      return {
        healthy: false,
        message: `JSON Applink SMS service returned ${response.status}`,
        latency
      };

    } catch (error: any) {
      return {
        healthy: false,
        message: `JSON Applink SMS service health check failed: ${error.message}`
      };
    }
  }
}

// Mock SMS Provider for development
class MockSMSProvider implements SMSProvider {
  name = 'Mock SMS Provider';

  async sendSMS(message: LegacySMSMessage): Promise<SMSResponse> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock success/failure (90% success rate)
    const success = Math.random() > 0.1;
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (success) {
      logger.info(`Mock SMS sent successfully`, {
        phone: message.to,
        messageId,
        content: message.message.substring(0, 50) + '...'
      });

      return { success: true, messageId, provider: this.name };
    } else {
      const error = 'Mock SMS delivery failed';
      logger.error(`Mock SMS failed`, {
        phone: message.to,
        error,
        content: message.message.substring(0, 50) + '...'
      });

      return { success: false, error, provider: this.name };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string; latency?: number }> {
    return {
      healthy: true,
      message: 'Mock SMS provider is always healthy',
      latency: 50
    };
  }
}

export class SMSService {
  private static provider: SMSProvider;

  // Initialize SMS provider based on configuration
  static initializeProvider(): SMSProvider {
    const smsConfig = config.sms || {};

    switch (smsConfig.provider?.toLowerCase()) {
      case 'json-applink':
      case 'jsonapplink':
        if (!smsConfig.jsonApplink?.apiUrl || !smsConfig.jsonApplink?.apiKey) {
          logger.warn('JSON Applink SMS configuration incomplete, falling back to mock provider');
          return new MockSMSProvider();
        }
        return new JSONApplinkProvider({
          apiUrl: smsConfig.jsonApplink.apiUrl,
          apiKey: smsConfig.jsonApplink.apiKey,
          username: smsConfig.jsonApplink.username,
          password: smsConfig.jsonApplink.password,
          fromNumber: smsConfig.jsonApplink.fromNumber,
          rateLimitPerMinute: smsConfig.jsonApplink.rateLimitPerMinute
        });

      case 'mock':
      default:
        return new MockSMSProvider();
    }
  }

  // Get current provider
  static getProvider(): SMSProvider {
    if (!this.provider) {
      this.provider = this.initializeProvider();
    }
    return this.provider;
  }

  // Send SMS using current provider
  static async sendSMS(to: string, message: string, from?: string): Promise<SMSResponse> {
    const provider = this.getProvider();
    return provider.sendSMS({ to, message, from });
  }

  // Get provider health status
  static async getProviderHealth(): Promise<{ healthy: boolean; message: string; latency?: number }> {
    const provider = this.getProvider();
    if (provider.healthCheck) {
      return provider.healthCheck();
    }
    return { healthy: true, message: 'Health check not supported by provider' };
  }

  // Get provider name
  static getProviderName(): string {
    return this.getProvider().name;
  }

  // SMS templates for different notification types
  private static SMS_TEMPLATES = {
    '30_day_reminder': {
      template: 'Hi {firstName}, your membership expires in {daysUntilExpiration} days on {expiryDate}. Please renew to continue enjoying our services. Reply STOP to opt out.',
      max_length: 160
    },
    '7_day_urgent': {
      template: 'URGENT: Hi {firstName}, your membership expires in {daysUntilExpiration} days! Renew now to avoid service interruption. Contact us immediately. Reply STOP to opt out.',
      max_length: 160
    },
    'expired_today': {
      template: 'Hi {firstName}, your membership expired today. Please renew immediately to restore access to all services. Contact our support team. Reply STOP to opt out.',
      max_length: 160
    },
    '7_day_grace': {
      template: 'Hi {firstName}, your membership expired {daysSinceExpiration} days ago. Grace period ending soon! Renew now to avoid permanent suspension. Reply STOP to opt out.',
      max_length: 160
    }
  };

  // Send expiration notifications
  static async sendExpirationNotifications(options: {
    notification_type: string;
    member_ids?: string[];
    custom_message?: string;
    send_immediately?: boolean;
  }): Promise<{
    successful_sends: number;
    failed_sends: number;
    notification_details: any[];
    total_cost: number;
  }> {
    try {
      const { notification_type, member_ids, custom_message, send_immediately = false } = options;

      // Get target members based on notification type and member_ids
      const targetMembers = await this.getTargetMembers(notification_type, member_ids);
      
      if (targetMembers.length === 0) {
        return {
          successful_sends: 0,
          failed_sends: 0,
          notification_details: [],
          total_cost: 0
        };
      }

      // Get SMS template
      const template = custom_message || this.SMS_TEMPLATES[notification_type as keyof typeof this.SMS_TEMPLATES]?.template;
      
      if (!template) {
        throw new Error(`Invalid notification type: ${notification_type}`);
      }

      // Process SMS sending for each member
      const notificationDetails: any[] = [];
      let successfulSends = 0;
      let failedSends = 0;

      for (const member of targetMembers) {
        try {
          // Personalize message
          const personalizedMessage = this.personalizeMessage(template, member);
          
          // Simulate SMS sending (in real implementation, integrate with SMS provider)
          const smsResult = await this.sendSMSInternal(member.phone_number, personalizedMessage, send_immediately);
          
          notificationDetails.push({
            member_id: member.member_id,
            member_name: `${member.first_name} ${member.last_name}`,
            phone_number: member.phone_number,
            message: personalizedMessage,
            status: smsResult.status,
            sent_at: smsResult.sent_at,
            cost: smsResult.cost,
            message_id: smsResult.message_id
          });

          if (smsResult.status === 'sent') {
            successfulSends++;
          } else {
            failedSends++;
          }
        } catch (error) {
          failedSends++;
          notificationDetails.push({
            member_id: member.member_id,
            member_name: `${member.first_name} ${member.last_name}`,
            phone_number: member.phone_number,
            message: template,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            sent_at: new Date().toISOString(),
            cost: 0
          });
        }
      }

      // Calculate total cost
      const totalCost = notificationDetails.reduce((sum, detail) => sum + (detail.cost || 0), 0);

      // Log SMS campaign
      await this.logSMSCampaign({
        notification_type,
        total_recipients: targetMembers.length,
        successful_sends: successfulSends,
        failed_sends: failedSends,
        total_cost: totalCost,
        template_used: template
      });

      return {
        successful_sends: successfulSends,
        failed_sends: failedSends,
        notification_details: notificationDetails,
        total_cost: totalCost
      };
    } catch (error) {
      throw new DatabaseError('Failed to send expiration notifications', error);
    }
  }

  // Get target members for notifications
  private static async getTargetMembers(notification_type: string, member_ids?: string[]): Promise<any[]> {
    let whereClause = '';
    let params: any[] = [];

    // Build WHERE clause based on notification type
    switch (notification_type) {
      case '30_day_reminder':
        whereClause = 'WHERE membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
        break;
      case '7_day_urgent':
        whereClause = 'WHERE membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
        break;
      case 'expired_today':
        whereClause = 'WHERE DATE(membership_expiry_date) = CURDATE()';
        break;
      case '7_day_grace':
        whereClause = 'WHERE membership_expiry_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE()';
        break;
      default:
        throw new Error(`Invalid notification type: ${notification_type}`);
    }

    // Add member_ids filter if provided
    if (member_ids && member_ids.length > 0) {
      const placeholders = member_ids.map(() => '?').join(',');
      whereClause += ` AND member_id IN (${placeholders})`;
      params = member_ids;
    }

    const query = `
      SELECT 
        member_id,
        first_name,
        last_name,
        email,
        phone_number,
        membership_expiry_date,
        CASE 
          WHEN membership_expiry_date < CURDATE() THEN ABS(DATEDIFF(CURDATE(), membership_expiry_date))
          ELSE DATEDIFF(membership_expiry_date, CURDATE())
        END as days_until_expiration
      FROM vw_member_details 
      ${whereClause}
      AND phone_number IS NOT NULL 
      AND phone_number != ''
      ORDER BY membership_expiry_date ASC
      LIMIT 1000
    `;

    return await executeQuery(query, params);
  }

  // Personalize SMS message with member data
  private static personalizeMessage(template: string, member: any): string {
    let personalizedMessage = template;
    
    // Replace placeholders with actual member data
    personalizedMessage = personalizedMessage.replace(/{firstName}/g, member.first_name || 'Member');
    personalizedMessage = personalizedMessage.replace(/{lastName}/g, member.last_name || '');
    personalizedMessage = personalizedMessage.replace(/{daysUntilExpiration}/g, member.days_until_expiration?.toString() || '0');
    personalizedMessage = personalizedMessage.replace(/{daysSinceExpiration}/g, member.days_until_expiration?.toString() || '0');
    
    // Format expiry date
    if (member.membership_expiry_date) {
      const expiryDate = new Date(member.membership_expiry_date);
      const formattedDate = expiryDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      personalizedMessage = personalizedMessage.replace(/{expiryDate}/g, formattedDate);
    }

    return personalizedMessage;
  }

  // Send individual SMS using the provider (internal method)
  private static async sendSMSInternal(phoneNumber: string, message: string, sendImmediately: boolean): Promise<{
    status: string;
    sent_at: string;
    cost: number;
    message_id: string;
  }> {
    try {
      // Use the SMS provider to send the message
      const result = await SMSService.sendSMS(phoneNumber, message);

      if (result.success) {
        return {
          status: 'sent',
          sent_at: new Date().toISOString(),
          cost: 0.05, // Mock cost per SMS - should be calculated based on provider
          message_id: result.messageId || `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      } else {
        throw new Error(result.error || 'SMS delivery failed');
      }
    } catch (error: any) {
      throw new Error(`SMS delivery failed: ${error.message}`);
    }
  }

  // Log SMS campaign for tracking
  private static async logSMSCampaign(campaignData: {
    notification_type: string;
    total_recipients: number;
    successful_sends: number;
    failed_sends: number;
    total_cost: number;
    template_used: string;
  }): Promise<void> {
    try {
      // In a real implementation, this would insert into an SMS campaigns table
      console.log('SMS Campaign Logged:', {
        ...campaignData,
        campaign_date: new Date().toISOString(),
        success_rate: ((campaignData.successful_sends / campaignData.total_recipients) * 100).toFixed(2) + '%'
      });
    } catch (error) {
      console.error('Failed to log SMS campaign:', error);
      // Don't throw error here as it's not critical to the main SMS sending process
    }
  }

  // Get SMS delivery status
  static async getSMSDeliveryStatus(messageId: string): Promise<{
    message_id: string;
    status: string;
    delivered_at?: string;
    error_message?: string;
  }> {
    // Mock implementation - in real app, query SMS provider's API
    return {
      message_id: messageId,
      status: 'delivered',
      delivered_at: new Date().toISOString()
    };
  }

  // Get SMS campaign statistics
  static async getSMSCampaignStats(period: string = 'last_30_days'): Promise<{
    total_campaigns: number;
    total_messages_sent: number;
    total_cost: number;
    average_success_rate: string;
    campaigns_by_type: any[];
  }> {
    // Mock implementation - in real app, query SMS campaigns table
    return {
      total_campaigns: 15,
      total_messages_sent: 2450,
      total_cost: 122.50,
      average_success_rate: '94.2%',
      campaigns_by_type: [
        { type: '30_day_reminder', count: 8, messages: 1200 },
        { type: '7_day_urgent', count: 4, messages: 800 },
        { type: 'expired_today', count: 2, messages: 300 },
        { type: '7_day_grace', count: 1, messages: 150 }
      ]
    };
  }

  // Validate phone number format
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation - adjust regex based on your requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }

  // Get SMS template by type
  static getSMSTemplate(notificationType: string): string | null {
    return this.SMS_TEMPLATES[notificationType as keyof typeof this.SMS_TEMPLATES]?.template || null;
  }

  // Update SMS template
  static updateSMSTemplate(notificationType: string, newTemplate: string): boolean {
    if (this.SMS_TEMPLATES[notificationType as keyof typeof this.SMS_TEMPLATES]) {
      // In real implementation, this would update the database
      console.log(`SMS template updated for ${notificationType}:`, newTemplate);
      return true;
    }
    return false;
  }
}
