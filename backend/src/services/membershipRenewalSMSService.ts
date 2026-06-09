import { executeQuery, executeQuerySingle } from '../config/database';
import { renderTemplateString } from '../utils/templateRenderer';
import { SMSService } from './smsService';
import { SMSLogService } from './smsLogService';
import { config } from '../config/config';

const logger = {
    info: (message: string, meta?: any) => console.log('[INFO][RenewalSMS]', message, meta || ''),
    error: (message: string, meta?: any) => console.error('[ERROR][RenewalSMS]', message, meta || ''),
    warn: (message: string, meta?: any) => console.warn('[WARN][RenewalSMS]', message, meta || ''),
};

export interface RenewalSMSMember {
    member_id: number;
    id_number: string;
    firstname: string;
    surname: string;
    full_name: string;
    cell_number: string;
    expiry_date: string;
    days_until_expiry?: number;
    days_expired?: number;
    category?: string;
    type: 'expiring' | 'expired';
}

export type RenewalSMSTargetGroup =
    | 'expiring_30_days' // Medium Priority (1 Month)
    | 'expiring_14_days' // High Priority (2 Weeks)
    | 'expiring_7_days'  // Urgent (1 Week)
    | 'expired_recently' // Recently Expired (1-30 days)
    | 'expired_30_plus'; // Expired 1-3 Months, 3-12 Months, Over 1 Year

export class MembershipRenewalSMSService {
    /**
     * Get the renewal SMS template based on the target group.
     */
    static getTemplate(targetGroup: RenewalSMSTargetGroup): string {
        // Digital card usage disabled on March 6, 2026 for now.
        const frontendUrl = process.env.FRONTEND_URL || 'https://effmemberportal.org';
        const cardLink = `${frontendUrl}/my-card?id={id_number}`;

        switch (targetGroup) {
            case 'expiring_30_days':
            case 'expiring_14_days':
                // return `.`;
                return `Your EFF membership about to expire. Contact your branch secretary to renew. EFF Digital Membership Link :https://effmemberportal.org/my-card?id={id_number}`;
            case 'expiring_7_days':
                // return `URGENT: Hi {firstname}, your EFF membership expires in {days} days! Renew now to avoid losing your benefits.`;
                return `Your EFF membership has expired. Contact your branch secretary to renew. EFF Digital Membership Link :https://effmemberportal.org/my-card?id={id_number}`;
            case 'expired_recently':
                return `Your EFF membership has expired. Contact your branch secretary to renew. EFF Digital Membership Link :https://effmemberportal.org/my-card?id={id_number}`;
            case 'expired_30_plus':
                return `Your EFF membership has expired. Contact your branch secretary to renew. EFF Digital Membership Link :https://effmemberportal.org/my-card?id={id_number}`;
            default:
                return `Your EFF membership has expired. Contact your branch secretary to renew. EFF Digital Membership Link :https://effmemberportal.org/my-card?id={id_number}`;
        }
    }

    /**
     * Get the mapping from target group to database view conditions.
     */
    private static getTargetGroupCondition(targetGroup: RenewalSMSTargetGroup): { view: 'vw_expiring_soon' | 'vw_expired_memberships', conditions: string[] } {
        switch (targetGroup) {
            case 'expiring_30_days':
                return { view: 'vw_expiring_soon', conditions: ["renewal_priority = 'Medium Priority (1 Month)'"] };
            case 'expiring_14_days':
                return { view: 'vw_expiring_soon', conditions: ["renewal_priority = 'High Priority (2 Weeks)'"] };
            case 'expiring_7_days':
                return { view: 'vw_expiring_soon', conditions: ["renewal_priority = 'Urgent (1 Week)'"] };
            case 'expired_recently':
                return { view: 'vw_expired_memberships', conditions: ["expiry_category = 'Recently Expired'"] };
            case 'expired_30_plus':
                return {
                    view: 'vw_expired_memberships',
                    conditions: [
                        "expiry_category IN ('Expired 1-3 Months', 'Expired 3-12 Months', 'Expired Over 1 Year')"
                    ]
                };
            default:
                throw new Error(`Unknown target group: ${targetGroup}`);
        }
    }

