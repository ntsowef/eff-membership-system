// Ward Membership Audit Store
// Created: 2025-09-07
// Purpose: Zustand store for comprehensive ward membership audit system state management

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  WardMembershipAuditStore,
  WardAuditData,
  MunicipalityPerformanceData,
  WardTrendData,
  WardAuditOverviewResponse,
  PaginationInfo,
  WardAuditUIState,
  WardAuditFilters,
  MunicipalityPerformanceFilters,
  WardTrendsFilters
} from '../types/wardMembershipAudit';

// =====================================================
// Initial State
// =====================================================

const initialUIState: WardAuditUIState = {
  activeTab: 'overview',
  selectedWards: [],
  selectedMunicipalities: [],
  // Geographic filters for role-based access control
  selectedProvince: undefined,
  selectedMunicipality: undefined,
  wardFilters: {
    page: 1,
    limit: 20,
    sort_by: 'active_members',
    sort_order: 'desc'
  },
  municipalityFilters: {
    page: 1,
    limit: 20,
    sort_by: 'compliance_percentage',
    sort_order: 'desc'
  },
  trendsFilters: {
    months: 12
  },
  isLoading: false,
  error: null
};

// =====================================================
// Ward Membership Audit Store
// =====================================================

export const useWardMembershipAuditStore = create<WardMembershipAuditStore>()(
  devtools(
    persist(
      (set, _get) => ({
        // Data
        auditOverview: null,
        wardAuditData: [],
        municipalityPerformanceData: [],
        wardTrendsData: [],
        
        // Pagination
        wardPagination: null,
        municipalityPagination: null,
        
        // UI State
        uiState: initialUIState,
        
        // Loading States
        overviewLoading: false,
        wardDataLoading: false,
        municipalityDataLoading: false,
        trendsDataLoading: false,
        
        // Error States
        overviewError: null,
        wardDataError: null,
        municipalityDataError: null,
        trendsDataError: null,
        
        // Actions
        setAuditOverview: (overview: WardAuditOverviewResponse['data']['audit_overview']) => {
          set({ auditOverview: overview }, false, 'setAuditOverview');
        },

        setWardAuditData: (data: WardAuditData[]) => {
          set({ wardAuditData: data }, false, 'setWardAuditData');
        },

        setMunicipalityPerformanceData: (data: MunicipalityPerformanceData[]) => {
          set({ municipalityPerformanceData: data }, false, 'setMunicipalityPerformanceData');
        },

        setWardTrendsData: (data: WardTrendData[]) => {
          set({ wardTrendsData: data }, false, 'setWardTrendsData');
        },

        setWardPagination: (pagination: PaginationInfo) => {
          set({ wardPagination: pagination }, false, 'setWardPagination');
        },

        setMunicipalityPagination: (pagination: PaginationInfo) => {
          set({ municipalityPagination: pagination }, false, 'setMunicipalityPagination');
        },

        setUIState: (state: Partial<WardAuditUIState>) => {
          set(
            (prevState) => ({
              uiState: { ...prevState.uiState, ...state }
            }),
            false,
            'setUIState'
          );
        },

        setOverviewLoading: (loading: boolean) => {
          set({ overviewLoading: loading }, false, 'setOverviewLoading');
        },

        setWardDataLoading: (loading: boolean) => {
          set({ wardDataLoading: loading }, false, 'setWardDataLoading');
        },

        setMunicipalityDataLoading: (loading: boolean) => {
          set({ municipalityDataLoading: loading }, false, 'setMunicipalityDataLoading');
        },

        setTrendsDataLoading: (loading: boolean) => {
          set({ trendsDataLoading: loading }, false, 'setTrendsDataLoading');
        },

        setOverviewError: (error: string | null) => {
          set({ overviewError: error }, false, 'setOverviewError');
        },

        setWardDataError: (error: string | null) => {
          set({ wardDataError: error }, false, 'setWardDataError');
        },

        setMunicipalityDataError: (error: string | null) => {
          set({ municipalityDataError: error }, false, 'setMunicipalityDataError');
        },

        setTrendsDataError: (error: string | null) => {
          set({ trendsDataError: error }, false, 'setTrendsDataError');
        },

        // Geographic filter actions
        setSelectedProvince: (provinceCode: string | undefined) => {
          set((state) => ({
            uiState: {
              ...state.uiState,
              selectedProvince: provinceCode,
              // Reset municipality when province changes
              selectedMunicipality: undefined,
              // Reset filters to page 1 when geographic filters change
              wardFilters: { ...state.uiState.wardFilters, page: 1 },
              municipalityFilters: { ...state.uiState.municipalityFilters, page: 1 }
            }
          }), false, 'setSelectedProvince');
        },

        setSelectedMunicipality: (municipalityCode: string | undefined) => {
          set((state) => ({
            uiState: {
              ...state.uiState,
              selectedMunicipality: municipalityCode,
              // Reset filters to page 1 when geographic filters change
              wardFilters: { ...state.uiState.wardFilters, page: 1 },
              municipalityFilters: { ...state.uiState.municipalityFilters, page: 1 }
            }
          }), false, 'setSelectedMunicipality');
        },

        resetStore: () => {
          set({
            auditOverview: null,
            wardAuditData: [],
            municipalityPerformanceData: [],
            wardTrendsData: [],
            wardPagination: null,
            municipalityPagination: null,
            uiState: initialUIState,
            overviewLoading: false,
            wardDataLoading: false,
            municipalityDataLoading: false,
            trendsDataLoading: false,
            overviewError: null,
            wardDataError: null,
            municipalityDataError: null,
            trendsDataError: null
          }, false, 'resetStore');
        }
      }),
      {
        name: 'ward-membership-audit-store',
        partialize: (state) => ({
          // Only persist UI state and filters, not data
          uiState: state.uiState
        })
      }
    ),
    {
      name: 'ward-membership-audit-store'
    }
  )
);

