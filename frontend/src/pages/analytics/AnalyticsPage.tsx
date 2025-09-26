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
  Button,
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
  Download,
  Refresh,
  Analytics,
  BarChart,
  PieChart,
  ShowChart,
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
                  value={(dashboardData?.statistics?.total_members || 0).toLocaleString()}
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
                  value={(dashboardData?.statistics?.active_members || 0).toLocaleString()}
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
                  value={(dashboardData?.statistics?.pending_applications || 0).toString()}
                  subtitle="Awaiting review"
                  icon={Assessment}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Recent Registrations"
                  value={(dashboardData?.statistics?.recent_registrations || 0).toString()}
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
                  value={(dashboardData?.statistics?.total_meetings || 0).toString()}
                  subtitle="All scheduled meetings"
                  icon={Event}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Upcoming Meetings"
                  value={(dashboardData?.statistics?.upcoming_meetings || 0).toString()}
                  subtitle="Scheduled ahead"
                  icon={Event}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Leadership Positions"
                  value={(dashboardData?.statistics?.leadership_positions_filled || 0).toString()}
                  subtitle="Filled positions"
                  icon={AccountBalance}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Growth Rate"
                  value={`${dashboardData?.statistics?.membership_growth_rate || 0}%`}
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
                  value={(membershipData?.analytics?.total_members || 0).toLocaleString()}
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
                  value={(membershipData?.analytics?.active_members || 0).toLocaleString()}
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
                  value={(membershipData?.analytics?.inactive_members || 0).toString()}
                  subtitle="Not currently active"
                  icon={People}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Pending Members"
                  value={(membershipData?.analytics?.pending_members || 0).toString()}
                  subtitle="Awaiting approval"
                  icon={People}
                  color="warning"
                />
              </Grid>

              {/* Membership by Hierarchy */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Membership by Hierarchy
                    </Typography>
                    {membershipData?.analytics?.membership_by_hierarchy?.map((item, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{item.hierarchy_level}</Typography>
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

              {/* Gender Distribution */}
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
                    {membershipData?.analytics?.gender_distribution?.map((item, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{item.gender}</Typography>
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
                              backgroundColor: index === 0 ? 'primary.main' : 'secondary.main',
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Age Distribution */}
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
                    {membershipData?.analytics?.age_distribution?.map((item, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{item.age_group}</Typography>
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
                              backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
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
                    {membershipData?.analytics?.membership_by_status?.map((item, index) => (
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

              {/* Membership Growth */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Membership Growth (Last 12 Months)
                    </Typography>
                    {membershipData?.analytics?.membership_growth?.length && membershipData.analytics.membership_growth.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {membershipData?.analytics?.membership_growth?.map((item: any, index: number) => (
                          <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">{item.month}</Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Typography variant="body2" color="primary.main">
                                New: {item.new_members}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total: {item.total_members}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No growth data available
                      </Typography>
                    )}
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
                    {membershipData?.analytics?.geographic_performance?.best_performing_wards?.length && membershipData.analytics.geographic_performance.best_performing_wards.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {membershipData.analytics.geographic_performance.best_performing_wards.map((ward: any, index: number) => (
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
                      {membershipData?.analytics?.geographic_performance?.top_performing_districts?.length && membershipData.analytics.geographic_performance.top_performing_districts.length > 0 ? (
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
                            {membershipData.analytics.geographic_performance.top_performing_districts.map((district: any, index: number) => {
                              const maxCount = membershipData?.analytics?.geographic_performance?.top_performing_districts?.[0]?.member_count || 1;
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
                  value={(meetingData?.analytics?.total_meetings || 0).toString()}
                  subtitle="All meetings held"
                  icon={Event}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Completed"
                  value={(meetingData?.analytics?.completed_meetings || 0).toString()}
                  subtitle="Successfully held"
                  icon={Event}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Upcoming"
                  value={(meetingData?.analytics?.upcoming_meetings || 0).toString()}
                  subtitle="Scheduled ahead"
                  icon={Event}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Average Attendance"
                  value={`${meetingData?.analytics?.average_attendance || 0}%`}
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
                    {meetingData?.analytics?.meetings_by_type?.map((item, index) => (
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
                    {meetingData?.analytics?.meetings_by_hierarchy?.map((item, index) => (
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
                  value={(leadershipData?.analytics?.total_positions || 0).toString()}
                  subtitle="All leadership roles"
                  icon={AccountBalance}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Filled Positions"
                  value={(leadershipData?.analytics?.filled_positions || 0).toString()}
                  subtitle="Currently occupied"
                  icon={AccountBalance}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Vacant Positions"
                  value={(leadershipData?.analytics?.vacant_positions || 0).toString()}
                  subtitle="Need to be filled"
                  icon={AccountBalance}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Active Elections"
                  value={(leadershipData?.analytics?.upcoming_elections || 0).toString()}
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
                    {leadershipData?.analytics?.positions_by_hierarchy?.map((item, index) => (
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
