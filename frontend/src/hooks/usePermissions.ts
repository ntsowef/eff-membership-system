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
  'communication.bulk_send': boolean;

  // Reports permissions
  'reports.view': boolean;
  'reports.generate': boolean;
  'reports.export': boolean;
  'reports.schedule': boolean;

  // Analytics permissions
  'analytics.view': boolean;
  'analytics.advanced': boolean;
  'analytics.export': boolean;

  // Leadership permissions
  'leadership.view': boolean;
  'leadership.manage': boolean;
  'leadership.assign': boolean;
  'leadership.remove': boolean;

  // Elections permissions
  'elections.view': boolean;
  'elections.manage': boolean;
  'elections.results': boolean;
}

export const usePermissions = () => {
  const { user, hasPermission: _storeHasPermission, hasAdminLevel: _hasAdminLevel } = useAuth();

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
    // const _isMunicipalAdmin = user.admin_level === 'municipality';
    // const _isWardAdmin = user.admin_level === 'ward';

    // Financial reviewer and membership approver roles
    const isFinancialReviewer = user.role_name === 'financial_reviewer' || user?.role_name === 'financial.approver';
    const isMembershipApprover = user.role_name === 'membership_approver' || user?.role_name === 'membership.approver';

    // National Admin has ALL privileges - return true for all permissions
    if (isNationalAdmin) {
      return Object.keys({
        'financial.view_all_transactions': true,
        'financial.view_dashboard': true,
        'financial.view_summary': true,
        'financial.view_performance': true,
        'financial.view_analytics': true,
        'financial.bulk_operations': true,
        'financial.export_data': true,
        'approval.financial_review': true,
        'approval.final_review': true,
        'approval.renewal_review': true,
        'approval.view_audit_trail': true,
        'members.view': true,
        'members.create': true,
        'members.edit': true,
        'members.delete': true,
        'members.export': true,
        'renewals.view': true,
        'renewals.create': true,
        'renewals.process': true,
        'renewals.bulk_operations': true,
        'renewals.pricing_management': true,
        'payments.view': true,
        'payments.process': true,
        'payments.verify': true,
        'payments.approve': true,
        'payments.reject': true,
        'payments.refund': true,
        'admin.user_management': true,
        'admin.system_settings': true,
        'admin.audit_logs': true,
        'admin.backup_restore': true,
        'geographic.view': true,
        'geographic.edit': true,
        'geographic.manage_hierarchy': true,
        'communication.send_messages': true,
        'communication.manage_templates': true,
        'communication.view_history': true,
        'communication.bulk_send': true,
        'reports.view': true,
        'reports.generate': true,
        'reports.export': true,
        'reports.schedule': true,
        'analytics.view': true,
        'analytics.advanced': true,
        'analytics.export': true,
        'leadership.view': true,
        'leadership.manage': true,
        'leadership.assign': true,
        'leadership.remove': true,
        'elections.view': true,
        'elections.manage': true,
        'elections.results': true,
      } as PermissionMap).reduce((acc, key) => {
        acc[key as keyof PermissionMap] = true;
        return acc;
      }, {} as PermissionMap);
    }

    return {
      // Financial permissions - Financial reviewers, membership approvers, and admins
      'financial.view_all_transactions': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,
      'financial.view_dashboard': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,
      'financial.view_summary': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,
      'financial.view_performance': isFinancialReviewer || isMembershipApprover,
      'financial.view_analytics': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,
      'financial.bulk_operations': false,
      'financial.export_data': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,

      // Two-tier approval permissions
      'approval.financial_review': isFinancialReviewer,
      'approval.final_review': isMembershipApprover,
      'approval.renewal_review': isFinancialReviewer || isMembershipApprover,
      'approval.view_audit_trail': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,

      // Membership permissions
      'members.view': true, // All authenticated users can view members
      'members.create': isProvincialAdmin || isDistrictAdmin,
      'members.edit': isProvincialAdmin || isDistrictAdmin,
      'members.delete': isProvincialAdmin,
      'members.export': isProvincialAdmin || isDistrictAdmin,

      // Renewal permissions
      'renewals.view': true, // All authenticated users can view renewals
      'renewals.create': isProvincialAdmin || isDistrictAdmin,
      'renewals.process': isProvincialAdmin || isDistrictAdmin,
      'renewals.bulk_operations': isProvincialAdmin,
      'renewals.pricing_management': false,

      // Payment permissions
      'payments.view': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,
      'payments.process': isFinancialReviewer || isMembershipApprover || isProvincialAdmin,
      'payments.verify': isFinancialReviewer || isMembershipApprover,
      'payments.approve': isMembershipApprover,
      'payments.reject': isMembershipApprover,
      'payments.refund': false,

      // Administrative permissions
      'admin.user_management': isProvincialAdmin,
      'admin.system_settings': false,
      'admin.audit_logs': isProvincialAdmin,
      'admin.backup_restore': false,

      // Geographic permissions
      'geographic.view': true, // All authenticated users can view geographic data
      'geographic.edit': isProvincialAdmin,
      'geographic.manage_hierarchy': false,

      // Communication permissions
      'communication.send_messages': isProvincialAdmin || isDistrictAdmin,
      'communication.manage_templates': isProvincialAdmin,
      'communication.view_history': isProvincialAdmin || isDistrictAdmin,
      'communication.bulk_send': isProvincialAdmin,

      // Reports permissions
      'reports.view': true,
      'reports.generate': isProvincialAdmin || isDistrictAdmin,
      'reports.export': isProvincialAdmin || isDistrictAdmin,
      'reports.schedule': isProvincialAdmin,

      // Analytics permissions
      'analytics.view': true,
      'analytics.advanced': isProvincialAdmin,
      'analytics.export': isProvincialAdmin || isDistrictAdmin,

      // Leadership permissions
      'leadership.view': true,
      'leadership.manage': isProvincialAdmin,
      'leadership.assign': isProvincialAdmin,
      'leadership.remove': isProvincialAdmin,

      // Elections permissions
      'elections.view': true,
      'elections.manage': false,
      'elections.results': isProvincialAdmin,
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
