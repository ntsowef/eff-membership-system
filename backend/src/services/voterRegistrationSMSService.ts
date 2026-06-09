import { executeQuery, executeQuerySingle } from '../config/database';
import { renderTemplateString } from '../utils/templateRenderer';
import { SMSService } from './smsService';
import { SMSLogService } from './smsLogService';
import { SMSManagementService } from './smsManagementService';

const logger = {
    info: (message: string, meta?: any) => console.log('[INFO][VoterRegSMS]', message, meta || ''),
    error: (message: string, meta?: any) => console.error('[ERROR][VoterRegSMS]', message, meta || ''),
    warn: (message: string, meta?: any) => console.warn('[WARN][VoterRegSMS]', message, meta || ''),
};

export interface UnregisteredVoterMember {
    member_id: number;
    firstname: string;
    surname: string;
    full_name: string;
    cell_number: string;
    ward_code: string;
    municipality_code?: string;
    municipality_name?: string;
}

export class VoterRegistrationSMSService {

    /**
     * Get the voter registration SMS template from the database.
     */
    static async getTemplate(): Promise<{ message_template: string } | null> {
        try {
            const template = await executeQuerySingle<{ message_template: string }>(
                `SELECT message_template FROM sms_templates
         WHERE template_code = 'VOTER_REGISTRATION' AND is_active = true
         LIMIT 1`
            );
            return template || null;
        } catch (error: any) {
            logger.error('Failed to fetch VOTER_REGISTRATION template', { error: error.message });
            return null;
        }
    }

    /**
     * Query members who are not registered voters and have a valid phone number.
     */
    static async getUnregisteredVoters(page: number = 1, limit: number = 50): Promise<{ members: UnregisteredVoterMember[]; total: number }> {
        try {
            const offset = (page - 1) * limit;

            const countResult = await executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM members_consolidated
         WHERE (is_registered_voter = false OR is_registered_voter IS NULL)
           AND cell_number IS NOT NULL AND cell_number != ''`
            );
            const total = parseInt(countResult?.count || '0', 10);

            const result = await executeQuery(
                `SELECT
           member_id,
           firstname,
           surname,
           CONCAT(firstname, ' ', COALESCE(surname, '')) as full_name,
           cell_number,
           ward_code,
           municipality_code,
           municipality_name
         FROM members_consolidated
         WHERE (is_registered_voter = false OR is_registered_voter IS NULL)
           AND cell_number IS NOT NULL AND cell_number != ''
         ORDER BY surname, firstname
         LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            const members = Array.isArray(result) ? result : [];
            return { members, total };
        } catch (error: any) {
            logger.error('Failed to get unregistered voters', { error: error.message });
            throw error;
        }
    }

    /**
     * Get count of unregistered voters with valid phone numbers.
     */
    static async getUnregisteredVoterCount(): Promise<number> {
        try {
            const result = await executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM members_consolidated
         WHERE (is_registered_voter = false OR is_registered_voter IS NULL)
           AND cell_number IS NOT NULL AND cell_number != ''`
            );
            return parseInt(result?.count || '0', 10);
        } catch (error: any) {
            logger.error('Failed to get unregistered voter count', { error: error.message });
            return 0;
        }
    }

    /**
     * Get statistics: total unregistered, sent today, failed today.
     */
    static async getStatistics(): Promise<{
        total_unregistered: number;
        sent_today: number;
        failed_today: number;
    }> {
        try {
            const total = await this.getUnregisteredVoterCount();

            const sentResult = await executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM sms_send_log
         WHERE source_type = 'voter_registration'
           AND status IN ('sent', 'delivered')
           AND created_at::date = CURRENT_DATE`
            );

            const failedResult = await executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM sms_send_log
         WHERE source_type = 'voter_registration'
           AND status = 'failed'
           AND created_at::date = CURRENT_DATE`
            );

            return {
                total_unregistered: total,
                sent_today: parseInt(sentResult?.count || '0', 10),
                failed_today: parseInt(failedResult?.count || '0', 10),
            };
        } catch (error: any) {
            logger.error('Failed to get voter registration SMS statistics', { error: error.message });
            return { total_unregistered: 0, sent_today: 0, failed_today: 0 };
        }
    }

    /**
     * Send voter registration reminder to a single member by ID.
     */
    static async sendSingleReminder(memberId: number): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            const template = await this.getTemplate();
            if (!template || !template.message_template) {
                return { success: false, error: 'No active VOTER_REGISTRATION SMS template found' };
            }

            // Fetch member details
            const member = await executeQuerySingle<UnregisteredVoterMember>(
                `SELECT
           member_id,
           firstname,
           surname,
           CONCAT(firstname, ' ', COALESCE(surname, '')) as full_name,
           cell_number,
           ward_code,
           municipality_code,
           municipality_name
         FROM members_consolidated
         WHERE member_id = $1
           AND (is_registered_voter = false OR is_registered_voter IS NULL)
           AND cell_number IS NOT NULL AND cell_number != ''`,
                [memberId]
            );

            if (!member) {
                return { success: false, error: 'Member not found, already a registered voter, or has no phone number' };
            }

            // Anti-Spam: Check if we sent ANY voter registration reminder to this member in the last 7 days
            const recentSend = await executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM sms_send_log
                 WHERE source_type = 'voter_registration'
                   AND recipient_member_id = $1
                   AND status IN ('sent', 'delivered', 'sending')
                   AND created_at >= (CURRENT_DATE - INTERVAL '7 days')`,
                [memberId.toString()]
            );

