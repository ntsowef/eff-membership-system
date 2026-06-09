import { executeQuery } from '../config/database';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { SMSLogService } from './smsLogService';
import axios from 'axios';
import { SMSService, SMSProvider } from './smsService';

export interface BulkSMSRecipient {
    msisdn: string;
    message: string;
    member_id?: number | string;
    name?: string;
}

export interface BulkSMSBatchParams {
    campaign_id?: number;
    source_type: 'campaign' | 'birthday' | 'system';
    source_reference_id?: string;
    recipients: BulkSMSRecipient[];
}

export interface BulkSMSProgress {
    job_id: string;
    campaign_id?: number;
    source_type: string;
    status: 'Running' | 'Completed' | 'Failed';
    total_recipients: number;
    total_batches: number;
    current_batch: number;
    messages_sent: number;
    messages_failed: number;
    started_at: string;
    estimated_completion_time?: string;
    error_message?: string;
}

export class SMSBulkService {
    // In-memory progress tracking
    private static activeJobs: Map<string, BulkSMSProgress> = new Map();

    private static getBatchSize(): number {
        return parseInt(process.env.SMS_BULK_BATCH_SIZE || '10000', 10);
    }

    private static getPauseDurationMs(): number {
        return parseInt(process.env.SMS_BULK_PAUSE_MS || '180000', 10); // 3 minutes default
    }

    /**
     * Retrieves the current progress of a bulk SMS job.
     */
    static getJobProgress(jobId: string): BulkSMSProgress | undefined {
        return this.activeJobs.get(jobId);
    }

    /**
     * Dispatch a bulk SMS job in the background.
     * Returns immediately with a job ID.
     */
    static async dispatchBulkJob(params: BulkSMSBatchParams): Promise<string> {
        const jobId = `bulk_${params.source_type}_${Date.now()}`;

        // Format and validate all numbers
        const validRecipients: BulkSMSRecipient[] = [];
        for (const recipient of params.recipients) {
            // Use the formatPhoneNumber logic from SMSManagementService, or assume already formatted.
            // But we ensure it has numbers and is valid length.
            const cleaned = recipient.msisdn.replace(/[^0-9]/g, '');
            if (cleaned.length >= 9 && cleaned.length <= 12) {
                let finalNumber = cleaned;
                if (cleaned.startsWith('0')) {
                    finalNumber = '27' + cleaned.substring(1);
                } else if (/^[678]/.test(cleaned) && cleaned.length === 9) {
                    finalNumber = '27' + cleaned;
                }

                if (/^27[0-9]{9}$/.test(finalNumber) || /^[0-9]{11,12}$/.test(finalNumber)) {
                    validRecipients.push({
                        ...recipient,
                        msisdn: finalNumber
                    });
                }
            }
        }

        const batchSize = this.getBatchSize();
        const totalBatches = Math.ceil(validRecipients.length / batchSize);

        const progress: BulkSMSProgress = {
            job_id: jobId,
            campaign_id: params.campaign_id,
            source_type: params.source_type,
            status: 'Running',
            total_recipients: validRecipients.length,
            total_batches: totalBatches,
            current_batch: 0,
            messages_sent: 0,
            messages_failed: 0,
            started_at: new Date().toISOString()
        };

        this.activeJobs.set(jobId, progress);

        // Start processing in the background asynchronously
        this.processJobAsync(jobId, params, validRecipients).catch(error => {
            logger.error(`Unhandled error in background bulk job ${jobId}`, { error });
        });

        return jobId;
    }

