import { useProvinceContext } from '../hooks/useProvinceContext';

/**
 * Utility functions for province-based validation and security
 */

export interface ProvinceValidationResult {
  isValid: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Validates if a user can access a specific province's data
 */
export const validateProvinceAccess = (
  requestedProvinceCode: string | undefined,
  userProvinceCode: string | undefined,
  userAdminLevel: string | undefined
): ProvinceValidationResult => {
  // National admins can access any province
  if (userAdminLevel === 'national' || userAdminLevel === 'super_admin') {
    return { isValid: true };
  }

  // Provincial admins can only access their assigned province
  if (userAdminLevel === 'province') {
    if (!userProvinceCode) {
      return {
        isValid: false,
        error: 'Provincial admin user has no assigned province',
        redirectTo: '/admin/dashboard'
      };
    }

    if (requestedProvinceCode && requestedProvinceCode !== userProvinceCode) {
      return {
        isValid: false,
        error: `Access denied: You can only view data for ${userProvinceCode} province`,
        redirectTo: '/admin/dashboard'
      };
    }

    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Insufficient permissions to access province data',
    redirectTo: '/admin/dashboard'
  };
};

/**
 * Validates URL parameters for province-based routes
 */
export const validateProvinceRoute = (
  routeParams: Record<string, string | undefined>,
  userProvinceCode: string | undefined,
  userAdminLevel: string | undefined
): ProvinceValidationResult => {
  const provinceFromRoute = routeParams.province || routeParams.provinceCode;
  
  return validateProvinceAccess(provinceFromRoute, userProvinceCode, userAdminLevel);
};

/**
 * Sanitizes API parameters to ensure province filtering for provincial admins
 */
export const sanitizeApiParams = <T extends Record<string, any>>(
  params: T,
  userProvinceCode: string | undefined,
  userAdminLevel: string | undefined
): T => {
  // National admins can use any parameters
  if (userAdminLevel === 'national' || userAdminLevel === 'super_admin') {
    return params;
  }

  // Provincial admins must have their province code enforced
  if (userAdminLevel === 'province' && userProvinceCode) {
    return {
      ...params,
      province_code: userProvinceCode,
      // Remove any conflicting province parameters
      provinceCode: undefined,
      province: undefined,
    };
  }

  return params;
};

/**
 * Logs security violations for audit purposes
 */
export const logSecurityViolation = (
  userId: number,
  userEmail: string,
  attemptedAction: string,
  requestedProvince?: string,
  userProvince?: string
): void => {
  const violation = {
    timestamp: new Date().toISOString(),
    userId,
    userEmail,
    attemptedAction,
    requestedProvince,
    userProvince,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Log to console for development
  console.warn('🚨 Security Violation Detected:', violation);

  // In production, you would send this to your audit logging service
  // auditService.logSecurityViolation(violation);
};

/**
 * Custom hook for province-aware navigation
 */
export const useProvinceNavigation = () => {
  const provinceContext = useProvinceContext();

  const navigateWithProvinceContext = (basePath: string, additionalParams?: Record<string, string>): string => {
    if (provinceContext.shouldRestrictToProvince && provinceContext.assignedProvince) {
      const params = new URLSearchParams({
        province: provinceContext.assignedProvince.code,
        ...additionalParams,
      });
      return `${basePath}?${params.toString()}`;
    }

    if (additionalParams && Object.keys(additionalParams).length > 0) {
      const params = new URLSearchParams(additionalParams);
      return `${basePath}?${params.toString()}`;
    }

    return basePath;
  };

  const getProvinceAwarePath = (path: string): string => {
    // For provincial admins, ensure province context is maintained in navigation
    if (provinceContext.shouldRestrictToProvince && provinceContext.assignedProvince) {
      const url = new URL(path, window.location.origin);
      if (!url.searchParams.has('province') && !url.searchParams.has('province_code')) {
        url.searchParams.set('province', provinceContext.assignedProvince.code);
      }
      return url.pathname + url.search;
    }
    return path;
  };

  return {
    navigateWithProvinceContext,
    getProvinceAwarePath,
  };
};

/**
 * Validates and sanitizes geographic filters for provincial admins
 */
export const validateGeographicFilters = (
  filters: Record<string, any>,
  userProvinceCode: string | undefined,
  userAdminLevel: string | undefined
): Record<string, any> => {
  if (userAdminLevel === 'national' || userAdminLevel === 'super_admin') {
    return filters;
  }

  if (userAdminLevel === 'province' && userProvinceCode) {
    // Ensure provincial admin can only filter within their province
    const sanitizedFilters = { ...filters };
    
    // Force province filter
    sanitizedFilters.province_code = userProvinceCode;
    
    // Remove any conflicting province parameters
    delete sanitizedFilters.province;
    delete sanitizedFilters.provinceCode;
    
    // Validate district/municipality/ward codes belong to the user's province
    // This would require additional validation against geographic data
    // For now, we'll allow them but the backend should validate
    
    return sanitizedFilters;
  }

  return filters;
};

/**
 * Validates URL parameters against province access permissions
 */
export const validateUrlAccess = (
  pathname: string,
  searchParams: URLSearchParams,
  userContext: any
): { isValid: boolean; redirectTo?: string; error?: string } => {
  // Extract province-related parameters from URL
  const urlProvinceCode = searchParams.get('province') ||
                         searchParams.get('province_code') ||
                         pathname.match(/\/province\/([A-Z]{2})/)?.[1];

  // If user is provincial admin, validate province access
  if (userContext?.admin_level === 'province' && userContext?.province_code) {
    if (urlProvinceCode && urlProvinceCode !== userContext.province_code) {
      logSecurityViolation(
        userContext.id,
        userContext.email,
        `Attempted to access ${urlProvinceCode} data via URL`,
        urlProvinceCode,
        userContext.province_code
      );

      return {
        isValid: false,
        redirectTo: pathname.replace(
          `/province/${urlProvinceCode}`,
          `/province/${userContext.province_code}`
        ),
        error: `Access denied: You can only view ${userContext.province_code} province data`
      };
    }
  }

  return { isValid: true };
};

/**
 * Monitors and prevents unauthorized API calls
 */
export const validateApiAccess = (
  endpoint: string,
  params: Record<string, any>,
  userContext: any
): { isValid: boolean; sanitizedParams?: Record<string, any>; error?: string } => {
  // If user is provincial admin, ensure province filtering is applied
  if (userContext?.admin_level === 'province' && userContext?.province_code) {
    const sanitizedParams = { ...params };

    // Force province filter for provincial admins
    if (!sanitizedParams.province_code && !sanitizedParams.province) {
      sanitizedParams.province_code = userContext.province_code;
    }

    // Validate existing province parameters
    const requestedProvince = sanitizedParams.province_code || sanitizedParams.province;
    if (requestedProvince && requestedProvince !== userContext.province_code) {
      logSecurityViolation(
        userContext.id,
        userContext.email,
        `Attempted to access ${requestedProvince} data via ${endpoint}`,
        requestedProvince,
        userContext.province_code
      );

      return {
        isValid: false,
        error: `Access denied: You can only access ${userContext.province_code} province data`
      };
    }

    return { isValid: true, sanitizedParams };
  }

  return { isValid: true, sanitizedParams: params };
};
