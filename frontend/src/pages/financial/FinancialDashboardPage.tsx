import React from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Home,
  // Dashboard,
  AccountBalance,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import UnifiedFinancialDashboard from '../../components/financial/UnifiedFinancialDashboard';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

const FinancialDashboardPage: React.FC = () => {
  const theme = useTheme();
  // const _navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Check if user has financial reviewer permissions
  const canViewFinancialDashboard = hasPermission('financial.view_dashboard') ||
                                   hasPermission('financial.view_all_transactions') ||
                                   (user as any)?.role === 'financial_reviewer' ||
                                   (user as any)?.role === 'financial.approver' ||
                                   (user as any)?.role === 'super_admin';

  if (!canViewFinancialDashboard) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          You do not have permission to view the financial dashboard. Please contact your administrator.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ pt: 3, pb: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link
            component={RouterLink}
            to="/admin/dashboard"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Home fontSize="small" />
            Dashboard
          </Link>
          <Typography 
            color="text.primary" 
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <AccountBalance fontSize="small" />
            Financial Dashboard
          </Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Paper 
          sx={{ 
            p: 3, 
            mb: 3, 
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountBalance sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                Financial Dashboard
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Comprehensive financial oversight and analytics for membership applications and renewals
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Welcome Message for Financial Reviewers */}
        {(user as any)?.role === 'financial_reviewer' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Welcome, Financial Reviewer!
            </Typography>
            <Typography variant="body2">
              This dashboard provides real-time insights into all financial transactions, pending reviews, 
              and performance metrics. Use the tabs below to navigate between different views and analytics.
            </Typography>
          </Alert>
        )}

        {/* Main Dashboard Component */}
        <Paper sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
          <UnifiedFinancialDashboard />
        </Paper>

        {/* Footer Information */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Financial Dashboard • Real-time data updates every 5-15 minutes • 
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default FinancialDashboardPage;
