// API Response Types for Enhanced Financial Oversight System

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Financial Transaction Types
export interface TransactionQueryParams {
  // Entity filters
  entity_type?: 'application' | 'renewal' | 'all';
  entity_id?: number;

  // Status filters
  payment_status?: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
  financial_status?: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  workflow_stage?: string;

  // Date filters
  date_from?: string;
  date_to?: string;
  created_date_from?: string;
  created_date_to?: string;
  reviewed_date_from?: string;
  reviewed_date_to?: string;

  // Amount filters
  amount_min?: number;
  amount_max?: number;

  // Member filters
  member_search?: string;
  member_id?: number;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;

  // Reviewer filters
  financial_reviewed_by?: number;
  final_reviewed_by?: number;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'created_at' | 'amount' | 'member_name' | 'status' | 'reviewed_at';
  sort_order?: 'ASC' | 'DESC';

  // Advanced filters
  has_payment?: boolean;
  overdue_only?: boolean;
  flagged_only?: boolean;
  requires_attention?: boolean;
}

export interface FinancialTransaction {
  id: number;
  transaction_id: string;
  member_id?: number;
  entity_id: number;
  entity_type: 'application' | 'renewal';
  transaction_type: 'application' | 'renewal' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  payment_method?: string;
  payment_gateway?: string;
  gateway_reference?: string;
  reference_number?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  member_info?: {
    member_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface TransactionQueryResponse {
  transactions: FinancialTransaction[];
  total_count: number;
  filtered_count: number;
  summary: {
    total_amount: number;
    avg_amount: number;
    completed_amount: number;
    pending_amount: number;
    status_breakdown: {
      pending: number;
      under_review: number;
      approved: number;
      rejected: number;
    };
  };
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
    total_pages: number;
    current_page: number;
  };
  query_info?: {
    filters_applied: string[];
    execution_time: string;
  };
}

// Financial Dashboard Types
export interface FinancialMetrics {
  total_revenue: number;
  total_transactions: number;
  average_transaction_value: number;
  pending_transactions: number;
  failed_transactions: number;
  refund_amount: number;
  applications_revenue: number;
  renewals_revenue: number;
  monthly_growth: number;
  daily_transactions: number;
}

export interface FinancialTrends {
  revenue_trend: Array<{ date: string; amount: number }>;
  transaction_trend: Array<{ date: string; count: number }>;
  type_breakdown: Array<{ type: string; amount: number; count: number }>;
  status_distribution: Array<{ status: string; count: number; percentage: number }>;
}

export interface FinancialAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  is_read: boolean;
}

// Renewal Types
export interface RenewalQueryParams extends PaginationParams {
  status?: string;
  member_id?: number;
  renewal_year?: number;
  financial_status?: string;
  date_from?: string;
  date_to?: string;
}

export interface MembershipRenewal {
  id: number;
  member_id: number;
  renewal_year: number;
  renewal_fee: number;
  status: string;
  financial_status?: string;
  payment_status?: string;
  created_at: string;
  updated_at: string;
  member_info?: {
    first_name: string;
    last_name: string;
    email: string;
    member_id: string;
  };
}

// Geographic Types
export interface Province {
  province_code: string;
  province_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface District {
  district_code: string;
  district_name: string;
  province_code: string;
  created_at?: string;
  updated_at?: string;
}

export interface Municipality {
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  created_at?: string;
  updated_at?: string;
}

export interface Ward {
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  created_at?: string;
  updated_at?: string;
}

export interface VotingDistrict {
  voting_district_code: string;
  voting_district_name: string;
  ward_code: string;
  created_at?: string;
  updated_at?: string;
}

// Payment Types
export interface PaymentData {
  applicationId?: number;
  renewalId?: number;
  amount: number;
  currency?: string;
  paymentMethod: 'card' | 'cash' | 'eft' | 'bank_transfer';
  cardData?: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    holder: string;
  };
  receiptNumber?: string;
  receiptImage?: string;
}

export interface PaymentResponse {
  success: boolean;
  payment_id?: string;
  transaction_id?: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  currency: string;
  gateway_reference?: string;
  message?: string;
  redirect_url?: string;
}

// Member Types
export interface Member {
  id: number;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  id_number: string;
  date_of_birth: string;
  gender: string;
  race?: string;
  citizenship?: string;
  language?: string;
  occupation?: string;
  created_at: string;
  updated_at: string;
}

// Lookup Types
export interface LookupItem {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface AllLookupsResponse {
  genders: LookupItem[];
  races: LookupItem[];
  citizenships: LookupItem[];
  languages: LookupItem[];
  occupation_categories: LookupItem[];
  qualifications: LookupItem[];
  marital_statuses: LookupItem[];
  employment_statuses: LookupItem[];
}

// System Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  queue?: {
    queueLength: number;
    currentProcessing: number;
    maxQueueSize: number;
    processingConcurrency: number;
  };
  circuitBreaker?: {
    state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
    failures: number;
    lastFailureTime: number;
  };
  cache?: {
    available: boolean;
  };
}

// Export and Bulk Operation Types
export interface ExportParams {
  format: 'csv' | 'excel' | 'pdf';
  filters?: any;
  includeAll?: boolean;
  columns?: string[];
}

export interface BulkActionParams {
  action: string;
  entity_ids: number[];
  reason?: string;
  data?: any;
}

export interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    id: number;
    success: boolean;
    error?: string;
  }>;
}

// Filter Options
export interface FilterOptions {
  transaction_types: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
  payment_methods: Array<{ value: string; label: string }>;
  date_ranges: Array<{ value: string; label: string }>;
}

// Analytics Types
export interface TransactionAnalytics {
  summary: {
    total_transactions: number;
    total_amount: number;
    average_amount: number;
    period_comparison: {
      current_period: number;
      previous_period: number;
      growth_percentage: number;
    };
  };
  trends: Array<{
    date: string;
    transactions: number;
    amount: number;
  }>;
  breakdown: {
    by_type: Array<{ type: string; count: number; amount: number }>;
    by_status: Array<{ status: string; count: number; percentage: number }>;
    by_payment_method: Array<{ method: string; count: number; amount: number }>;
  };
}
