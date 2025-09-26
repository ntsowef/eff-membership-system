import { useMemo } from 'react';
import { useAuthStore } from '../store';

export interface MunicipalityContextData {
  isMunicipalityAdmin: boolean;
  assignedMunicipality: {
    code: string;
    name: string;
  } | null;
  assignedProvince: {
    code: string;
    name: string;
  } | null;
  assignedDistrict: {
    code: string;
    name: string;
  } | null;
  canAccessMunicipality: (municipalityCode: string) => boolean;
  shouldRestrictToMunicipality: boolean;
  getMunicipalityFilter: () => string | undefined;
  getProvinceFilter: () => string | undefined;
  getDistrictFilter: () => string | undefined;
  getMunicipalityDisplayName: () => string;
  isNationalAdmin: boolean;
  isProvincialAdmin: boolean;
}

/**
 * Custom hook to manage municipality context for Municipality Admin users
 * Provides utilities for municipality-based filtering and access control
 */
export const useMunicipalityContext = (): MunicipalityContextData => {
  const { user, isAuthenticated } = useAuthStore();

  const contextData = useMemo((): MunicipalityContextData => {
    if (!isAuthenticated || !user) {
      return {
        isMunicipalityAdmin: false,
        assignedMunicipality: null,
        assignedProvince: null,
        assignedDistrict: null,
        canAccessMunicipality: () => false,
        shouldRestrictToMunicipality: false,
        getMunicipalityFilter: () => undefined,
        getProvinceFilter: () => undefined,
        getDistrictFilter: () => undefined,
        getMunicipalityDisplayName: () => 'National',
        isNationalAdmin: false,
        isProvincialAdmin: false,
      };
    }

    const isNationalAdmin = user.admin_level === 'national' || user.role_name === 'super_admin';
    const isProvincialAdmin = user.admin_level === 'province';
    const isMunicipalityAdmin = user.admin_level === 'municipality';

    // Extract municipality context from user data
    const assignedMunicipality = isMunicipalityAdmin && (user as any).municipal_code ? {
      code: (user as any).municipal_code,
      name: (user as any).municipality_name || `Municipality ${(user as any).municipal_code}`,
    } : null;

    const assignedProvince = isMunicipalityAdmin && (user as any).province_code ? {
      code: (user as any).province_code,
      name: (user as any).province_name || `Province ${(user as any).province_code}`,
    } : null;

    const assignedDistrict = isMunicipalityAdmin && (user as any).district_code ? {
      code: (user as any).district_code,
      name: (user as any).district_name || `District ${(user as any).district_code}`,
    } : null;

    return {
      isMunicipalityAdmin,
      assignedMunicipality,
      assignedProvince,
      assignedDistrict,
      canAccessMunicipality: (municipalityCode: string) => {
        if (isNationalAdmin || isProvincialAdmin) return true;
        if (isMunicipalityAdmin && assignedMunicipality) {
          return assignedMunicipality.code === municipalityCode;
        }
        return false;
      },
      shouldRestrictToMunicipality: isMunicipalityAdmin && !!assignedMunicipality,
      getMunicipalityFilter: () => assignedMunicipality?.code,
      getProvinceFilter: () => assignedProvince?.code,
      getDistrictFilter: () => assignedDistrict?.code,
      getMunicipalityDisplayName: () => {
        if (assignedMunicipality) {
          return assignedMunicipality.name;
        }
        return isProvincialAdmin ? 'Provincial' : 'National';
      },
      isNationalAdmin,
      isProvincialAdmin,
    };
  }, [user, isAuthenticated]);

  return contextData;
};

/**
 * Utility function to apply municipality filtering to API parameters
 */
export const applyMunicipalityFilter = <T extends Record<string, any>>(
  params: T,
  municipalityContext: MunicipalityContextData
): T => {
  if (municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedMunicipality) {
    return {
      ...params,
      municipal_code: municipalityContext.assignedMunicipality.code,
      province_code: municipalityContext.assignedProvince?.code,
      district_code: municipalityContext.assignedDistrict?.code,
    };
  }
  return params;
};

/**
 * Utility function to validate municipality access
 */
export const validateMunicipalityAccess = (
  requestedMunicipalityCode: string | undefined,
  municipalityContext: MunicipalityContextData
): boolean => {
  // National and provincial admins can access any municipality
  if (municipalityContext.isNationalAdmin || municipalityContext.isProvincialAdmin) {
    return true;
  }

  // Municipality admins can only access their assigned municipality
  if (municipalityContext.isMunicipalityAdmin) {
    if (!requestedMunicipalityCode) {
      return true; // Allow requests without municipality filter
    }
    return municipalityContext.canAccessMunicipality(requestedMunicipalityCode);
  }

  return false;
};