// =====================================================
// Selector Hooks
// =====================================================

/**
 * Get current ward filters
 */
export const useWardFilters = () => {
  return useWardMembershipAuditStore((state) => state.uiState.wardFilters);
};

/**
 * Get current municipality filters
 */
export const useMunicipalityFilters = () => {
  return useWardMembershipAuditStore((state) => state.uiState.municipalityFilters);
};

/**
 * Get current trends filters
 */
export const useTrendsFilters = () => {
  return useWardMembershipAuditStore((state) => state.uiState.trendsFilters);
};

/**
 * Get selected wards
 */
export const useSelectedWards = () => {
  return useWardMembershipAuditStore((state) => state.uiState.selectedWards);
};

/**
 * Get selected municipalities
 */
export const useSelectedMunicipalities = () => {
  return useWardMembershipAuditStore((state) => state.uiState.selectedMunicipalities);
};

/**
 * Get active tab
 */
export const useActiveTab = () => {
  return useWardMembershipAuditStore((state) => state.uiState.activeTab);
};

/**
 * Get overview data with loading and error states
 */
export const useAuditOverview = () => {
  return useWardMembershipAuditStore((state) => ({
    data: state.auditOverview,
    loading: state.overviewLoading,
    error: state.overviewError
  }));
};

/**
 * Get ward audit data with pagination and loading states
 */
export const useWardAuditData = () => {
  return useWardMembershipAuditStore((state) => ({
    data: state.wardAuditData,
    pagination: state.wardPagination,
    loading: state.wardDataLoading,
    error: state.wardDataError
  }));
};

/**
 * Get municipality performance data with pagination and loading states
 */
export const useMunicipalityPerformanceData = () => {
  return useWardMembershipAuditStore((state) => ({
    data: state.municipalityPerformanceData,
    pagination: state.municipalityPagination,
    loading: state.municipalityDataLoading,
    error: state.municipalityDataError
  }));
};

/**
 * Get ward trends data with loading states
 */
export const useWardTrendsData = () => {
  return useWardMembershipAuditStore((state) => ({
    data: state.wardTrendsData,
    loading: state.trendsDataLoading,
    error: state.trendsDataError
  }));
};

// =====================================================
// Action Hooks
// =====================================================

/**
 * Update ward filters
 */
export const useUpdateWardFilters = () => {
  const setUIState = useWardMembershipAuditStore((state) => state.setUIState);

  return (filters: Partial<WardAuditFilters>) => {
    setUIState({
      wardFilters: {
        ...useWardMembershipAuditStore.getState().uiState.wardFilters,
        ...filters
      }
    });
  };
};

/**
 * Update municipality filters
 */
export const useUpdateMunicipalityFilters = () => {
  const setUIState = useWardMembershipAuditStore((state) => state.setUIState);
  
  return (filters: Partial<MunicipalityPerformanceFilters>) => {
    setUIState({
      municipalityFilters: {
        ...useWardMembershipAuditStore.getState().uiState.municipalityFilters,
        ...filters
      }
    });
  };
};

/**
 * Update trends filters
 */
export const useUpdateTrendsFilters = () => {
  const setUIState = useWardMembershipAuditStore((state) => state.setUIState);
  
  return (filters: Partial<WardTrendsFilters>) => {
    setUIState({
      trendsFilters: {
        ...useWardMembershipAuditStore.getState().uiState.trendsFilters,
        ...filters
      }
    });
  };
};

/**
 * Toggle ward selection
 */
export const useToggleWardSelection = () => {
  const setUIState = useWardMembershipAuditStore((state) => state.setUIState);
  
  return (wardCode: string) => {
    const currentSelected = useWardMembershipAuditStore.getState().uiState.selectedWards;
    const newSelected = currentSelected.includes(wardCode)
      ? currentSelected.filter(code => code !== wardCode)
      : [...currentSelected, wardCode];
    
    setUIState({ selectedWards: newSelected });
  };
};

/**
 * Geographic filter selectors and actions
 */
export const useSelectedProvince = () => {
  return useWardMembershipAuditStore((state) => state.uiState.selectedProvince);
};

export const useSelectedMunicipality = () => {
  return useWardMembershipAuditStore((state) => state.uiState.selectedMunicipality);
};

export const useSetSelectedProvince = () => {
  return useWardMembershipAuditStore((state) => state.setSelectedProvince);
};

export const useSetSelectedMunicipality = () => {
  return useWardMembershipAuditStore((state) => state.setSelectedMunicipality);
};

/**
 * Toggle municipality selection
 */
export const useToggleMunicipalitySelection = () => {
  const setUIState = useWardMembershipAuditStore((state) => state.setUIState);
  
  return (municipalityCode: string) => {
    const currentSelected = useWardMembershipAuditStore.getState().uiState.selectedMunicipalities;
    const newSelected = currentSelected.includes(municipalityCode)
      ? currentSelected.filter(code => code !== municipalityCode)
      : [...currentSelected, municipalityCode];
    
    setUIState({ selectedMunicipalities: newSelected });
  };
};

/**
 * Clear all selections
 */
export const useClearSelections = () => {
  const setUIState = useWardMembershipAuditStore((state) => state.setUIState);
  
  return () => {
    setUIState({
      selectedWards: [],
      selectedMunicipalities: []
    });
  };
};
