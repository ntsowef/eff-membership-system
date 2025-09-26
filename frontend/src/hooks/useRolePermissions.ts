import { useMemo } from 'react';
import { useAuth } from '../store';

export interface RolePermissions {
  // Communication permissions
  canAccessSMS: boolean;
  canAccessEmail: boolean;
  canAccessCommunication: boolean;
  
  // Election management permissions
  canAccessElectionManagement: boolean;
  canCreateElections: boolean;
  canManageElections: boolean;
  
  // Administrative permissions
  canAccessNationalFeatures: boolean;
  canAccessProvincialFeatures: boolean;
  canAccessDistrictFeatures: boolean;
  canAccessMunicipalFeatures: boolean;
  canAccessWardFeatures: boolean;
  
  // Data access permissions
  canViewAllProvinces: boolean;
  canViewAssignedProvinceOnly: boolean;
  
  // System permissions
  canManageUsers: boolean;
  canViewSystemSettings: boolean;
  canAccessAuditLogs: boolean;

  // Leadership management permissions
  canManageLeadership: boolean;

  // SMS Communication permissions
  canAccessSMSManagement: boolean;
}

export const useRolePermissions = (): RolePermissions => {
  const { user } = useAuth();

  const permissions = useMemo((): RolePermissions => {
    if (!user || !user.is_active) {
      return {
        canAccessSMS: false,
        canAccessEmail: false,
        canAccessCommunication: false,
        canAccessElectionManagement: false,
        canCreateElections: false,
        canManageElections: false,
        canAccessNationalFeatures: false,
        canAccessProvincialFeatures: false,
        canAccessDistrictFeatures: false,
        canAccessMunicipalFeatures: false,
        canAccessWardFeatures: false,
        canViewAllProvinces: false,
        canViewAssignedProvinceOnly: false,
        canManageUsers: false,
        canViewSystemSettings: false,
        canAccessAuditLogs: false,
        canManageLeadership: false,
        canAccessSMSManagement: false
      };
    }

    const adminLevel = user.admin_level;
    const roleName = user.role_name;
    const isSuperAdmin = roleName === 'super_admin';
    const isNationalAdmin = adminLevel === 'national' || isSuperAdmin;
    const isProvincialAdmin = adminLevel === 'province';
    const isDistrictAdmin = adminLevel === 'district';
    const isMunicipalAdmin = adminLevel === 'municipality';
    const isWardAdmin = adminLevel === 'ward';

    return {
      // Communication permissions
      canAccessSMS: isNationalAdmin, // SMS restricted to National Admin only
      canAccessEmail: true, // Email available to all admin levels
      canAccessCommunication: true, // General communication available to all
      
      // Election management permissions
      canAccessElectionManagement: isNationalAdmin || isProvincialAdmin, // National and Provincial only
      canCreateElections: isNationalAdmin || isProvincialAdmin,
      canManageElections: isNationalAdmin || isProvincialAdmin,
      
      // Administrative permissions
      canAccessNationalFeatures: isNationalAdmin,
      canAccessProvincialFeatures: isNationalAdmin || isProvincialAdmin,
      canAccessDistrictFeatures: isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      canAccessMunicipalFeatures: isNationalAdmin || isProvincialAdmin || isDistrictAdmin || isMunicipalAdmin,
      canAccessWardFeatures: true, // All admin levels can access ward features
      
      // Data access permissions
      canViewAllProvinces: isNationalAdmin,
      canViewAssignedProvinceOnly: isProvincialAdmin || isDistrictAdmin || isMunicipalAdmin || isWardAdmin,
      
      // System permissions
      canManageUsers: isNationalAdmin || isProvincialAdmin, // Municipality admin cannot manage users
      canViewSystemSettings: isNationalAdmin,
      canAccessAuditLogs: isNationalAdmin || isProvincialAdmin,

      // Leadership management permissions
      canManageLeadership: isNationalAdmin || isProvincialAdmin, // Municipality admin cannot manage leadership (except meetings)

      // SMS Communication permissions
      canAccessSMSManagement: isNationalAdmin // Only National Admin can access SMS management
    };
  }, [user]);

  return permissions;
};

// Hook for checking specific permissions
export const usePermissionCheck = () => {
  const permissions = useRolePermissions();
  const { user } = useAuth();

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission];
  };

  const hasAnyPermission = (permissionList: (keyof RolePermissions)[]): boolean => {
    return permissionList.some(permission => permissions[permission]);
  };

  const hasAllPermissions = (permissionList: (keyof RolePermissions)[]): boolean => {
    return permissionList.every(permission => permissions[permission]);
  };

  const getAdminLevelDisplay = (): string => {
    if (!user) return 'No Access';
    
    switch (user.admin_level) {
      case 'national':
        return user.role_name === 'super_admin' ? 'Super Admin' : 'National Admin';
      case 'province':
        return 'Provincial Admin';
      case 'district':
        return 'District Admin';
      case 'municipality':
        return 'Municipal Admin';
      case 'ward':
        return 'Ward Admin';
      default:
        return 'User';
    }
  };

  const getAccessScope = (): string => {
    if (!user) return 'No Access';
    
    if (permissions.canViewAllProvinces) {
      return 'National Access';
    } else if (permissions.canViewAssignedProvinceOnly && user.province_code) {
      return `Province Access (${user.province_code})`;
    } else if (user.district_code) {
      return `District Access (${user.district_code})`;
    } else if (user.municipal_code) {
      return `Municipal Access (${user.municipal_code})`;
    } else if (user.ward_code) {
      return `Ward Access (${user.ward_code})`;
    }
    
    return 'Limited Access';
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAdminLevelDisplay,
    getAccessScope
  };
};

export default useRolePermissions;
