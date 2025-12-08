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
  useTheme
} from '@mui/material';
import { Download, HowToVote, PersonOff } from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell
} from 'recharts';
import StatsCard from '../ui/StatsCard';

interface VoterRegistrationSummary {
  total_members: number;
  registered_voters: number;
  not_registered_voters: number;
  unknown_status: number;
  verification_failed: number;
  special_voting_district: number;
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
  total_members: number;
  registered_voters: number;
  not_registered_voters: number;
  registered_percentage: number;
  not_registered_percentage: number;
}

interface VoterRegistrationStatsProps {
  summary: VoterRegistrationSummary | null;
  geographicBreakdown: GeographicBreakdown[];
  breakdownType: 'province' | 'municipality' | 'ward';
  isLoading: boolean;
  error: Error | null;
  onExport?: (format: 'csv' | 'excel') => void;
  contextLabel?: string;
}

const COLORS = {
  registered: '#4CAF50',
  notRegistered: '#f44336',
  unknown: '#9e9e9e'
};

const VoterRegistrationStats: React.FC<VoterRegistrationStatsProps> = ({
  summary,
  geographicBreakdown,
  breakdownType,
  isLoading,
  error,
  onExport,
  contextLabel
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
        Failed to load voter registration statistics. Please try again.
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No voter registration data available.
      </Alert>
    );
  }

  // Get the label for geographic breakdown
  const getBreakdownLabel = () => {
    switch (breakdownType) {
      case 'province': return 'Province';
      case 'municipality': return 'Municipality';
      case 'ward': return 'Ward';
      default: return 'Area';
    }
  };

  // Get the name field based on breakdown type
  const getAreaName = (item: GeographicBreakdown) => {
    if (breakdownType === 'province') return item.province_name || item.province_code || 'Unknown';
    if (breakdownType === 'municipality') return item.municipality_name || item.municipality_code || 'Unknown';
    return item.ward_name || item.ward_code || 'Unknown';
  };

  // Prepare chart data
  const chartData = geographicBreakdown.map((item) => ({
    name: getAreaName(item),
    registered: item.registered_voters,
    notRegistered: item.not_registered_voters,
    total: item.total_members,
    registeredPct: item.registered_percentage,
    notRegisteredPct: item.not_registered_percentage
  })).slice(0, 15); // Limit to top 15 for readability

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {data.name}
          </Typography>
          <Box>
            <Typography variant="body2" sx={{ color: COLORS.registered }}>
              Registered: {data.registered.toLocaleString()} ({data.registeredPct}%)
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.notRegistered }}>
              Not Registered: {data.notRegistered.toLocaleString()} ({data.notRegisteredPct}%)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Total: {data.total.toLocaleString()} members
            </Typography>
          </Box>
        </Card>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Header with Export Button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="bold">
          Voter Registration Statistics{contextLabel ? ` - ${contextLabel}` : ''}
        </Typography>
        {onExport && (
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => onExport('csv')}
            size="small"
          >
            Export CSV
          </Button>
        )}
      </Box>

      {/* Summary Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Registered Voters"
            value={summary.registered_voters.toLocaleString()}
            subtitle={`${summary.registered_percentage}% of total`}
            icon={HowToVote}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Not Registered"
            value={summary.not_registered_voters.toLocaleString()}
            subtitle={`${summary.not_registered_percentage}% of total`}
            icon={PersonOff}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Members"
            value={summary.total_members.toLocaleString()}
            subtitle="All members"
            icon={HowToVote}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Special VD (222222222)"
            value={summary.special_voting_district.toLocaleString()}
            subtitle="Special Voting District"
            icon={HowToVote}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Geographic Breakdown Charts */}
      {chartData.length > 0 && breakdownType === 'province' && (
        /* Vertical Bar Chart - For National Admin (Province breakdown) - Side by side bars */
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Voter Registration by {getBreakdownLabel()}
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={chartData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar
                  dataKey="registered"
                  name="Registered Voters"
                  fill={COLORS.registered}
                />
                <Bar
                  dataKey="notRegistered"
                  name="Not Registered"
                  fill={COLORS.notRegistered}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && breakdownType !== 'province' && (
        /* Horizontal Bar Chart - For Province/Municipality Admin (Sub-region/Ward breakdown) */
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Voter Registration by {getBreakdownLabel()}
            </Typography>
            <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 45)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 140, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="registered"
                  name="Registered Voters"
                  fill={COLORS.registered}
                  stackId="a"
                />
                <Bar
                  dataKey="notRegistered"
                  name="Not Registered"
                  fill={COLORS.notRegistered}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Percentage Comparison Chart - Vertical for provinces, Horizontal for others */}
      {chartData.length > 0 && breakdownType === 'province' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Registration Rate by {getBreakdownLabel()} (%)
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
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar
                  dataKey="registeredPct"
                  name="Registered %"
                  fill={COLORS.registered}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.registered} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && breakdownType !== 'province' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Registration Rate by {getBreakdownLabel()} (%)
            </Typography>
            <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 45)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 140, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                />
                <Legend />
                <Bar
                  dataKey="registeredPct"
                  name="Registered %"
                  fill={COLORS.registered}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default VoterRegistrationStats;

