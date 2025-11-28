import React from 'react';
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
  Dashboard as DashboardIcon,
  Analytics,
  SupervisorAccount,
  Refresh,
  Add as AddIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';
import ExpiredMembersSection from '../../components/dashboard/ExpiredMembersSection';
import { useProvinceContext, useProvincePageTitle } from '../../hooks/useProvinceContext';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import ProvinceContextBanner from '../../components/common/ProvinceContextBanner';
import MunicipalityContextBanner from '../../components/common/MunicipalityContextBanner';
import { useSecureApi } from '../../hooks/useSecureApi';

// Interface definitions

interface MembershipApplication {
  application_id: number;
  firstname: string;
  surname: string;
  status: string;
  created_at: string;
  membership_type?: string;
}

interface Meeting {
  meeting_id: number;
  meeting_title: string;
  start_datetime: string;
  meeting_type: string;
  meeting_status: string;
  hierarchy_level: string;
}

const DashboardPage: React.FC = () => {
  // Add refresh timestamp to force cache invalidation
  const [refreshTimestamp, setRefreshTimestamp] = React.useState(Date.now());

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

    // Apply municipality filtering for municipality admin
    return applyMunicipalityFilter(baseParams, municipalityContext);
  };

  // Fetch comprehensive dashboard statistics with geographic filtering
  const { data: dashboardData, isLoading: statsLoading, error: statsError, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard-stats', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: async () => {
      console.log('🔍 Dashboard API Call - Making request to /statistics/dashboard');
      console.log('🔍 Filter params:', getFilterParams());
      try {
        const result = await secureGet('/statistics/dashboard', getFilterParams());
        console.log('✅ Dashboard API Call - Success:', result);
        return result;
      } catch (error) {
        console.error('❌ Dashboard API Call - Error:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Fetch analytics data for additional metrics with geographic filtering
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics-dashboard', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/analytics/dashboard', getFilterParams()),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Fetch top performing wards for the geographic area
  const { data: topWardsData, isLoading: wardsLoading } = useQuery({
    queryKey: ['top-wards', refreshTimestamp, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/statistics/top-wards', { ...getFilterParams(), limit: 5 }),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!provinceFilter || municipalityContext.shouldRestrictToMunicipality, // Fetch for provincial and municipality admins
  });

  // Fetch municipality overview for municipality admin
  const { data: municipalityOverviewData, isLoading: municipalityOverviewLoading } = useQuery({
    queryKey: ['municipality-overview', refreshTimestamp, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/statistics/municipality-overview', getFilterParams()),
    staleTime: 30 * 1000, // 30 seconds
    enabled: municipalityContext.shouldRestrictToMunicipality, // Only fetch for municipality admins
  });

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshTimestamp(Date.now());
    refetchDashboard();
    refetchAnalytics();
  };

  const systemStats = (dashboardData as any)?.system || {};
  const analyticsStats = (analyticsData as any)?.statistics || {};

  // Debug logging
  console.log('🔍 Dashboard Data:', dashboardData);
  console.log('🔍 System Stats:', systemStats);

  // Extract the actual data from the nested API response structure
  const totals = systemStats.totals || {};
  const growth = systemStats.growth || {};
  const alerts = (dashboardData as any)?.alerts || {};

  console.log('🔍 Totals:', totals);
  console.log('🔍 Growth:', growth);

  // Mock data for applications and meetings (since endpoints don't exist yet)
  const recentApplications = [
    {
      application_id: 1001,
      firstname: 'Thabo',
      surname: 'Mthembu',
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      membership_type: 'Regular'
    },
    {
      application_id: 1002,
      firstname: 'Nomsa',
      surname: 'Dlamini',
      status: 'under_review',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      membership_type: 'Student'
    },
    {
      application_id: 1003,
      firstname: 'Sipho',
      surname: 'Ndlovu',
      status: 'approved',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      membership_type: 'Regular'
    }
  ];

  const upcomingMeetings = [
    {
      meeting_id: 1,
      meeting_title: 'Ward Committee Meeting - Ward 9',
      start_datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      meeting_type: 'Ward Committee',
      meeting_status: 'Scheduled',
      hierarchy_level: 'Ward'
    },
    {
      meeting_id: 2,
      meeting_title: 'Municipal Executive Meeting',
      start_datetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      meeting_type: 'Executive',
      meeting_status: 'Scheduled',
      hierarchy_level: 'Municipality'
    }
  ];

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
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Context Banners for Admin Level Restrictions */}
        <MunicipalityContextBanner variant="banner" sx={{ mb: 3 }} />
        <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

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

        {/* Expired Members Section */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <ExpiredMembersSection
              onViewExpiredMembers={() => {
                // Navigate to expired members management page
                window.location.href = '/admin/membership/expiration';
              }}
              onFilterByProvince={(provinceCode) => {
                // Handle province filtering - could update URL params or state
                console.log('Filter by province:', provinceCode);
              }}
            />
          </Grid>
        </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Recent Applications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Applications
            </Typography>
            {recentApplications.length > 0 ? (
              <List>
                {recentApplications.map((app: MembershipApplication, index: number) => (
                  <ListItem key={app.application_id} divider={index < recentApplications.length - 1}>
                    <ListItemIcon>
                      <Assignment />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${app.firstname} ${app.surname || ''}`}
                      secondary={
                        <>
                          <span style={{ display: 'block', fontSize: '0.75rem' }}>
                            ID: {app.application_id} • {app.membership_type || 'Regular'} Membership
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
                {upcomingMeetings.map((meeting: Meeting, index: number) => (
                  <ListItem key={meeting.meeting_id} divider={index < upcomingMeetings.length - 1}>
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
                            {meeting.hierarchy_level} • {meeting.meeting_type}
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

        {/* Municipality Statistics - Municipality Admin Only */}
        {municipalityContext.shouldRestrictToMunicipality && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {municipalityContext.assignedMunicipality?.name || 'Municipality'} Overview
              </Typography>
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
            </Paper>
          </Grid>
        )}

        {/* Top Performing Wards */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {municipalityContext.shouldRestrictToMunicipality
                ? `Top 5 Performing Wards in ${municipalityContext.assignedMunicipality?.name || 'Sub-Region'}`
                : provinceContext.isProvincialAdmin && provinceContext.assignedProvince
                ? `Top Performing Wards in ${provinceContext.assignedProvince.name}`
                : 'Top Performing Wards'}
            </Typography>
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
          </Paper>
        </Grid>


      </Grid>
      </Container>
    </Box>
  );
};

export default DashboardPage;
