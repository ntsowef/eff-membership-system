import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export interface CommunicationAnalytics {
  // Overview metrics
  total_campaigns: number;
  active_campaigns: number;
  total_messages_sent: number;
  total_messages_delivered: number;
  overall_delivery_rate: number;
  
  // Channel statistics
  email_stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  
  sms_stats: {
    sent: number;
    delivered: number;
    failed: number;
  };
  
  in_app_stats: {
    sent: number;
    delivered: number;
    read: number;
  };
  
  // Performance metrics
  channel_performance: {
    email: { 
      delivery_rate: number; 
      open_rate: number; 
      click_rate: number; 
      bounce_rate: number;
    };
    sms: { 
      delivery_rate: number; 
      failure_rate: number;
    };
    in_app: { 
      delivery_rate: number; 
      read_rate: number; 
    };
  };
  
  // Time-based data
  daily_stats: Array<{
    date: string;
    messages_sent: number;
    messages_delivered: number;
    campaigns_launched: number;
  }>;
  
  // Geographic breakdown
  geographic_stats: Array<{
    province_code: string;
    province_name: string;
    total_recipients: number;
    delivery_rate: number;
    engagement_rate: number;
  }>;
  
  // Campaign performance
  top_campaigns: Array<{
    id: number;
    name: string;
    delivery_rate: number;
    engagement_rate: number;
    total_recipients: number;
  }>;
}

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  campaign_ids?: number[];
  delivery_channels?: string[];
  geographic_filters?: {
    province_codes?: string[];
    district_codes?: string[];
  };
}

export class AnalyticsService {
  // Get comprehensive communication analytics
  static async getCommunicationAnalytics(filters: AnalyticsFilters = {}): Promise<CommunicationAnalytics> {
    try {
      const dateFilter = this.buildDateFilter(filters);
      const campaignFilter = this.buildCampaignFilter(filters);
      
      // Get overview metrics
      const overview = await this.getOverviewMetrics(dateFilter, campaignFilter);
      
      // Get channel statistics
      const channelStats = await this.getChannelStatistics(dateFilter, campaignFilter);
      
      // Get daily statistics
      const dailyStats = await this.getDailyStatistics(filters);
      
      // Get geographic breakdown
      const geographicStats = await this.getGeographicStatistics(filters);
      
      // Get top performing campaigns
      const topCampaigns = await this.getTopCampaigns(filters);
      
      return {
        ...overview,
        ...channelStats,
        daily_stats: dailyStats,
        geographic_stats: geographicStats,
        top_campaigns: topCampaigns
      };
    } catch (error) {
      throw createDatabaseError('Failed to get communication analytics', error);
    }
  }

  // Get overview metrics
  private static async getOverviewMetrics(dateFilter: string, campaignFilter: string) {
    const query = `
        SELECT
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT CASE WHEN c.status IN ('Sending', 'Scheduled') THEN c.id END) as active_campaigns,
        COALESCE(SUM(c.total_sent), 0) as total_messages_sent,
        COALESCE(SUM(c.total_delivered), 0) as total_messages_delivered,
        CASE
          WHEN SUM(c.total_sent) > 0
          THEN ROUND((SUM(c.total_delivered) / SUM(c.total_sent)) * 100, 2)
          ELSE 0
        END as overall_delivery_rate
      FROM communication_campaigns c
      WHERE 1 = 1 ${dateFilter} ${campaignFilter}
    `;

    return await executeQuerySingle(query);
  }

