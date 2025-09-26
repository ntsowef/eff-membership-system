import { QueryClient } from '@tanstack/react-query';
import { useUIStore } from '../store';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          if (error?.response?.status === 408 || error?.response?.status === 429) {
            return failureCount < 2;
          }
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors
        return failureCount < 2;
      },
      onError: (error: any) => {
        // Show error notification
        const addNotification = useUIStore.getState().addNotification;
        addNotification({
          type: 'error',
          message: error?.response?.data?.message || 'An error occurred',
        });
      },
    },
  },
});

// Query keys factory
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    profile: ['auth', 'profile'] as const,
  },
  
  // Members
  members: {
    all: ['members'] as const,
    lists: () => [...queryKeys.members.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.members.lists(), filters] as const,
    details: () => [...queryKeys.members.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.members.details(), id] as const,
    search: (query: string) => [...queryKeys.members.all, 'search', query] as const,
    stats: ['members', 'stats'] as const,
  },

  // Applications
  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.applications.lists(), filters] as const,
    details: () => [...queryKeys.applications.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.applications.details(), id] as const,
    byApplicationId: (applicationId: string) => [...queryKeys.applications.all, 'byApplicationId', applicationId] as const,
    stats: ['applications', 'stats'] as const,
  },

  // Leadership
  leadership: {
    all: ['leadership'] as const,
    positions: ['leadership', 'positions'] as const,
    appointments: () => [...queryKeys.leadership.all, 'appointments'] as const,
    appointment: (id: number) => [...queryKeys.leadership.appointments(), id] as const,
    structure: ['leadership', 'structure'] as const,
    elections: ['leadership', 'elections'] as const,
    election: (id: number) => [...queryKeys.leadership.elections, id] as const,
  },

  // Meetings
  meetings: {
    all: ['meetings'] as const,
    lists: () => [...queryKeys.meetings.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.meetings.lists(), filters] as const,
    details: () => [...queryKeys.meetings.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.meetings.details(), id] as const,
    calendar: (month: string, year: string) => [...queryKeys.meetings.all, 'calendar', month, year] as const,
    attendance: (id: number) => [...queryKeys.meetings.detail(id), 'attendance'] as const,
    types: ['meetings', 'types'] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    dashboard: ['analytics', 'dashboard'] as const,
    membership: ['analytics', 'membership'] as const,
    meetings: ['analytics', 'meetings'] as const,
    leadership: ['analytics', 'leadership'] as const,
    elections: ['analytics', 'elections'] as const,
  },

  // SMS
  sms: {
    all: ['sms'] as const,
    provider: ['sms', 'provider'] as const,
    config: ['sms', 'config'] as const,
    history: (filters: any) => [...queryKeys.sms.all, 'history', filters] as const,
    templates: ['sms', 'templates'] as const,
  },

  // System
  system: {
    all: ['system'] as const,
    health: ['system', 'health'] as const,
    metrics: ['system', 'metrics'] as const,
    settings: ['system', 'settings'] as const,
    users: ['system', 'users'] as const,
    audit: (filters: any) => [...queryKeys.system.all, 'audit', filters] as const,
  },

  // Geographic
  geographic: {
    all: ['geographic'] as const,
    entities: (level?: string) => [...queryKeys.geographic.all, 'entities', level] as const,
    hierarchy: ['geographic', 'hierarchy'] as const,
  },

  // Membership Expiration
  membershipExpiration: {
    all: ['membership-expiration'] as const,
    enhancedOverview: ['membership-expiration', 'enhanced-overview'] as const,
    expiringSoon: (filters: any) => [...queryKeys.membershipExpiration.all, 'expiring-soon', filters] as const,
    expired: (filters: any) => [...queryKeys.membershipExpiration.all, 'expired', filters] as const,
    trends: (filters: any) => [...queryKeys.membershipExpiration.all, 'trends', filters] as const,
  },

  // Ward Membership Audit
  wardMembershipAudit: {
    all: ['ward-membership-audit'] as const,
    overview: ['ward-audit-overview'] as const,
    wardData: (filters: any) => [...queryKeys.wardMembershipAudit.all, 'ward-data', filters] as const,
    municipalityData: (filters: any) => [...queryKeys.wardMembershipAudit.all, 'municipality-data', filters] as const,
    trends: (filters: any) => [...queryKeys.wardMembershipAudit.all, 'trends', filters] as const,
  },
} as const;

export default queryClient;