    /**
     * The asynchronous background processor that handles batching and pausing.
     */
    private static async processJobAsync(jobId: string, params: BulkSMSBatchParams, recipients: BulkSMSRecipient[]) {
        const progress = this.activeJobs.get(jobId);
        if (!progress) return; // Should not happen

        try {
            const batchSize = this.getBatchSize();
            const pauseDurationMs = this.getPauseDurationMs();

            const smsConfig = config.sms || {};
            const isJsonApplink = smsConfig.provider?.toLowerCase() === 'json-applink' || smsConfig.provider?.toLowerCase() === 'jsonapplink';

            const apiUrl = smsConfig.jsonApplink?.apiUrl || '';
            const authenticationCode = smsConfig.jsonApplink?.authenticationCode || '';
            const affiliateCode = smsConfig.jsonApplink?.affiliateCode || '';
            const postbackUrl = process.env.SMS_CALLBACK_URL || 'https://api.effmemberportal.org/api/v1/sms-webhooks/delivery/json-applink';

            if (!isJsonApplink || !apiUrl || !authenticationCode || !affiliateCode) {
                logger.warn(`JSON Applink credentials missing. Using mock/loop provider for bulk sending.`);
                // We will fall back to sending one-by-one with SMSService if Applink bulk isn't configured
            }

            for (let i = 0; i < recipients.length; i += batchSize) {
                progress.current_batch = Math.floor(i / batchSize) + 1;

                // Calculate estimated completion time
                const batchesRemaining = progress.total_batches - progress.current_batch;
                const msRemaining = batchesRemaining * pauseDurationMs;
                progress.estimated_completion_time = new Date(Date.now() + msRemaining).toISOString();

                const batch = recipients.slice(i, i + batchSize);
                logger.info(`Processing bulk job ${jobId} batch ${progress.current_batch}/${progress.total_batches}, size: ${batch.length}`);

                await this.sendBatch(batch, params, isJsonApplink, {
                    apiUrl, authenticationCode, affiliateCode, postbackUrl
                }, progress);

                // Update campaign status if applicable
                if (params.campaign_id) {
                    await this.updateCampaignStats(params.campaign_id);
                    await executeQuery(`UPDATE sms_campaigns SET status = 'Running' WHERE campaign_id = $1`, [params.campaign_id]);
                }

                // Wait 3 minutes before processing the next batch, unless this is the last batch
                if (progress.current_batch < progress.total_batches) {
                    logger.info(`Bulk job ${jobId} pausing for ${pauseDurationMs / 1000}s to respect rate limits...`);
                    await new Promise(resolve => setTimeout(resolve, pauseDurationMs));
                }
            }

            progress.status = 'Completed';
            logger.info(`Bulk job ${jobId} completed. Sent: ${progress.messages_sent}, Failed: ${progress.messages_failed}`);

            if (params.campaign_id) {
                await executeQuery(`UPDATE sms_campaigns SET status = 'Completed' WHERE campaign_id = $1`, [params.campaign_id]);
            }

        } catch (error: any) {
            progress.status = 'Failed';
            progress.error_message = error.message;
            logger.error(`Bulk job ${jobId} failed completely:`, { error: error.message });

            if (params.campaign_id) {
                await executeQuery(`UPDATE sms_campaigns SET status = 'Failed' WHERE campaign_id = $1`, [params.campaign_id]);
            }
        }
    }

