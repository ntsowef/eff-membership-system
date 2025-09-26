import axios from 'axios';
import type {
  ApiResponse,
  TransactionQueryParams,
  TransactionQueryResponse,
  FinancialMetrics,
  FinancialTrends,
  FinancialAlert,
  PaymentData,
  PaymentResponse,
  SystemHealth,
  ExportParams,
  BulkActionParams,
  BulkActionResponse,
  FilterOptions,
  TransactionAnalytics,
  AllLookupsResponse,
} from '../types/api';

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (try both possible keys)
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('sessionId');
      console.warn('Authentication failed, redirecting to login...');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Generic API functions with type safety
export const apiGet = async <T = any>(endpoint: string, params?: any): Promise<ApiResponse<T>> => {
  const response = await api.get(endpoint, { params });
  return response.data;
};

export const apiPost = async <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
  const response = await api.post(endpoint, data);
  return response.data;
};

export const apiPut = async <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
  const response = await api.put(endpoint, data);
  return response.data;
};

export const apiPatch = async <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
  const response = await api.patch(endpoint, data);
  return response.data;
};

export const apiDelete = async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
  const response = await api.delete(endpoint);
  return response.data;
};

// Geographic API functions
export const geographicApi = {
  // Provinces
  getProvinces: () => apiGet('/geographic/provinces'),

  // Districts - Filter by province
  getDistricts: (provinceCode?: string) =>
    apiGet('/geographic/districts', provinceCode ? { province: provinceCode } : {}),

  // Municipalities - Filter by district (corrected from province filtering)
  getMunicipalities: (districtCode?: string) =>
    apiGet('/geographic/municipalities', districtCode ? { district: districtCode } : {}),

  // Wards - Filter by municipality
  getWards: (municipalCode?: string) =>
    apiGet('/geographic/wards', municipalCode ? { municipality: municipalCode } : {}),

  // Voting Districts
  getVotingDistricts: (filters?: any) =>
    apiGet('/geographic/voting-districts', filters),

  getVotingDistrictsByWard: (wardCode: string) =>
    apiGet(`/geographic/voting-districts/by-ward/${wardCode}`),

  getVotingDistrictStatistics: () =>
    apiGet('/geographic/voting-districts/statistics'),

  getCompleteHierarchy: (filters?: any) =>
    apiGet('/geographic/voting-districts/hierarchy', filters),

  // Voting District CRUD operations
  createVotingDistrict: (data: any) =>
    apiPost('/geographic/voting-districts', data),

  updateVotingDistrict: (code: string, data: any) =>
    apiPut(`/geographic/voting-districts/${code}`, data),

  deleteVotingDistrict: (code: string) =>
    apiDelete(`/geographic/voting-districts/${code}`),

  // Geographic summary
  getSummary: () => apiGet('/geographic/summary'),
};

// Members API functions
export const membersApi = {
  getMembers: (filters?: any) => apiGet('/members', filters),
  getMember: (id: string) => apiGet(`/members/${id}`),
  createMember: (data: any) => apiPost('/members', data),
  updateMember: (id: string, data: any) => apiPut(`/members/${id}`, data),
  deleteMember: (id: string) => apiDelete(`/members/${id}`),
  getMemberStatistics: () => apiGet('/members/statistics'),
  exportMembers: (format: string, filters?: any) =>
    apiGet('/members/export', { format, ...filters }),
  exportWardAudit: (wardCode: string) => apiGet(`/members/ward/${wardCode}/audit-export`),
};

// Applications API functions
export const applicationsApi = {
  getApplications: (filters?: any) => apiGet('/membership-applications', filters),
  getApplication: (id: string) => apiGet(`/membership-applications/${id}`),
  getApplicationByNumber: (applicationNumber: string) => apiGet(`/membership-applications/number/${applicationNumber}`),
  createApplication: (data: any) => apiPost('/membership-applications', data),
  updateApplication: (id: string, data: any) => apiPut(`/membership-applications/${id}`, data),
  deleteApplication: (id: string) => apiDelete(`/membership-applications/${id}`),

  // Review actions
  reviewApplication: (id: string, reviewData: any) => apiPost(`/membership-applications/${id}/review`, reviewData),
  setUnderReview: (id: string) => apiPost(`/membership-applications/${id}/under-review`),
  bulkReview: (data: any) => apiPost('/membership-applications/bulk/review', data),

  // Status-based queries
  getPendingApplications: (params?: any) => apiGet('/membership-applications/pending/review', params),
  getUnderReviewApplications: (params?: any) => apiGet('/membership-applications/under-review/list', params),

  // Payment integration
  getApplicationPayments: (id: string) => apiGet(`/payments/application/${id}/payments`),
  getApprovalStatus: (id: string) => apiGet(`/payments/approval-status/${id}`),
};

