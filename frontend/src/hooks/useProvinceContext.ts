import { useMemo } from 'react';
import { useAuthStore } from '../store';

export interface ProvinceContextData {
  isProvincialAdmin: boolean;
  assignedProvince: {
    code: string;
    name: string;
  } | null;
  canAccessProvince: (provinceCode: string) => boolean;
  shouldRestrictToProvince: boolean;
  getProvinceFilter: () => string | undefined;
  getProvinceDisplayName: () => string;
  isNationalAdmin: boolean;
}

/**
 * Custom hook to manage province context for Provincial Admin users
 * Provides utilities for province-based filtering and access control
 */
export const useProvinceContext = (): ProvinceContextData => {
  const { user, isAuthenticated, canAccessProvince, isProvincialAdmin } = useAuthStore();

  const contextData = useMemo((): ProvinceContextData => {
    if (!isAuthenticated || !user) {
      return {
        isProvincialAdmin: false,
        assignedProvince: null,
        canAccessProvince: () => false,
        shouldRestrictToProvince: false,
        getProvinceFilter: () => undefined,
        getProvinceDisplayName: () => 'National',
        isNationalAdmin: false,
      };
    }

    const isProvAdmin = isProvincialAdmin();
    const isNatAdmin = user.admin_level === 'national' || user.role_name === 'super_admin';

    // Get province name mapping (you might want to fetch this from API or store it in constants)
    const getProvinceName = (code: string): string => {
      const provinceNames: Record<string, string> = {
        'GP': 'Gauteng',
        'WC': 'Western Cape',
        'KZN': 'KwaZulu-Natal',
        'EC': 'Eastern Cape',
        'FS': 'Free State',
        'LP': 'Limpopo',
        'MP': 'Mpumalanga',
        'NW': 'North West',
        'NC': 'Northern Cape',
      };
      return provinceNames[code] || code;
    };

    return {
      isProvincialAdmin: isProvAdmin,
      assignedProvince: isProvAdmin && user.province_code ? {
        code: user.province_code,
        name: getProvinceName(user.province_code)
      } : null,
      canAccessProvince,
      shouldRestrictToProvince: isProvAdmin && !!user.province_code,
      getProvinceFilter: () => isProvAdmin ? user.province_code : undefined,
      getProvinceDisplayName: () => {
        if (isProvAdmin && user.province_code) {
          return getProvinceName(user.province_code);
        }
        return 'National';
      },
      isNationalAdmin: isNatAdmin,
    };
  }, [user, isAuthenticated, canAccessProvince, isProvincialAdmin]);

  return contextData;
};

/**
 * Utility function to apply province filtering to API parameters
 */
export const applyProvinceFilter = <T extends Record<string, any>>(
  params: T,
  provinceContext: ProvinceContextData
): T => {
  if (provinceContext.shouldRestrictToProvince && provinceContext.assignedProvince) {
    return {
      ...params,
      province_code: provinceContext.assignedProvince.code,
    };
  }
  return params;
};

/**
 * Utility function to validate province access
 */
export const validateProvinceAccess = (
  requestedProvinceCode: string | undefined,
  provinceContext: ProvinceContextData
): boolean => {
  // National admins can access any province
  if (provinceContext.isNationalAdmin) {
    return true;
  }

  // Provincial admins can only access their assigned province
  if (provinceContext.isProvincialAdmin) {
    if (!requestedProvinceCode) {
      return true; // Allow requests without province filter
    }
    return provinceContext.canAccessProvince(requestedProvinceCode);
  }

  return false;
};

/**
 * Hook to get province-aware page title
 */
export const useProvincePageTitle = (baseTitle: string): string => {
  const provinceContext = useProvinceContext();
  
  if (provinceContext.isProvincialAdmin && provinceContext.assignedProvince) {
    return `${baseTitle} - ${provinceContext.assignedProvince.name} Province`;
  }
  
  return baseTitle;
};

/**
 * Hook to get province-aware breadcrumbs
 */
export const useProvinceBreadcrumbs = (baseBreadcrumbs: Array<{ label: string; href?: string }>): Array<{ label: string; href?: string }> => {
  const provinceContext = useProvinceContext();
  
  if (provinceContext.isProvincialAdmin && provinceContext.assignedProvince) {
    return [
      { label: provinceContext.assignedProvince.name, href: '/admin/dashboard' },
      ...baseBreadcrumbs
    ];
  }
  
  return [
    { label: 'National', href: '/admin/dashboard' },
    ...baseBreadcrumbs
  ];
};
