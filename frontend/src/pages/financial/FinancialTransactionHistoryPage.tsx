import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Home,
  AccountBalance,
  Person,
  Search,
  History,
} from '@mui/icons-material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import FinancialTransactionHistory from '../../components/financial/FinancialTransactionHistory';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

const FinancialTransactionHistoryPage: React.FC = () => {
  const theme = useTheme();
  // const _navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Get member ID from URL params or state
  const initialMemberId = searchParams.get('memberId') || '';
  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'member'>('all');

  // Check if user has financial transaction view permissions
  const canViewTransactions = hasPermission('financial.view_all_transactions') ||
                              hasPermission('financial.view_dashboard') ||
                              (user as any)?.role === 'financial_reviewer' ||
                              (user as any)?.role === 'financial.approver' ||
                              (user as any)?.role === 'membership_approver' ||
                              (user as any)?.role === 'membership.approver' ||
                              (user as any)?.role === 'super_admin';

  if (!canViewTransactions) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          You do not have permission to view financial transaction history. Please contact your administrator.
        </Alert>
      </Container>
    );
  }

  const handleMemberSearch = () => {
    if (memberSearchTerm.trim()) {
      setSelectedMemberId(memberSearchTerm.trim());
      setViewMode('member');
      setSearchParams({ memberId: memberSearchTerm.trim() });
    }
  };

  const handleViewAllTransactions = () => {
    setSelectedMemberId('');
    setViewMode('all');
    setSearchParams({});
  };

  const handleTransactionSelect = (transaction: any) => {
    console.log('Selected transaction:', transaction);
    // Could navigate to a detailed transaction page or show additional details
  };

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
          <Link
            component={RouterLink}
            to="/admin/financial-dashboard"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <AccountBalance fontSize="small" />
            Financial Dashboard
          </Link>
          <Typography 
            color="text.primary" 
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <History fontSize="small" />
            Transaction History
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
            <History sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                Financial Transaction History
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Comprehensive view of all financial transactions including applications, renewals, refunds, and adjustments
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Search and Filter Controls */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Search Options
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search by Member ID or Name"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                placeholder="Enter member ID or name..."
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleMemberSearch();
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>View Mode</InputLabel>
                <Select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'all' | 'member')}
                  label="View Mode"
                >
                  <MenuItem value="all">All Transactions</MenuItem>
                  <MenuItem value="member">Specific Member</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleMemberSearch}
                  disabled={!memberSearchTerm.trim()}
                >
                  Search Member
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleViewAllTransactions}
                >
                  View All
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Current View Indicator */}
          {viewMode === 'member' && selectedMemberId && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={`Viewing transactions for Member: ${selectedMemberId}`}
                color="primary"
                onDelete={() => handleViewAllTransactions()}
                sx={{ mr: 1 }}
              />
            </Box>
          )}
        </Paper>

        {/* Welcome Message for Financial Reviewers */}
        {(user as any)?.role === 'financial_reviewer' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Financial Reviewer Access
            </Typography>
            <Typography variant="body2">
              You have access to view all financial transactions across the system. Use the search and filter 
              options to find specific transactions or members. All transactions include detailed audit trails 
              and can be exported for reporting purposes.
            </Typography>
          </Alert>
        )}

        {/* Main Transaction History Component */}
        <Paper sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
          <FinancialTransactionHistory
            memberId={viewMode === 'member' ? selectedMemberId : undefined}
            showFilters={true}
            showExport={true}
            maxHeight={700}
            onTransactionSelect={handleTransactionSelect}
            title={viewMode === 'member' && selectedMemberId 
              ? `Transaction History - Member ${selectedMemberId}` 
              : 'All Financial Transactions'
            }
            subtitle={viewMode === 'member' && selectedMemberId
              ? 'Complete financial history for the selected member'
              : 'System-wide financial transaction overview with advanced filtering'
            }
          />
        </Paper>

        {/* Usage Statistics */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Quick Actions
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  • Use filters to narrow down transactions by date, type, or status
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  • Click on any transaction to view detailed information
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  • Export filtered results for reporting and analysis
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="success.main">
                  Transaction Types
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  • <strong>Applications:</strong> New membership application payments
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  • <strong>Renewals:</strong> Membership renewal payments
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  • <strong>Refunds:</strong> Payment refunds and reversals
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  • <strong>Adjustments:</strong> Manual payment adjustments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  Data Updates
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Transaction data is updated in real-time as payments are processed.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Use the refresh button to get the latest transaction information.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Export functionality includes all filtered results with complete details.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer Information */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Financial Transaction History • Real-time data • 
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default FinancialTransactionHistoryPage;
