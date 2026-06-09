// Local helper for formatting phone numbers since it wasn't exported from smsManagementService
const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        return '27' + cleaned.substring(1);
    }
    return cleaned;
};
import { executeQuery, executeQuerySingle } from '../config/database-hybrid';
import { logger } from '../utils/logger';

export interface SMSReportFilters {
    startDate?: string;
    endDate?: string;
    category?: string;
    status?: string;
    provinceCode?: string;
    search?: string;
    page?: number;
    limit?: number;
}

// SQL that unions sms_messages and sms_send_log into a single normalised view.
// Birthday and Quick Send are excluded from sms_send_log because birthdaySMSService
// and the quick-send route already write those rows into sms_messages.
const UNIFIED_SMS_CTE = `
  WITH sms_unified AS (
    SELECT
      m.message_id::TEXT                           AS message_id,
      m.recipient_number,
      m.recipient_name,
      m.category,
      LOWER(m.status)                              AS delivery_status,
      COALESCE(m.sent_at, m.created_at)            AS sent_at,
      m.delivered_at,
      m.failed_at,
      COALESCE(m.provider_name, 'JSON Applink')    AS provider_name,
      m.error_code,
      m.error_message,
      m.cost_per_message                           AS cost,
      c.campaign_name
    FROM sms_messages m
    LEFT JOIN sms_campaigns c ON m.campaign_id = c.campaign_id

    UNION ALL

    SELECT
      s.message_id,
      s.recipient_phone                            AS recipient_number,
      s.recipient_name,
      CASE s.source_type
        WHEN 'voter_registration'  THEN 'Voter Registration'
        WHEN 'expiration_reminder' THEN 'Membership Renewal'
        WHEN 'otp'                 THEN 'OTP'
        WHEN 'campaign'            THEN 'Campaign'
        WHEN 'bulk'                THEN 'Campaign'
        WHEN 'manual'              THEN 'Quick Send'
        WHEN 'system'              THEN 'System'
        ELSE 'General'
      END                                          AS category,
      s.status                                     AS delivery_status,
      s.created_at                                 AS sent_at,
      CASE WHEN s.status = 'delivered'
           THEN s.delivery_timestamp END           AS delivered_at,
      NULL::TIMESTAMP                              AS failed_at,
      COALESCE(s.provider_name, 'JSON Applink')    AS provider_name,
      s.error_code,
      s.error_message,
      s.cost,
      NULL::VARCHAR                                AS campaign_name
    FROM sms_send_log s
    -- Exclude types already written to sms_messages to avoid double-counting
    WHERE s.source_type NOT IN ('quick_send', 'birthday')
  )
`;

