import { executeQuery, executeQuerySingle } from '../config/database';
import { SMSDeliveryTrackingService } from './smsDeliveryTrackingService';
import { SMSLogService } from './smsLogService';
import { SMSMORenewalService } from './smsMORenewalService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// =====================================================================================
// Types & Interfaces
// =====================================================================================

export type CallbackDeliveryStatus = 'delivered' | 'failed' | 'expired' | 'rejected' | 'pending' | 'sent' | 'queued' | 'unknown';

export interface CallbackRecord {
  callback_id?: number;
  received_at?: Date;
  processed_at?: Date;
  message_id: string | null;
  provider_message_id: string | null;
  campaign_id?: number | null;
  provider_name: string;
  provider_type?: string;
  delivery_status: CallbackDeliveryStatus;
  raw_status?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  failure_reason?: string | null;
  request_headers?: Record<string, any>;
  request_body?: Record<string, any>;
  request_ip?: string;
  request_method?: string;
  response_status?: number;
  processed_successfully?: boolean;
  processing_error?: string | null;
  processing_attempts?: number;
  cost?: number | null;
  currency?: string;
  signature_valid?: boolean | null;
  signature_header?: string | null;
  delivery_timestamp?: Date | null;
}

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
  signatureValid?: boolean;
  ipWhitelisted?: boolean;
}

export interface ProviderCallbackConfig {
  name: string;
  signatureHeader?: string;
  signatureSecret?: string;
  signatureAlgorithm?: string;
  whitelistedIPs?: string[];
  statusFieldMappings: Record<string, string[]>;
  messageIdFields: string[];
  providerMessageIdFields: string[];
  errorCodeFields: string[];
  errorMessageFields: string[];
  costFields: string[];
  timestampFields: string[];
}

export interface ProcessCallbackResult {
  success: boolean;
  callbackId: number;
  messageId: string | null;
  deliveryStatus: CallbackDeliveryStatus;
  error?: string;
}

// =====================================================================================
// Provider Configurations
// =====================================================================================

const PROVIDER_CONFIGS: Record<string, ProviderCallbackConfig> = {
  'json-applink': {
    name: 'JSON Applink',
    signatureHeader: 'x-applink-signature',
    signatureSecret: process.env.JSON_APPLINK_WEBHOOK_SECRET || '',
    signatureAlgorithm: 'sha256',
    whitelistedIPs: (process.env.JSON_APPLINK_WEBHOOK_IPS || '').split(',').filter(Boolean),
    statusFieldMappings: {
      delivered: ['delivered', 'DELIVRD', 'delivery_success', 'dlr_success', '1', 'stat:DELIVRD'],
      failed: ['failed', 'UNDELIV', 'UNDELVR', 'delivery_failed', 'dlr_failed', '5', 'stat:UNDELVR'],
      expired: ['expired', 'EXPIRED', 'timeout', '3', 'stat:EXPIRED'],
      rejected: ['rejected', 'REJECTD', 'BLACKLISTED', 'blocked', '6', 'stat:BLACKLISTED'],
      sent: ['sent', 'submitted', 'accepted', 'ACCEPTD', '0'],
      pending: ['pending', 'buffered', 'ENROUTE', '2'],
      queued: ['queued', 'scheduled'],
    },
    messageIdFields: ['reference', 'message_id', 'messageId', 'id', 'clientRef', 'correlator'],
    providerMessageIdFields: ['tracking_id', 'external_id', 'provider_message_id', 'apiMsgId', 'msgId'],
    errorCodeFields: ['error_code', 'errorCode', 'failure_code', 'statusCode'],
    errorMessageFields: ['error_message', 'errorMessage', 'failure_reason', 'statusDescription'],
    costFields: ['cost', 'price', 'charge', 'creditCost'],
    timestampFields: ['delivered_at', 'timestamp', 'doneDate', 'deliveryTime'],
  },
};

const DEFAULT_PROVIDER_CONFIG: ProviderCallbackConfig = {
  name: 'Unknown',
  whitelistedIPs: [],
  statusFieldMappings: {
    delivered: ['delivered', 'success', 'completed'],
    failed: ['failed', 'error', 'undelivered'],
    expired: ['expired', 'timeout'],
    rejected: ['rejected', 'blocked'],
    sent: ['sent', 'submitted', 'accepted'],
    pending: ['pending', 'processing'],
    queued: ['queued', 'buffered', 'scheduled'],
  },
  messageIdFields: ['message_id', 'messageId', 'id', 'reference', 'ref'],
  providerMessageIdFields: ['provider_message_id', 'providerMessageId', 'external_id', 'tracking_id'],
  errorCodeFields: ['error_code', 'errorCode', 'failure_code'],
  errorMessageFields: ['error_message', 'errorMessage', 'failure_reason', 'error_description'],
  costFields: ['cost', 'price', 'charge'],
  timestampFields: ['delivered_at', 'timestamp', 'delivery_time'],
};

