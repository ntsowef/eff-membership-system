// TypeScript interfaces for membership expiration data

export interface ExpiringSoonMember {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  cell_number?: string;
  email?: string;
  ward_number?: number;
  municipality_name?: string;
  expiry_date: string;
  membership_amount: number;
  days_until_expiry: number;
  renewal_priority: 'Urgent (1 Week)' | 'High Priority (2 Weeks)' | 'Medium Priority (1 Month)';
}

export interface ExpiredMember {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  cell_number?: string;
  email?: string;
  ward_number?: number;
  municipality_name?: string;
  expiry_date: string;
  membership_amount: number;
  days_expired: number;
  expiry_category: 'Recently Expired' | 'Expired 1-3 Months' | 'Expired 3-12 Months' | 'Expired Over 1 Year';
}

export interface PrioritySummary {
  renewal_priority: string;
  count: number;
}

export interface CategorySummary {
  expiry_category: string;
  count: number;
}

export interface EnhancedStatusOverview {
  expiring_soon_summary: PrioritySummary[];
  expired_summary: CategorySummary[];
  total_expiring_soon: number;
  total_expired: number;
  urgent_renewals: number;
  recently_expired: number;
}

export interface ExpiringSoonResponse {
  members: ExpiringSoonMember[];
  priority_summary: PrioritySummary[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    records_per_page: number;
  };
}

export interface ExpiredMembersResponse {
  members: ExpiredMember[];
  category_summary: CategorySummary[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    records_per_page: number;
  };
}

export interface EnhancedOverviewResponse {
  enhanced_overview: EnhancedStatusOverview;
  summary: {
    total_expiring_soon: number;
    urgent_renewals: number;
    total_expired: number;
    recently_expired: number;
  };
}

// Filter and pagination interfaces
export interface ExpiringSoonFilters {
  priority?: 'Urgent (1 Week)' | 'High Priority (2 Weeks)' | 'Medium Priority (1 Month)' | 'all';
  page?: number;
  limit?: number;
  sort_by?: 'days_until_expiry' | 'expiry_date' | 'full_name' | 'municipality_name';
  sort_order?: 'asc' | 'desc';
}

export interface ExpiredMembersFilters {
  category?: 'Recently Expired' | 'Expired 1-3 Months' | 'Expired 3-12 Months' | 'Expired Over 1 Year' | 'all';
  page?: number;
  limit?: number;
  sort_by?: 'days_expired' | 'expiry_date' | 'full_name' | 'municipality_name';
  sort_order?: 'asc' | 'desc';
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// Priority and category constants for UI
export const RENEWAL_PRIORITIES = [
  'Urgent (1 Week)',
  'High Priority (2 Weeks)',
  'Medium Priority (1 Month)'
] as const;

export const EXPIRY_CATEGORIES = [
  'Recently Expired',
  'Expired 1-3 Months',
  'Expired 3-12 Months',
  'Expired Over 1 Year'
] as const;

// Priority colors for UI
export const PRIORITY_COLORS = {
  'Urgent (1 Week)': 'error',
  'High Priority (2 Weeks)': 'warning',
  'Medium Priority (1 Month)': 'info'
} as const;

// Category colors for UI
export const CATEGORY_COLORS = {
  'Recently Expired': 'error',
  'Expired 1-3 Months': 'warning',
  'Expired 3-12 Months': 'info',
  'Expired Over 1 Year': 'default'
} as const;
