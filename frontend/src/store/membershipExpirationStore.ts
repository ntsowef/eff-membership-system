import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ExpiringSoonMember,
  ExpiredMember,
  EnhancedStatusOverview,
  PrioritySummary,
  CategorySummary,
  ExpiringSoonFilters,
  ExpiredMembersFilters
} from '../types/membershipExpiration';

interface MembershipExpirationState {
  // Enhanced Overview Data
  enhancedOverview: EnhancedStatusOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;

  // Expiring Soon Data
  expiringSoonMembers: ExpiringSoonMember[];
  expiringSoonPrioritySummary: PrioritySummary[];
  expiringSoonPagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    records_per_page: number;
  } | null;
  expiringSoonLoading: boolean;
  expiringSoonError: string | null;
  expiringSoonFilters: ExpiringSoonFilters;

  // Expired Members Data
  expiredMembers: ExpiredMember[];
  expiredCategorySummary: CategorySummary[];
  expiredPagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    records_per_page: number;
  } | null;
  expiredLoading: boolean;
  expiredError: string | null;
  expiredFilters: ExpiredMembersFilters;

  // Selected Members for Bulk Operations
  selectedExpiringSoonMembers: number[];
  selectedExpiredMembers: number[];

  // UI State
  activeTab: 'overview' | 'expiring-soon' | 'expired';
  showSMSDialog: boolean;
  showRenewalDialog: boolean;
  smsNotificationType: '30_day_reminder' | '7_day_urgent' | 'expired_today' | '7_day_grace';

  // Actions
  setEnhancedOverview: (overview: EnhancedStatusOverview) => void;
  setOverviewLoading: (loading: boolean) => void;
  setOverviewError: (error: string | null) => void;

  setExpiringSoonMembers: (members: ExpiringSoonMember[]) => void;
  setExpiringSoonPrioritySummary: (summary: PrioritySummary[]) => void;
  setExpiringSoonPagination: (pagination: any) => void;
  setExpiringSoonLoading: (loading: boolean) => void;
  setExpiringSoonError: (error: string | null) => void;
  setExpiringSoonFilters: (filters: ExpiringSoonFilters) => void;

  setExpiredMembers: (members: ExpiredMember[]) => void;
  setExpiredCategorySummary: (summary: CategorySummary[]) => void;
  setExpiredPagination: (pagination: any) => void;
  setExpiredLoading: (loading: boolean) => void;
  setExpiredError: (error: string | null) => void;
  setExpiredFilters: (filters: ExpiredMembersFilters) => void;

  setSelectedExpiringSoonMembers: (memberIds: number[]) => void;
  setSelectedExpiredMembers: (memberIds: number[]) => void;
  toggleExpiringSoonMember: (memberId: number) => void;
  toggleExpiredMember: (memberId: number) => void;
  clearSelectedMembers: () => void;

  setActiveTab: (tab: 'overview' | 'expiring-soon' | 'expired') => void;
  setShowSMSDialog: (show: boolean) => void;
  setShowRenewalDialog: (show: boolean) => void;
  setSMSNotificationType: (type: '30_day_reminder' | '7_day_urgent' | 'expired_today' | '7_day_grace') => void;

  // Reset functions
  resetExpiringSoonData: () => void;
  resetExpiredData: () => void;
  resetAllData: () => void;
}

export const useMembershipExpirationStore = create<MembershipExpirationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      enhancedOverview: null,
      overviewLoading: false,
      overviewError: null,

      expiringSoonMembers: [],
      expiringSoonPrioritySummary: [],
      expiringSoonPagination: null,
      expiringSoonLoading: false,
      expiringSoonError: null,
      expiringSoonFilters: {
        priority: 'all',
        page: 1,
        limit: 25,
        sort_by: 'days_until_expiry',
        sort_order: 'asc'
      },

      expiredMembers: [],
      expiredCategorySummary: [],
      expiredPagination: null,
      expiredLoading: false,
      expiredError: null,
      expiredFilters: {
        category: 'all',
        page: 1,
        limit: 25,
        sort_by: 'days_expired',
        sort_order: 'asc'
      },

      selectedExpiringSoonMembers: [],
      selectedExpiredMembers: [],

      activeTab: 'overview',
      showSMSDialog: false,
      showRenewalDialog: false,
      smsNotificationType: '30_day_reminder',

      // Actions
      setEnhancedOverview: (overview) => set({ enhancedOverview: overview }),
      setOverviewLoading: (loading) => set({ overviewLoading: loading }),
      setOverviewError: (error) => set({ overviewError: error }),

      setExpiringSoonMembers: (members) => set({ expiringSoonMembers: members }),
      setExpiringSoonPrioritySummary: (summary) => set({ expiringSoonPrioritySummary: summary }),
      setExpiringSoonPagination: (pagination) => set({ expiringSoonPagination: pagination }),
      setExpiringSoonLoading: (loading) => set({ expiringSoonLoading: loading }),
      setExpiringSoonError: (error) => set({ expiringSoonError: error }),
      setExpiringSoonFilters: (filters) => set({ expiringSoonFilters: { ...get().expiringSoonFilters, ...filters } }),

      setExpiredMembers: (members) => set({ expiredMembers: members }),
      setExpiredCategorySummary: (summary) => set({ expiredCategorySummary: summary }),
      setExpiredPagination: (pagination) => set({ expiredPagination: pagination }),
      setExpiredLoading: (loading) => set({ expiredLoading: loading }),
      setExpiredError: (error) => set({ expiredError: error }),
      setExpiredFilters: (filters) => set({ expiredFilters: { ...get().expiredFilters, ...filters } }),

      setSelectedExpiringSoonMembers: (memberIds) => set({ selectedExpiringSoonMembers: memberIds }),
      setSelectedExpiredMembers: (memberIds) => set({ selectedExpiredMembers: memberIds }),
      
      toggleExpiringSoonMember: (memberId) => {
        const selected = get().selectedExpiringSoonMembers;
        const newSelected = selected.includes(memberId)
          ? selected.filter(id => id !== memberId)
          : [...selected, memberId];
        set({ selectedExpiringSoonMembers: newSelected });
      },

      toggleExpiredMember: (memberId) => {
        const selected = get().selectedExpiredMembers;
        const newSelected = selected.includes(memberId)
          ? selected.filter(id => id !== memberId)
          : [...selected, memberId];
        set({ selectedExpiredMembers: newSelected });
      },

      clearSelectedMembers: () => set({ 
        selectedExpiringSoonMembers: [], 
        selectedExpiredMembers: [] 
      }),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setShowSMSDialog: (show) => set({ showSMSDialog: show }),
      setShowRenewalDialog: (show) => set({ showRenewalDialog: show }),
      setSMSNotificationType: (type) => set({ smsNotificationType: type }),

      // Reset functions
      resetExpiringSoonData: () => set({
        expiringSoonMembers: [],
        expiringSoonPrioritySummary: [],
        expiringSoonPagination: null,
        expiringSoonLoading: false,
        expiringSoonError: null,
        selectedExpiringSoonMembers: []
      }),

      resetExpiredData: () => set({
        expiredMembers: [],
        expiredCategorySummary: [],
        expiredPagination: null,
        expiredLoading: false,
        expiredError: null,
        selectedExpiredMembers: []
      }),

      resetAllData: () => {
        get().resetExpiringSoonData();
        get().resetExpiredData();
        set({
          enhancedOverview: null,
          overviewLoading: false,
          overviewError: null,
          activeTab: 'overview'
        });
      }
    }),
    {
      name: 'membership-expiration-store'
    }
  )
);

export default useMembershipExpirationStore;
