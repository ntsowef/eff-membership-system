import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  firstname?: string;
  surname?: string;
  phone?: string;
  admin_level: 'national' | 'province' | 'district' | 'municipality' | 'ward' | 'none';
  role_name?: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  is_active: boolean;
  mfa_enabled?: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Province context for filtering
export interface ProvinceContext {
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  filtered_by_province: boolean;
}

export interface Member {
  // Core member fields
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  age?: number;
  date_of_birth?: string;
  gender_id: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  ward_code: string;
  voting_station_id?: number;
  residential_address?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  occupation_id?: number;
  qualification_id?: number;
  voter_status_id?: number;
  voter_registration_number?: string;
  voter_registration_date?: string;
  created_at: string;
  updated_at: string;

  // Extended details
  full_name: string;
  gender_name: string;
  race_name?: string;
  citizenship_name?: string;
  language_name?: string;
  voter_status: string;
  is_eligible_to_vote?: boolean;
  ward_number: string;
  ward_name: string;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  district_name: string;
  province_code: string;
  province_name: string;
  voting_station_name?: string;
  voting_station_code?: string;
  occupation_name?: string;
  occupation_category?: string;
  qualification_name?: string;
  qualification_level?: string;
  member_created_at: string;
  member_updated_at: string;

  // Membership details (when available)
  membership_id?: number;
  date_joined?: string;
  last_payment_date?: string;
  expiry_date?: string;
  subscription_name?: string;
  membership_amount?: string;
  status_name?: string;
  is_active?: number;
  days_until_expiry?: number;
  membership_status_calculated?: string;
  payment_method?: string;
  payment_reference?: string;
  membership_created_at?: string;
  membership_updated_at?: string;

  // Computed fields for compatibility
  id: number; // alias for member_id
  first_name: string; // alias for firstname
  last_name: string; // alias for surname
  membership_number: string; // computed from member_id
  membership_status: string; // alias for membership_status_calculated or status_name
  membership_expiry: string; // alias for expiry_date
  region_name: string; // alias for district_name
}