const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

// =====================================================================================
// SMS Callback Service
// =====================================================================================

export class SMSCallbackService {

  static getProviderConfig(providerName: string): ProviderCallbackConfig {
    const normalized = providerName.toLowerCase().replace(/\s+/g, '-');
    return PROVIDER_CONFIGS[normalized] || { ...DEFAULT_PROVIDER_CONFIG, name: providerName };
  }

  static getSupportedProviders(): string[] {
    return Object.keys(PROVIDER_CONFIGS);
  }

  // ==================================================================================
  // 1. WEBHOOK VALIDATION
  // ==================================================================================

  static validateWebhookRequest(
    providerName: string,
    requestIP: string,
    headers: Record<string, any>,
    rawBody: string | Buffer
  ): WebhookValidationResult {
    const config = this.getProviderConfig(providerName);

    // Rate limiting
    if (!this.checkRateLimit(requestIP)) {
      return { valid: false, reason: 'Rate limit exceeded', ipWhitelisted: false, signatureValid: false };
    }

    // IP whitelisting
    const ipWhitelisted = this.checkIPWhitelist(requestIP, config);

    // Signature verification
    const signatureValid = this.verifySignature(headers, rawBody, config);

    // If provider has whitelisted IPs and request is not from one, warn but allow
    if (config.whitelistedIPs && config.whitelistedIPs.length > 0 && !ipWhitelisted) {
      logger.warn('Webhook from non-whitelisted IP', { providerName, requestIP });
    }

    // If provider has signature secret and signature is invalid, reject
    if (config.signatureSecret && !signatureValid) {
      logger.warn('Webhook with invalid signature', { providerName, requestIP });
      return { valid: false, reason: 'Invalid webhook signature', ipWhitelisted, signatureValid: false };
    }

    return { valid: true, ipWhitelisted, signatureValid };
  }

