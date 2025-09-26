// Ward Membership Audit System Types
// Created: 2025-09-07
// Purpose: TypeScript interfaces for comprehensive ward membership audit system

// =====================================================
// Core Data Types
// =====================================================

export interface WardAuditData {
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  municipality_name: string;
  district_name: string;
  province_name: string;
  active_members: number;
  expired_members: number;
  inactive_members: number;
  total_members: number;
  ward_standing: WardStanding;
  standing_level: StandingLevel;
  active_percentage: number;
  target_achievement_percentage: number;
  members_needed_next_level: number;
  last_updated: string;
}

export interface MunicipalityPerformanceData {
  municipality_code: string;
  municipality_name: string;
  district_name: string;
  province_name: string;
  total_wards: number | null;
  good_standing_wards: number | null;
  acceptable_standing_wards: number | null;
  needs_improvement_wards: number | null;
  compliant_wards: number | null;
  compliance_percentage: number | null;
  municipality_performance: MunicipalityPerformance;
  performance_level: PerformanceLevel;
  total_active_members: number | null;
  total_all_members: number | null;
  avg_active_per_ward: number | null;
  wards_needed_compliance: number | null;
  last_updated: string;
}

export interface WardTrendData {
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  municipality_name: string;
  trend_month: string;
  active_members: number;
  total_members: number;
  month_over_month_growth: number | null;
  year_over_year_growth: number | null;
  growth_trend: GrowthTrend;
  monthly_standing: WardStanding;
}

// =====================================================
// Enums and Constants
// =====================================================

export type WardStanding = 'Good Standing' | 'Acceptable Standing' | 'Needs Improvement';
export type StandingLevel = 1 | 2 | 3; // 1=Good, 2=Acceptable, 3=Needs Improvement

export type MunicipalityPerformance = 'Performing Municipality' | 'Underperforming Municipality';
export type PerformanceLevel = 1 | 2; // 1=Performing, 2=Underperforming

export type GrowthTrend = 'Growing' | 'Stable' | 'Declining' | 'No Data';

export const WARD_STANDING_COLORS = {
  'Good Standing': 'success',
  'Acceptable Standing': 'warning', 
  'Needs Improvement': 'error'
} as const;

export const MUNICIPALITY_PERFORMANCE_COLORS = {
  'Performing Municipality': 'success',
  'Underperforming Municipality': 'error'
} as const;

export const GROWTH_TREND_COLORS = {
  'Growing': 'success',
  'Stable': 'info',
  'Declining': 'error',
  'No Data': 'default'
} as const;

export const WARD_STANDING_THRESHOLDS = {
  GOOD_STANDING: 200,
  ACCEPTABLE_STANDING: 100
} as const;

export const MUNICIPALITY_COMPLIANCE_THRESHOLD = 70; // 70% of wards in Good/Acceptable Standing

// =====================================================
// API Response Types
// =====================================================

export interface WardAuditOverviewResponse {
  success: boolean;
  message: string;
  data: {
    audit_overview: {
      // Ward statistics
      total_wards: number;
      good_standing_wards: number;
      acceptable_standing_wards: number;
      needs_improvement_wards: number;
      avg_active_per_ward: number;
      total_active_members: number;
      total_all_members: number;
      overall_compliance_percentage: number;

      // Municipality statistics
      total_municipalities: number;
      performing_municipalities: number;
      underperforming_municipalities: number;
      municipal_compliance_percentage: number;

      // Standing distribution
      standing_distribution: Array<{
        ward_standing: WardStanding;
        standing_level: StandingLevel;
        ward_count: number;
        percentage: number;
      }>;

      // Top performers
      top_performing_municipalities: Array<{
        municipality_name: string;
        compliance_percentage: number;
        total_wards: number;
        compliant_wards: number;
        total_active_members: number;
      }>;

      // Needs attention
      municipalities_needing_attention: Array<{
        municipality_name: string;
        compliance_percentage: number;
        total_wards: number;
        needs_improvement_wards: number;
        wards_needed_compliance: number;
      }>;
    };
  };
  timestamp: string;
}

export interface WardAuditDataResponse {
  success: boolean;
  message: string;
  data: {
    wards: WardAuditData[];
    pagination: PaginationInfo;
  };
  timestamp: string;
}

export interface MunicipalityPerformanceResponse {
  success: boolean;
  message: string;
  data: {
    municipalities: MunicipalityPerformanceData[];
    pagination: PaginationInfo;
  };
  timestamp: string;
}

