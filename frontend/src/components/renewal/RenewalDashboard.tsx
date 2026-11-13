import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,

  Button,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,

} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  Schedule,
  CheckCircle,
  Warning,
  Error,
  Send,
  Receipt,
  Analytics,
  PictureAsPdf,
  ArrowForward,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { devLog } from '../../utils/logger';

interface RenewalDashboardData {
  renewal_statistics: {
    total_renewals_this_month: number;
    pending_renewals: number;
    completed_renewals: number;
    failed_renewals: number;
    total_revenue: number;
    average_renewal_amount: number;
    renewal_rate: number;
  };
  upcoming_expirations: any[];
  recent_renewals: any[];
  payment_method_breakdown: any[];
  renewal_trends: any[];
}

interface RenewalDashboardProps {
  onProcessRenewal?: (memberId: string) => void;
  onSendReminder?: (memberId: string) => void;
  onViewAnalytics?: () => void;
  onViewTransactions?: () => void;
}

const RenewalDashboard: React.FC<RenewalDashboardProps> = ({
  onProcessRenewal,
  onSendReminder,
  onViewAnalytics,
  onViewTransactions,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch renewal dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['renewal-dashboard', refreshKey],
    queryFn: async () => {
      const response = await api.get('/membership-renewal/dashboard');
      devLog('Renewal Dashboard API Response:', response.data);
      
      if (response.data && response.data.data && response.data.data.renewal_dashboard) {
        return response.data.data.renewal_dashboard as RenewalDashboardData;
      }
      
      throw new (Error as any)('Invalid renewal dashboard data structure');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/membership-renewal/report/pdf', {
        params: {
          report_type: 'dashboard',
          title: 'Renewal Dashboard Report',
          include_charts: true
        },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `renewal-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('PDF export functionality is being implemented. Please check back soon.');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400, gap: 2 }}>
        <CircularProgress size={60} />
        <Typography variant="body1" color="text.secondary">
          Loading renewal dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load renewal dashboard data
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const {
    renewal_statistics,
    upcoming_expirations = [],
    recent_renewals = [],
    payment_method_breakdown = []
  } = dashboardData;

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('online') || m.includes('card')) return '💳';
    if (m.includes('bank') || m.includes('transfer')) return '🏦';
    if (m.includes('cash')) return '💵';
    if (m.includes('eft')) return '📱';
    return '💰';
  };

  const formatCurrency = (amount: any): string => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0');
    return isNaN(numAmount) ? 'R0.00' : `R${numAmount.toFixed(2)}`;
  };

  const formatNumber = (value: any): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(value || '0');
    return isNaN(numValue) ? '0' : numValue.toLocaleString();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Analytics color="primary" />
            Renewal Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive overview of membership renewals and revenue
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          {onViewTransactions && (
            <Button
              variant="outlined"
              startIcon={<Receipt />}
              onClick={onViewTransactions}
            >
              View Transactions
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {formatNumber(renewal_statistics.total_renewals_this_month)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Renewals
                  </Typography>
                </Box>
                <People color="primary" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                This month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {formatCurrency(renewal_statistics.total_revenue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </Box>
                <AttachMoney color="success" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Avg: {formatCurrency(renewal_statistics.average_renewal_amount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {formatNumber(renewal_statistics.pending_renewals)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Renewals
                  </Typography>
                </Box>
                <Schedule color="warning" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Requires attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {renewal_statistics.renewal_rate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Renewal Rate
                  </Typography>
                </Box>
                {renewal_statistics.renewal_rate >= 90 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={renewal_statistics.renewal_rate} 
                color={renewal_statistics.renewal_rate >= 90 ? 'success' : 'warning'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Method Breakdown */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            Payment Method Breakdown
          </Typography>
          
          <Grid container spacing={2}>
            {payment_method_breakdown.map((method) => (
              <Grid item xs={12} sm={6} md={3} key={method.method}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {getPaymentMethodIcon(method.method)}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {method.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {method.method.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {method.percentage}% • {formatCurrency(method.total_amount)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={method.percentage} 
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Upcoming Expirations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning color="warning" />
                Upcoming Expirations
              </Typography>
              
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>Province</TableCell>
                      <TableCell align="center">Days Left</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcoming_expirations.slice(0, 8).map((member) => (
                      <TableRow key={member.member_id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {member.first_name} {member.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {member.province_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={member.days_until_expiry}
                            color={member.days_until_expiry <= 7 ? 'error' : member.days_until_expiry <= 30 ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Send Reminder">
                            <IconButton 
                              size="small" 
                              onClick={() => onSendReminder?.(member.member_id)}
                            >
                              <Send fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {upcoming_expirations.length > 8 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Showing 8 of {upcoming_expirations.length} upcoming expirations
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Renewals */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" />
                  Recent Renewals
                </Typography>
                {onViewTransactions && (
                  <Button size="small" onClick={onViewTransactions} endIcon={<ArrowForward />}>
                    All Transactions
                  </Button>
                )}
              </Box>
              
              <TableContainer sx={{ maxHeight: 320 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recent_renewals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No recent renewals recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      recent_renewals.slice(0, 8).map((renewal, idx) => (
                        <TableRow key={renewal.payment_id || renewal.member_id || idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {renewal.first_name} {renewal.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {new Date(renewal.renewal_date).toLocaleDateString()}
                              {renewal.id_number ? ` • ID: ${renewal.id_number}` : ''}
                            </Typography>
                            {renewal.proof_of_payment_filename && (
                              <Chip
                                label="PoP Attached"
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {getPaymentMethodIcon(renewal.payment_method)} {renewal.payment_method?.replace('_', ' ')}
                            </Typography>
                            {renewal.payment_reference && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {renewal.payment_reference.length > 15 ? renewal.payment_reference.slice(0, 15) + '...' : renewal.payment_reference}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(renewal.amount_paid)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={renewal.renewal_status}
                              color={getStatusColor(renewal.renewal_status)}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {recent_renewals.length > 8 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Showing 8 of {recent_renewals.length} recent renewals
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RenewalDashboard;