            if (parseInt(recentSend?.count || '0', 10) > 0) {
                return { success: false, error: 'Member already received a voter registration reminder in the last 7 days' };
            }

            // Personalize the template
            const personalizedMessage = renderTemplateString(
                template.message_template,
                {
                    firstname: member.firstname,
                    surname: member.surname,
                    full_name: member.full_name,
                    fullname: member.full_name,
                },
                { keepUnmatched: false }
            );

            // Normalize phone number to 27xxxxxxxxx format
            const normalizedPhone = SMSManagementService.formatPhoneNumber(member.cell_number);
            if (!normalizedPhone) {
                return { success: false, error: `Invalid phone number: ${member.cell_number}` };
            }

            // Generate tracking ID and log
            const trackingId = SMSLogService.generateMessageId('voter_registration');

            await SMSLogService.logSMSSend({
                message_id: trackingId,
                source_type: 'voter_registration',
                source_reference_id: memberId.toString(),
                recipient_phone: normalizedPhone,
                recipient_name: member.full_name,
                recipient_member_id: member.member_id?.toString(),
                message_content: personalizedMessage,
                status: 'sending',
            });

            // Send via production SMS provider
            const smsResult = await SMSService.sendSMS(normalizedPhone, personalizedMessage, 'EFF', trackingId);

            // Update log with result
            await SMSLogService.updateSMSLog(trackingId, {
                status: smsResult.success ? 'sent' : 'failed',
                provider_message_id: smsResult.messageId,
                error_message: smsResult.error,
            });

            if (smsResult.success) {
                logger.info(`Voter registration SMS sent to ${member.full_name} (${member.cell_number})`);
                return { success: true, message: `Voter registration reminder sent to ${member.full_name}` };
            } else {
                logger.error(`Voter registration SMS failed for ${member.full_name}`, { error: smsResult.error });
                return { success: false, error: smsResult.error || 'SMS delivery failed' };
            }
        } catch (error: any) {
            logger.error('Failed to send single voter registration reminder', { error: error.message, memberId });
            return { success: false, error: error.message };
        }
    }

    /**
     * Send voter registration reminders to all unregistered members in batches.
     */
    static async sendBulkReminders(batchSize: number = 50): Promise<{
        total_targeted: number;
        sent: number;
        failed: number;
        skipped: number;
    }> {
        try {
            const template = await this.getTemplate();
            if (!template || !template.message_template) {
                logger.warn('No active VOTER_REGISTRATION template found — aborting bulk send');
                return { total_targeted: 0, sent: 0, failed: 0, skipped: 0 };
            }

            // Get all unregistered voters with valid phone numbers
            const result = await executeQuery(
                `SELECT
           member_id,
           firstname,
           surname,
           CONCAT(firstname, ' ', COALESCE(surname, '')) as full_name,
           cell_number
         FROM members_consolidated
         WHERE (is_registered_voter = false OR is_registered_voter IS NULL)
           AND cell_number IS NOT NULL AND cell_number != ''
         ORDER BY surname, firstname`
            );

            const members: any[] = Array.isArray(result) ? result : [];
            let sent = 0;
            let failed = 0;
            let skipped = 0;

            for (const member of members) {
                try {
                    // Anti-Spam: Check if we sent ANY voter registration reminder to this member in the last 7 days
                    const recentSend = await executeQuerySingle<{ count: string }>(
                        `SELECT COUNT(*) as count FROM sms_send_log
                         WHERE source_type = 'voter_registration'
                           AND recipient_member_id = $1
                           AND status IN ('sent', 'delivered', 'sending')
                           AND created_at >= (CURRENT_DATE - INTERVAL '7 days')`,
                        [member.member_id.toString()]
                    );

                    if (parseInt(recentSend?.count || '0', 10) > 0) {
                        skipped++;
                        continue;
                    }

                    const personalizedMessage = renderTemplateString(
                        template.message_template,
                        {
                            firstname: member.firstname,
                            surname: member.surname,
                            full_name: member.full_name,
                            fullname: member.full_name,
                        },
                        { keepUnmatched: false }
                    );

                    // Normalize phone number to 27xxxxxxxxx format
                    const normalizedPhone = SMSManagementService.formatPhoneNumber(member.cell_number);
                    if (!normalizedPhone) {
                        skipped++;
                        continue;
                    }

                    const trackingId = SMSLogService.generateMessageId('voter_registration' as any);

                    await SMSLogService.logSMSSend({
                        message_id: trackingId,
                        source_type: 'voter_registration' as any,
                        source_reference_id: member.member_id.toString(),
                        recipient_phone: normalizedPhone,
                        recipient_name: member.full_name,
                        recipient_member_id: member.member_id.toString(),
                        message_content: personalizedMessage,
                        status: 'sending',
                    });

                    const smsResult = await SMSService.sendSMS(normalizedPhone, personalizedMessage, 'EFF', trackingId);

                    await SMSLogService.updateSMSLog(trackingId, {
                        status: smsResult.success ? 'sent' : 'failed',
                        provider_message_id: smsResult.messageId,
                        error_message: smsResult.error,
                    });

                    if (smsResult.success) {
                        sent++;
                    } else {
                        failed++;
                    }
                } catch (err: any) {
                    logger.error(`Failed sending to member ${member.member_id}`, { error: err.message });
                    failed++;
                }
            }

            logger.info(`Bulk voter registration SMS complete`, { total: members.length, sent, failed, skipped });
            return { total_targeted: members.length, sent, failed, skipped };
        } catch (error: any) {
            logger.error('Bulk voter registration SMS failed', { error: error.message });
            throw error;
        }
    }
}

export default VoterRegistrationSMSService;
