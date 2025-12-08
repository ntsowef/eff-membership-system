/**
 * Membership-related type definitions
 */

export type MembershipFilterType = 'all' | 'good_standing' | 'active';

export interface MembershipStatusBreakdown {
  status_id: number;
  status_name: string;
  status_code: string;
  is_active: boolean;
  allows_voting: boolean;
  allows_leadership: boolean;
  member_count: number;
  percentage: number;
}

export interface MembershipAnalyticsSummary {
  total_members: number;
  good_standing_count: number;
  good_standing_percentage: string;
  active_count: number;
  active_percentage: string;
  inactive_count: number;
  inactive_percentage: string;
}

export interface MembershipAnalyticsData {
  summary: MembershipAnalyticsSummary;
  breakdown_by_status: MembershipStatusBreakdown[];
}

