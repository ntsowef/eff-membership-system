import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  LocationOn,
  Assessment,
  Speed,
  Refresh,
  Download,
  Info,
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
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface DashboardMetrics {
  totalMembers: number;
  membershipGrowth: {
    current: number;
    previous: number;
    percentage: number;
  };
  geographicDistribution: {
    provinces: number;
    regions: number;
    subRegions: number;
    wards: number;
    votingDistricts: number;
  };
  membershipTrends: Array<{
    month: string;
    members: number;
    newMembers: number;
    renewals: number;
  }>;
  demographics: {
    ageGroups: Array<{ name: string; value: number; color: string }>;
    genderDistribution: Array<{ name: string; value: number; color: string }>;
  };
  systemPerformance: {
    responseTime: number;
    uptime: number;
    activeUsers: number;
    dataQuality: number;
  };
  topPerformingAreas: Array<{
    name: string;
    memberCount: number;
    growthRate: number;
    type: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const PerformanceDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard metrics
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics', refreshKey],
    queryFn: async () => {
      const response = await api.get('/statistics/dashboard');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load dashboard metrics. Please try again.
      </Alert>
    );
  }

  const dashboardData = metrics?.data;

  if (!dashboardData) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No dashboard data available.
      </Alert>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assessment color="primary" />
            Performance Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time insights and key performance indicators for membership management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Dashboard">
            <IconButton color="primary">
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Performance Indicators */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Members
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData.totalMembers)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {dashboardData.membershipGrowth.percentage >= 0 ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      color={dashboardData.membershipGrowth.percentage >= 0 ? 'success.main' : 'error.main'}
                      sx={{ ml: 0.5 }}
                    >
                      {formatPercentage(dashboardData.membershipGrowth.percentage)}
                    </Typography>
                  </Box>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Geographic Coverage
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.geographicDistribution.provinces}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Provinces covered
                  </Typography>
                </Box>
                <LocationOn color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    System Performance
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.systemPerformance.uptime.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uptime
                  </Typography>
                </Box>
                <Speed color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Data Quality
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.systemPerformance.dataQuality.toFixed(0)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={dashboardData.systemPerformance.dataQuality}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Assessment color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Membership Growth Trend */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Membership Growth Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData.membershipTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="members"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Total Members"
                  />
                  <Area
                    type="monotone"
                    dataKey="newMembers"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="New Members"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Age Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Age Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.demographics.ageGroups}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.demographics.ageGroups.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Geographic Coverage */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Geographic Coverage
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" color="primary">
                      {dashboardData.geographicDistribution.provinces}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Provinces
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" color="primary">
                      {dashboardData.geographicDistribution.regions}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Regions
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" color="primary">
                      {dashboardData.geographicDistribution.subRegions}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sub-Regions
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" color="primary">
                      {formatNumber(dashboardData.geographicDistribution.votingDistricts)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Voting Districts
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performing Areas */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Areas
              </Typography>
              <Box sx={{ mt: 2 }}>
                {dashboardData.topPerformingAreas.map((area, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {area.name}
                      </Typography>
                      <Chip
                        label={`+${area.growthRate}%`}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatNumber(area.memberCount)} members
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {area.type}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(area.memberCount / dashboardData.totalMembers) * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Performance Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Performance Metrics
              </Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {dashboardData.systemPerformance.responseTime}ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Response Time
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, 100 - (dashboardData.systemPerformance.responseTime / 10))}
                      color="success"
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {dashboardData.systemPerformance.uptime}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      System Uptime
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.systemPerformance.uptime}
                      color="success"
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {formatNumber(dashboardData.systemPerformance.activeUsers)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Users
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(dashboardData.systemPerformance.activeUsers / dashboardData.totalMembers) * 100}
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {dashboardData.systemPerformance.dataQuality}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Data Quality Score
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.systemPerformance.dataQuality}
                      color="warning"
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Information */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Dashboard Summary
        </Typography>
        <Typography variant="body2">
          This performance dashboard provides real-time insights into membership growth, geographic distribution,
          and system performance. Data is updated every 10 minutes and cached for optimal performance.
          Use the refresh button to get the latest metrics.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PerformanceDashboard;
