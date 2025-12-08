import { useCallback } from 'react';
import { useAuth } from '../store';
import { validateApiAccess } from '../utils/provinceValidation';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useMunicipalityContext, applyMunicipalityFilter } from './useMunicipalityContext';

/**
 * Custom hook that provides secure API methods with automatic province and municipality validation
 * for Provincial Admin and Municipality Admin users
 */
export const useSecureApi = () => {
  const { user } = useAuth();
  const municipalityContext = useMunicipalityContext();

  /**
   * Secure GET request with province and municipality validation
   */
  const secureGet = useCallback(async <T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> => {
    // Validate API access and sanitize parameters
    const validation = validateApiAccess(endpoint, params || {}, user);

    if (!validation.isValid) {
      throw new Error(validation.error || 'Access denied');
    }

    // Apply municipality filtering for municipality admin users
    const municipalityFilteredParams = applyMunicipalityFilter(
      validation.sanitizedParams || {},
      municipalityContext
    );

    return apiGet<T>(endpoint, municipalityFilteredParams);
  }, [user, municipalityContext]);

  /**
   * Secure POST request with province and municipality validation
   */
  const securePost = useCallback(async <T = any>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> => {
    // Validate API access and sanitize parameters
    const validation = validateApiAccess(endpoint, params || {}, user);

    if (!validation.isValid) {
      throw new Error(validation.error || 'Access denied');
    }

    // For provincial admins, ensure province context is included in data
    let secureData = data;
    if (user?.admin_level === 'province' && user?.province_code && data) {
      secureData = {
        ...data,
        province_code: user.province_code
      };
    }

    // For municipality admins, ensure municipality context is included in data
    if (user?.admin_level === 'municipality' && municipalityContext.assignedMunicipality && data) {
      secureData = {
        ...secureData,
        municipal_code: municipalityContext.assignedMunicipality.code,
        province_code: municipalityContext.assignedProvince?.code,
        district_code: municipalityContext.assignedDistrict?.code,
      };
    }

    // Apply municipality filtering to parameters
    const municipalityFilteredParams = applyMunicipalityFilter(
      validation.sanitizedParams || {},
      municipalityContext
    );

    // Merge params into data for POST requests
    const dataWithParams = { ...secureData, ...municipalityFilteredParams };
    return apiPost<T>(endpoint, dataWithParams);
  }, [user, municipalityContext]);

  /**
   * Secure PUT request with province and municipality validation
   */
  const securePut = useCallback(async <T = any>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> => {
    // Validate API access and sanitize parameters
    const validation = validateApiAccess(endpoint, params || {}, user);

    if (!validation.isValid) {
      throw new Error(validation.error || 'Access denied');
    }

    // For provincial admins, ensure province context is included in data
    let secureData = data;
    if (user?.admin_level === 'province' && user?.province_code && data) {
      secureData = {
        ...data,
        province_code: user.province_code
      };
    }

    // For municipality admins, ensure municipality context is included in data
    if (user?.admin_level === 'municipality' && municipalityContext.assignedMunicipality && data) {
      secureData = {
        ...secureData,
        municipal_code: municipalityContext.assignedMunicipality.code,
        province_code: municipalityContext.assignedProvince?.code,
        district_code: municipalityContext.assignedDistrict?.code,
      };
    }

    // Apply municipality filtering to parameters
    const municipalityFilteredParams = applyMunicipalityFilter(
      validation.sanitizedParams || {},
      municipalityContext
    );

    // Merge params into data for PUT requests
    const dataWithParams = { ...secureData, ...municipalityFilteredParams };
    return apiPut<T>(endpoint, dataWithParams);
  }, [user, municipalityContext]);

  /**
   * Secure DELETE request with province and municipality validation
   */
  const secureDelete = useCallback(async <T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> => {
    // Validate API access and sanitize parameters
    const validation = validateApiAccess(endpoint, params || {}, user);

    if (!validation.isValid) {
      throw new Error(validation.error || 'Access denied');
    }

    // Apply municipality filtering to parameters - not used for DELETE
    // const municipalityFilteredParams = applyMunicipalityFilter(
    //   validation.sanitizedParams || {},
    //   municipalityContext
    // );

    return apiDelete<T>(endpoint);
  }, [user, municipalityContext]);

  /**
   * Check if current user can access a specific province
   */
  const canAccessProvince = useCallback((provinceCode: string): boolean => {
    if (!user) return false;
    
    // National admins can access all provinces
    if (user.admin_level === 'national') return true;
    
    // Provincial admins can only access their assigned province
    if (user.admin_level === 'province') {
      return user.province_code === provinceCode;
    }
    
    return false;
  }, [user]);

  /**
   * Get the province filter that should be applied for the current user
   */
  const getProvinceFilter = useCallback((): string | null => {
    if (!user) return null;

    // Provincial admins must filter by their assigned province
    if (user.admin_level === 'province' && user.province_code) {
      return user.province_code;
    }

    // National admins don't need province filtering
    return null;
  }, [user]);

  /**
   * Check if current user can access a specific municipality
   */
  const canAccessMunicipality = useCallback((municipalityCode: string): boolean => {
    if (!user) return false;

    // National and provincial admins can access all municipalities
    if (user.admin_level === 'national' || user.admin_level === 'province') return true;

    // Municipality admins can only access their assigned municipality
    if (user.admin_level === 'municipality') {
      return municipalityContext.canAccessMunicipality(municipalityCode);
    }

    return false;
  }, [user, municipalityContext]);

  /**
   * Get the municipality filter that should be applied for the current user
   */
  const getMunicipalityFilter = useCallback((): string | null => {
    if (!user) return null;

    // Municipality admins must filter by their assigned municipality
    if (user.admin_level === 'municipality' && municipalityContext.assignedMunicipality) {
      return municipalityContext.assignedMunicipality.code;
    }

    // National and provincial admins don't need municipality filtering
    return null;
  }, [user, municipalityContext]);

  return {
    secureGet,
    securePost,
    securePut,
    secureDelete,
    canAccessProvince,
    canAccessMunicipality,
    getProvinceFilter,
    getMunicipalityFilter,
    user
  };
};

export default useSecureApi;
