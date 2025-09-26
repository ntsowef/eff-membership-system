import { useMemo } from 'react';
import { useAuth } from '../store';

export interface PermissionMap {
  // Financial permissions
  'financial.view_all_transactions': boolean;
  'financial.view_dashboard': boolean;
  'financial.view_summary': boolean;
  'financial.view_performance': boolean;
  'financial.view_analytics': boolean;
  'financial.bulk_operations': boolean;
  'financial.export_data': boolean;
  
  // Two-tier approval permissions
  'approval.financial_review': boolean;
  'approval.final_review': boolean;
  'approval.renewal_review': boolean;
  'approval.view_audit_trail': boolean;
  
  // Membership permissions
  'members.view': boolean;
  'members.create': boolean;
  'members.edit': boolean;
  'members.delete': boolean;
  'members.export': boolean;
  
  // Renewal permissions
  'renewals.view': boolean;
  'renewals.create': boolean;
  'renewals.process': boolean;
  'renewals.bulk_operations': boolean;
  'renewals.pricing_management': boolean;
  
  // Payment permissions
  'payments.view': boolean;
  'payments.process': boolean;
  'payments.verify': boolean;
  'payments.approve': boolean;
  'payments.reject': boolean;
  'payments.refund': boolean;
  
  // Administrative permissions
  'admin.user_management': boolean;
  'admin.system_settings': boolean;
  'admin.audit_logs': boolean;
  'admin.backup_restore': boolean;
  
  // Geographic permissions
  'geographic.view': boolean;
  'geographic.edit': boolean;
  'geographic.manage_hierarchy': boolean;
  
  // Communication permissions
  'communication.send_messages': boolean;
  'communication.manage_templates': boolean;
  'communication.view_history': boolean;
  
  // Statistics and reporting permissions
  'statistics.view': boolean;
  'statistics.export': boolean;
  'reports.generate': boolean;
  'reports.schedule': boolean;
}

export const usePermissions = () => {
  const { user, hasPermission: storeHasPermission, hasAdminLevel } = useAuth();

  const permissions = useMemo((): PermissionMap => {
    if (!user || !user.is_active) {
      // Return all false permissions for inactive/no user
      return Object.keys({} as PermissionMap).reduce((acc, key) => {
        acc[key as keyof PermissionMap] = false;
        return acc;
      }, {} as PermissionMap);
    }

    const isSuperAdmin = user.role_name === 'super_admin';
    const isNationalAdmin = user.admin_level === 'national' || isSuperAdmin;
    const isProvincialAdmin = user.admin_level === 'province';
    const isDistrictAdmin = user.admin_level === 'district';
    const isMunicipalAdmin = user.admin_level === 'municipality';
    const isWardAdmin = user.admin_level === 'ward';
    
    // Financial reviewer and membership approver roles
    const isFinancialReviewer = user.role_name === 'financial_reviewer' || user?.role_name === 'financial.approver';
    const isMembershipApprover = user.role_name === 'membership_approver' || user?.role_name === 'membership.approver';

    return {
      // Financial permissions - Financial reviewers, membership approvers, and admins
      'financial.view_all_transactions': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      'financial.view_dashboard': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      'financial.view_summary': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      'financial.view_performance': isFinancialReviewer || isMembershipApprover || isNationalAdmin,
      'financial.view_analytics': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      'financial.bulk_operations': isSuperAdmin,
      'financial.export_data': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      
      // Two-tier approval permissions
      'approval.financial_review': isFinancialReviewer || isNationalAdmin,
      'approval.final_review': isMembershipApprover || isNationalAdmin,
      'approval.renewal_review': isFinancialReviewer || isMembershipApprover || isNationalAdmin,
      'approval.view_audit_trail': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      
      // Membership permissions
      'members.view': true, // All authenticated users can view members
      'members.create': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      'members.edit': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      'members.delete': isNationalAdmin || isProvincialAdmin,
      'members.export': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      
      // Renewal permissions
      'renewals.view': true, // All authenticated users can view renewals
      'renewals.create': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      'renewals.process': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      'renewals.bulk_operations': isNationalAdmin || isProvincialAdmin,
      'renewals.pricing_management': isNationalAdmin,
      
      // Payment permissions
      'payments.view': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      'payments.process': isFinancialReviewer || isMembershipApprover || isNationalAdmin || isProvincialAdmin,
      'payments.verify': isFinancialReviewer || isMembershipApprover || isNationalAdmin,
      'payments.approve': isMembershipApprover || isNationalAdmin,
      'payments.reject': isMembershipApprover || isNationalAdmin,
      'payments.refund': isNationalAdmin,
      
      // Administrative permissions
      'admin.user_management': isNationalAdmin || isProvincialAdmin,
      'admin.system_settings': isNationalAdmin,
      'admin.audit_logs': isNationalAdmin || isProvincialAdmin,
      'admin.backup_restore': isSuperAdmin,
      
      // Geographic permissions
      'geographic.view': true, // All authenticated users can view geographic data
      'geographic.edit': isNationalAdmin || isProvincialAdmin,
      'geographic.manage_hierarchy': isNationalAdmin,
      
      // Communication permissions
      'communication.send_messages': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      'communication.manage_templates': isNationalAdmin || isProvincialAdmin,
      'communication.view_history': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      
      // Statistics and reporting permissions
      'statistics.view': true, // All authenticated users can view basic statistics
      'statistics.export': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      'reports.generate': isNationalAdmin || isProvincialAdmin || isDistrictAdmin,
      'reports.schedule': isNationalAdmin || isProvincialAdmin,
    };
  }, [user]);

  const hasPermission = (permission: keyof PermissionMap): boolean => {
    return permissions[permission] || false;
  };

  const hasAnyPermission = (permissionList: (keyof PermissionMap)[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: (keyof PermissionMap)[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  const hasRole = (role: string): boolean => {
    return user?.role_name === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const isFinancialUser = (): boolean => {
    return hasAnyRole(['financial_reviewer', 'financial.approver', 'membership_approver', 'membership.approver']) ||
           hasAnyPermission(['financial.view_dashboard', 'financial.view_all_transactions']);
  };

  const canAccessFinancialDashboard = (): boolean => {
    return hasPermission('financial.view_dashboard');
  };

  const canViewAllTransactions = (): boolean => {
    return hasPermission('financial.view_all_transactions');
  };

  const canProcessPayments = (): boolean => {
    return hasPermission('payments.process');
  };

  const canManageRenewals = (): boolean => {
    return hasAnyPermission(['renewals.create', 'renewals.process', 'renewals.bulk_operations']);
  };

  const canAccessAdminFeatures = (): boolean => {
    return hasAnyPermission(['admin.user_management', 'admin.system_settings', 'admin.audit_logs']);
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isFinancialUser,
    canAccessFinancialDashboard,
    canViewAllTransactions,
    canProcessPayments,
    canManageRenewals,
    canAccessAdminFeatures,
    user,
  };
};

export default usePermissions;
