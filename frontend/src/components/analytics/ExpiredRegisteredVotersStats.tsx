import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  useTheme,
  Chip
} from '@mui/material';
import { Download, Warning, HowToVote, PersonOff, TrendingDown } from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import StatsCard from '../ui/StatsCard';

interface ExpiredRegisteredVotersSummary {
  total_expired: number;
  expired_registered_voters: number;
  expired_not_registered: number;
  expired_unknown_status: number;
  expired_special_vd: number;
  registered_percentage: number;
  not_registered_percentage: number;
}

interface GeographicBreakdown {
  province_code?: string;
  province_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_code?: string;
  ward_name?: string;
  total_expired: number;
  expired_registered_voters: number;
  expired_not_registered: number;
  registered_percentage: number;
  not_registered_percentage: number;
}

interface ExpiredRegisteredVotersStatsProps {
  summary: ExpiredRegisteredVotersSummary | null;
  geographicBreakdown: GeographicBreakdown[];
  breakdownType: 'province' | 'municipality' | 'ward';
  isLoading: boolean;
  error: Error | null;
  onExport?: () => void;
}

const COLORS = {
  registered: '#f44336',  // Red - Lost registered voters (critical)
  notRegistered: '#9e9e9e',  // Grey - Not registered
  warning: '#ff9800',
  primary: '#1976d2'
};

const ExpiredRegisteredVotersStats: React.FC<ExpiredRegisteredVotersStatsProps> = ({
  summary,
  geographicBreakdown,
  breakdownType,
  isLoading,
  error,
  onExport
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load expired registered voters analysis. Please try again.
      </Alert>
    );
  }

  if (!summary || summary.total_expired === 0) {
    return (
      <Alert severity="success" sx={{ mb: 3 }}>
        No expired memberships found. All members are up to date!
      </Alert>
    );
  }

  const getBreakdownLabel = () => {
    switch (breakdownType) {
      case 'province': return 'Province';
      case 'municipality': return 'Sub-Region';
      case 'ward': return 'Ward';
      default: return 'Area';
    }
  };

  const getAreaName = (item: GeographicBreakdown) => {
    if (breakdownType === 'province') return item.province_name || item.province_code || 'Unknown';
    if (breakdownType === 'municipality') return item.municipality_name || item.municipality_code || 'Unknown';
    return item.ward_name || item.ward_code || 'Unknown';
  };

  // Prepare chart data
  const chartData = geographicBreakdown.map((item) => ({
    name: getAreaName(item),
    expiredRegistered: item.expired_registered_voters,
    expiredNotRegistered: item.expired_not_registered,
    total: item.total_expired,
    registeredPct: item.registered_percentage,
    notRegisteredPct: item.not_registered_percentage
  })).slice(0, 15);

  // Pie chart data for summary
  const pieData = [
    { name: 'Registered Voters', value: summary.expired_registered_voters, color: COLORS.registered },
    { name: 'Not Registered', value: summary.expired_not_registered, color: COLORS.notRegistered }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card sx={{ p: 2, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {data.name}
          </Typography>
          <Box>
            <Typography variant="body2" sx={{ color: COLORS.registered }}>
              Expired Registered: {data.expiredRegistered?.toLocaleString()} ({data.registeredPct}%)
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.notRegistered }}>
              Expired Not Registered: {data.expiredNotRegistered?.toLocaleString()} ({data.notRegisteredPct}%)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Total Expired: {data.total?.toLocaleString()}
            </Typography>
          </Box>
        </Card>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Header with Warning and Export Button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" fontWeight="bold">
            Expired Registered Voters Analysis
          </Typography>
          <Chip
            icon={<Warning />}
            label="Potential Member Loss"
            color="error"
            size="small"
            variant="outlined"
          />
        </Box>
        {onExport && (
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={onExport}
            size="small"
            color="error"
          >
            Export Report
          </Button>
        )}
      </Box>

      {/* Alert Banner */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>{summary.expired_registered_voters.toLocaleString()}</strong> registered voters have expired memberships.
          These represent <strong>{summary.registered_percentage}%</strong> of all expired members and are potential lost votes for the organization.
        </Typography>
      </Alert>

      {/* Summary Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Expired"
            value={summary.total_expired.toLocaleString()}
            subtitle="All expired memberships"
            icon={TrendingDown}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Expired Registered Voters"
            value={summary.expired_registered_voters.toLocaleString()}
            subtitle={`${summary.registered_percentage}% of expired`}
            icon={Warning}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Expired Not Registered"
            value={summary.expired_not_registered.toLocaleString()}
            subtitle={`${summary.not_registered_percentage}% of expired`}
            icon={PersonOff}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Critical Impact"
            value={`${summary.registered_percentage}%`}
            subtitle="Voters at risk of loss"
            icon={HowToVote}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Summary Pie Chart and Geographic Breakdown Side by Side */}
      <Grid container spacing={3}>
        {/* Pie Chart for Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expired Members Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Geographic Breakdown Chart */}
        <Grid item xs={12} md={8}>
          {chartData.length > 0 && breakdownType === 'province' && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Expired Registered Voters by {getBreakdownLabel()}
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={chartData}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Bar dataKey="expiredRegistered" name="Expired Registered" fill={COLORS.registered} />
                    <Bar dataKey="expiredNotRegistered" name="Expired Not Registered" fill={COLORS.notRegistered} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {chartData.length > 0 && breakdownType !== 'province' && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Expired Registered Voters by {getBreakdownLabel()}
                </Typography>
                <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 40)}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 140, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="expiredRegistered" name="Expired Registered" fill={COLORS.registered} stackId="a" />
                    <Bar dataKey="expiredNotRegistered" name="Expired Not Registered" fill={COLORS.notRegistered} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpiredRegisteredVotersStats;

