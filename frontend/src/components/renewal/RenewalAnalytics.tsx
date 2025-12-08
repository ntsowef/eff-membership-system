import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,

  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  Refresh,
  PictureAsPdf,

  Analytics,
  Timeline,
  LocationOn,
  Payment,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface RenewalAnalyticsData {
  renewal_performance: {
    total_renewals_ytd: number;
    renewal_rate: number;
    revenue_ytd: number;
    average_renewal_amount: number;
    month_over_month_growth: number;
  };
  geographic_breakdown: any[];
  timing_analysis: {
    early_renewals: number;
    on_time_renewals: number;
    late_renewals: number;
    expired_members: number;
  };
  payment_method_analysis: any[];
  retention_metrics: {
    first_year_retention: number;
    multi_year_retention: number;
    churn_rate: number;
    lifetime_value: number;
  };
}

interface RenewalAnalyticsProps {
  onExportReport?: (period: string) => void;
}

const RenewalAnalytics: React.FC<RenewalAnalyticsProps> = ({ onExportReport: _onExportReport }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('last_12_months');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch renewal analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['renewal-analytics', selectedPeriod, refreshKey],
    queryFn: async () => {
      const response = await api.get('/membership-renewal/analytics', {
        params: {
          period: selectedPeriod,
          include_trends: true,
          include_geographic: true
        }
      });
      console.log('Renewal Analytics API Response:', response.data);

      if (response.data && response.data.data && response.data.data.analytics) {
        return response.data.data.analytics as RenewalAnalyticsData;
      }

      throw new Error('Invalid renewal analytics data structure');
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/membership-renewal/report/pdf', {
        params: {
          report_type: 'analytics',
          period: selectedPeriod,
          title: 'Renewal Analytics Report',
          include_charts: true
        },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `renewal-analytics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
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
          Loading renewal analytics...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load renewal analytics data
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const { renewal_performance, timing_analysis, retention_metrics, payment_method_analysis, geographic_breakdown } = analyticsData;

  const formatNumber = (value: any): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(value || '0');
    return isNaN(numValue) ? '0' : numValue.toLocaleString();
  };

  const formatCurrency = (amount: any) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0');
    return isNaN(numAmount) ? 'R0.00' : `R${numAmount.toLocaleString()}`;
  };

  const formatPercentage = (value: any) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value || '0');
    return isNaN(numValue) ? '0.0%' : `${numValue.toFixed(1)}%`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline color="primary" />
            Renewal Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive analysis of renewal trends and performance metrics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Analysis Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Analysis Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="last_30_days">Last 30 Days</MenuItem>
              <MenuItem value="last_90_days">Last 90 Days</MenuItem>
              <MenuItem value="last_12_months">Last 12 Months</MenuItem>
              <MenuItem value="current_year">Current Year</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Revenue Analysis */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoney color="primary" />
            Revenue Analysis
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="h4" color="success.contrastText" fontWeight="bold">
                  {formatCurrency(renewal_performance.revenue_ytd)}
                </Typography>
                <Typography variant="body2" color="success.contrastText">
                  Total Revenue YTD
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="h4" color="primary.contrastText" fontWeight="bold">
                  {formatCurrency(renewal_performance.average_renewal_amount)}
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  Average Renewal Amount
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="h4" color="info.contrastText" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  {formatPercentage(renewal_performance.month_over_month_growth)}
                  {renewal_performance.month_over_month_growth >= 0 ? <TrendingUp /> : <TrendingDown />}
                </Typography>
                <Typography variant="body2" color="info.contrastText">
                  Month-over-Month Growth
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Total Renewals YTD: <strong>{formatNumber(renewal_performance.total_renewals_ytd)}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Renewal Rate: <strong>{formatPercentage(renewal_performance.renewal_rate)}</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Retention Metrics */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People color="primary" />
            Retention Metrics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  {formatPercentage((retention_metrics as any).overall_retention_rate || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Retention Rate
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(retention_metrics as any).overall_retention_rate || 0}
                  color="primary"
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {formatPercentage(retention_metrics.first_year_retention)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  First Year Retention
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={retention_metrics.first_year_retention} 
                  color="warning"
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {formatPercentage((retention_metrics as any).long_term_retention || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Long-term Retention
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(retention_metrics as any).long_term_retention || 0}
                  color="success"
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="error.main" fontWeight="bold">
                  {formatPercentage(retention_metrics.churn_rate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Churn Rate
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={retention_metrics.churn_rate} 
                  color="error"
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Average Membership Duration: <strong>{(retention_metrics as any).average_membership_duration || 0} years</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Customer Lifetime Value: <strong>{formatCurrency(retention_metrics.lifetime_value)}</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Payment Method Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payment color="primary" />
                Payment Method Analysis
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                {Object.entries(payment_method_analysis).map(([method, data]: [string, any]) => (
                  <Box key={method} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {method.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {formatPercentage(data.percentage)}
                        </Typography>
                        <Chip 
                          label={`${data.growth_rate > 0 ? '+' : ''}${formatPercentage(data.growth_rate)}`}
                          color={data.growth_rate >= 0 ? 'success' : 'error'}
                          size="small"
                          icon={data.growth_rate >= 0 ? <TrendingUp /> : <TrendingDown />}
                        />
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={data.percentage} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Geographic Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn color="primary" />
                Geographic Performance
              </Typography>
              
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Province</TableCell>
                      <TableCell align="right">Avg Amount</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {geographic_breakdown.slice(0, 8).map((province) => (
                      <TableRow key={province.province} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {province.province || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatNumber(province.total_renewals)} renewals
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatCurrency(province.average_amount || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={formatPercentage(province.renewal_rate || 0)}
                            color={(province.renewal_rate || 0) >= 90 ? 'success' : (province.renewal_rate || 0) >= 80 ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(province.revenue || 0)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Renewal Trends */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Analytics color="primary" />
            Renewal Trends ({selectedPeriod.replace('_', ' ')})
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Total Renewals</TableCell>
                  <TableCell align="right">Successful</TableCell>
                  <TableCell align="right">Failed</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Timing Analysis Data */}
                {[
                  { month: 'Early Renewals', total_renewals: timing_analysis.early_renewals, successful_renewals: timing_analysis.early_renewals, failed_renewals: 0, revenue: 0, renewal_rate: '100' },
                  { month: 'On-Time Renewals', total_renewals: timing_analysis.on_time_renewals, successful_renewals: timing_analysis.on_time_renewals, failed_renewals: 0, revenue: 0, renewal_rate: '100' },
                  { month: 'Late Renewals', total_renewals: timing_analysis.late_renewals, successful_renewals: timing_analysis.late_renewals, failed_renewals: 0, revenue: 0, renewal_rate: '100' },
                  { month: 'Expired Members', total_renewals: timing_analysis.expired_members, successful_renewals: 0, failed_renewals: timing_analysis.expired_members, revenue: 0, renewal_rate: '0' }
                ].map((trend) => (
                  <TableRow key={trend.month} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {trend.month}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(trend.total_renewals)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        {formatNumber(trend.successful_renewals)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error.main">
                        {formatNumber(trend.failed_renewals)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(trend.revenue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${trend.renewal_rate}%`}
                        color={parseFloat(trend.renewal_rate) >= 90 ? 'success' : parseFloat(trend.renewal_rate) >= 80 ? 'warning' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RenewalAnalytics;