    /**
     * Query eligible members based on target group
     */
    static async getEligibleMembers(targetGroup: RenewalSMSTargetGroup, page: number = 1, limit: number = 50): Promise<{ members: RenewalSMSMember[]; total: number }> {
        try {
            const offset = (page - 1) * limit;
            const { view, conditions } = this.getTargetGroupCondition(targetGroup);
            const whereClause = `WHERE cell_number IS NOT NULL AND cell_number != '' AND ${conditions.join(' AND ')}`;

            const countQuery = `SELECT COUNT(*) as count FROM ${view} ${whereClause}`;
            const countResult = await executeQuerySingle<{ count: string }>(countQuery);
            const total = parseInt(countResult?.count || '0', 10);

            const isExpiring = view === 'vw_expiring_soon';

            const dataQuery = `
                SELECT
                    member_id,
                    id_number,
                    firstname,
                    surname,
                    full_name,
                    cell_number,
                    expiry_date,
                    ${isExpiring ? "days_until_expiry, renewal_priority as category, 'expiring' as type" : "days_expired, expiry_category as category, 'expired' as type"}
                FROM ${view}
                ${whereClause}
                ORDER BY ${isExpiring ? 'days_until_expiry ASC' : 'days_expired ASC'}
                LIMIT $1 OFFSET $2
            `;

            const result = await executeQuery(dataQuery, [limit, offset]);
            const members = Array.isArray(result) ? result : [];

            return { members, total };
        } catch (error: any) {
            logger.error('Failed to get eligible members', { error: error.message, targetGroup });
            throw error;
        }
    }

