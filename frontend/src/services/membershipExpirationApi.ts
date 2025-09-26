import { api } from '../lib/api';
import type {
  EnhancedOverviewResponse,
  ExpiringSoonResponse,
  ExpiredMembersResponse,
  ExpiringSoonFilters,
  ExpiredMembersFilters,
  ApiResponse
} from '../types/membershipExpiration';

// Base endpoint for membership expiration
const BASE_ENDPOINT = '/membership-expiration';

/**
 * Membership Expiration API Service
 * Provides functions to interact with the new database view-powered endpoints
 */
export const membershipExpirationApi = {
  /**
   * Get enhanced status overview using database views
   * Returns comprehensive overview with priority and category summaries
   */
  getEnhancedOverview: async (): Promise<EnhancedOverviewResponse> => {
    const response = await api.get<ApiResponse<EnhancedOverviewResponse>>(
      `${BASE_ENDPOINT}/enhanced-overview`
    );
    return response.data.data;
  },

  /**
   * Get members expiring soon with filtering and pagination
   * @param filters - Filter options for priority, pagination, and sorting
   */
  getExpiringSoonMembers: async (filters: ExpiringSoonFilters = {}): Promise<ExpiringSoonResponse> => {
    const params = new URLSearchParams();
    
    if (filters.priority && filters.priority !== 'all') {
      params.append('priority', filters.priority);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `${BASE_ENDPOINT}/expiring-soon?${queryString}`
      : `${BASE_ENDPOINT}/expiring-soon`;

    const response = await api.get<ApiResponse<ExpiringSoonResponse>>(endpoint);
    return response.data.data;
  },

  /**
   * Get expired members with categorization and pagination
   * @param filters - Filter options for category, pagination, and sorting
   */
  getExpiredMembers: async (filters: ExpiredMembersFilters = {}): Promise<ExpiredMembersResponse> => {
    const params = new URLSearchParams();
    
    if (filters.category && filters.category !== 'all') {
      params.append('category', filters.category);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `${BASE_ENDPOINT}/expired?${queryString}`
      : `${BASE_ENDPOINT}/expired`;

    const response = await api.get<ApiResponse<ExpiredMembersResponse>>(endpoint);
    return response.data.data;
  },

  /**
   * Send SMS notifications to members
   * @param notificationType - Type of notification to send
   * @param memberIds - Optional array of specific member IDs
   * @param customMessage - Optional custom message
   * @param sendImmediately - Whether to send immediately
   */
  sendSMSNotifications: async (data: {
    notification_type: '30_day_reminder' | '7_day_urgent' | 'expired_today' | '7_day_grace';
    member_ids?: string[];
    custom_message?: string;
    send_immediately?: boolean;
  }) => {
    const response = await api.post(`${BASE_ENDPOINT}/send-sms-notifications`, data);
    return response.data;
  },

  /**
   * Perform bulk membership renewal
   * @param memberIds - Array of member IDs to renew
   * @param renewalPeriodMonths - Number of months to extend membership
   * @param sendConfirmationSms - Whether to send confirmation SMS
   */
  bulkRenewal: async (data: {
    member_ids: string[];
    renewal_period_months: number;
    send_confirmation_sms?: boolean;
  }) => {
    const response = await api.post(`${BASE_ENDPOINT}/bulk-renewal`, data);
    return response.data;
  },

  /**
   * Get expiration trends and analytics
   * @param period - Time period for analytics
   * @param includeRenewalRates - Whether to include renewal rate data
   */
  getTrendsAnalytics: async (filters: {
    period?: 'last_30_days' | 'last_90_days' | 'last_year';
    include_renewal_rates?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    
    if (filters.period) {
      params.append('period', filters.period);
    }
    if (filters.include_renewal_rates !== undefined) {
      params.append('include_renewal_rates', filters.include_renewal_rates.toString());
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `${BASE_ENDPOINT}/trends-analytics?${queryString}`
      : `${BASE_ENDPOINT}/trends-analytics`;

    const response = await api.get(endpoint);
    return response.data;
  },

  /**
   * Export expiration report as PDF
   * @param status - Status filter for export
   * @param title - Custom title for the report
   * @param includeContactDetails - Whether to include contact details
   */
  exportToPDF: async (filters: {
    status?: string;
    title?: string;
    include_contact_details?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.title) {
      params.append('title', filters.title);
    }
    if (filters.include_contact_details !== undefined) {
      params.append('include_contact_details', filters.include_contact_details.toString());
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `${BASE_ENDPOINT}/export-pdf?${queryString}`
      : `${BASE_ENDPOINT}/export-pdf`;

    // Return blob for PDF download
    const response = await api.get(endpoint, {
      responseType: 'blob'
    });
    
    return response.data;
  }
};

export default membershipExpirationApi;
