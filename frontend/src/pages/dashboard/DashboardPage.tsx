import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material';
import {
  People,
  PersonAdd,
  HowToVote,
  Event,
  TrendingUp,
  Assignment,
  Groups,
  AccountBalance,
  Analytics,
  Refresh,
  ExpandMore,
  PictureAsPdf,
  Timeline,
  ShowChart,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiGet, api } from '../../lib/api';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';
import ExpiredMembersSection from '../../components/dashboard/ExpiredMembersSection';
import MembershipFilterBar from '../../components/dashboard/MembershipFilterBar';
import MembershipAnalyticsCards from '../../components/dashboard/MembershipAnalyticsCards';
import VoterRegistrationStats from '../../components/dashboard/VoterRegistrationStats';
import { useProvinceContext, useProvincePageTitle } from '../../hooks/useProvinceContext';
import type { MembershipFilterType } from '../../types/membership';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import ProvinceContextBanner from '../../components/common/ProvinceContextBanner';
import MunicipalityContextBanner from '../../components/common/MunicipalityContextBanner';
import { useSecureApi } from '../../hooks/useSecureApi';
import { devLog } from '../../utils/logger';

// Interface definitions (currently unused but kept for future use)
// interface MembershipApplication {
//   application_id: number;
//   firstname: string;
//   surname: string;
//   status: string;
//   created_at: string;
//   membership_type?: string;
// }

// interface Meeting {
//   meeting_id: number;
//   meeting_title: string;
//   start_datetime: string;
//   meeting_type: string;
//   meeting_status: string;
//   hierarchy_level: string;
// }