  // Get channel-specific statistics
  private static async getChannelStatistics(dateFilter: string, campaignFilter: string) {
    // Email statistics
    const emailStats = await executeQuerySingle(`
        SELECT
        COUNT(*) as sent,
        SUM(CASE WHEN delivery_status IN ('Delivered', 'Opened', 'Clicked') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'Opened' THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN delivery_status = 'Clicked' THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN delivery_status = 'Bounced' THEN 1 ELSE 0 END) as bounced,
        0 as unsubscribed
      FROM message_deliveries md
      JOIN communication_campaigns c ON md.campaign_id = c.id
      WHERE md.delivery_channel = 'Email' ${dateFilter.replace('c.', 'c.')} ${campaignFilter.replace('c.', 'c.')}
    `);

    // SMS statistics
    const smsStats = await executeQuerySingle(`
        SELECT
        COUNT(*) as sent,
        SUM(CASE WHEN delivery_status IN ('Delivered') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status IN ('Failed', 'Bounced') THEN 1 ELSE 0 END) as failed
      FROM message_deliveries md
      JOIN communication_campaigns c ON md.campaign_id = c.id
      WHERE md.delivery_channel = 'SMS' ${dateFilter.replace('c.', 'c.')} ${campaignFilter.replace('c.', 'c.')}
    `);

    // In-App statistics
    const inAppStats = await executeQuerySingle(`
        SELECT
        COUNT(*) as sent,
        SUM(CASE WHEN delivery_status IN ('Delivered', 'Read') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'Read' THEN 1 ELSE 0 END) as read
      FROM message_deliveries md
      JOIN communication_campaigns c ON md.campaign_id = c.id
      WHERE md.delivery_channel = 'In-App' ${dateFilter.replace('c.', 'c.')} ${campaignFilter.replace('c.', 'c.')}
    `);

    // Calculate performance metrics
    const emailPerformance = {
      delivery_rate: emailStats.sent > 0 ? Math.round((emailStats.delivered / emailStats.sent) * 100) : 0,
      open_rate: emailStats.delivered > 0 ? Math.round((emailStats.opened / emailStats.delivered) * 100) : 0,
      click_rate: emailStats.opened > 0 ? Math.round((emailStats.clicked / emailStats.opened) * 100) : 0,
      bounce_rate: emailStats.sent > 0 ? Math.round((emailStats.bounced / emailStats.sent) * 100) : 0
    };

    const smsPerformance = {
      delivery_rate: smsStats.sent > 0 ? Math.round((smsStats.delivered / smsStats.sent) * 100) : 0,
      failure_rate: smsStats.sent > 0 ? Math.round((smsStats.failed / smsStats.sent) * 100) : 0
    };

    const inAppPerformance = {
      delivery_rate: inAppStats.sent > 0 ? Math.round((inAppStats.delivered / inAppStats.sent) * 100) : 0,
      read_rate: inAppStats.delivered > 0 ? Math.round((inAppStats.read / inAppStats.delivered) * 100) : 0
    };

    return {
      email_stats: emailStats,
      sms_stats: smsStats,
      in_app_stats: inAppStats,
      channel_performance: {
        email: emailPerformance,
        sms: smsPerformance,
        in_app: inAppPerformance
      }
    };
  }

  // Get daily statistics for trend analysis
  private static async getDailyStatistics(filters: AnalyticsFilters) {
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters.date_to || new Date().toISOString().split('T')[0];

    const query = `
      SELECT
        md.created_at::DATE as date,
        COUNT(DISTINCT md.id) as messages_sent,
        COUNT(DISTINCT CASE WHEN md.delivery_status IN ('Delivered', 'Opened', 'Clicked', 'Read') THEN md.id END) as messages_delivered,
        COUNT(DISTINCT c.id) as campaigns_launched
      FROM message_deliveries md
      LEFT JOIN communication_campaigns c ON md.campaign_id = c.id AND c.created_at::DATE = md.created_at::DATE
      WHERE md.created_at::DATE BETWEEN $1 AND $2
      GROUP BY md.created_at::DATE
      ORDER BY date ASC
    `;

    return await executeQuery(query, [dateFrom, dateTo]);
  }

  // Get geographic performance breakdown
  private static async getGeographicStatistics(filters: AnalyticsFilters) {
    let whereClause = '';
    const params: any[] = [];

    if (filters.geographic_filters?.province_codes?.length) {
      const placeholders = filters.geographic_filters.province_codes.map((_, index) => `$${params.length + index + 1}`).join(',');
      whereClause += ` AND m.province_code IN (${placeholders})`;
      params.push(...filters.geographic_filters.province_codes);
    }

    const query = `
        SELECT
        m.province_code,
        p.province_name,
        COUNT(DISTINCT md.id) as total_recipients,
        ROUND(
          (COUNT(DISTINCT CASE WHEN md.delivery_status IN ('Delivered', 'Opened', 'Clicked', 'Read') THEN md.id END) /
           COUNT(DISTINCT md.id)) * 100, 2
        ) as delivery_rate,
        ROUND(
          (COUNT(DISTINCT CASE WHEN md.delivery_status IN ('Opened', 'Clicked', 'Read') THEN md.id END) /
           COUNT(DISTINCT CASE WHEN md.delivery_status IN ('Delivered', 'Opened', 'Clicked', 'Read') THEN md.id END)) * 100, 2
        ) as engagement_rate
      FROM message_deliveries md
      JOIN members_consolidated m ON md.recipient_id = m.member_id
      JOIN provinces p ON m.province_code = p.province_code
      WHERE md.recipient_type = 'Member' ${whereClause}
      GROUP BY m.province_code, p.province_name
      HAVING total_recipients > 0
      ORDER BY total_recipients DESC
      LIMIT 10
    `;

    return await executeQuery(query, params);
  }