export interface MembershipApplication {
  id: number;
  application_id: string;
  firstname: string;
  surname: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  id_number: string;
  // Enhanced Personal Information fields
  language_id?: number;
  occupation_id?: number;
  qualification_id?: number;
  citizenship_status?: 'South African Citizen' | 'Foreign National' | 'Permanent Resident';
  nationality?: string;
  occupation?: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country?: string;
  alternative_phone?: string;
  hierarchy_level: string;
  entity_id: number;
  entity_name?: string;
  membership_type: string;
  reason_for_joining?: string;
  skills_experience?: string;
  referred_by?: string;
  // Payment Information fields
  payment_method?: string;
  payment_reference?: string;
  last_payment_date?: string;
  payment_amount?: number;
  payment_notes?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  documents?: any[];
  agree_terms?: boolean;
  agree_privacy?: boolean;
  agree_communications?: boolean;
  created_at: string;
  updated_at: string;
}

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  provinceContext: ProvinceContext | null;
  login: (user: User, token: string, sessionId?: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
  hasAdminLevel: (level: 'national' | 'province' | 'district' | 'municipality' | 'ward') => boolean;
  canAccessUserManagement: () => boolean;
  getProvinceContext: () => ProvinceContext | null;
  isProvincialAdmin: () => boolean;
  canAccessProvince: (provinceCode: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initialize with no user (proper authentication required)
        user: null,
        token: null,
        sessionId: null,
        isAuthenticated: false, // Require proper authentication
        provinceContext: null,
        login: (user, token, sessionId) => {
          // Let Zustand persist middleware handle localStorage
          // No manual localStorage calls needed

          // Create province context for provincial admin users
          const provinceContext: ProvinceContext = {
            province_code: user.province_code,
            district_code: user.district_code,
            municipal_code: user.municipal_code,
            ward_code: user.ward_code,
            filtered_by_province: user.admin_level === 'province' && !!user.province_code
          };

          set({ user, token, sessionId, isAuthenticated: true, provinceContext });
        },
        logout: () => {
          // Let Zustand persist middleware handle localStorage
          // Only remove non-Zustand managed items
          localStorage.removeItem('tokenExpiration');
          localStorage.removeItem('sessionExpiration');
          localStorage.removeItem('rememberMe');
          set({ user: null, token: null, sessionId: null, isAuthenticated: false, provinceContext: null });
        },
        updateUser: (userData) => {
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, ...userData } });
          }
        },
        hasPermission: (permission: string) => {
          const user = get().user;
          if (!user || !user.is_active) return false;

          // Super admin has all permissions
          if (user.role_name === 'super_admin' || user.admin_level === 'national') {
            return true;
          }

          // Basic permission checking based on admin level
          const adminLevels = ['national', 'province', 'district', 'municipality', 'ward'];
          const userLevelIndex = adminLevels.indexOf(user.admin_level);

          // Higher admin levels have more permissions
          if (permission.includes('users.manage') || permission.includes('admin')) {
            return userLevelIndex <= 1; // Only national and province admins
          }

          if (permission.includes('statistics') || permission.includes('analytics')) {
            return userLevelIndex <= 2; // National, province, and district admins
          }

          return userLevelIndex !== -1; // Any admin level
        },
        hasAdminLevel: (level: 'national' | 'province' | 'district' | 'municipality' | 'ward') => {
          const user = get().user;
          if (!user || !user.is_active) return false;

          const adminLevels = ['national', 'province', 'district', 'municipality', 'ward'];
          const userLevelIndex = adminLevels.indexOf(user.admin_level);
          const requiredLevelIndex = adminLevels.indexOf(level);

          // User must have equal or higher level access
          return userLevelIndex !== -1 && userLevelIndex <= requiredLevelIndex;
        },
        canAccessUserManagement: () => {
          const user = get().user;
          if (!user || !user.is_active) return false;

          // Only national and province admins can access user management
          return user.admin_level === 'national' || user.admin_level === 'province' || user.role_name === 'super_admin';
        },
        getProvinceContext: () => {
          return get().provinceContext;
        },
        isProvincialAdmin: () => {
          const user = get().user;
          return user?.admin_level === 'province' && !!user.province_code;
        },
        canAccessProvince: (provinceCode: string) => {
          const user = get().user;
          if (!user || !user.is_active) return false;

          // National admin and super admin can access all provinces
          if (user.admin_level === 'national' || user.role_name === 'super_admin') {
            return true;
          }

          // Provincial admin can only access their assigned province
          if (user.admin_level === 'province') {
            return user.province_code === provinceCode;
          }

          return false;
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          sessionId: state.sessionId,
          isAuthenticated: state.isAuthenticated,
          provinceContext: state.provinceContext
        }),
      }
    ),
    { name: 'auth-store' }
  )
);

// UI Store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        sidebarOpen: true,
        theme: 'light',
        loading: false,
        notifications: [],
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
        setLoading: (loading) => set({ loading }),
        addNotification: (notification) => {
          const id = Math.random().toString(36).substring(2);
          const timestamp = Date.now();
          set((state) => ({
            notifications: [...state.notifications, { ...notification, id, timestamp }]
          }));
          // Auto remove after 5 seconds
          setTimeout(() => {
            get().removeNotification(id);
          }, 5000);
        },
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        clearNotifications: () => set({ notifications: [] }),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({ 
          sidebarOpen: state.sidebarOpen, 
          theme: state.theme 
        }),
      }
    ),
    { name: 'ui-store' }
  )
);

// Application Store
interface ApplicationState {
  currentApplication: MembershipApplication | null;
  applicationStep: number;
  applicationData: Partial<MembershipApplication>;
  setCurrentApplication: (application: MembershipApplication | null) => void;
  setApplicationStep: (step: number) => void;
  updateApplicationData: (data: Partial<MembershipApplication>) => void;
  resetApplication: () => void;
}

export const useApplicationStore = create<ApplicationState>()(
  devtools(
    persist(
      (set) => ({
        currentApplication: null,
        applicationStep: 0,
        applicationData: {},
        setCurrentApplication: (application) => set({ currentApplication: application }),
        setApplicationStep: (step) => set({ applicationStep: step }),
        updateApplicationData: (data) => set((state) => ({
          applicationData: { ...state.applicationData, ...data }
        })),
        resetApplication: () => set({
          currentApplication: null,
          applicationStep: 0,
          applicationData: {}
        }),
      }),
      {
        name: 'application-storage',
        partialize: (state) => ({ 
          applicationStep: state.applicationStep,
          applicationData: state.applicationData
        }),
      }
    ),
    { name: 'application-store' }
  )
);

// Export all stores
export { useAuthStore as useAuth, useUIStore as useUI, useApplicationStore as useApplication };
