import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  Divider,
  Button
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

const UserRoleDebug: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission, isFinancialUser, canAccessFinancialDashboard } = usePermissions();

  if (!user) {
    return (
      <Alert severity="warning">
        No user data available. Please log in.
      </Alert>
    );
  }

  const financialPermissions = [
    'financial.view_dashboard',
    'financial.view_all_transactions',
    'financial.view_summary',
    'financial.view_performance',
    'financial.view_analytics'
  ];

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🔍 User Role Debug Information
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary">
            Basic User Information:
          </Typography>
          <Typography variant="body2">
            <strong>Name:</strong> {user.name}
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {user.email}
          </Typography>
          <Typography variant="body2">
            <strong>Role Name:</strong> <Chip label={user.role_name || 'No Role'} color="primary" size="small" />
          </Typography>
          <Typography variant="body2">
            <strong>Admin Level:</strong> <Chip label={user.admin_level || 'No Level'} color="secondary" size="small" />
          </Typography>
          <Typography variant="body2">
            <strong>Active:</strong> <Chip label={user.is_active ? 'Yes' : 'No'} color={user.is_active ? 'success' : 'error'} size="small" />
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary">
            Financial Access Status:
          </Typography>
          <Typography variant="body2">
            <strong>Is Financial User:</strong> <Chip label={isFinancialUser() ? 'Yes' : 'No'} color={isFinancialUser() ? 'success' : 'error'} size="small" />
          </Typography>
          <Typography variant="body2">
            <strong>Can Access Financial Dashboard:</strong> <Chip label={canAccessFinancialDashboard() ? 'Yes' : 'No'} color={canAccessFinancialDashboard() ? 'success' : 'error'} size="small" />
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary">
            Financial Permissions Check:
          </Typography>
          {financialPermissions.map(permission => (
            <Box key={permission} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ minWidth: 200 }}>
                {permission}:
              </Typography>
              <Chip
                label={hasPermission(permission as any) ? 'GRANTED' : 'DENIED'}
                color={hasPermission(permission as any) ? 'success' : 'error'}
                size="small"
              />
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle2" color="primary">
            Role Matching Analysis:
          </Typography>
          <Typography variant="body2">
            <strong>Matches 'financial_reviewer':</strong> <Chip label={user.role_name === 'financial_reviewer' ? 'Yes' : 'No'} color={user.role_name === 'financial_reviewer' ? 'success' : 'error'} size="small" />
          </Typography>
          <Typography variant="body2">
            <strong>Matches 'financial.approver':</strong> <Chip label={user.role_name === 'financial.approver' ? 'Yes' : 'No'} color={user.role_name === 'financial.approver' ? 'success' : 'error'} size="small" />
          </Typography>
          <Typography variant="body2">
            <strong>Matches 'membership_approver':</strong> <Chip label={user.role_name === 'membership_approver' ? 'Yes' : 'No'} color={user.role_name === 'membership_approver' ? 'success' : 'error'} size="small" />
          </Typography>
          <Typography variant="body2">
            <strong>Matches 'membership.approver':</strong> <Chip label={user.role_name === 'membership.approver' ? 'Yes' : 'No'} color={user.role_name === 'membership.approver' ? 'success' : 'error'} size="small" />
          </Typography>
          <Typography variant="body2">
            <strong>Matches 'super_admin':</strong> <Chip label={user.role_name === 'super_admin' ? 'Yes' : 'No'} color={user.role_name === 'super_admin' ? 'success' : 'error'} size="small" />
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle2" color="primary">
            Browser Storage Debug:
          </Typography>
          <Typography variant="body2">
            <strong>Token in localStorage:</strong> {localStorage.getItem('token') ? 'Present' : 'Missing'}
          </Typography>
          <Typography variant="body2">
            <strong>User in localStorage:</strong> {localStorage.getItem('user') ? 'Present' : 'Missing'}
          </Typography>
        </Box>

        {!isFinancialUser() && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Issue Detected:</strong> Your role "{user.role_name || 'No Role'}" is not recognized as a financial user.
            The system expects roles like 'financial_reviewer', 'financial.approver', 'membership_approver', or 'membership.approver'.
            <br /><br />
            <strong>Possible Solutions:</strong>
            <br />• Try logging out and logging back in
            <br />• Clear your browser cache and cookies
            <br />• The backend shows you have 'financial_reviewer' role, but frontend shows 'No Role'
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                sx={{ mr: 1 }}
              >
                Clear Cache & Reload
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  window.location.href = '/auth/login';
                }}
              >
                Re-login
              </Button>
            </Box>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default UserRoleDebug;