export class SMSReportService {
    /**
     * Retrieves a paginated list of SMS messages based on filters.
     */
    static async getMessagesReport(filters: SMSReportFilters) {
        const {
            page = 1,
            limit = 50
        } = filters;

        const offset = (page - 1) * limit;
        const { whereClause, params } = this.buildReportFilters(filters);

        try {
            const query = `
        ${UNIFIED_SMS_CTE}
        SELECT *
        FROM sms_unified
        ${whereClause ? 'WHERE ' + whereClause : ''}
        ORDER BY sent_at DESC NULLS LAST
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

            const countQuery = `
        ${UNIFIED_SMS_CTE}
        SELECT COUNT(*) AS total
        FROM sms_unified
        ${whereClause ? 'WHERE ' + whereClause : ''}
      `;

            const messages = await executeQuery(query, [...params, limit, offset]);
            const countResult = await executeQuerySingle(countQuery, params);
            const totalCount = parseInt(countResult?.total || '0', 10);

            return {
                messages: messages.map((m: any) => ({
                    ...m,
                    recipient_number: formatPhoneNumber(m.recipient_number) || m.recipient_number
                })),
                pagination: {
                    totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            logger.error('Error in getMessagesReport:', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    /**
     * Generates a summary of SMS activity based on filters.
     */
    static async getReportSummary(filters: SMSReportFilters) {
        const { whereClause, params } = this.buildReportFilters(filters);

        try {
            const summaryQuery = `
        ${UNIFIED_SMS_CTE}
        SELECT
          COUNT(*)                                                              AS total_messages,
          SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END)      AS total_delivered,
          SUM(CASE WHEN delivery_status = 'failed'    THEN 1 ELSE 0 END)      AS total_failed,
          SUM(CASE WHEN delivery_status IN ('pending','sending','queued')
                   THEN 1 ELSE 0 END)                                         AS total_pending,
          SUM(CASE WHEN delivery_status = 'sent'      THEN 1 ELSE 0 END)      AS total_sent,
          COUNT(DISTINCT recipient_number)                                      AS unique_recipients,
          SUM(COALESCE(cost, 0))                                               AS total_cost
        FROM sms_unified
        ${whereClause ? 'WHERE ' + whereClause : ''}
      `;

            const categoryQuery = `
        ${UNIFIED_SMS_CTE}
        SELECT category, COUNT(*) AS count
        FROM sms_unified
        ${whereClause ? 'WHERE ' + whereClause : ''}
        GROUP BY category
        ORDER BY count DESC
      `;

            const [summaryResult, categoryResults] = await Promise.all([
                executeQuerySingle(summaryQuery, params),
                executeQuery(categoryQuery, params)
            ]);

            const total     = parseInt(summaryResult?.total_messages || '0', 10);
            const delivered = parseInt(summaryResult?.total_delivered || '0', 10);
            const sent      = parseInt(summaryResult?.total_sent || '0', 10);
            const successRate = total > 0 ? (((delivered + sent) / total) * 100).toFixed(2) : '0.00';

            return {
                // Keyed as "summary" so the frontend can read response.data.data.summary.*
                summary: {
                    total_sent:        total,
                    total_delivered:   delivered,
                    total_failed:      parseInt(summaryResult?.total_failed  || '0', 10),
                    total_pending:     parseInt(summaryResult?.total_pending || '0', 10),
                    unique_recipients: parseInt(summaryResult?.unique_recipients || '0', 10),
                    total_cost:        parseFloat(summaryResult?.total_cost || '0').toFixed(2)
                },
                successRate,
                byCategory: (categoryResults as any[]).reduce((acc: any, row: any) => {
                    acc[row.category || 'Unknown'] = parseInt(row.count, 10);
                    return acc;
                }, {})
            };
        } catch (error) {
            logger.error('Error in getReportSummary:', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    /**
     * Detects duplicate phone numbers in the members table.
     */
    static async getDuplicateNumbersReport(filters: { search?: string, limit?: number, page?: number }) {
        const { search, limit = 50, page = 1 } = filters;
        const offset = (page - 1) * limit;

        try {
            let whereClause = "WHERE m.cell_number IS NOT NULL AND m.cell_number != ''";
            let params: any[] = [];
            let paramCount = 1;

            if (search) {
                whereClause += ` AND m.cell_number LIKE $${paramCount}`;
                params.push(`%${search}%`);
                paramCount++;
            }

            const query = `
        SELECT
          m.cell_number AS phone_number,
          COUNT(m.member_id) AS member_count
        FROM members_consolidated m
        ${whereClause}
        GROUP BY m.cell_number
        HAVING COUNT(m.member_id) > 1
        ORDER BY member_count DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

            const countQuery = `
        SELECT COUNT(*) AS total FROM (
          SELECT m.cell_number
          FROM members_consolidated m
          ${whereClause}
          GROUP BY m.cell_number
          HAVING COUNT(m.member_id) > 1
        ) AS sub
      `;

            const statsQuery = `
        SELECT
          COUNT(DISTINCT cell_number) AS unique_numbers,
          SUM(count) AS total_affected_members
        FROM (
          SELECT cell_number, COUNT(member_id) AS count
          FROM members_consolidated
          WHERE cell_number IS NOT NULL AND cell_number != ''
          GROUP BY cell_number
          HAVING COUNT(member_id) > 1
        ) AS sub
      `;

            const [duplicates, countResult, statsResult] = await Promise.all([
                executeQuery(query, [...params, limit, offset]),
                executeQuerySingle(countQuery, params),
                executeQuerySingle(statsQuery, [])
            ]);

            const totalCount           = parseInt(countResult?.total || '0', 10);
            const uniqueNumbers        = parseInt(statsResult?.unique_numbers || '0', 10);
            const totalAffectedMembers = parseInt(statsResult?.total_affected_members || '0', 10);

            const formattedDuplicates = (duplicates as any[]).map((d: any) => ({
                ...d,
                phone_number:              formatPhoneNumber(d.phone_number) || d.phone_number,
                member_count:              parseInt(d.member_count, 10),
                messages_skipped_estimate: parseInt(d.member_count, 10) - 1
            }));

            return {
                duplicates: formattedDuplicates,
                stats: {
                    uniqueDuplicateNumbers:   uniqueNumbers,
                    totalAffectedMembers,
                    estimatedMessagesSkipped: totalAffectedMembers - uniqueNumbers
                },
                pagination: {
                    totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            logger.error('Error in getDuplicateNumbersReport:', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    /**
     * Helper to build SQL WHERE clause from filters.
     * Column names must match the aliases used in UNIFIED_SMS_CTE.
     */
    private static buildReportFilters(filters: SMSReportFilters): { whereClause: string, params: any[] } {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.startDate) {
            conditions.push(`sent_at >= $${paramIndex++}`);
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            conditions.push(`sent_at <= $${paramIndex++}`);
            params.push(filters.endDate);
        }

        if (filters.category && filters.category !== 'All' && filters.category !== 'all') {
            conditions.push(`LOWER(category) = LOWER($${paramIndex++})`);
            params.push(filters.category);
        }

        if (filters.status && filters.status !== 'All' && filters.status !== 'all') {
            conditions.push(`delivery_status = LOWER($${paramIndex++})`);
            params.push(filters.status);
        }

        if (filters.search) {
            const searchTerm = `%${filters.search}%`;
            conditions.push(`(
        recipient_number ILIKE $${paramIndex} OR
        recipient_name   ILIKE $${paramIndex} OR
        campaign_name    ILIKE $${paramIndex}
      )`);
            params.push(searchTerm);
            paramIndex++;
        }

        return {
            whereClause: conditions.join(' AND '),
            params
        };
    }

    /**
     * Generates a CSV string containing SMS messages based on filters.
     */
    static async generateCsvExport(filters: SMSReportFilters): Promise<string> {
        try {
            const reportData = await this.getMessagesReport({ ...filters, limit: 10000 });
            const messages = reportData.messages;

            if (messages.length === 0) {
                return 'Date,Category,Phone,Recipient Name,Status,Provider,Cost,Campaign Name,Error Info\n';
            }

            const headers = ['Date', 'Category', 'Phone', 'Recipient Name', 'Status', 'Provider', 'Cost', 'Campaign Name', 'Error Info'];

            const rows = messages.map((msg: any) => {
                return [
                    new Date(msg.sent_at || msg.created_at).toLocaleString(),
                    msg.category || 'General',
                    msg.recipient_number,
                    msg.recipient_name || '',
                    msg.delivery_status || msg.status,
                    msg.provider_name || '',
                    msg.cost ? Number(msg.cost).toFixed(4) : '0.0000',
                    msg.campaign_name || '',
                    msg.error_message || ''
                ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
            });

            return [headers.join(','), ...rows].join('\n');
        } catch (error) {
            logger.error('Error in generateCsvExport:', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
}