  // Get top performing campaigns
  private static async getTopCampaigns(filters: AnalyticsFilters) {
    const dateFilter = this.buildDateFilter(filters);

    const query = `
        SELECT
        c.id,
        c.name,
        ROUND(
          CASE WHEN c.total_sent > 0
          THEN (c.total_delivered / c.total_sent) * 100
          ELSE 0 END, 2
        ) as delivery_rate,
        ROUND(
          CASE WHEN c.total_delivered > 0
          THEN (c.total_opened / c.total_delivered) * 100
          ELSE 0 END, 2
        ) as engagement_rate,
        c.recipient_count as total_recipients
      FROM communication_campaigns c
      WHERE c.status = 'Completed' ${dateFilter}
        ORDER BY delivery_rate DESC, engagement_rate DESC
      LIMIT 10
    `;

    return await executeQuery(query);
  }

  // Get campaign comparison data
  static async getCampaignComparison(campaignIds: number[]) {
    if (campaignIds.length === 0) return [];

    const placeholders = campaignIds.map((_, index) => `$${index + 1}`).join(',');
    const query = `
        SELECT
        c.id,
        c.name,
        c.campaign_type,
        c.total_sent,
        c.total_delivered,
        c.total_opened,
        c.total_clicked,
        c.total_failed,
        ROUND((c.total_delivered::numeric / NULLIF(c.total_sent, 0)) * 100, 2) as delivery_rate,
        ROUND((c.total_opened::numeric / NULLIF(c.total_delivered, 0)) * 100, 2) as open_rate,
        ROUND((c.total_clicked::numeric / NULLIF(c.total_opened, 0)) * 100, 2) as click_rate,
        c.created_at,
        c.completed_at
      FROM communication_campaigns c
      WHERE c.id IN (${placeholders})
      ORDER BY c.created_at DESC
    `;

    return await executeQuery(query, campaignIds);
  }

  // Get engagement trends over time
  static async getEngagementTrends(filters: AnalyticsFilters) {
    const dateFrom = filters.date_from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters.date_to || new Date().toISOString().split('T')[0];

    const query = `
      SELECT
        md.created_at::DATE as date,
        md.delivery_channel,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN md.delivery_status IN ('Delivered', 'Opened', 'Clicked', 'Read') THEN 1 END) as delivered,
        COUNT(CASE WHEN md.delivery_status IN ('Opened', 'Read') THEN 1 END) as opened,
        COUNT(CASE WHEN md.delivery_status = 'Clicked' THEN 1 END) as clicked
      FROM message_deliveries md
      WHERE md.created_at::DATE BETWEEN $1 AND $2
      GROUP BY md.created_at::DATE, md.delivery_channel
      ORDER BY date ASC, delivery_channel
    `;

    return await executeQuery(query, [dateFrom, dateTo]);
  }

  // Helper methods
  private static buildDateFilter(filters: AnalyticsFilters): string {
    let dateFilter = '';
    if (filters.date_from) {
      dateFilter += ` AND c.created_at >= '${filters.date_from}'`;
    }
    if (filters.date_to) {
      dateFilter += ` AND c.created_at <= '${filters.date_to}'`;
    }
    return dateFilter;
  }

  private static buildCampaignFilter(filters: AnalyticsFilters): string {
    if (filters.campaign_ids?.length) {
      return ` AND c.id IN (${filters.campaign_ids.join(',')})`;
    }
    return '';
  }
}
