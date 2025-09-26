import React from 'react';
import { usePermissionCheck, RolePermissions } from '../../hooks/useRolePermissions';
import { Box, Alert, Typography } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: keyof RolePermissions;
  permissions?: (keyof RolePermissions)[];
  requireAll?: boolean; // If true, requires all permissions; if false, requires any permission
  fallback?: React.ReactNode;
  showFallback?: boolean; // If true, shows fallback when permission denied; if false, renders nothing
  adminLevels?: ('national' | 'province' | 'district' | 'municipality' | 'ward')[];
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  showFallback = false,
  adminLevels
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, getAdminLevelDisplay } = usePermissionCheck();
  const { user } = usePermissionCheck().permissions as any; // Access user from the hook

  // Check admin level restrictions
  if (adminLevels && adminLevels.length > 0) {
    const userAdminLevel = user?.admin_level;
    if (!userAdminLevel || !adminLevels.includes(userAdminLevel)) {
      if (showFallback) {
        return fallback || (
          <Alert severity="warning" icon={<LockIcon />}>
            <Typography variant="body2">
              Access restricted to {adminLevels.join(', ')} admin levels only.
            </Typography>
          </Alert>
        );
      }
      return null;
    }
  }

  // Check specific permission
  if (permission) {
    if (!hasPermission(permission)) {
      if (showFallback) {
        return fallback || (
          <Alert severity="info" icon={<LockIcon />}>
            <Typography variant="body2">
              You don't have permission to access this feature.
            </Typography>
          </Alert>
        );
      }
      return null;
    }
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      if (showFallback) {
        return fallback || (
          <Alert severity="info" icon={<LockIcon />}>
            <Typography variant="body2">
              You don't have the required permissions to access this feature.
            </Typography>
          </Alert>
        );
      }
      return null;
    }
  }

  return <>{children}</>;
};

// Specialized components for common use cases
export const SMSGate: React.FC<{ children: React.ReactNode; showFallback?: boolean; fallback?: React.ReactNode }> = ({ 
  children, 
  showFallback = false, 
  fallback 
}) => (
  <PermissionGate 
    permission="canAccessSMS" 
    showFallback={showFallback}
    fallback={fallback || (
      <Alert severity="warning" icon={<LockIcon />}>
        <Typography variant="body2">
          SMS communication is restricted to National Admin users only.
        </Typography>
      </Alert>
    )}
  >
    {children}
  </PermissionGate>
);

export const ElectionManagementGate: React.FC<{ children: React.ReactNode; showFallback?: boolean; fallback?: React.ReactNode }> = ({ 
  children, 
  showFallback = false, 
  fallback 
}) => (
  <PermissionGate 
    permission="canAccessElectionManagement" 
    showFallback={showFallback}
    fallback={fallback || (
      <Alert severity="warning" icon={<LockIcon />}>
        <Typography variant="body2">
          Election management is restricted to National and Provincial Admin users only.
        </Typography>
      </Alert>
    )}
  >
    {children}
  </PermissionGate>
);

export const NationalAdminGate: React.FC<{ children: React.ReactNode; showFallback?: boolean; fallback?: React.ReactNode }> = ({ 
  children, 
  showFallback = false, 
  fallback 
}) => (
  <PermissionGate 
    adminLevels={['national']} 
    showFallback={showFallback}
    fallback={fallback || (
      <Alert severity="warning" icon={<LockIcon />}>
        <Typography variant="body2">
          This feature is restricted to National Admin users only.
        </Typography>
      </Alert>
    )}
  >
    {children}
  </PermissionGate>
);

export const ProvincialAdminGate: React.FC<{ children: React.ReactNode; showFallback?: boolean; fallback?: React.ReactNode }> = ({ 
  children, 
  showFallback = false, 
  fallback 
}) => (
  <PermissionGate 
    adminLevels={['national', 'province']} 
    showFallback={showFallback}
    fallback={fallback || (
      <Alert severity="warning" icon={<LockIcon />}>
        <Typography variant="body2">
          This feature is restricted to National and Provincial Admin users only.
        </Typography>
      </Alert>
    )}
  >
    {children}
  </PermissionGate>
);

// Hook for conditional rendering in components
export const useConditionalRender = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissionCheck();

  const renderIf = (
    condition: boolean | (() => boolean),
    component: React.ReactNode,
    fallback?: React.ReactNode
  ): React.ReactNode => {
    const shouldRender = typeof condition === 'function' ? condition() : condition;
    return shouldRender ? component : (fallback || null);
  };

  const renderIfPermission = (
    permission: keyof RolePermissions,
    component: React.ReactNode,
    fallback?: React.ReactNode
  ): React.ReactNode => {
    return renderIf(hasPermission(permission), component, fallback);
  };

  const renderIfAnyPermission = (
    permissions: (keyof RolePermissions)[],
    component: React.ReactNode,
    fallback?: React.ReactNode
  ): React.ReactNode => {
    return renderIf(hasAnyPermission(permissions), component, fallback);
  };

  const renderIfAllPermissions = (
    permissions: (keyof RolePermissions)[],
    component: React.ReactNode,
    fallback?: React.ReactNode
  ): React.ReactNode => {
    return renderIf(hasAllPermissions(permissions), component, fallback);
  };

  return {
    renderIf,
    renderIfPermission,
    renderIfAnyPermission,
    renderIfAllPermissions
  };
};

export default PermissionGate;
