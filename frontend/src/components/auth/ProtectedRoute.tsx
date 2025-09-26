import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Alert, Button, Typography, Card, CardContent } from '@mui/material';
import { Lock as LockIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { useAuth } from '../../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdminLevel?: 'national' | 'province' | 'district' | 'municipality' | 'ward';
  requirePermission?: string;
  requireUserManagement?: boolean;
  fallbackPath?: string;
  developmentMode?: boolean; // New prop to bypass all checks
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true, // Require authentication by default
  requireAdminLevel,
  requirePermission,
  requireUserManagement = false,
  fallbackPath = '/login',
  developmentMode = false // Disable development mode by default
}) => {
  const { isAuthenticated, user, hasPermission, hasAdminLevel, canAccessUserManagement } = useAuth();
  const location = useLocation();

  // Skip all checks in development mode
  if (developmentMode) {
    return <>{children}</>;
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check if user is active
  if (isAuthenticated && user && !user.is_active) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.100"
        p={2}
      >
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom color="error">
              Account Inactive
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Your account has been deactivated. Please contact your administrator for assistance.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.location.href = '/logout'}
              sx={{ mt: 2 }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Check admin level requirement
  if (requireAdminLevel && !hasAdminLevel(requireAdminLevel)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.100"
        p={2}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <AdminIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom color="warning.main">
              Insufficient Access Level
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              You need <strong>{requireAdminLevel}</strong> level access or higher to view this page.
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Your current access level: <strong>{user?.admin_level || 'none'}</strong>
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.history.back()}
              sx={{ mt: 2, mr: 1 }}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              onClick={() => window.location.href = '/dashboard'}
              sx={{ mt: 2 }}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Check permission requirement
  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.100"
        p={2}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom color="error">
              Access Denied
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              You don't have permission to access this resource.
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Required permission: <strong>{requirePermission}</strong>
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.history.back()}
              sx={{ mt: 2, mr: 1 }}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              onClick={() => window.location.href = '/dashboard'}
              sx={{ mt: 2 }}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Check user management access requirement
  if (requireUserManagement && !canAccessUserManagement()) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.100"
        p={2}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <AdminIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom color="warning.main">
              User Management Access Required
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              You need national or province level admin access to manage users.
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Your current access level: <strong>{user?.admin_level || 'none'}</strong>
            </Typography>
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              User management is restricted to national and province administrators to maintain security and proper hierarchical control.
            </Alert>
            <Button
              variant="outlined"
              onClick={() => window.history.back()}
              sx={{ mt: 2, mr: 1 }}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              onClick={() => window.location.href = '/dashboard'}
              sx={{ mt: 2 }}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
