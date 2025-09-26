import { apiGet, api } from './api';

// Analytics interfaces
export interface DashboardStats {
  total_members: number;
  active_members: number;
  pending_applications: number;
  total_meetings: number;
  upcoming_meetings: number;
  total_elections: number;
  active_elections: number;
  leadership_positions_filled: number;
  leadership_positions_vacant: number;
  recent_registrations: number;
  membership_growth_rate: number;
}

export interface MembershipAnalytics {
  total_members: number;
  active_members: number;
  inactive_members: number;
  pending_members: number;
  membership_by_hierarchy: Array<{
    hierarchy_level: string;
    member_count: number;
    percentage: number;
  }>;
  membership_by_status: Array<{
    membership_status: string;
    member_count: number;
    percentage: number;
  }>;
  membership_growth: Array<{
    month: string;
    new_members: number;
    total_members: number;
  }>;
  age_distribution: Array<{
    age_group: string;
    member_count: number;
    percentage: number;
  }>;
  gender_distribution: Array<{
    gender: string;
    member_count: number;
    percentage: number;
  }>;
  geographic_performance?: {
    best_performing_wards?: Array<{
      ward_name: string;
      municipality_name: string;
      province_name: string;
      member_count: number;
      performance_score: number;
    }>;
    improving_areas?: Array<{
      area_name: string;
      area_type: string;
      current_members: number;
      growth_rate: number;
      growth_period: string;
    }>;
    poor_performing_areas?: Array<{
      area_name: string;
      area_type: string;
      current_members: number;
      performance_score: number;
      member_count: number;
      target_count: number;
      performance_gap: number;
    }>;
    top_provinces?: Array<{
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_municipalities?: Array<{
      municipality_name: string;
      province_name: string;
      member_count: number;
      percentage: number;
    }>;
    top_performing_districts?: Array<{
      district_name: string;
      province_name: string;
      member_count: number;
      municipality_count: number;
      performance_score: number;
      growth_rate: number;
      compliance_rate: number;
    }>;
    worst_performing_municipalities?: Array<{
      municipality_name: string;
      district_name: string;
      province_name: string;
      member_count: number;
      target_count: number;
      performance_gap: number;
      compliance_rate: number;
      recommendations: string[];
    }>;
  };
}

export interface MeetingAnalytics {
  total_meetings: number;
  completed_meetings: number;
  cancelled_meetings: number;
  upcoming_meetings: number;
  average_attendance: number;
  meetings_by_type: Array<{
    meeting_type: string;
    meeting_count: number;
    percentage: number;
  }>;
  meetings_by_hierarchy: Array<{
    hierarchy_level: string;
    meeting_count: number;
    average_attendance: number;
  }>;
  monthly_meetings: Array<{
    month: string;
    meeting_count: number;
    attendance_rate: number;
  }>;
}

export interface LeadershipAnalytics {
  total_positions: number;
  filled_positions: number;
  vacant_positions: number;
  total_elections: number;
  completed_elections: number;
  upcoming_elections: number;
  positions_by_hierarchy: Array<{
    hierarchy_level: string;
    total_positions: number;
    filled_positions: number;
    vacancy_rate: number;
  }>;
  leadership_tenure: Array<{
    position_name: string;
    average_tenure_months: number;
    current_appointments: number;
  }>;
  election_participation: Array<{
    election_name: string;
    total_eligible: number;
    votes_cast: number;
    turnout_percentage: number;
  }>;
}

export interface ReportFilters {
  hierarchy_level?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
}

// Analytics API functions
export const analyticsApi = {
  // Get dashboard statistics
  getDashboardStats: (filters?: ReportFilters) =>
    apiGet<{ statistics: DashboardStats }>('/analytics/dashboard', filters),

  // Get membership analytics
  getMembershipAnalytics: (filters?: ReportFilters) =>
    apiGet<{ analytics: MembershipAnalytics }>('/analytics/membership', filters),

  // Get meeting analytics
  getMeetingAnalytics: (filters?: ReportFilters) =>
    apiGet<{ analytics: MeetingAnalytics }>('/analytics/meetings', filters),

  // Get leadership analytics
  getLeadershipAnalytics: (filters?: ReportFilters) =>
    apiGet<{ analytics: LeadershipAnalytics }>('/analytics/leadership', filters),

  // Get business intelligence insights
  getBusinessIntelligence: (filters?: ReportFilters) =>
    apiGet<{ businessIntelligence: any }>('/analytics/business-intelligence', filters),

  // Get comprehensive analytics
  getComprehensiveAnalytics: (filters?: ReportFilters) =>
    apiGet<{
      dashboard: DashboardStats;
      membership: MembershipAnalytics;
      meetings: MeetingAnalytics;
      leadership: LeadershipAnalytics;
      generated_at: string;
      filters: ReportFilters;
    }>('/analytics/comprehensive', filters),

  // Export analytics
  exportAnalytics: (reportType: string, format: string = 'excel', filters?: ReportFilters) =>
    apiGet<{ file_path: string; download_url: string }>(
      `/analytics/export/${reportType}/${format}`,
      filters
    ),

  // Export comprehensive analytics to PDF (landscape)
  exportComprehensiveAnalyticsPDF: async (filters?: ReportFilters): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const url = `/analytics/export/comprehensive/pdf${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await api.get(url, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });

    return response.data;
  },
};

export default analyticsApi;