    /**
     * Get statistics summary for all target groups
     */
    static async getStatistics(): Promise<any> {
        try {
            const stats: any = {
                totals: {
                    expiring_30_days: 0,
                    expiring_14_days: 0,
                    expiring_7_days: 0,
                    expired_recently: 0,
                    expired_30_plus: 0
                },
                sent_today: 0,
                failed_today: 0
            };

            // Query expiring soon summary
            const expiringQuery = `
                SELECT renewal_priority, COUNT(*) as count 
                FROM vw_expiring_soon 
                WHERE cell_number IS NOT NULL AND cell_number != ''
                GROUP BY renewal_priority
            `;
            const expiringResults = await executeQuery(expiringQuery);
            if (Array.isArray(expiringResults)) {
                expiringResults.forEach(row => {
                    const count = parseInt(row.count, 10);
                    if (row.renewal_priority === 'Medium Priority (1 Month)') stats.totals.expiring_30_days = count;
                    if (row.renewal_priority === 'High Priority (2 Weeks)') stats.totals.expiring_14_days = count;
                    if (row.renewal_priority === 'Urgent (1 Week)') stats.totals.expiring_7_days = count;
                });
            }

            // Query expired summary
            const expiredQuery = `
                SELECT expiry_category, COUNT(*) as count 
                FROM vw_expired_memberships 
                WHERE cell_number IS NOT NULL AND cell_number != ''
                GROUP BY expiry_category
            `;
            const expiredResults = await executeQuery(expiredQuery);
            if (Array.isArray(expiredResults)) {
                let over30Count = 0;
                expiredResults.forEach(row => {
                    const count = parseInt(row.count, 10);
                    if (row.expiry_category === 'Recently Expired') {
                        stats.totals.expired_recently = count;
                    } else if (['Expired 1-3 Months', 'Expired 3-12 Months', 'Expired Over 1 Year'].includes(row.expiry_category)) {
                        over30Count += count;
                    }
                });
                stats.totals.expired_30_plus = over30Count;
            }

            // Today's send logs count
            const sentResult = await executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM sms_send_log
                 WHERE source_type = 'expiration_reminder'
                   AND status IN ('sent', 'delivered')
                   AND created_at::date = CURRENT_DATE`
            );
            stats.sent_today = parseInt(sentResult?.count || '0', 10);

            const failedResult = await executeQuerySingle<{ count: string }>(
                `SELECT COUNT(*) as count FROM sms_send_log
                 WHERE source_type = 'expiration_reminder'
                   AND status = 'failed'
                   AND created_at::date = CURRENT_DATE`
            );
            stats.failed_today = parseInt(failedResult?.count || '0', 10);

            return stats;
        } catch (error: any) {
            logger.error('Failed to get renewal SMS statistics', { error: error.message });
            return null;
        }
    }

    /**
     * Base sender method that prevents duplicates
     */
    private static async _sendRenewalSMS(member: RenewalSMSMember, targetGroup: RenewalSMSTargetGroup, messageTemplate: string): Promise<{ success: boolean; skipped: boolean; error?: string }> {
        // Anti-Spam: Check if we sent ANY expiration reminder to this member in the last 7 days
        const recentSend = await executeQuerySingle<{ count: string }>(
            `SELECT COUNT(*) as count FROM sms_send_log
             WHERE source_type = 'expiration_reminder'
               AND recipient_member_id = $1
               AND status IN ('sent', 'delivered')
               AND created_at >= (CURRENT_DATE - INTERVAL '7 days')`,
            [member.member_id.toString()]
        );

        if (parseInt(recentSend?.count || '0', 10) > 0) {
            return { success: false, skipped: true, error: 'Already sent reminder in the last 7 days' };
        }

        const days = member.type === 'expiring' ? member.days_until_expiry : member.days_expired;

        const personalizedMessage = renderTemplateString(
            messageTemplate,
            {
                firstname: member.firstname,
                surname: member.surname,
                full_name: member.full_name,
                id_number: member.id_number,
                days: days?.toString() || '',
                category: member.category || ''
            },
            { keepUnmatched: false }
        );

        const trackingId = SMSLogService.generateMessageId('expiration_reminder' as any);

        await SMSLogService.logSMSSend({
            message_id: trackingId,
            source_type: 'expiration_reminder',
            source_reference_id: targetGroup,
            recipient_phone: member.cell_number,
            recipient_name: member.full_name,
            recipient_member_id: member.member_id.toString(),
            message_content: personalizedMessage,
            status: 'sending',
        });

        const smsResult = await SMSService.sendSMS(member.cell_number, personalizedMessage, 'EFF', trackingId);

        await SMSLogService.updateSMSLog(trackingId, {
            status: smsResult.success ? 'sent' : 'failed',
            provider_message_id: smsResult.messageId,
            error_message: smsResult.error,
        });

        if (smsResult.success) {
            return { success: true, skipped: false };
        } else {
            return { success: false, skipped: false, error: smsResult.error };
        }
    }

    /**
     * Send single reminder to a specific member
     */
    static async sendSingleReminder(memberId: number, targetGroup: RenewalSMSTargetGroup): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            const template = this.getTemplate(targetGroup);

            const { view, conditions } = this.getTargetGroupCondition(targetGroup);
            const isExpiring = view === 'vw_expiring_soon';

            const query = `
                SELECT
                    member_id,
                    id_number,
                    firstname,
                    surname,
                    full_name,
                    cell_number,
                    expiry_date,
                    ${isExpiring ? "days_until_expiry, renewal_priority as category, 'expiring' as type" : "days_expired, expiry_category as category, 'expired' as type"}
                FROM ${view}
                WHERE member_id = $1 AND cell_number IS NOT NULL AND cell_number != ''
            `;

            const member = await executeQuerySingle<RenewalSMSMember>(query, [memberId]);

            if (!member) {
                return { success: false, error: 'Member not eligible in this category or lacks phone number' };
            }

            const result = await this._sendRenewalSMS(member, targetGroup, template);

            if (result.skipped) {
                return { success: false, error: 'Member already received a reminder in the last 7 days.' };
            }

            if (result.success) {
                return { success: true, message: `Renewal reminder sent to ${member.full_name}` };
            } else {
                return { success: false, error: result.error || 'SMS delivery failed' };
            }

        } catch (error: any) {
            logger.error('Failed to send single renewal reminder', { error: error.message, memberId });
            return { success: false, error: error.message };
        }
    }

    /**
     * Send bulk reminders to an entire target group
     */
    static async sendBulkReminders(targetGroup: RenewalSMSTargetGroup, batchSize: number = 200): Promise<{
        total_targeted: number;
        sent: number;
        failed: number;
        skipped: number;
    }> {
        try {
            const template = this.getTemplate(targetGroup);
            const { view, conditions } = this.getTargetGroupCondition(targetGroup);
            const isExpiring = view === 'vw_expiring_soon';

            // We grab all eligible members, ignoring pagination here since it's a bulk operation.
            // In a massive DB this might need cursor-based batching.
            const query = `
                SELECT
                    member_id,
                    id_number,
                    firstname,
                    surname,
                    full_name,
                    cell_number,
                    expiry_date,
                    ${isExpiring ? "days_until_expiry, renewal_priority as category, 'expiring' as type" : "days_expired, expiry_category as category, 'expired' as type"}
                FROM ${view}
                WHERE cell_number IS NOT NULL AND cell_number != '' AND ${conditions.join(' AND ')}
            `;

            const result = await executeQuery(query);
            const members: RenewalSMSMember[] = Array.isArray(result) ? result : [];

            let sent = 0;
            let failed = 0;
            let skipped = 0;

            for (const member of members) {
                try {
                    const sendResult = await this._sendRenewalSMS(member, targetGroup, template);
                    if (sendResult.skipped) {
                        skipped++;
                    } else if (sendResult.success) {
                        sent++;
                    } else {
                        failed++;
                    }
                } catch (err: any) {
                    logger.error(`Failed sending to member ${member.member_id}`, { error: err.message });
                    failed++;
                }
            }

            logger.info(`Bulk renewal SMS complete for ${targetGroup}`, { total: members.length, sent, failed, skipped });
            return { total_targeted: members.length, sent, failed, skipped };
        } catch (error: any) {
            logger.error(`Bulk renewal SMS failed for ${targetGroup}`, { error: error.message });
            throw error;
        }
    }
}

export default MembershipRenewalSMSService;