    /**
     * Executes the actual API request to send a batch.
     */
    private static async sendBatch(
        batch: BulkSMSRecipient[],
        params: BulkSMSBatchParams,
        isJsonApplink: boolean,
        creds: { apiUrl: string, authenticationCode: string, affiliateCode: string, postbackUrl: string },
        progress: BulkSMSProgress
    ) {
        if (isJsonApplink) {
            let attempt = 0;
            let success = false;

            while (attempt < 3 && !success) {
                attempt++;
                try {
                    const payload = {
                        affiliateCode: creds.affiliateCode,
                        authenticationCode: creds.authenticationCode,
                        submitDateTime: new Date().toISOString(),
                        messageType: 'text',
                        postBackUrl: creds.postbackUrl,
                        recipientList: {
                            recipient: batch.map(r => ({
                                msisdn: r.msisdn,
                                message: r.message
                            }))
                        }
                    };

                    const headers = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'EFF-Membership-System/1.0'
                    };

                    const response = await axios.post(creds.apiUrl, payload, {
                        headers,
                        timeout: 60000, // Large batches might take time
                        validateStatus: (status) => status < 500
                    });

                    if (response.status >= 200 && response.status < 300) {
                        const data = response.data;
                        if (data.resultCode === 0 || data.resultCode === '0') {
                            success = true;
                            // Pre-register batch in database to "pending"
                            await this.logBatchToDB(batch, params, 'pending', 'Applink API Accept', undefined);
                            progress.messages_sent += batch.length;
                        } else {
                            throw new Error(`JSON Applink error: ${data.resultText || data.error}`);
                        }
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (error: any) {
                    logger.error(`Batch send attempt ${attempt} failed:`, { error: error.message });
                    if (attempt === 3) {
                        // Mark all as failed
                        await this.logBatchToDB(batch, params, 'failed', 'JSON Applink Exhausted Retries', error.message);
                        progress.messages_failed += batch.length;
                    } else {
                        // Wait 10 seconds before retry
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
            }
        } else {
            // Fallback for Mock Provider: loop array
            for (const r of batch) {
                try {
                    const result = await SMSService.sendSMS(r.msisdn, r.message, 'EFF');
                    if (result.success) {
                        await this.logBatchToDB([r], params, 'sent', undefined, undefined, result.messageId);
                        progress.messages_sent++;
                    } else {
                        await this.logBatchToDB([r], params, 'failed', result.error, undefined);
                        progress.messages_failed++;
                    }
                } catch (e: any) {
                    await this.logBatchToDB([r], params, 'failed', e.message, undefined);
                    progress.messages_failed++;
                }
            }
        }
    }

    /**
     * Logs a batch array into `sms_messages` and `sms_delivery_tracking`
     */
    private static async logBatchToDB(
        batch: BulkSMSRecipient[],
        params: BulkSMSBatchParams,
        status: string,
        errorMessage?: string,
        errorCode?: string,
        providerMessageId?: string
    ) {
        // To optimize database insertion for 10,000 items, we can use multi-row insert strings or transaction
        // But looping executeQuery might kill the pool in large loads.
        // It's better to build a batch query:

        const timestamp = new Date().toISOString();
        const baseMessageIdStr = `bulk_${Date.now()}_`;

        try {
            // We'll chunk the db inserts into chunks of 1000 to avoid query string length limits
            for (let i = 0; i < batch.length; i += 1000) {
                const chunk = batch.slice(i, i + 1000);

                const valueSets: string[] = [];
                const queryParams: any[] = [];
                let paramIndex = 1;

                for (const r of chunk) {
                    // Generate tracking ID
                    const msgTrackingId = providerMessageId || `${baseMessageIdStr}${i + valueSets.length}`;

                    valueSets.push(`(
                        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
                        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
                        $${paramIndex++}, $${paramIndex++}
                    )`);
                    queryParams.push(
                        params.campaign_id || null, // campaign_id
                        r.message, // message_content
                        r.msisdn, // recipient_number
                        r.name || null, // recipient_name
                        r.member_id || null, // recipient_member_id
                        status, // status
                        0.05, // cost_per_message
                        msgTrackingId, // provider_message_id
                        errorCode || null, // error_code
                        errorMessage || null, // error_message
                        status === 'sent' || status === 'delivered' ? timestamp : null, // sent_at
                        params.source_type === 'birthday' ? 'Birthday' : (params.source_type === 'campaign' ? 'Campaign' : 'General') // category
                    );
                }

                const query = `
                    INSERT INTO sms_messages (
                        campaign_id, message_content, recipient_number, recipient_name, recipient_member_id,
                        status, cost_per_message, provider_message_id, error_code, error_message, sent_at, category
                    )
                    VALUES ${valueSets.join(', ')}
                `;

                await executeQuery(query, queryParams);
            }
        } catch (error) {
            logger.error(`Error logging batch to DB:`, { error });
            // Don't crash the main process for log insertion failure.
        }
    }

    /**
     * Updates the global campaign stats summary
     */
    private static async updateCampaignStats(campaignId: number): Promise<void> {
        try {
            await executeQuery(`
                WITH stats AS (
                    SELECT 
                        COUNT(message_id) as total_messages,
                        SUM(CASE WHEN status IN ('sent', 'pending', 'delivered') THEN 1 ELSE 0 END) as sent_count,
                        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
                    FROM sms_messages
                    WHERE campaign_id = $1
                )
                UPDATE sms_campaigns
                SET 
                    messages_sent = stats.sent_count,
                    messages_delivered = stats.delivered_count,
                    messages_failed = stats.failed_count
                FROM stats
                WHERE campaign_id = $1
            `, [campaignId]);
        } catch (error) {
            logger.error('Error updating campaign stats', { error });
        }
    }
}