// Two-Tier Approval API
export const twoTierApprovalApi = {
  // Financial Review endpoints (Applications)
  getFinancialReviewApplications: () => apiGet('/two-tier-approval/financial-review/applications'),
  startFinancialReview: (id: string) => apiPost(`/two-tier-approval/financial-review/${id}/start`),
  completeFinancialReview: (id: string, reviewData: any) => apiPost(`/two-tier-approval/financial-review/${id}/complete`, reviewData),

  // Renewal Financial Review endpoints
  getRenewalsForFinancialReview: (params?: any) => apiGet('/two-tier-approval/renewal-review/renewals', params),
  startRenewalFinancialReview: (id: string) => apiPost(`/two-tier-approval/renewal-review/${id}/start`),
  completeRenewalFinancialReview: (id: string, reviewData: any) => apiPost(`/two-tier-approval/renewal-review/${id}/complete`, reviewData),
  getRenewalDetails: (id: string) => apiGet(`/two-tier-approval/renewals/${id}`),
  getRenewalAuditTrail: (id: string) => apiGet(`/two-tier-approval/renewals/${id}/audit-trail`),
  getRenewalComprehensiveAudit: (id: string) => apiGet(`/two-tier-approval/renewals/${id}/comprehensive-audit`),

  // Final Review endpoints
  getFinalReviewApplications: () => apiGet('/two-tier-approval/final-review/applications'),
  startFinalReview: (id: string) => apiPost(`/two-tier-approval/final-review/${id}/start`),
  completeFinalReview: (id: string, reviewData: any) => apiPost(`/two-tier-approval/final-review/${id}/complete`, reviewData),

  // Shared endpoints
  getApplicationWithRoleAccess: (id: string) => apiGet(`/two-tier-approval/applications/${id}`),
  getWorkflowAuditTrail: (id: string) => apiGet(`/two-tier-approval/applications/${id}/audit-trail`),
  getWorkflowNotifications: (isRead?: boolean) => apiGet('/two-tier-approval/notifications', isRead !== undefined ? { is_read: isRead } : {}),
  markNotificationAsRead: (id: string) => apiPatch(`/two-tier-approval/notifications/${id}/read`),
  getWorkflowStatistics: () => apiGet('/two-tier-approval/statistics'),

  // Comprehensive Financial Oversight
  getFinancialTransactions: (params?: any) => apiGet('/two-tier-approval/financial/transactions', params),
  getFinancialSummary: (params?: any) => apiGet('/two-tier-approval/financial/summary', params),
  getReviewerPerformance: (params?: any) => apiGet('/two-tier-approval/financial/reviewer-performance', params),
  getFinancialKPIs: (params?: any) => apiGet('/two-tier-approval/financial/kpis', params),
  updateFinancialKPI: (kpiName: string, data: any) => apiPut(`/two-tier-approval/financial/kpis/${kpiName}`, data),
  getDashboardCache: (cacheKey: string) => apiGet(`/two-tier-approval/financial/dashboard-cache/${cacheKey}`),
  setDashboardCache: (data: any) => apiPost('/two-tier-approval/financial/dashboard-cache', data),
  invalidateDashboardCache: (pattern?: string) => apiDelete(`/two-tier-approval/financial/dashboard-cache?pattern=${pattern || ''}`),
};

