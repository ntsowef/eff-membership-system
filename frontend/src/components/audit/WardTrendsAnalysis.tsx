import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Analytics
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import { useSecureApi } from '../../hooks/useSecureApi';
import { wardMembershipAuditApi } from '../../services/wardMembershipAuditApi';
import { useWardMembershipAuditStore, useTrendsFilters, useUpdateTrendsFilters } from '../../store/wardMembershipAuditStore';
import { GROWTH_TREND_COLORS } from '../../types/wardMembershipAudit';
import type { GrowthTrend } from '../../types/wardMembershipAudit';

interface WardTrendsAnalysisProps {
  onShowMessage: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const WardTrendsAnalysis: React.FC<WardTrendsAnalysisProps> = ({
  onShowMessage
}) => {
  const {
    wardTrendsData,
    setWardTrendsData,
    setTrendsDataLoading,
    setTrendsDataError,
    trendsDataLoading,
    trendsDataError
  } = useWardMembershipAuditStore();

  const trendsFilters = useTrendsFilters();
  const updateTrendsFilters = useUpdateTrendsFilters();

  const provinceContext = useProvinceContext();
  const municipalityContext = useMunicipalityContext();
  const { secureGet, getProvinceFilter } = useSecureApi();

  // Fetch ward trends data with province and municipality filtering
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ward-trends-data', trendsFilters, getProvinceFilter(), municipalityContext.getMunicipalityFilter()],
    queryFn: async () => {
      let params = {
        ...trendsFilters,
        ...(getProvinceFilter() && { province_code: getProvinceFilter() })
      };

      // Apply municipality filtering for municipality admin
      params = applyMunicipalityFilter(params, municipalityContext);

      return secureGet('/audit/ward-membership/trends', params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update store when data changes
  useEffect(() => {
    setTrendsDataLoading(isLoading);
    
    if (error) {
      setTrendsDataError(error.message || 'Failed to fetch ward trends data');
    } else {
      setTrendsDataError(null);
    }

    if (data) {
      setWardTrendsData(data.trends);
    }
  }, [data, isLoading, error, setWardTrendsData, setTrendsDataLoading, setTrendsDataError]);

  const handleFilterChange = (field: string, value: any) => {
    updateTrendsFilters({
      [field]: value === 'all' ? undefined : value
    });
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      onShowMessage('Trends data refreshed successfully', 'success');
    } catch (error) {
      onShowMessage('Failed to refresh trends data', 'error');
    }
  };

  const getTrendIcon = (trend: GrowthTrend) => {
    switch (trend) {
      case 'Growing':
        return <TrendingUp color="success" />;
      case 'Declining':
        return <TrendingDown color="error" />;
      case 'Stable':
        return <TrendingFlat color="info" />;
      default:
        return <Analytics />;
    }
  };

  const getTrendColor = (trend: GrowthTrend) => {
    return GROWTH_TREND_COLORS[trend] as any;
  };

  if (trendsDataError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {trendsDataError}
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  // Group trends by ward for summary
  const wardTrendsSummary = wardTrendsData.reduce((acc, trend) => {
    if (!acc[trend.ward_code]) {
      acc[trend.ward_code] = {
        ward_name: trend.ward_name,
        municipality_name: trend.municipality_name,
        trends: []
      };
    }
    acc[trend.ward_code].trends.push(trend);
    return acc;
  }, {} as Record<string, any>);

  // Calculate summary statistics
  const summaryStats = data?.summary || {
    wards_tracked: 0,
    total_data_points: 0,
    avg_monthly_growth: null,
    avg_yearly_growth: null,
    growing_periods: 0,
    declining_periods: 0,
    stable_periods: 0
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header and Controls */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Ward Membership Trends Analysis
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={trendsDataLoading}
          >
            Refresh
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Analysis Period</InputLabel>
                <Select
                  value={trendsFilters.months || 12}
                  label="Analysis Period"
                  onChange={(e) => handleFilterChange('months', e.target.value)}
                >
                  <MenuItem value={6}>Last 6 Months</MenuItem>
                  <MenuItem value={12}>Last 12 Months</MenuItem>
                  <MenuItem value={18}>Last 18 Months</MenuItem>
                  <MenuItem value={24}>Last 24 Months</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Trend Type</InputLabel>
                <Select
                  value={trendsFilters.trend_type || 'all'}
                  label="Trend Type"
                  onChange={(e) => handleFilterChange('trend_type', e.target.value)}
                >
                  <MenuItem value="all">All Trends</MenuItem>
                  <MenuItem value="growth">Growing</MenuItem>
                  <MenuItem value="decline">Declining</MenuItem>
                  <MenuItem value="stable">Stable</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Ward</InputLabel>
                <Select
                  value={trendsFilters.ward_code || 'all'}
                  label="Ward"
                  onChange={(e) => handleFilterChange('ward_code', e.target.value)}
                >
                  <MenuItem value="all">All Wards</MenuItem>
                  {/* TODO: Add ward options from API */}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Municipality</InputLabel>
                <Select
                  value={trendsFilters.municipality_code || 'all'}
                  label="Municipality"
                  onChange={(e) => handleFilterChange('municipality_code', e.target.value)}
                >
                  <MenuItem value="all">All Municipalities</MenuItem>
                  {/* TODO: Add municipality options from API */}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Loading Progress */}
      {trendsDataLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Wards Tracked
              </Typography>
              <Typography variant="h3" color="primary">
                {summaryStats.wards_tracked.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summaryStats.total_data_points.toLocaleString()} data points
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Avg Monthly Growth
              </Typography>
              <Typography variant="h3" color={summaryStats.avg_monthly_growth >= 0 ? 'success.main' : 'error.main'}>
                {summaryStats.avg_monthly_growth ? `${summaryStats.avg_monthly_growth.toFixed(1)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Month-over-month change
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Avg Yearly Growth
              </Typography>
              <Typography variant="h3" color={summaryStats.avg_yearly_growth >= 0 ? 'success.main' : 'error.main'}>
                {summaryStats.avg_yearly_growth ? `${summaryStats.avg_yearly_growth.toFixed(1)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Year-over-year change
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trend Distribution
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${summaryStats.growing_periods} Growing`}
                  color="success"
                  size="small"
                  icon={<TrendingUp />}
                />
                <Chip
                  label={`${summaryStats.stable_periods} Stable`}
                  color="info"
                  size="small"
                  icon={<TrendingFlat />}
                />
                <Chip
                  label={`${summaryStats.declining_periods} Declining`}
                  color="error"
                  size="small"
                  icon={<TrendingDown />}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Trends */}
      {Object.keys(wardTrendsSummary).length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recent Ward Trends
          </Typography>
          <List>
            {Object.entries(wardTrendsSummary).slice(0, 10).map(([wardCode, wardData]: [string, any]) => {
              const latestTrend = wardData.trends[0]; // Assuming sorted by date desc
              return (
                <ListItem key={wardCode} divider>
                  <ListItemIcon>
                    {getTrendIcon(latestTrend.growth_trend)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">
                          {wardData.ward_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={latestTrend.growth_trend}
                            color={getTrendColor(latestTrend.growth_trend)}
                            size="small"
                          />
                          <Chip
                            label={`${latestTrend.active_members.toLocaleString()} members`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {wardData.municipality_name}
                        </Typography>
                        {latestTrend.month_over_month_growth !== null && (
                          <Typography variant="caption" color="text.secondary">
                            Monthly: {latestTrend.month_over_month_growth > 0 ? '+' : ''}{latestTrend.month_over_month_growth.toFixed(1)}%
                          </Typography>
                        )}
                        {latestTrend.year_over_year_growth !== null && (
                          <Typography variant="caption" color="text.secondary">
                            Yearly: {latestTrend.year_over_year_growth > 0 ? '+' : ''}{latestTrend.year_over_year_growth.toFixed(1)}%
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {/* No Data Message */}
      {!trendsDataLoading && wardTrendsData.length === 0 && (
        <Alert severity="info">
          No trend data available for the selected filters. Try adjusting the analysis period or filters.
        </Alert>
      )}
    </Box>
  );
};

export default WardTrendsAnalysis;
