import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
  // Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Container,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Event,
  AccountBalance,
  // Download,
  Refresh,
  Analytics,
  // BarChart,
  // PieChart,
  // ShowChart,
  Assessment,
  PictureAsPdf,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/analyticsApi';
import type { ReportFilters } from '../../lib/analyticsApi';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';
import { useProvinceContext, useProvincePageTitle } from '../../hooks/useProvinceContext';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import ProvinceContextBanner from '../../components/common/ProvinceContextBanner';
import MunicipalityContextBanner from '../../components/common/MunicipalityContextBanner';
import { useSecureApi } from '../../hooks/useSecureApi';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AnalyticsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [entityId, setEntityId] = useState('');

  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();
  const municipalityContext = useMunicipalityContext();
  const pageTitle = useProvincePageTitle('Analytics');
  const { secureGet, getProvinceFilter } = useSecureApi();

  // Get province filter for API calls
  const provinceFilter = getProvinceFilter();

  // Create combined filter parameters for municipality admin
  const getFilterParams = () => {
    const baseParams: any = { ...filters };

    // Apply province filtering for provincial admin
    if (provinceFilter) {
      baseParams.province_code = provinceFilter;
    }

    // Apply municipality filtering for municipality admin
    return applyMunicipalityFilter(baseParams, municipalityContext);
  };

  // Build base filters for API calls
  const filters: ReportFilters = {
    ...(hierarchyLevel && { hierarchy_level: hierarchyLevel }),
    ...(entityId && { entity_id: entityId }),
  };

  // Fetch dashboard statistics with geographic filtering
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery({
    queryKey: ['analytics-dashboard', filters, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/analytics/dashboard', getFilterParams()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch membership analytics with geographic filtering
  const { data: membershipData, isLoading: membershipLoading, error: membershipError, refetch: refetchMembership } = useQuery({
    queryKey: ['analytics-membership', filters, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/analytics/membership', getFilterParams()),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch meeting analytics with geographic filtering
  const { data: meetingData, isLoading: meetingLoading, error: meetingError, refetch: refetchMeetings } = useQuery({
    queryKey: ['analytics-meetings', filters, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/analytics/meetings', getFilterParams()),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch leadership analytics with geographic filtering
  const { data: leadershipData, isLoading: leadershipLoading, error: leadershipError, refetch: refetchLeadership } = useQuery({
    queryKey: ['analytics-leadership', filters, provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/analytics/leadership', getFilterParams()),
    staleTime: 5 * 60 * 1000,
  });

  // Extract payloads from API response (handles both wrapped { data: {...} } and direct {...} structures)
  const dashboardStats = (((dashboardData as any)?.data) || dashboardData)?.statistics;
  const membershipAnalytics = (((membershipData as any)?.data) || membershipData)?.analytics;
  const meetingAnalytics = (((meetingData as any)?.data) || meetingData)?.analytics;
  const leadershipAnalytics = (((leadershipData as any)?.data) || leadershipData)?.analytics;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchMembership();
    refetchMeetings();
    refetchLeadership();
  };

  const handleExport = async (type: string) => {
    try {
      if (type === 'comprehensive-pdf') {
        console.log('Exporting comprehensive analytics to PDF...');

        // Export comprehensive analytics to PDF
        const pdfBlob = await analyticsApi.exportComprehensiveAnalyticsPDF(filters);

        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprehensive-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('✅ Comprehensive analytics PDF exported successfully');
      } else {
        // Other export types
        console.log(`Exporting ${type} analytics...`);
        // Implementation would depend on your export requirements
      }
    } catch (error) {
      console.error('Export failed:', error);
      // You might want to show a user-friendly error message here
    }
  };



  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title={pageTitle}
        subtitle={
          municipalityContext.shouldRestrictToMunicipality
            ? `Comprehensive insights for ${municipalityContext.assignedMunicipality?.name || 'your municipality'} - membership, meetings, and leadership analytics`
            : provinceContext.isProvincialAdmin
            ? `Comprehensive insights for ${provinceContext.assignedProvince?.name || 'your province'} - membership, meetings, and leadership analytics`
            : "Comprehensive insights into membership, meetings, and leadership across your organization"
        }
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Analytics' },
        ]}
        badge={{
          label: municipalityContext.shouldRestrictToMunicipality
            ? `${municipalityContext.assignedMunicipality?.code || 'Municipality'} Data`
            : provinceContext.isProvincialAdmin
            ? `${provinceContext.assignedProvince?.code || 'Province'} Data`
            : 'Live Data',
          color: municipalityContext.shouldRestrictToMunicipality || provinceContext.isProvincialAdmin ? 'primary' : 'success',
        }}
        actions={
          <Box display="flex" gap={2}>
            <ActionButton
              icon={Refresh}
              onClick={handleRefreshAll}
              variant="outlined"
              color="info"
            >
              Refresh All
            </ActionButton>
            <ActionButton
              icon={PictureAsPdf}
              onClick={() => handleExport('comprehensive-pdf')}
              gradient={true}
              vibrant={true}
              color="error"
            >
              Export PDF (Landscape)
            </ActionButton>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Context Banners for Admin Level Restrictions */}
        <MunicipalityContextBanner variant="banner" sx={{ mb: 3 }} />
        <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Hierarchy Level</InputLabel>
              <Select
                value={hierarchyLevel}
                label="Hierarchy Level"
                onChange={(e) => setHierarchyLevel(e.target.value)}
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="National">National</MenuItem>
                <MenuItem value="Province">Province</MenuItem>
                <MenuItem value="Region">Region</MenuItem>
                <MenuItem value="Municipality">Municipality</MenuItem>
                <MenuItem value="Ward">Ward</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Entity ID</InputLabel>
              <Select
                value={entityId}
                label="Entity ID"
                onChange={(e) => setEntityId(e.target.value)}
              >
                <MenuItem value="">All Entities</MenuItem>
                {/* Add entity options based on your data */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {hierarchyLevel && (
                <Chip
                  label={`Level: ${hierarchyLevel}`}
                  onDelete={() => setHierarchyLevel('')}
                  size="small"
                />
              )}
              {entityId && (
                <Chip
                  label={`Entity: ${entityId}`}
                  onDelete={() => setEntityId('')}
                  size="small"
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

        {/* Enhanced Tabs */}
        <Paper
          sx={{
            mb: 4,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="analytics tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '1rem',
                fontWeight: 500,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                },
              },
            }}
          >
            <Tab
              label="Dashboard Overview"
              icon={<Analytics />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Membership Analytics"
              icon={<People />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Meeting Analytics"
              icon={<Event />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              label="Leadership Analytics"
              icon={<AccountBalance />}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          {dashboardLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : dashboardError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load dashboard statistics. Please try again.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title={`Total Members${
                    municipalityContext.shouldRestrictToMunicipality
                      ? ` (${municipalityContext.assignedMunicipality?.name || 'Municipality'})`
                      : provinceContext.isProvincialAdmin
                      ? ` (${provinceContext.assignedProvince?.name || 'Province'})`
                      : ''
                  }`}
                  value={(dashboardStats?.total_members || 0).toLocaleString()}
                  subtitle={
                    municipalityContext.shouldRestrictToMunicipality
                      ? `Municipality-specific data`
                      : provinceContext.isProvincialAdmin
                      ? `Province-specific data`
                      : "All registered members"
                  }
                  icon={People}
                  color="primary"
                  trend={{
                    value: 12,
                    isPositive: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title={`Active Members${
                    municipalityContext.shouldRestrictToMunicipality
                      ? ` (${municipalityContext.assignedMunicipality?.name || 'Municipality'})`
                      : provinceContext.isProvincialAdmin
                      ? ` (${provinceContext.assignedProvince?.name || 'Province'})`
                      : ''
                  }`}
                  value={(dashboardStats?.active_members || 0).toLocaleString()}
                  subtitle={
                    municipalityContext.shouldRestrictToMunicipality
                      ? `Municipality-specific data`
                      : provinceContext.isProvincialAdmin
                      ? `Province-specific data`
                      : "Currently active"
                  }
                  icon={People}
                  color="success"
                  trend={{
                    value: 8,
                    isPositive: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Pending Applications"
                  value={(dashboardStats?.pending_applications || 0).toString()}
                  subtitle="Awaiting review"
                  icon={Assessment}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Recent Registrations"
                  value={(dashboardStats?.recent_registrations || 0).toString()}
                  subtitle="Last 30 days"
                  icon={TrendingUp}
                  color="info"
                  trend={{
                    value: 15,
                    isPositive: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Total Meetings"
                  value={(dashboardStats?.total_meetings || 0).toString()}
                  subtitle="All scheduled meetings"
                  icon={Event}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Upcoming Meetings"
                  value={(dashboardStats?.upcoming_meetings || 0).toString()}
                  subtitle="Scheduled ahead"
                  icon={Event}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Leadership Positions"
                  value={(dashboardStats?.leadership_positions_filled || 0).toString()}
                  subtitle="Filled positions"
                  icon={AccountBalance}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Growth Rate"
                  value={`${dashboardStats?.membership_growth_rate || 0}%`}
                  subtitle="Monthly growth"
                  icon={TrendingUp}
                  color="success"
                />
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* Membership Tab */}
        <TabPanel value={tabValue} index={1}>
          {membershipLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : membershipError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load membership analytics. Please try again.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Membership Summary */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Membership Summary
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title={`Total Members${
                    municipalityContext.shouldRestrictToMunicipality
                      ? ` (${municipalityContext.assignedMunicipality?.name || 'Municipality'})`
                      : provinceContext.isProvincialAdmin
                      ? ` (${provinceContext.assignedProvince?.name || 'Province'})`
                      : ''
                  }`}
                  value={(membershipAnalytics?.total_members || 0).toLocaleString()}
                  subtitle={
                    municipalityContext.shouldRestrictToMunicipality
                      ? `Municipality-specific data`
                      : provinceContext.isProvincialAdmin
                      ? `Province-specific data`
                      : "All registered members"
                  }
                  icon={People}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title={`Active Members${
                    municipalityContext.shouldRestrictToMunicipality
                      ? ` (${municipalityContext.assignedMunicipality?.name || 'Municipality'})`
                      : provinceContext.isProvincialAdmin
                      ? ` (${provinceContext.assignedProvince?.name || 'Province'})`
                      : ''
                  }`}
                  value={(membershipAnalytics?.active_members || 0).toLocaleString()}
                  subtitle={
                    municipalityContext.shouldRestrictToMunicipality
                      ? `Municipality-specific data`
                      : provinceContext.isProvincialAdmin
                      ? `Province-specific data`
                      : "Currently active"
                  }
                  icon={People}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Inactive Members"
                  value={(membershipAnalytics?.inactive_members || 0).toString()}
                  subtitle="Not currently active"
                  icon={People}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Pending Members"
                  value={(membershipAnalytics?.pending_members || 0).toString()}
                  subtitle="Awaiting approval"
                  icon={People}
                  color="warning"
                />
              </Grid>

              {/* Gender Distribution - Pie Chart */}
              <Grid item xs={12} md={6}>
                    <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Gender Distribution{
                        municipalityContext.shouldRestrictToMunicipality
                          ? ` - ${municipalityContext.assignedMunicipality?.name || 'Municipality'}`
                          : provinceContext.isProvincialAdmin
                          ? ` - ${provinceContext.assignedProvince?.name || 'Province'}`
                          : ''
                      }
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={membershipAnalytics?.gender_distribution?.map((item: any) => ({
                            name: item.gender,
                            value: Number(item.member_count),
                            percentage: Number(item.percentage).toFixed(1),
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }: any) => `${name}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          >
                          {membershipAnalytics?.gender_distribution?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#1976d2' : index === 1 ? '#dc004e' : '#ff9800'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any, props: any) => [
                            `${Number(value).toLocaleString()} (${props.payload.percentage}%)`,
                            name
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Age Distribution - Bar Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Age Distribution{
                        municipalityContext.shouldRestrictToMunicipality
                          ? ` - ${municipalityContext.assignedMunicipality?.name || 'Municipality'}`
                          : provinceContext.isProvincialAdmin
                          ? ` - ${provinceContext.assignedProvince?.name || 'Province'}`
                          : ''
                      }
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={membershipAnalytics?.age_distribution?.map((item: any) => ({
                          age_group: item.age_group,
                          member_count: Number(item.member_count),
                          percentage: Number(item.percentage).toFixed(1),
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="age_group" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any, name: any, props: any) => [
                            `${Number(value).toLocaleString()} (${props.payload.percentage}%)`,
                            'Members'
                          ]}
                        />
                        <Legend formatter={() => 'Members'} />
                        <Bar dataKey="member_count" fill="#1976d2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Population Pyramid - Age/Gender Distribution */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Population Pyramid - Age/Gender Distribution{
                        municipalityContext.shouldRestrictToMunicipality
                          ? ` - ${municipalityContext.assignedMunicipality?.name || 'Municipality'}`
                          : provinceContext.isProvincialAdmin
                          ? ` - ${provinceContext.assignedProvince?.name || 'Province'}`
                          : ''
                      }
                    </Typography>
                    <Box sx={{ display: 'flex', height: 400 }}>
                      {/* Male side (left) */}
                      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                            data={membershipAnalytics?.age_gender_pyramid?.map((item: any) => ({
                              age_group: item.age_group,
                              male_count: Number(item.male_count),
                              male_percentage: Number(item.male_percentage).toFixed(1),
                            }))}
                            layout="vertical"
                            margin={{ top: 20, right: 0, left: 30, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              reversed
                              tickFormatter={(value) => value.toLocaleString()}
                            />
                            <YAxis
                              type="category"
                              dataKey="age_group"
                              width={0}
                              hide
                            />
                            <Tooltip
                              formatter={(value: any, name: any, props: any) => [
                                `${Number(value).toLocaleString()} (${props.payload.male_percentage}%)`,
                                'Male'
                              ]}
                            />
                            <Bar
                              dataKey="male_count"
                              fill="#1976d2"
                              name="Male"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>

                      {/* Center axis with age labels */}
                      <Box sx={{ width: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', py: 2.5 }}>
                        {membershipAnalytics?.age_gender_pyramid?.map((item: any, index: number) => (
                          <Typography key={index} variant="body2" align="center" sx={{ height: `${100 / (membershipAnalytics?.age_gender_pyramid?.length || 1)}%`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.age_group}
                          </Typography>
                        ))}
                      </Box>

                      {/* Female side (right) */}
                      <Box sx={{ flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={membershipAnalytics?.age_gender_pyramid?.map((item: any) => ({
                              age_group: item.age_group,
                              female_count: Number(item.female_count),
                              female_percentage: Number(item.female_percentage).toFixed(1),
                            }))}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              tickFormatter={(value) => value.toLocaleString()}
                            />
                            <YAxis
                              type="category"
                              dataKey="age_group"
                              width={0}
                              hide
                            />
                            <Tooltip
                              formatter={(value: any, name: any, props: any) => [
                                `${Number(value).toLocaleString()} (${props.payload.female_percentage}%)`,
                                'Female'
                              ]}
                            />
                            <Bar
                              dataKey="female_count"
                              fill="#dc004e"
                              name="Female"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>

                    {/* Legend */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, bgcolor: '#1976d2' }} />
                        <Typography variant="body2">Male</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, bgcolor: '#dc004e' }} />
                        <Typography variant="body2">Female</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Membership by Status */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Membership by Status
                    </Typography>
                    {membershipAnalytics?.membership_by_status?.map((item: any, index: number) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{item.membership_status}</Typography>
                          <Typography variant="body2">
                            {item.member_count} ({Number(item.percentage).toFixed(1)}%)
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: '100%',
                            height: 8,
                            backgroundColor: 'grey.200',
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Number(item.percentage)}%`,
                              height: '100%',
                              backgroundColor: item.membership_status === 'Active' ? 'success.main' : 'warning.main',
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Voter Registration Status */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Voter Registration Status
                    </Typography>
                    {membershipAnalytics?.voter_registration_status?.map((item: any, index: number) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{item.voter_status}</Typography>
                          <Typography variant="body2">
                            {item.member_count} ({Number(item.percentage).toFixed(1)}%)
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: '100%',
                            height: 8,
                            backgroundColor: 'grey.200',
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Number(item.percentage)}%`,
                              height: '100%',
                              backgroundColor: item.voter_status === 'Registered' ? 'success.main' : 'error.main',
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Best Performing Wards */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="success.main">
                      🏆 Best Performing Wards (Top 5){
                        municipalityContext.shouldRestrictToMunicipality
                          ? ` - ${municipalityContext.assignedMunicipality?.name || 'Municipality'}`
                          : provinceContext.isProvincialAdmin
                          ? ` - ${provinceContext.assignedProvince?.name || 'Province'}`
                          : ''
                      }
                    </Typography>
                    {membershipAnalytics?.geographic_performance?.best_performing_wards?.length && membershipAnalytics.geographic_performance.best_performing_wards.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {membershipAnalytics.geographic_performance.best_performing_wards.map((ward: any, index: number) => (
                          <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'success.light', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              #{index + 1} {ward.ward_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {municipalityContext.shouldRestrictToMunicipality
                                ? `Ward in ${municipalityContext.assignedMunicipality?.name || 'Municipality'}`
                                : `${ward.municipality_name}, ${ward.province_name}`
                              }
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Typography variant="body2" color="success.main">
                                {ward.member_count} members
                              </Typography>
                              <Typography variant="body2" color="success.main">
                                {ward.performance_score}% of target
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No performance data available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Top District Municipalities - Only show for Provincial Admin */}
              {provinceContext.isProvincialAdmin && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="info.main">
                        🏛️ Top District Municipalities ({provinceContext.assignedProvince?.name || 'Province'})
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        Best performing district municipalities within {provinceContext.assignedProvince?.name || 'your province'}
                      </Typography>
                      {membershipAnalytics?.geographic_performance?.top_performing_districts?.length && membershipAnalytics.geographic_performance.top_performing_districts.length > 0 ? (
                        <Box sx={{ mt: 3 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'end',
                              justifyContent: 'flex-start',
                              height: 250,
                              gap: 2,
                              px: 1,
                              overflowX: 'auto'
                            }}
                          >
                            {membershipAnalytics.geographic_performance.top_performing_districts.map((district: any, index: number) => {
                              const maxCount = membershipAnalytics?.geographic_performance?.top_performing_districts?.[0]?.member_count || 1;
                              const barHeight = (district.member_count / maxCount) * 180; // Max height 180px
                              const color = `hsl(${200 + index * 15}, 70%, ${45 + index * 3}%)`; // Blue gradient

                              return (
                                <Box
                                  key={index}
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: 80
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 60,
                                      height: barHeight,
                                      backgroundColor: color,
                                      borderRadius: '4px 4px 0 0',
                                      mb: 1,
                                      display: 'flex',
                                      alignItems: 'flex-end',
                                      justifyContent: 'center',
                                      pb: 1,
                                      position: 'relative',
                                      '&:hover': {
                                        backgroundColor: `hsl(${200 + index * 15}, 70%, ${35 + index * 3}%)`,
                                        cursor: 'pointer'
                                      }
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.7rem',
                                        textAlign: 'center'
                                      }}
                                    >
                                      {district.member_count.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="text.primary"
                                    sx={{
                                      textAlign: 'center',
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                      maxWidth: 75,
                                      wordBreak: 'break-word',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    {district.district_name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      textAlign: 'center',
                                      fontSize: '0.6rem',
                                      maxWidth: 75,
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {district.municipality_count} municipalities
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No district data available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        {/* Meetings Tab */}
        <TabPanel value={tabValue} index={2}>
          {meetingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : meetingError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load meeting analytics. Please try again.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Meeting Summary */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Meeting Summary
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Total Meetings"
                  value={(meetingAnalytics?.total_meetings || 0).toString()}
                  subtitle="All meetings held"
                  icon={Event}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Completed"
                  value={(meetingAnalytics?.completed_meetings || 0).toString()}
                  subtitle="Successfully held"
                  icon={Event}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Upcoming"
                  value={(meetingAnalytics?.upcoming_meetings || 0).toString()}
                  subtitle="Scheduled ahead"
                  icon={Event}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Average Attendance"
                  value={`${meetingAnalytics?.average_attendance || 0}%`}
                  subtitle="Participation rate"
                  icon={People}
                  color="success"
                />
              </Grid>

              {/* Meetings by Type */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Meetings by Type
                    </Typography>
                    {meetingAnalytics?.meetings_by_type?.map((item: any, index: number) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{item.meeting_type}</Typography>
                          <Typography variant="body2">
                            {item.meeting_count} ({Number(item.percentage).toFixed(1)}%)
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: '100%',
                            height: 8,
                            backgroundColor: 'grey.200',
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Number(item.percentage)}%`,
                              height: '100%',
                              backgroundColor: 'primary.main',
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Meetings by Hierarchy */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Meetings by Hierarchy
                    </Typography>
                    {meetingAnalytics?.meetings_by_hierarchy?.map((item: any, index: number) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{item.hierarchy_level}</Typography>
                          <Typography variant="body2">
                            {item.meeting_count} meetings (Avg: {item.average_attendance}% attendance)
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* Leadership Tab */}
        <TabPanel value={tabValue} index={3}>
          {leadershipLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : leadershipError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load leadership analytics. Please try again.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Leadership Summary */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Leadership Summary
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Total Positions"
                  value={(leadershipAnalytics?.total_positions || 0).toString()}
                  subtitle="All leadership roles"
                  icon={AccountBalance}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Filled Positions"
                  value={(leadershipAnalytics?.filled_positions || 0).toString()}
                  subtitle="Currently occupied"
                  icon={AccountBalance}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Vacant Positions"
                  value={(leadershipAnalytics?.vacant_positions || 0).toString()}
                  subtitle="Need to be filled"
                  icon={AccountBalance}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                  title="Active Elections"
                  value={(leadershipAnalytics?.upcoming_elections || 0).toString()}
                  subtitle="Currently running"
                  icon={Event}
                  color="info"
                />
              </Grid>

              {/* Positions by Hierarchy */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Positions by Hierarchy
                    </Typography>
                    {leadershipAnalytics?.positions_by_hierarchy?.map((item: any, index: number) => (
                      <Box key={index} sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {item.hierarchy_level}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Total: {item.total_positions}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="success.main">
                              Filled: {item.filled_positions}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="error.main">
                              Vacancy Rate: {Number(item.vacancy_rate).toFixed(1)}%
                            </Typography>
                          </Grid>
                        </Grid>
                        <Box
                          sx={{
                            width: '100%',
                            height: 8,
                            backgroundColor: 'grey.200',
                            borderRadius: 1,
                            mt: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${100 - item.vacancy_rate}%`,
                              height: '100%',
                              backgroundColor: 'success.main',
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default AnalyticsPage;