// Users API functions
export const usersApi = {
  getUsers: (filters?: any) => apiGet('/users', filters),
  getUser: (id: string) => apiGet(`/users/${id}`),
  createUser: (data: any) => apiPost('/users', data),
  updateUser: (id: string, data: any) => apiPut(`/users/${id}`, data),
  deleteUser: (id: string) => apiDelete(`/users/${id}`),
  changePassword: (id: string, data: any) => apiPost(`/users/${id}/change-password`, data),
};

// Auth API functions
export const authApi = {
  login: (credentials: any) => apiPost('/auth/login', credentials),
  register: (userData: any) => apiPost('/auth/register', userData),
  logout: () => apiPost('/auth/logout'),
  refreshToken: () => apiPost('/auth/refresh'),
  forgotPassword: (email: string) => apiPost('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiPost('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => apiPost('/auth/verify-email', { token }),
};

// Search API functions (lookups and suggestions)
export const searchApi = {
  lookup: (type: string, params?: any) => apiGet(`/search/lookup/${type}`, params),
  suggestions: (q: string, limit: number = 10) => apiGet('/search/suggestions', { q, limit }),
  getMembersByVotingDistrict: (votingDistrictCode: string, filters?: any) =>
    apiGet(`/search/members-by-voting-district/${votingDistrictCode}`, filters),
  getMembersByVotingStation: (votingStationId: string, filters?: any) =>
    apiGet(`/search/members-by-voting-station/${votingStationId}`, filters),
};

// Views API functions (for voting districts views)
export const viewsApi = {
  createMembersVotingDistrictViews: () => apiPost('/views/create-members-voting-districts'),
  getMembersWithVotingDistricts: (filters?: any) =>
    apiGet('/views/members-with-voting-districts', filters),
  getVotingDistrictSummary: (filters?: any) =>
    apiGet('/views/voting-district-summary', filters),
};

// Analytics API functions
export const analyticsApi = {
  getDashboardStats: () => apiGet('/analytics/dashboard'),
  getMembershipTrends: (period?: string) =>
    apiGet('/analytics/membership-trends', period ? { period } : {}),
  getGeographicDistribution: () => apiGet('/analytics/geographic-distribution'),
  getDemographicBreakdown: () => apiGet('/analytics/demographic-breakdown'),
  getApplicationTrends: (period?: string) =>
    apiGet('/analytics/application-trends', period ? { period } : {}),
};

// Statistics API functions
export const statisticsApi = {
  getDashboard: () => apiGet('/statistics/dashboard'),
  getExpiredMembers: () => apiGet('/statistics/expired-members'),
  getSystemStatistics: () => apiGet('/statistics/system'),
  getMembershipTrends: (months?: number) =>
    apiGet('/statistics/membership-trends', months ? { months } : {}),
  getDemographicBreakdown: (filters?: any) =>
    apiGet('/statistics/demographics', filters || {}),
};

// Communication API functions
export const communicationApi = {
  sendMessage: (data: any) => apiPost('/communication/send', data),
  getMessages: (filters?: any) => apiGet('/communication/messages', filters),
  getMessage: (id: string) => apiGet(`/communication/messages/${id}`),
  getTemplates: () => apiGet('/communication/templates'),
  createTemplate: (data: any) => apiPost('/communication/templates', data),
  updateTemplate: (id: string, data: any) => apiPut(`/communication/templates/${id}`, data),
  deleteTemplate: (id: string) => apiDelete(`/communication/templates/${id}`),
};

// Reference Data API functions
export const referenceApi = {
  getLanguages: () => apiGet('/reference/languages'),
  getOccupations: () => apiGet('/reference/occupations'),
  getQualifications: () => apiGet('/reference/qualifications'),
  getAllReferenceData: () => apiGet('/reference/all'),
  getLanguage: (id: number) => apiGet(`/reference/languages/${id}`),
  getOccupation: (id: number) => apiGet(`/reference/occupations/${id}`),
  getQualification: (id: number) => apiGet(`/reference/qualifications/${id}`),
};

// Unified Financial Dashboard API with type safety
export const financialDashboardApi = {
  // Dashboard Metrics
  getMetrics: (params?: any) => apiGet<FinancialMetrics>('/financial-dashboard/metrics', params),
  getRealtimeStats: () => apiGet('/financial-dashboard/realtime-stats'),
  getTrends: (params?: any) => apiGet<FinancialTrends>('/financial-dashboard/trends', params),
  getAlerts: (params?: any) => apiGet<FinancialAlert[]>('/financial-dashboard/alerts', params),
  getOverview: () => apiGet('/financial-dashboard/overview'),
  getPerformance: (params?: any) => apiGet('/financial-dashboard/performance', params),

  // Dashboard Management
  updateDailySummary: (data?: any) => apiPost('/financial-dashboard/update-daily-summary', data),
  getConfig: () => apiGet('/financial-dashboard/config'),
  getHealth: () => apiGet<SystemHealth>('/financial-dashboard/health'),
};

// Financial Transaction Query API with type safety
export const financialTransactionApi = {
  // Advanced Querying
  query: (params?: TransactionQueryParams) => apiGet<TransactionQueryResponse>('/financial-transactions/query', params),
  queryTransactions: (params?: TransactionQueryParams) => apiGet<TransactionQueryResponse>('/financial-transactions/query', params),
  searchMembers: (params?: any) => apiGet('/financial-transactions/search-members', params),
  getFilterOptions: () => apiGet<FilterOptions>('/financial-transactions/filter-options'),
  getTransactionDetails: (id: string) => apiGet(`/financial-transactions/transaction/${id}`),

  // Analytics and Reporting
  getAnalytics: (params?: TransactionQueryParams) => apiGet<TransactionAnalytics>('/financial-transactions/analytics', params),
  getQuickStats: (params?: any) => apiGet('/financial-transactions/quick-stats', params),

  // Export and Bulk Operations
  exportTransactions: (data: ExportParams) => apiPost('/financial-transactions/export', data),
  bulkAction: (data: BulkActionParams) => apiPost<BulkActionResponse>('/financial-transactions/bulk-action', data),
};

// Membership Renewal API
export const membershipRenewalApi = {
  // Dashboard and Analytics
  getDashboard: () => apiGet('/membership-renewal/dashboard'),
  getAnalytics: (params?: any) => apiGet('/membership-renewal/analytics', params),
  getTrendsAnalytics: (params?: any) => apiGet('/membership-expiration/trends-analytics', params),

  // Individual Renewal Processing
  processIndividualRenewal: (memberId: string, data: any) => apiPost(`/membership-renewal/process/${memberId}`, data),
  getMemberRenewalWorkflow: (memberId: string) => apiGet(`/membership-renewal/workflow/${memberId}`),

  // Bulk Operations
  bulkRenewal: (data: any) => apiPost('/membership-renewal/bulk-renewal', data),
  bulkCreateRenewalsForYear: (data: any) => apiPost('/renewals/bulk/create-year', data),
  processAutoRenewals: () => apiPost('/renewals/process/auto-renewals'),

  // Renewal Management
  getRenewals: (params?: any) => apiGet('/renewals', params),
  getRenewal: (id: string) => apiGet(`/renewals/${id}`),
  createRenewal: (data: any) => apiPost('/renewals', data),
  updateRenewal: (id: string, data: any) => apiPut(`/renewals/${id}`, data),
  deleteRenewal: (id: string) => apiDelete(`/renewals/${id}`),

  // Pricing and Configuration
  getPricingTiers: () => apiGet('/renewals/pricing/tiers'),
  getPricingRules: () => apiGet('/renewals/pricing/rules'),
  calculateRenewalPricing: (memberId: string, params?: any) => apiGet(`/renewals/pricing/calculate/${memberId}`, params),

  // Notifications and Reminders
  sendRenewalReminders: (data: any) => apiPost('/membership-renewal/send-reminders', data),

  // Reports
  generatePDFReport: (params?: any) => apiGet('/membership-renewal/report/pdf', params),
  exportRenewals: (params?: any) => apiGet('/renewals/export', params),
};

// Enhanced Geographic API (extends existing geographicApi above)
export const enhancedGeographicApi = {
  // Specific Geographic Items by Code
  getProvince: (code: string) => apiGet(`/geographic/provinces/${code}`),
  getDistrict: (code: string) => apiGet(`/geographic/districts/${code}`),
  getMunicipality: (code: string) => apiGet(`/geographic/municipalities/${code}`),
  getWard: (code: string) => apiGet(`/geographic/wards/${code}`),
  getVotingDistrict: (code: string) => apiGet(`/geographic/voting-districts/${code}`),

  // Hierarchical Data
  getProvinceHierarchy: (provinceCode: string) => apiGet(`/geographic/hierarchy/province/${provinceCode}`),
  getDistrictHierarchy: (districtCode: string) => apiGet(`/geographic/hierarchy/district/${districtCode}`),
  getMunicipalityHierarchy: (municipalityCode: string) => apiGet(`/geographic/hierarchy/municipality/${municipalityCode}`),

  // Additional Endpoints
  getEndpoints: () => apiGet('/geographic'),
};

// Membership Expiration API
export const membershipExpirationApi = {
  // Overview and Dashboard
  getOverview: () => apiGet('/membership-expiration/overview'),
  getEnhancedOverview: () => apiGet('/membership-expiration/enhanced-overview'),

  // Expiring Members
  getExpiringSoon: (params?: any) => apiGet('/membership-expiration/expiring-soon', params),
  getExpiredMembers: (params?: any) => apiGet('/membership-expiration/expired', params),

  // Bulk Operations
  bulkRenewal: (data: any) => apiPost('/membership-expiration/bulk-renewal', data),

  // Analytics
  getTrendsAnalytics: (params?: any) => apiGet('/membership-expiration/trends-analytics', params),
};

// Enhanced Payment API with type safety
export const enhancedPaymentApi = {
  // Payment Processing
  processCardPayment: (data: PaymentData) => apiPost<PaymentResponse>('/payments/card-payment', data),
  processCashPayment: (data: PaymentData) => apiPost<PaymentResponse>('/payments/cash-payment', data),
  processEFTPayment: (data: PaymentData) => apiPost<PaymentResponse>('/payments/eft-payment', data),

  // Payment Status and History
  getPaymentStatus: (memberId: string) => apiGet(`/payments/status/${memberId}`),
  getApplicationPayments: (applicationId: string) => apiGet(`/payments/application/${applicationId}/payments`),
  getPaymentHistory: (params?: any) => apiGet('/payments/history', params),

  // Payment Configuration
  getPaymentConfig: () => apiGet('/payments/config'),
  updatePaymentConfig: (data: any) => apiPut('/payments/config', data),

  // Payment Analytics
  getPaymentDashboard: () => apiGet('/payments/dashboard'),
  getPaymentTransactions: (params?: any) => apiGet('/payments/transactions', params),

  // Payment Verification
  verifyPayment: (paymentId: string, data: any) => apiPost(`/payments/${paymentId}/verify`, data),
  approvePayment: (paymentId: string, data: any) => apiPost(`/payments/${paymentId}/approve`, data),
  rejectPayment: (paymentId: string, data: any) => apiPost(`/payments/${paymentId}/reject`, data),
};

// Lookup Data API with type safety
export const lookupApi = {
  // All Lookups
  getAllLookups: () => apiGet<AllLookupsResponse>('/lookups'),

  // Specific Lookups
  getGenders: () => apiGet('/lookups/genders'),
  getRaces: () => apiGet('/lookups/races'),
  getCitizenships: () => apiGet('/lookups/citizenships'),
  getLanguages: () => apiGet('/lookups/languages'),
  getOccupationCategories: () => apiGet('/lookups/occupation-categories'),
  getQualifications: () => apiGet('/lookups/qualifications'),
  getMaritalStatuses: () => apiGet('/lookups/marital-statuses'),
  getEmploymentStatuses: () => apiGet('/lookups/employment-statuses'),
};

// System API functions with type safety
export const systemApi = {
  getHealth: () => apiGet<SystemHealth>('/health'),
  getSystemInfo: () => apiGet('/system/info'),
  getSystemLogs: (filters?: any) => apiGet('/system/logs', filters),
  backupDatabase: () => apiPost('/system/backup'),
  getBackups: () => apiGet('/system/backups'),
  restoreBackup: (backupId: string) => apiPost(`/system/restore/${backupId}`),
};

export default api;