  private static checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
      logger.warn('Rate limit exceeded for webhook IP', { ip, count: entry.count });
      return false;
    }
    return true;
  }

  private static checkIPWhitelist(ip: string, config: ProviderCallbackConfig): boolean {
    if (!config.whitelistedIPs || config.whitelistedIPs.length === 0) return true;
    const normalizedIP = ip.replace('::ffff:', '');
    return config.whitelistedIPs.some(whitelisted =>
      whitelisted.trim() === normalizedIP || whitelisted.trim() === ip
    );
  }

  private static verifySignature(
    headers: Record<string, any>,
    rawBody: string | Buffer,
    config: ProviderCallbackConfig
  ): boolean {
    if (!config.signatureSecret || !config.signatureHeader) return true;

    const signature = headers[config.signatureHeader];
    if (!signature) return false;

    try {
      const algorithm = config.signatureAlgorithm || 'sha256';
      const expectedSignature = crypto
        .createHmac(algorithm, config.signatureSecret)
        .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature.replace(/^sha256=/, ''), 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error: any) {
      logger.error('Signature verification error', { error: error.message });
      return false;
    }
  }

  // ==================================================================================
  // 2. CALLBACK PARSING
  // ==================================================================================

  static parseCallbackData(
    providerName: string,
    body: Record<string, any>,
    headers: Record<string, any>,
    requestIP: string,
    requestMethod: string = 'POST'
  ): CallbackRecord {
    const config = this.getProviderConfig(providerName);
    const rawStatus = this.extractField(body, ['status', 'delivery_status', 'state', 'message_status', 'dlrStatus']);
    const deliveryStatus = this.mapDeliveryStatus(rawStatus, config);

    return {
      message_id: this.extractField(body, config.messageIdFields),
      provider_message_id: this.extractField(body, config.providerMessageIdFields),
      campaign_id: body.campaign_id ? parseInt(body.campaign_id) : null,
      provider_name: config.name,
      provider_type: 'http',
      delivery_status: deliveryStatus,
      raw_status: rawStatus,
      error_code: this.extractField(body, config.errorCodeFields),
      error_message: this.extractField(body, config.errorMessageFields),
      failure_reason: body.failure_reason || body.failureReason || null,
      request_headers: headers,
      request_body: body,
      request_ip: requestIP,
      request_method: requestMethod,
      cost: this.extractNumericField(body, config.costFields),
      currency: body.currency || 'ZAR',
      signature_header: headers[config.signatureHeader || ''] || null,
      delivery_timestamp: this.extractTimestamp(body, config.timestampFields),
    };
  }

  static parseJsonApplinkCallback(
    body: Record<string, any>,
    headers: Record<string, any>,
    requestIP: string
  ): CallbackRecord {
    const data = body.data || body;
    
    // Handle the new status nested object
    let statusSource = data.status?.reason || data.status || data.delivery_status || data.state;
    
    // If it's a reason string, try to extract the stat:XXXX code
    if (typeof statusSource === 'string' && statusSource.includes('stat:')) {
      const match = statusSource.match(/stat:([A-Z]+)/);
      if (match) statusSource = 'stat:' + match[1];
    }

    const record = this.parseCallbackData('json-applink', data, headers, requestIP);

    // Override or refine based on specific Applink fields
    if (statusSource) {
      record.raw_status = String(statusSource);
      record.delivery_status = this.mapDeliveryStatus(record.raw_status, this.getProviderConfig('json-applink'));
    }

    if (data.status?.code !== undefined) record.error_code = String(data.status.code);
    if (data.status?.reason) record.error_message = data.status.reason;
    if (data.creditCost) record.cost = parseFloat(data.creditCost);
    if (data.apiMsgId) record.provider_message_id = data.apiMsgId;
    if (data.clientRef || data.correlator) record.message_id = data.clientRef || data.correlator;
    
    // MSISDN extraction from recipient object if top level is missing
    if (!record.request_body?.msisdn && data.recipient?.msisdn) {
      record.request_body = { ...record.request_body, msisdn: data.recipient.msisdn };
    }

    return record;
  }

  // ==================================================================================
  // 3. CALLBACK LOGGING
  // ==================================================================================

  static async logCallback(record: CallbackRecord): Promise<number> {
    try {
      const query = `
        INSERT INTO sms_delivery_callbacks (
          received_at, message_id, provider_message_id, campaign_id,
          provider_name, provider_type, delivery_status, raw_status,
          error_code, error_message, failure_reason,
          request_headers, request_body, request_ip, request_method,
          processed_successfully, processing_error, processing_attempts,
          cost, currency, signature_valid, signature_header, delivery_timestamp
        ) VALUES (
          CURRENT_TIMESTAMP, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        RETURNING callback_id
      `;

      const result = await executeQuery(query, [
        record.message_id, record.provider_message_id, record.campaign_id || null,
        record.provider_name, record.provider_type || 'http',
        record.delivery_status, record.raw_status || null,
        record.error_code || null, record.error_message || null, record.failure_reason || null,
        JSON.stringify(record.request_headers || {}), JSON.stringify(record.request_body || {}),
        record.request_ip || null, record.request_method || 'POST',
        record.processed_successfully || false, record.processing_error || null,
        record.processing_attempts || 0,
        record.cost || null, record.currency || 'ZAR',
        record.signature_valid ?? null, record.signature_header || null,
        record.delivery_timestamp || null,
      ]);

      const callbackId = Array.isArray(result) && result.length > 0 ? result[0].callback_id : 0;
      logger.info('SMS callback logged', { callbackId, messageId: record.message_id, status: record.delivery_status });
      return callbackId;
    } catch (error: any) {
      logger.error('Failed to log SMS callback', { error: error.message });
      throw error;
    }
  }

  static async updateCallbackStatus(callbackId: number, success: boolean, error?: string): Promise<void> {
    try {
      await executeQuery(`
        UPDATE sms_delivery_callbacks
        SET processed_successfully = $1, processing_error = $2, processed_at = CURRENT_TIMESTAMP,
            processing_attempts = processing_attempts + 1
        WHERE callback_id = $3
      `, [success, error || null, callbackId]);
    } catch (err: any) {
      logger.error('Failed to update callback status', { error: err.message, callbackId });
    }
  }

  // ==================================================================================
  // 4. PROCESS CALLBACK (main orchestrator)
  // ==================================================================================

  static async processCallback(
    providerName: string,
    body: Record<string, any>,
    headers: Record<string, any>,
    requestIP: string,
    requestMethod: string = 'POST'
  ): Promise<ProcessCallbackResult> {
    let callbackId = 0;
    let record: CallbackRecord;

    try {
      // Parse the callback data
      if (providerName === 'json-applink') {
        record = this.parseJsonApplinkCallback(body, headers, requestIP);
      } else {
        record = this.parseCallbackData(providerName, body, headers, requestIP, requestMethod);
      }

      // Log the callback
      callbackId = await this.logCallback(record);

      // Update sms_delivery_tracking
      if (record.message_id) {
        await this.updateDeliveryTracking(record);
      }

      // Update sms_send_log
      if (record.message_id) {
        await this.updateSendLog(record);
      }

      // Update sms_messages (for SMS Reports visibility)
      if (record.message_id || record.provider_message_id) {
        await this.updateSMSMessages(record);
      }

      // Log to sms_webhook_log
      await this.logWebhookEntry(providerName, headers, body, requestIP, requestMethod, 200, true);

      // Check for critical failures and notify
      if (record.delivery_status === 'failed' || record.delivery_status === 'rejected') {
        await this.handleCriticalFailure(record);
      }

      // Mark callback as processed
      await this.updateCallbackStatus(callbackId, true);

      return {
        success: true,
        callbackId,
        messageId: record.message_id,
        deliveryStatus: record.delivery_status,
      };
    } catch (error: any) {
      logger.error('Failed to process callback', { error: error.message, providerName });

      if (callbackId > 0) {
        await this.updateCallbackStatus(callbackId, false, error.message);
      }

      await this.logWebhookEntry(providerName, headers, body, requestIP, requestMethod, 500, false, error.message);

      return {
        success: false,
        callbackId,
        messageId: null,
        deliveryStatus: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Processes an incoming MO (Mobile Originated) SMS callback.
   * Typically used for keywords like "RENEW".
   */
  static async processMOCallback(
    providerName: string,
    body: Record<string, any>,
    headers: Record<string, any>,
    requestIP: string,
    requestMethod: string = 'POST'
  ): Promise<any> {
    try {
      logger.info(`Received MO callback from ${providerName}`, { requestIP });

      // 1. Data extraction
      // JSON Applink usually sends 'msisdn', 'destination', 'content'
      // New format: { "recipient": { "msisdn": "..." }, "response": "..." }
      const data = (body.data || body) as any;
      const msisdn = data.recipient?.msisdn || data.msisdn || data.from || data.mobile || '';
      const content = data.response || data.content || data.message || data.text || '';
      const destination = data.destination || data.shortcode || data.to || '';

      if (!msisdn) {
        throw new Error('MSISDN not found in MO callback');
      }

      // 2. Delegate to business logic service
      const result = await SMSMORenewalService.processRenewalRequest(msisdn, content, providerName);

      // 3. Log MO interaction
      await SMSMORenewalService.logMOCallback({
        msisdn,
        destination,
        content,
        provider: providerName,
        idNumber: result.idNumber,
        memberId: result.memberId,
        success: result.success,
        error: result.error
      });

      // 4. Log to webhook entry log for general auditing
      await this.logWebhookEntry(providerName, headers, body, requestIP, requestMethod, 200, true);

      return result;
    } catch (error: any) {
      logger.error('Failed to process MO callback', { error: error.message, providerName });
      await this.logWebhookEntry(providerName, headers, body, requestIP, requestMethod, 500, false, error.message);
      throw error;
    }
  }

  // ==================================================================================
  // 5. INTEGRATION METHODS
  // ==================================================================================

  private static async updateDeliveryTracking(record: CallbackRecord): Promise<void> {
    try {
      const trackingStatus = this.mapToTrackingStatus(record.delivery_status);
      await SMSDeliveryTrackingService.trackDeliveryStatus({
        message_id: record.message_id!,
        provider_message_id: record.provider_message_id || record.message_id!,
        status: trackingStatus,
        delivery_timestamp: record.delivery_timestamp || new Date(),
        error_code: record.error_code || undefined,
        error_message: record.error_message || undefined,
        retry_count: 0,
        cost: record.cost || undefined,
      });
    } catch (error: any) {
      logger.error('Failed to update delivery tracking', { error: error.message, messageId: record.message_id });
    }
  }

  private static async updateSendLog(record: CallbackRecord): Promise<void> {
    try {
      await SMSLogService.updateSMSLog(record.message_id!, {
        status: this.mapToLogStatus(record.delivery_status),
        delivery_timestamp: record.delivery_timestamp || new Date(),
        error_code: record.error_code || undefined,
        error_message: record.error_message || undefined,
        cost: record.cost || undefined,
        webhook_data: record.request_body,
      });
    } catch (error: any) {
      logger.error('Failed to update send log', { error: error.message, messageId: record.message_id });
    }
  }

  private static async updateSMSMessages(record: CallbackRecord): Promise<void> {
    try {
      // Map callback status to the status format used in sms_messages
      const statusMap: Record<string, string> = {
        delivered: 'Delivered',
        sent: 'Sent',
        failed: 'Failed',
        rejected: 'Failed',
        expired: 'Failed',
        pending: 'Pending',
        queued: 'Pending',
        unknown: 'Pending',
      };
      const mappedStatus = statusMap[record.delivery_status] || 'Pending';

      // Try to match by provider_message_id first, then by message_id (correlator)
      const identifiers = [record.provider_message_id, record.message_id].filter(Boolean);

      for (const identifier of identifiers) {
        const result = await executeQuery(`
          UPDATE sms_messages
          SET status = $1,
              error_message = COALESCE($2, error_message)
          WHERE provider_message_id = $3
          RETURNING message_id
        `, [mappedStatus, record.error_message || null, identifier]);

        const updated = Array.isArray(result) ? result : [];
        if (updated.length > 0) {
          logger.info('Updated sms_messages delivery status', {
            matchedBy: 'provider_message_id',
            identifier,
            status: mappedStatus,
            rowsUpdated: updated.length,
          });
          return;
        }
      }

      logger.debug('No matching sms_messages record found for webhook', {
        messageId: record.message_id,
        providerMessageId: record.provider_message_id,
      });
    } catch (error: any) {
      logger.error('Failed to update sms_messages', { error: error.message, messageId: record.message_id });
    }
  }

  private static async logWebhookEntry(
    providerName: string, headers: Record<string, any>, body: Record<string, any>,
    requestIP: string, requestMethod: string, responseStatus: number,
    success: boolean, errorMsg?: string
  ): Promise<void> {
    try {
      await executeQuery(`
        INSERT INTO sms_webhook_log (
          provider_name, request_method, request_headers, request_body,
          request_ip, response_status, response_message, processed_successfully,
          processing_error, received_at, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        providerName, requestMethod, JSON.stringify(headers), JSON.stringify(body),
        requestIP, responseStatus, success ? 'Processed successfully' : errorMsg || 'Processing failed',
        success, errorMsg || null,
      ]);
    } catch (error: any) {
      logger.error('Failed to log webhook entry', { error: error.message });
    }
  }

  private static async handleCriticalFailure(record: CallbackRecord): Promise<void> {
    logger.error('CRITICAL SMS delivery failure', {
      messageId: record.message_id,
      provider: record.provider_name,
      status: record.delivery_status,
      errorCode: record.error_code,
      errorMessage: record.error_message,
    });
    // Future: send email/Slack notification for critical failures
  }

  // ==================================================================================
  // HELPER METHODS
  // ==================================================================================

  private static extractField(data: any, fieldNames: string[]): string | null {
    for (const field of fieldNames) {
      if (data && data[field] !== undefined && data[field] !== null) return String(data[field]);
    }
    // Try nested .data object
    if (data?.data) {
      for (const field of fieldNames) {
        if (data.data[field] !== undefined && data.data[field] !== null) return String(data.data[field]);
      }
    }
    return null;
  }

  private static extractNumericField(data: any, fieldNames: string[]): number | null {
    const val = this.extractField(data, fieldNames);
    if (val === null) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }

  private static extractTimestamp(data: any, fieldNames: string[]): Date | null {
    const val = this.extractField(data, fieldNames);
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }

  private static mapDeliveryStatus(rawStatus: string | null, config: ProviderCallbackConfig): CallbackDeliveryStatus {
    if (!rawStatus) return 'unknown';
    const statusLower = rawStatus.toLowerCase();
    
    // 1. Direct match
    for (const [mapped, values] of Object.entries(config.statusFieldMappings)) {
      if (values.some(v => v.toLowerCase() === statusLower)) {
        return mapped as CallbackDeliveryStatus;
      }
    }
    
    // 2. Partial match for stat:XXXX pattern if not matched yet
    for (const [mapped, values] of Object.entries(config.statusFieldMappings)) {
      if (values.some(v => v.startsWith('stat:') && statusLower.includes(v.toLowerCase()))) {
        return mapped as CallbackDeliveryStatus;
      }
    }
    
    return 'unknown';
  }

  private static mapToTrackingStatus(status: CallbackDeliveryStatus): 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired' {
    const map: Record<string, any> = {
      delivered: 'delivered', failed: 'failed', expired: 'expired',
      rejected: 'failed', pending: 'pending', sent: 'sent', queued: 'queued', unknown: 'pending',
    };
    return map[status] || 'pending';
  }

  private static mapToLogStatus(status: CallbackDeliveryStatus): 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired' {
    return this.mapToTrackingStatus(status);
  }

  // ==================================================================================
  // 7. QUERY METHODS
  // ==================================================================================

  static async getCallbacks(filters: {
    provider_name?: string; delivery_status?: string; message_id?: string;
    page?: number; limit?: number; start_date?: string; end_date?: string;
  } = {}): Promise<{ callbacks: any[]; total: number }> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (filters.provider_name) { conditions.push(`provider_name = $${idx++}`); params.push(filters.provider_name); }
      if (filters.delivery_status) { conditions.push(`delivery_status = $${idx++}`); params.push(filters.delivery_status); }
      if (filters.message_id) { conditions.push(`message_id = $${idx++}`); params.push(filters.message_id); }
      if (filters.start_date) { conditions.push(`received_at >= $${idx++}`); params.push(filters.start_date); }
      if (filters.end_date) { conditions.push(`received_at <= $${idx++}`); params.push(filters.end_date); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const countResult = await executeQuerySingle(`SELECT COUNT(*) as total FROM sms_delivery_callbacks ${where}`, params);
      const total = parseInt(countResult?.total || '0');

      params.push(limit, offset);
      const callbacks = await executeQuery(
        `SELECT * FROM sms_delivery_callbacks ${where} ORDER BY received_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        params
      );

      return { callbacks: Array.isArray(callbacks) ? callbacks : [], total };
    } catch (error: any) {
      logger.error('Failed to get callbacks', { error: error.message });
      return { callbacks: [], total: 0 };
    }
  }

  static async getCallbackStats(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const intervals: Record<string, string> = { hour: '1 hour', day: '1 day', week: '7 days', month: '30 days' };
      const result = await executeQuerySingle(`
        SELECT
          COUNT(*) as total_callbacks,
          SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN delivery_status = 'expired' THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN delivery_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN processed_successfully = TRUE THEN 1 ELSE 0 END) as processed_ok,
          SUM(CASE WHEN processed_successfully = FALSE THEN 1 ELSE 0 END) as processed_fail,
          ROUND(AVG(COALESCE(cost, 0)), 4) as avg_cost
        FROM sms_delivery_callbacks
        WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '${intervals[timeframe]}'
      `);
      return result || {};
    } catch (error: any) {
      logger.error('Failed to get callback stats', { error: error.message });
      return {};
    }
  }

  // ==================================================================================
  // 6. RETRY PROCESSING
  // ==================================================================================

  static async retryFailedCallbacks(maxAttempts: number = 3): Promise<number> {
    try {
      const failedCallbacks = await executeQuery(`
        SELECT callback_id, message_id, provider_message_id, provider_name,
               delivery_status, raw_status, error_code, error_message,
               request_body, request_headers, request_ip, request_method
        FROM sms_delivery_callbacks
        WHERE processed_successfully = FALSE
          AND processing_attempts < $1
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY created_at ASC
        LIMIT 50
      `, [maxAttempts]);

      if (!Array.isArray(failedCallbacks) || failedCallbacks.length === 0) return 0;

      let retried = 0;
      for (const cb of failedCallbacks) {
        try {
          if (cb.message_id) {
            await this.updateDeliveryTracking({
              ...cb, delivery_status: cb.delivery_status, delivery_timestamp: new Date(),
            } as CallbackRecord);
            await this.updateSendLog({
              ...cb, delivery_status: cb.delivery_status, request_body: typeof cb.request_body === 'string' ? JSON.parse(cb.request_body) : cb.request_body,
            } as CallbackRecord);
          }

          await this.updateCallbackStatus(cb.callback_id, true);
          retried++;
        } catch (error: any) {
          await this.updateCallbackStatus(cb.callback_id, false, error.message);
        }
      }

      logger.info(`Retried ${retried} failed callbacks`);
      return retried;
    } catch (error: any) {
      logger.error('Failed to retry callbacks', { error: error.message });
      return 0;
    }
  }
}

export default SMSCallbackService;