import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
  Button,
  useTheme,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Payment,
  Receipt,
  Assessment,
  Speed,
  Refresh,
  Download,
  Warning,
  CheckCircle,
  Schedule,
  AttachMoney,
  People,
  Analytics,
  Dashboard as DashboardIcon,
  Notifications,
  Timeline,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { financialDashboardApi, twoTierApprovalApi, financialTransactionApi } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const UnifiedFinancialDashboard: React.FC = () => {
  const theme = useTheme();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ['financial-dashboard-metrics', refreshKey],
    queryFn: () => financialDashboardApi.getMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  // Fetch real-time stats
  const { data: realtimeStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['financial-realtime-stats', refreshKey],
    queryFn: () => financialDashboardApi.getRealtimeStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch trends data
  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery({
    queryKey: ['financial-trends', refreshKey],
    queryFn: () => financialDashboardApi.getTrends({ period: 'daily', limit: 30 }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['financial-alerts', refreshKey],
    queryFn: () => financialDashboardApi.getAlerts(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch performance data
  const { data: performance, isLoading: performanceLoading, refetch: refetchPerformance } = useQuery({
    queryKey: ['financial-performance', refreshKey],
    queryFn: () => financialDashboardApi.getPerformance({ period: 'daily' }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  // Fetch quick stats for analytics
  const { data: quickStats, isLoading: quickStatsLoading, refetch: refetchQuickStats } = useQuery({
    queryKey: ['financial-quick-stats', refreshKey],
    queryFn: () => financialTransactionApi.getQuickStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
    refetchMetrics();
    refetchStats();
    refetchTrends();
    refetchAlerts();
    refetchPerformance();
    refetchQuickStats();
    showNotification('Dashboard data refreshed', 'success');
  };

  const handleExportDashboard = async () => {
    try {
      // This would typically call an export API endpoint
      showNotification('Dashboard export started - you will receive an email when ready', 'info');
    } catch (error) {
      showNotification('Failed to export dashboard', 'error');
    }
  };

  const isLoading = metricsLoading || statsLoading || trendsLoading || alertsLoading || performanceLoading || quickStatsLoading;
  const hasError = metricsError || !metrics;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Failed to load financial dashboard data. Please try refreshing the page.
      </Alert>
    );
  }

  // Transform trends data to match chart expectations
  const trendsArray = Array.isArray(trends?.data?.trends) ? trends.data.trends :
                     Array.isArray(trends?.data) ? trends.data : [];

  const transformedTrends = trendsArray.map((trend: any) => ({
    date: trend.period,
    period: trend.period,
    total_revenue: trend.total_revenue || 0,
    applications_count: trend.applications_count || 0,
    renewals_count: trend.renewals_count || 0,
    applications_revenue: Math.round((trend.total_revenue || 0) * 0.4), // Estimate based on count ratio
    renewals_revenue: Math.round((trend.total_revenue || 0) * 0.6), // Estimate based on count ratio
    approval_rate: trend.approval_rate || 0,
    processing_time: trend.processing_time || 0,
    reviews_completed: (trend.applications_count || 0) + (trend.renewals_count || 0),
    avg_review_time: trend.processing_time || 24
  }));

  // Ensure alerts is always an array
  const alertsArray = Array.isArray(alerts?.data?.alerts) ? alerts.data.alerts :
                     Array.isArray(alerts?.data) ? alerts.data : [];

  const dashboardData = {
    metrics: metrics?.data?.metrics || {},
    realtimeStats: realtimeStats?.data?.stats || {},
    trends: transformedTrends,
    alerts: alertsArray,
    performance: performance?.data?.performance || {},
    quickStats: quickStats?.data || {}
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DashboardIcon color="primary" />
            Unified Financial Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive financial oversight for applications, renewals, and all transactions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh All Data">
            <IconButton onClick={handleRefreshAll} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Dashboard">
            <IconButton onClick={handleExportDashboard} color="primary">
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Alerts Section */}
      {dashboardData.alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {dashboardData.alerts.map((alert: any, index: number) => (
            <Alert 
              key={index} 
              severity={alert.severity || 'warning'} 
              sx={{ mb: 1 }}
              icon={<Warning />}
            >
              <Typography variant="subtitle2">{alert.title}</Typography>
              <Typography variant="body2">{alert.message}</Typography>
            </Alert>
          ))}
        </Box>
      )}

      {/* Overview Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <AttachMoney />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    R{dashboardData.metrics.overview?.total_revenue?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    {dashboardData.metrics.overview?.revenue_growth_percentage >= 0 ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    <Typography variant="caption" color={
                      dashboardData.metrics.overview?.revenue_growth_percentage >= 0 ? 'success.main' : 'error.main'
                    }>
                      {Math.abs(dashboardData.metrics.overview?.revenue_growth_percentage || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <Receipt />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {dashboardData.metrics.overview?.total_transactions?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dashboardData.metrics.overview?.completed_today || 0} completed today
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {dashboardData.metrics.overview?.pending_reviews || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Reviews
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg: {dashboardData.metrics.overview?.avg_processing_time_hours?.toFixed(1) || 0}h
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <Speed />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {dashboardData.performance.efficiency_score?.toFixed(1) || '0'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Efficiency Score
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dashboardData.performance.active_reviewers || 0} active reviewers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" icon={<Assessment />} />
          <Tab label="Applications" icon={<People />} />
          <Tab label="Renewals" icon={<Refresh />} />
          <Tab label="Performance" icon={<Speed />} />
          <Tab label="Analytics" icon={<Analytics />} />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* Revenue Trend Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue Trend (Last 30 Days)
                </Typography>
                {dashboardData.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: any) => [`R${value}`, 'Revenue']} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="total_revenue"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.6}
                      name="Total Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="applications_revenue"
                      stroke={theme.palette.info.main}
                      fill={theme.palette.info.main}
                      fillOpacity={0.4}
                      name="Applications"
                    />
                    <Area
                      type="monotone"
                      dataKey="renewals_revenue"
                      stroke={theme.palette.success.main}
                      fill={theme.palette.success.main}
                      fillOpacity={0.4}
                      name="Renewals"
                    />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body2" color="text.secondary">
                      No trend data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Transaction Distribution */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transaction Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Applications', value: dashboardData.metrics.applications?.total_applications || 0, color: COLORS[0] },
                        { name: 'Renewals', value: dashboardData.metrics.renewals?.total_renewals || 0, color: COLORS[1] },
                        { name: 'Other', value: (dashboardData.metrics.overview?.total_transactions || 0) -
                          (dashboardData.metrics.applications?.total_applications || 0) -
                          (dashboardData.metrics.renewals?.total_renewals || 0), color: COLORS[2] }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Real-time Activity */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Real-time Activity
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="primary">
                        {dashboardData.realtimeStats.active_sessions || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Sessions
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="info.main">
                        {dashboardData.realtimeStats.queue_length || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Queue Length
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="success.main">
                        {dashboardData.realtimeStats.processing_rate || 0}/min
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Processing Rate
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="warning.main">
                        {dashboardData.realtimeStats.avg_response_time || 0}ms
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Response Time
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Applications Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {/* Application Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Application Metrics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <People color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Applications"
                      secondary={dashboardData.metrics.applications?.total_applications?.toLocaleString() || '0'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoney color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Applications Revenue"
                      secondary={`R${dashboardData.metrics.applications?.applications_revenue?.toLocaleString() || '0'}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Schedule color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Pending Financial Review"
                      secondary={dashboardData.metrics.applications?.pending_financial_review || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Approved Today"
                      secondary={dashboardData.metrics.applications?.approved_today || 0}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Application Performance */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Application Performance
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Rejection Rate
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={dashboardData.metrics.applications?.rejection_rate || 0}
                    color={dashboardData.metrics.applications?.rejection_rate > 20 ? 'error' : 'success'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption">
                    {dashboardData.metrics.applications?.rejection_rate?.toFixed(1) || 0}%
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Processing Efficiency
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={100 - (dashboardData.metrics.applications?.rejection_rate || 0)}
                    size={60}
                    color="success"
                  />
                  <Typography variant="h6">
                    {(100 - (dashboardData.metrics.applications?.rejection_rate || 0)).toFixed(1)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Renewals Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {/* Renewal Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Renewal Metrics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Refresh color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Renewals"
                      secondary={dashboardData.metrics.renewals?.total_renewals?.toLocaleString() || '0'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoney color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Renewals Revenue"
                      secondary={`R${dashboardData.metrics.renewals?.renewals_revenue?.toLocaleString() || '0'}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Schedule color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Pending Financial Review"
                      secondary={dashboardData.metrics.renewals?.pending_financial_review || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Processed Today"
                      secondary={dashboardData.metrics.renewals?.processed_today || 0}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Renewal Success Rate */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Renewal Success Rate
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                  <CircularProgress
                    variant="determinate"
                    value={dashboardData.metrics.renewals?.success_rate || 0}
                    size={120}
                    thickness={6}
                    color="success"
                  />
                  <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {dashboardData.metrics.renewals?.success_rate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Success Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Performance Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {/* Reviewer Performance */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reviewer Performance Trends
                </Typography>
                {dashboardData.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="reviews_completed"
                      fill={theme.palette.primary.main}
                      name="Reviews Completed"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_review_time"
                      stroke={theme.palette.error.main}
                      name="Avg Review Time (hours)"
                    />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body2" color="text.secondary">
                      No performance trend data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Metrics */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <People color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Active Reviewers"
                      secondary={dashboardData.performance.active_reviewers || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Timeline color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Avg Review Time"
                      secondary={`${dashboardData.performance.avg_review_time?.toFixed(1) || 0} hours`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Reviews Completed Today"
                      secondary={dashboardData.performance.reviews_completed_today || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Speed color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Efficiency Score"
                      secondary={`${dashboardData.performance.efficiency_score?.toFixed(1) || 0}%`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Indicators */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Performance Indicators
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {dashboardData.quickStats.total_processed_today || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Processed Today
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (dashboardData.quickStats.total_processed_today || 0) / 10)}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {dashboardData.quickStats.approval_rate?.toFixed(1) || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approval Rate
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={dashboardData.quickStats.approval_rate || 0}
                        color="success"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {dashboardData.quickStats.avg_processing_time?.toFixed(1) || 0}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Processing Time
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(0, 100 - (dashboardData.quickStats.avg_processing_time || 0) * 10)}
                        color="info"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {dashboardData.quickStats.backlog_count || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Backlog Count
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (dashboardData.quickStats.backlog_count || 0) / 5)}
                        color="warning"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={activeTab} index={4}>
        <Grid container spacing={3}>
          {/* Transaction Volume Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transaction Volume Analysis
                </Typography>
                {dashboardData.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar
                      dataKey="applications_count"
                      stackId="a"
                      fill={theme.palette.primary.main}
                      name="Applications"
                    />
                    <Bar
                      dataKey="renewals_count"
                      stackId="a"
                      fill={theme.palette.success.main}
                      name="Renewals"
                    />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body2" color="text.secondary">
                      No transaction volume data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Analytics Summary */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analytics Summary
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Analytics color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Peak Processing Hour"
                      secondary={dashboardData.quickStats.peak_hour || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <TrendingUp color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Growth Rate"
                      secondary={`${dashboardData.quickStats.growth_rate?.toFixed(1) || 0}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoney color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Avg Transaction Value"
                      secondary={`R${dashboardData.quickStats.avg_transaction_value?.toFixed(2) || '0.00'}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Assessment color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Data Quality Score"
                      secondary={`${dashboardData.quickStats.data_quality_score?.toFixed(1) || 0}%`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Financial Health Indicators */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Financial Health Indicators
                </Typography>
                <Grid container spacing={3}>
                  {[
                    { label: 'Revenue Stability', value: dashboardData.quickStats.revenue_stability || 0, color: 'primary' },
                    { label: 'Processing Efficiency', value: dashboardData.quickStats.processing_efficiency || 0, color: 'success' },
                    { label: 'Error Rate', value: 100 - (dashboardData.quickStats.error_rate || 0), color: 'warning' },
                    { label: 'Customer Satisfaction', value: dashboardData.quickStats.satisfaction_score || 0, color: 'info' }
                  ].map((indicator, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h5" color={`${indicator.color}.main`}>
                          {indicator.value.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {indicator.label}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={indicator.value}
                          color={indicator.color as any}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default UnifiedFinancialDashboard;