export interface WardTrendsResponse {
  success: boolean;
  message: string;
  data: {
    trends: WardTrendData[];
    summary: {
      wards_tracked: number;
      total_data_points: number;
      avg_monthly_growth: number | null;
      avg_yearly_growth: number | null;
      growing_periods: number;
      declining_periods: number;
      stable_periods: number;
    };
    filters: {
      months_analyzed: number;
      ward_code: string | null;
      municipality_code: string | null;
      trend_type: string | null;
    };
  };
  timestamp: string;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_records: number;
  records_per_page: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

// =====================================================
// Filter and Sort Types
// =====================================================

export interface WardAuditFilters {
  page?: number;
  limit?: number;
  standing?: WardStanding;
  municipality_code?: string;
  province_code?: string;
  sort_by?: 'ward_name' | 'active_members' | 'standing_level' | 'target_achievement_percentage';
  sort_order?: 'asc' | 'desc';
  search?: string;
}

export interface MunicipalityPerformanceFilters {
  page?: number;
  limit?: number;
  performance?: MunicipalityPerformance;
  province_code?: string;
  sort_by?: 'municipality_name' | 'compliance_percentage' | 'total_active_members' | 'performance_level';
  sort_order?: 'asc' | 'desc';
  search?: string;
}

export interface WardTrendsFilters {
  ward_code?: string;
  municipality_code?: string;
  months?: number;
  trend_type?: 'growth' | 'decline' | 'stable';
}

// =====================================================
// UI State Types
// =====================================================

export interface WardAuditUIState {
  activeTab: 'overview' | 'wards' | 'municipalities' | 'trends';
  selectedWards: string[];
  selectedMunicipalities: string[];
  // Geographic filters for role-based access control
  selectedProvince?: string;
  selectedMunicipality?: string;
  wardFilters: WardAuditFilters;
  municipalityFilters: MunicipalityPerformanceFilters;
  trendsFilters: WardTrendsFilters;
  isLoading: boolean;
  error: string | null;
}

// =====================================================
// Store State Types
// =====================================================

export interface WardMembershipAuditStore {
  // Data
  auditOverview: WardAuditOverviewResponse['data']['audit_overview'] | null;
  wardAuditData: WardAuditData[];
  municipalityPerformanceData: MunicipalityPerformanceData[];
  wardTrendsData: WardTrendData[];
  
  // Pagination
  wardPagination: PaginationInfo | null;
  municipalityPagination: PaginationInfo | null;
  
  // UI State
  uiState: WardAuditUIState;
  
  // Loading States
  overviewLoading: boolean;
  wardDataLoading: boolean;
  municipalityDataLoading: boolean;
  trendsDataLoading: boolean;
  
  // Error States
  overviewError: string | null;
  wardDataError: string | null;
  municipalityDataError: string | null;
  trendsDataError: string | null;
  
  // Actions
  setAuditOverview: (overview: WardAuditOverviewResponse['data']['audit_overview']) => void;
  setWardAuditData: (data: WardAuditData[]) => void;
  setMunicipalityPerformanceData: (data: MunicipalityPerformanceData[]) => void;
  setWardTrendsData: (data: WardTrendData[]) => void;
  setWardPagination: (pagination: PaginationInfo) => void;
  setMunicipalityPagination: (pagination: PaginationInfo) => void;
  setUIState: (state: Partial<WardAuditUIState>) => void;
  setOverviewLoading: (loading: boolean) => void;
  setWardDataLoading: (loading: boolean) => void;
  setMunicipalityDataLoading: (loading: boolean) => void;
  setTrendsDataLoading: (loading: boolean) => void;
  setOverviewError: (error: string | null) => void;
  setWardDataError: (error: string | null) => void;
  setMunicipalityDataError: (error: string | null) => void;
  setTrendsDataError: (error: string | null) => void;
  // Geographic filter actions
  setSelectedProvince: (provinceCode: string | undefined) => void;
  setSelectedMunicipality: (municipalityCode: string | undefined) => void;
  resetStore: () => void;
}

// =====================================================
// Detail View Types
// =====================================================

export interface WardDetailInfo {
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  municipality_name: string;
  district_name: string;
  province_name: string;
  active_members: number;
  expired_members: number;
  inactive_members: number;
  total_members: number;
  ward_standing: WardStanding;
  standing_level: number;
  active_percentage: number;
  target_achievement_percentage: number;
  members_needed_next_level: number;
  last_updated: string;
}

export interface WardHistoricalTrend {
  trend_month: string;
  active_members: number;
  total_members: number;
  growth_trend: GrowthTrend;
  monthly_standing: WardStanding;
}

export interface WardComparison {
  ward_code: string;
  ward_name: string;
  active_members: number;
  ward_standing: WardStanding;
  target_achievement_percentage: number;
}

export interface WardDetailsResponse {
  success: boolean;
  message: string;
  data: {
    ward_info: WardDetailInfo;
    historical_trends: WardHistoricalTrend[];
    municipality_comparison: WardComparison[];
    recommendations: string[];
  };
  timestamp: string;
}

export interface MunicipalityDetailInfo {
  municipality_code: string;
  municipality_name: string;
  district_name: string;
  province_name: string;
  total_wards: number;
  good_standing_wards: number;
  acceptable_standing_wards: number;
  needs_improvement_wards: number;
  compliant_wards: number;
  compliance_percentage: number;
  municipality_performance: MunicipalityPerformance;
  performance_level: number;
  total_active_members: number;
  total_all_members: number;
  avg_active_per_ward: number;
  wards_needed_compliance: number;
  last_updated: string;
}

export interface MunicipalityWardBreakdown {
  ward_code: string;
  ward_name: string;
  active_members: number;
  expired_members: number;
  inactive_members: number;
  total_members: number;
  ward_standing: WardStanding;
  standing_level: number;
  active_percentage: number;
  target_achievement_percentage: number;
  members_needed_next_level: number;
}

export interface MunicipalityHistoricalTrend {
  trend_month: string;
  total_active_members: number;
  total_all_members: number;
  wards_tracked: number;
}

export interface MunicipalityDetailsResponse {
  success: boolean;
  message: string;
  data: {
    municipality_info: MunicipalityDetailInfo;
    wards_breakdown: MunicipalityWardBreakdown[];
    historical_trends: MunicipalityHistoricalTrend[];
    recommendations: string[];
  };
  timestamp: string;
}