const DashboardPage: React.FC = () => {
  // Add refresh timestamp to force cache invalidation
  const [refreshTimestamp, setRefreshTimestamp] = React.useState(Date.now());

  // Membership status filter state
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilterType>('all');

  // Time period filter state for line charts
  const [timePeriod, setTimePeriod] = useState<string>('30d');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();

  // Get municipality context for municipality admin restrictions
  const municipalityContext = useMunicipalityContext();

  const pageTitle = useProvincePageTitle('Dashboard');
  const { secureGet, getProvinceFilter } = useSecureApi();

  // Get province filter for API calls
  const provinceFilter = getProvinceFilter();

  // Create combined filter parameters for municipality admin
  const getFilterParams = () => {
    const baseParams: any = {};

    // Apply province filtering for provincial admin
    if (provinceFilter) {
      baseParams.province_code = provinceFilter;
    }

    // Apply membership status filter
    if (membershipFilter !== 'all') {
      baseParams.membership_status = membershipFilter;
    }

    // Apply municipality filtering for municipality admin
    return applyMunicipalityFilter(baseParams, municipalityContext);
  };

  // Fetch comprehensive dashboard statistics with geographic filtering
  const { data: dashboardData, isLoading: statsLoading, error: statsError, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard-stats', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter(), membershipFilter],
    queryFn: async () => {
      devLog('🔍 Dashboard API Call - Making request to /statistics/dashboard');
      devLog('🔍 Filter params:', getFilterParams());
      try {
        const result = await secureGet('/statistics/dashboard', getFilterParams());
        devLog('✅ Dashboard API Call - Success:', result);
        return result;
      } catch (error) {
        console.error('❌ Dashboard API Call - Error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reduced from 30s to avoid excessive re-fetches
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes - reduced from 1 minute
  });

  // Fetch membership status breakdown analytics
  const { data: membershipBreakdownData, isLoading: breakdownLoading, refetch: refetchBreakdown } = useQuery({
    queryKey: ['membership-status-breakdown', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/statistics/membership-status-breakdown', getFilterParams()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Fetch analytics data for additional metrics with geographic filtering
  const { data: _analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics-dashboard', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/analytics/dashboard', getFilterParams()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Fetch top performing wards for the geographic area
  const { data: topWardsData, isLoading: wardsLoading } = useQuery({
    queryKey: ['top-wards', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/statistics/top-wards', { ...getFilterParams(), limit: 5 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!provinceFilter || municipalityContext.shouldRestrictToMunicipality, // Fetch for provincial and municipality admins
  });

  // Fetch municipality overview for municipality admin
  const { data: municipalityOverviewData, isLoading: municipalityOverviewLoading } = useQuery({
    queryKey: ['municipality-overview', refreshTimestamp, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/statistics/municipality-overview', getFilterParams()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: municipalityContext.shouldRestrictToMunicipality, // Only fetch for municipality admins
  });

  // Fetch voter registration statistics
  const { data: voterRegistrationData, isLoading: voterRegistrationLoading, error: voterRegistrationError, refetch: refetchVoterRegistration } = useQuery({
    queryKey: ['voter-registration-stats', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/statistics/voter-registration', getFilterParams()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Fetch time-series data for line charts
  const { data: timeSeriesData, isLoading: timeSeriesLoading, refetch: refetchTimeSeries } = useQuery({
    queryKey: ['dashboard-time-series', refreshTimestamp, timePeriod, customDateFrom, customDateTo, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => {
      const params: any = { ...getFilterParams() };
      if (timePeriod === 'custom' && customDateFrom && customDateTo) {
        params.date_from = customDateFrom;
        params.date_to = customDateTo;
      } else {
        params.period = timePeriod;
      }
      return secureGet('/statistics/dashboard/time-series', params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshTimestamp(Date.now());
    refetchDashboard();
    refetchAnalytics();
    refetchBreakdown();
    refetchVoterRegistration();
    refetchTimeSeries();
  };

  // PDF export handler
  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const params: any = { ...getFilterParams() };
      if (timePeriod === 'custom' && customDateFrom && customDateTo) {
        params.date_from = customDateFrom;
        params.date_to = customDateTo;
      } else {
        params.period = timePeriod;
      }
      const response = await api.get('/statistics/dashboard/export/pdf', {
        params,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExportingPdf(false);
    }
  };

  // Extract data from API response (handles both { data: {...} } and direct {...} structures)
  const dashboardDataExtracted = (dashboardData as any)?.data || dashboardData;
  const systemStats = dashboardDataExtracted?.system || {};
  // const _analyticsStats = (analyticsData as any)?.statistics || {};

  // Debug logging
  devLog('🔍 Dashboard Data:', dashboardData);
  devLog('🔍 Dashboard Data Extracted:', dashboardDataExtracted);
  devLog('🔍 System Stats:', systemStats);

  // Extract the actual data from the nested API response structure
  const totals = systemStats.totals || {};
  const growth = systemStats.growth || {};
  // const _alerts = dashboardDataExtracted?.alerts || {};

  devLog('🔍 Totals:', totals);
  devLog('🔍 Growth:', growth);

  // Fetch recent applications
  const { data: applicationsData } = useQuery({
    queryKey: ['recent-applications'],
    queryFn: async () => {
      const result = await apiGet('/membership-applications', {
        limit: 5,
        page: 1,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch upcoming meetings
  const { data: meetingsData } = useQuery({
    queryKey: ['upcoming-meetings'],
    queryFn: async () => {
      const result = await apiGet('/meetings/upcoming/list', { limit: 5 });
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const recentApplications = (applicationsData as any)?.data?.applications || [];
  const upcomingMeetings = (meetingsData as any)?.data?.upcoming_meetings || [];

  // Create stats cards with real data from statistics API
  const statsCards = [
    {
      title: 'Total Members',
      value: totals.members?.toLocaleString() || '0',
      change: growth.members_this_month ? `+${growth.members_this_month.toLocaleString()} this month` : '+0 this month',
      icon: People,
      color: 'primary',
    },
    {
      title: 'Active Memberships',
      value: totals.active_memberships?.toLocaleString() || '0',
      change: `${growth.members_this_month?.toLocaleString() || 0} this month`,
      icon: PersonAdd,
      color: 'success',
    },
    {
      title: 'Regions',
      value: totals.districts?.toLocaleString() || '0',
      change: 'administrative regions',
      icon: AccountBalance,
      color: 'info',
    },
    // Only show provinces card for national admins
    ...(provinceContext.isNationalAdmin ? [{
      title: 'Provinces',
      value: totals.provinces?.toLocaleString() || '9', // Use actual data or fallback to 9
      change: 'nationwide coverage',
      icon: Groups,
      color: 'secondary',
    }] : []),
    {
      title: 'Sub-Regions',
      value: totals.municipalities?.toLocaleString() || '0',
      change: 'local governments',
      icon: HowToVote,
      color: 'warning',
    },
    {
      title: 'Wards',
      value: totals.wards?.toLocaleString() || '0',
      change: 'electoral divisions',
      icon: TrendingUp,
      color: 'success',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'under_review':
        return 'info';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  if (statsError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load dashboard data. Please try again later.
        </Alert>
      </Box>
    );
  }

  const isLoading = statsLoading || analyticsLoading;

  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title={pageTitle}
        subtitle={
          municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedMunicipality
            ? `Welcome to the ${municipalityContext.assignedMunicipality.name} Sub-Region Management System - Monitor your sub-region's growth and activities`
            : provinceContext.isProvincialAdmin && provinceContext.assignedProvince
            ? `Welcome to the ${provinceContext.assignedProvince.name} Province Management System - Monitor your province's growth and activities`
            : "Welcome to the EFF Membership Management System - Monitor your organization's growth and activities"
        }
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard' },
        ]}
        badge={{
          label: municipalityContext.shouldRestrictToMunicipality ? 'Municipality Data' :
                 provinceContext.isProvincialAdmin ? 'Provincial Data' : 'Live Data',
          color: municipalityContext.shouldRestrictToMunicipality || provinceContext.isProvincialAdmin ? 'primary' : 'success',
        }}
        actions={
          <Box display="flex" gap={2}>
            <ActionButton
              icon={Refresh}
              onClick={handleRefresh}
              variant="outlined"
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </ActionButton>
            <ActionButton
              icon={PersonAdd}
              onClick={() => window.location.href = '/admin/members/new'}
              variant="outlined"
              color="secondary"
            >
              Add Member
            </ActionButton>
            <ActionButton
              icon={Analytics}
              onClick={() => window.location.href = '/admin/analytics'}
              gradient={true}
              vibrant={true}
            >
              View Analytics
            </ActionButton>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={handleExportPDF}
              disabled={exportingPdf}
              sx={{ textTransform: 'none' }}
            >
              {exportingPdf ? 'Exporting...' : 'Export PDF'}
            </Button>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Context Banners for Admin Level Restrictions */}
        <MunicipalityContextBanner variant="banner" sx={{ mb: 3 }} />
        <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

        {/* Membership Filter Bar */}
        <MembershipFilterBar
          value={membershipFilter}
          onChange={setMembershipFilter}
        />

        {/* Membership Analytics Cards */}
        <Box sx={{ mb: 4 }}>
          <MembershipAnalyticsCards
            data={(membershipBreakdownData as any)?.data || membershipBreakdownData as any}
            isLoading={breakdownLoading}
          />
        </Box>

        {/* Quick Insights */}
      {!isLoading && totals.members && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>System Overview:</strong> {totals.members?.toLocaleString()} total members{' '}
            {municipalityContext.shouldRestrictToMunicipality
              ? `in ${municipalityContext.assignedMunicipality?.name || 'your sub-region'}`
              : provinceContext.isNationalAdmin
              ? 'nationwide'
              : `in ${provinceContext.assignedProvince?.name || 'your province'}`}.{' '}
            {totals.active_memberships?.toLocaleString()} active memberships across {totals.provinces} provinces.{' '}
            Monthly growth: {growth.members_this_month?.toLocaleString() || 0} new registrations.
          </Typography>
        </Alert>
      )}

        {/* Enhanced Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {isLoading ? (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress size={48} />
              </Box>
            </Grid>
          ) : (
            statsCards.map((stat, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                <StatsCard
                  title={stat.title}
                  value={stat.value}
                  subtitle={`${stat.change} this month`}
                  icon={stat.icon}
                  color={stat.color as 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'}
                  trend={{
                    value: parseFloat(stat.change.replace('%', '').replace('+', '')),
                    isPositive: stat.change.includes('+'),
                  }}
                  onClick={() => {
                    // Navigate to relevant section based on stat type
                    if (stat.title.includes('Members')) window.location.href = '/admin/members';
                    else if (stat.title.includes('Applications')) window.location.href = '/admin/applications';
                    else if (stat.title.includes('Elections')) window.location.href = '/admin/elections';
                    else if (stat.title.includes('Meetings')) window.location.href = '/admin/meetings';
                    else if (stat.title.includes('Leadership')) window.location.href = '/admin/leadership';
                  }}
                />
              </Grid>
            ))
          )}
        </Grid>

        {/* Membership Growth Charts */}
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline color="primary" />
              <Typography variant="h6">Membership Growth Charts</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Time Period Filter */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Time Period</InputLabel>
                <Select
                  value={timePeriod}
                  label="Time Period"
                  onChange={(e) => setTimePeriod(e.target.value)}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="7d">Last 7 Days</MenuItem>
                  <MenuItem value="30d">Last 30 Days</MenuItem>
                  <MenuItem value="90d">Last 90 Days</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
              {timePeriod === 'custom' && (
                <>
                  <TextField
                    size="small"
                    type="date"
                    label="From"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="To"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </>
              )}
              {(timeSeriesData as any)?.summary && (
                <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
                  <Chip
                    icon={<PersonAdd />}
                    label={`New Members: ${((timeSeriesData as any).summary.total_new_members || 0).toLocaleString()}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<ShowChart />}
                    label={`Renewals: ${((timeSeriesData as any).summary.total_renewals || 0).toLocaleString()}`}
                    color="success"
                    variant="outlined"
                  />
                </Box>
              )}
            </Box>

            {timeSeriesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (timeSeriesData as any)?.time_series?.length > 0 ? (
              <Grid container spacing={3}>
                {/* New Members Line Chart */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        New Member Registrations
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={(timeSeriesData as any).time_series}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) => {
                              const d = new Date(val);
                              if ((timeSeriesData as any)?.granularity === 'hourly') {
                                return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
                              }
                              return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                            fontSize={12}
                          />
                          <YAxis fontSize={12} />
                          <RechartsTooltip
                            labelFormatter={(label) => {
                              const d = new Date(label);
                              if ((timeSeriesData as any)?.granularity === 'hourly') {
                                return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) + ' - ' + d.toLocaleDateString();
                              }
                              return d.toLocaleDateString();
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="new_members"
                            stroke={theme.palette.primary.main}
                            strokeWidth={2}
                            name="New Members"
                            dot={(timeSeriesData as any)?.granularity === 'hourly'}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Renewals Line Chart */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Membership Renewals
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={(timeSeriesData as any).time_series}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) => {
                              const d = new Date(val);
                              if ((timeSeriesData as any)?.granularity === 'hourly') {
                                return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
                              }
                              return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                            fontSize={12}
                          />
                          <YAxis fontSize={12} />
                          <RechartsTooltip
                            labelFormatter={(label) => {
                              const d = new Date(label);
                              if ((timeSeriesData as any)?.granularity === 'hourly') {
                                return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) + ' - ' + d.toLocaleDateString();
                              }
                              return d.toLocaleDateString();
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="renewals"
                            stroke={theme.palette.success.main}
                            strokeWidth={2}
                            name="Renewals"
                            dot={(timeSeriesData as any)?.granularity === 'hourly'}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                No time-series data available for the selected period.
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Expired Members Section */}
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Expired Members</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ExpiredMembersSection
              onViewExpiredMembers={() => {
                window.location.href = '/admin/membership-expiration';
              }}
              onFilterByProvince={(provinceCode) => {
                devLog('Filter by province:', provinceCode);
              }}
            />
          </AccordionDetails>
        </Accordion>

        {/* Voter Registration Statistics Section */}
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Voter Registration Statistics</Typography>
          </AccordionSummary>
          <AccordionDetails>
              <VoterRegistrationStats
                summary={(voterRegistrationData as any)?.summary || null}
                geographicBreakdown={(voterRegistrationData as any)?.geographic_breakdown || []}
                breakdownType={(voterRegistrationData as any)?.breakdown_type || 'province'}
                isLoading={voterRegistrationLoading}
                error={voterRegistrationError as Error | null}
                onExport={async (format) => {
                  try {
                    const response = await secureGet('/statistics/voter-registration/export', {
                      ...getFilterParams(),
                      format
                    });
                    if (format === 'csv' && response) {
                      // For CSV, the backend returns the file directly
                      const blob = new Blob([response as any], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `voter-registration-statistics-${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    }
                  } catch (error) {
                    console.error('Export failed:', error);
                  }
                }}
                contextLabel={
                  municipalityContext.shouldRestrictToMunicipality
                    ? municipalityContext.assignedMunicipality?.name
                    : provinceContext.isProvincialAdmin
                    ? provinceContext.assignedProvince?.name
                    : undefined
                }
              />
          </AccordionDetails>
        </Accordion>

        {/* Recent Activity Section */}
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Recent Activity</Typography>
          </AccordionSummary>
          <AccordionDetails>
      <Grid container spacing={3}>
        {/* Recent Applications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Applications
            </Typography>
            {recentApplications.length > 0 ? (
              <List>
                {recentApplications.map((app: any, index: number) => (
                  <ListItem key={app.id} divider={index < recentApplications.length - 1}>
                    <ListItemIcon>
                      <Assignment />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${app.first_name} ${app.last_name || ''}`}
                      secondary={
                        <>
                          <span style={{ display: 'block', fontSize: '0.75rem' }}>
                            ID: {app.id} • {app.membership_type || 'Regular'} Membership
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            Submitted {new Date(app.created_at).toLocaleDateString()}
                          </span>
                        </>
                      }
                    />
                    <Chip
                      label={app.status.replace('_', ' ')}
                      color={getStatusColor(app.status) as any}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No recent applications
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Upcoming Meetings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Meetings
            </Typography>
            {upcomingMeetings.length > 0 ? (
              <List>
                {upcomingMeetings.map((meeting: any, index: number) => (
                  <ListItem key={meeting.id} divider={index < upcomingMeetings.length - 1}>
                    <ListItemIcon>
                      <Event />
                    </ListItemIcon>
                    <ListItemText
                      primary={meeting.meeting_title}
                      secondary={
                        <>
                          <span style={{ display: 'block', fontSize: '0.75rem' }}>
                            {new Date(meeting.start_datetime).toLocaleDateString()} at {new Date(meeting.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            {meeting.hierarchy_level} • {meeting.entity_name || 'National'}
                          </span>
                        </>
                      }
                    />
                    <Chip
                      label={meeting.meeting_status}
                      color={meeting.meeting_status === 'Scheduled' ? 'info' : 'default'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No upcoming meetings
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Municipality Statistics - Municipality Admin Only */}
        {municipalityContext.shouldRestrictToMunicipality && (
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">{municipalityContext.assignedMunicipality?.name || 'Municipality'} Overview</Typography>
          </AccordionSummary>
          <AccordionDetails>
              {municipalityOverviewLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : municipalityOverviewData?.data?.municipality ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Ward Performance
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="success.main">
                              {municipalityOverviewData.data.municipality.good_standing_wards}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Good Standing
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="warning.main">
                              {municipalityOverviewData.data.municipality.needs_improvement_wards}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Needs Improvement
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Compliance Rate: <strong>{municipalityOverviewData.data.municipality.compliance_percentage}%</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Wards: <strong>{municipalityOverviewData.data.municipality.total_wards}</strong>
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Membership Statistics
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Members: <strong>{municipalityOverviewData.data.municipality.total_all_members?.toLocaleString()}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Members: <strong>{municipalityOverviewData.data.municipality.total_active_members?.toLocaleString()}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average per Ward: <strong>{Math.round(municipalityOverviewData.data.municipality.avg_active_per_ward || 0)}</strong>
                      </Typography>
                      {municipalityOverviewData.data.demographics && (
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Male: <strong>{municipalityOverviewData.data.demographics.male_members?.toLocaleString()}</strong> |
                            Female: <strong>{municipalityOverviewData.data.demographics.female_members?.toLocaleString()}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Average Age: <strong>{Math.round(municipalityOverviewData.data.demographics.avg_age || 0)} years</strong>
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  Municipality overview data not available
                </Typography>
              )}
          </AccordionDetails>
        </Accordion>
        )}

        {/* Top Performing Wards */}
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">
              {municipalityContext.shouldRestrictToMunicipality
                ? `Top 5 Performing Wards in ${municipalityContext.assignedMunicipality?.name || 'Sub-Region'}`
                : provinceContext.isProvincialAdmin && provinceContext.assignedProvince
                ? `Top Performing Wards in ${provinceContext.assignedProvince.name}`
                : 'Top Performing Wards'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {wardsLoading || municipalityOverviewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              // Show municipality-specific wards if available, otherwise fall back to general top wards
              (municipalityOverviewData?.data?.top_performing_wards?.length > 0) ? (
                <Grid container spacing={2}>
                  {municipalityOverviewData.data.top_performing_wards.map((ward: any, index: number) => (
                    <Grid item xs={12} sm={6} md={4} key={ward.ward_code}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {ward.ward_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {ward.ward_standing}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Box>
                              <Typography variant="h6" color="primary.main">
                                {ward.active_members?.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Active ({ward.active_percentage}%)
                              </Typography>
                            </Box>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color={index < 3 ? 'primary' : 'default'}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (topWardsData?.data?.length > 0 || systemStats.top_wards?.length > 0) ? (
                <Grid container spacing={2}>
                  {(topWardsData?.data || systemStats.top_wards || []).slice(0, 5).map((ward: any, index: number) => (
                    <Grid item xs={12} sm={6} md={4} key={ward.ward_code || ward.id}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {ward.ward_name || ward.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {ward.municipality_name || ward.municipality}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography variant="h6" color="primary.main">
                              {ward.member_count || ward.members || 0}
                            </Typography>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color={index < 3 ? 'primary' : 'default'}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  {municipalityContext.shouldRestrictToMunicipality
                    ? `No ward performance data available for ${municipalityContext.assignedMunicipality?.name || 'your municipality'}`
                    : provinceContext.isProvincialAdmin
                    ? `No ward performance data available for ${provinceContext.assignedProvince?.name || 'your province'}`
                    : 'No ward performance data available'}
                </Typography>
              )
            )}
          </AccordionDetails>
        </Accordion>

      </Container>
    </Box>
  );
};

export default DashboardPage;
