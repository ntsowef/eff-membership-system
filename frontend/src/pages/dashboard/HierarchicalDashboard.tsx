import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  Container,
  Paper,
  Button,
  ButtonGroup,
  Avatar,
  CardActionArea,
} from '@mui/material';
import {
  People,
  HowToVote,
  LocationOn,
  NavigateNext,
  Public,
  AccountBalance,
  Business,
  LocationCity,
  ArrowForward,
  Groups,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiGet } from '../../lib/api';
import { devLog } from '../../utils/logger';
import StatsCard from '../../components/ui/StatsCard';
import PageHeader from '../../components/ui/PageHeader';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext } from '../../hooks/useMunicipalityContext';
import ProvinceContextBanner from '../../components/common/ProvinceContextBanner';

// Types for hierarchical dashboard
interface HierarchicalEntity {
  id?: number;
  name: string;
  code: string;
  province_name?: string;
  province_code?: string;
  region_name?: string;
  region_code?: string;
  municipality_name?: string;
  municipality_code?: string;
}

interface MemberStatistics {
  total_members: number;
  active_members: number;
  expired_members: number;
  registered_voters: number;
  male_members?: number;
  female_members?: number;
  average_age?: number;
}

interface GeographicStatistics {
  total_provinces?: number;
  total_regions?: number;
  total_municipalities?: number;
  total_wards?: number;
  wards_in_good_standing?: number;
  is_in_good_standing?: boolean;
  member_count?: number;
}

interface DashboardData {
  level: 'national' | 'province' | 'region' | 'municipality' | 'ward';
  entity: HierarchicalEntity;
  member_statistics: MemberStatistics;
  geographic_statistics: GeographicStatistics;
  timestamp: string;
}

// Level configuration
const LEVEL_CONFIG = {
  national: {
    title: 'National Dashboard',
    icon: Public,
    color: '#1976d2',
    parentLevel: null,
    childLevel: 'province',
    childLabel: 'Provinces'
  },
  province: {
    title: 'Provincial Dashboard',
    icon: AccountBalance,
    color: '#388e3c',
    parentLevel: 'national',
    childLevel: 'region',
    childLabel: 'Regions'
  },
  region: {
    title: 'Regional Dashboard',
    icon: Business,
    color: '#f57c00',
    parentLevel: 'province',
    childLevel: 'municipality',
    childLabel: 'Municipalities'
  },
  municipality: {
    title: 'Municipal Dashboard',
    icon: LocationCity,
    color: '#7b1fa2',
    parentLevel: 'region',
    childLevel: 'ward',
    childLabel: 'Wards'
  },
  ward: {
    title: 'Ward Dashboard',
    icon: LocationOn,
    color: '#d32f2f',
    parentLevel: 'municipality',
    childLevel: 'voting_station',
    childLabel: 'Voting Stations'
  }
};

// Drill-down section component
interface DrillDownSectionProps {
  level: string;
  code?: string;
  childLevel: string;
  childLabel?: string;
}

// interface DrillDownSectionState {
//   displayedCount: number;
//   isLoadingMore: boolean;
// }

const DrillDownSection: React.FC<DrillDownSectionProps> = ({ level, code, childLevel, childLabel }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  // State for progressive loading
  const [displayedCount, setDisplayedCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch child entities based on current level
  const { data: childEntities, isLoading } = useQuery({
    queryKey: ['drill-down', level, code, childLevel],
    queryFn: async () => {
      let url = '';
      switch (level) {
        case 'national':
          url = '/members/provinces';
          break;
        case 'province':
          url = `/members/regions?province=${code}`;
          break;
        case 'region':
          url = `/members/municipalities?region=${code}`;
          break;
        case 'municipality':
          url = `/members/wards?municipality=${code}`;
          break;
        case 'ward':
          url = `/members/stats/voting-districts?ward=${code}`;
          break;
        default:
          return [];
      }

      try {
        const result = await apiGet<any>(url);

        devLog('🔍 DrillDownSection - API Response:', {
          level,
          url,
          resultType: typeof result,
          resultKeys: result ? Object.keys(result) : [],
          hasData: !!result?.data,
          isArray: Array.isArray(result),
          isDataArray: Array.isArray(result?.data),
          dataLength: Array.isArray(result?.data) ? result.data.length : 'N/A'
        });

        // Handle different response formats
        if (level === 'ward' && result?.data) {
          // Voting districts endpoint: apiGet extracts to { data: [...] }
          devLog('✅ Ward level - Mapping voting districts:', result.data.length, 'items');
          return result.data.map((vd: any) => ({
            code: vd.voting_district_code,
            name: vd.voting_district_name || `Voting District ${vd.voting_district_number || ''}`,
            member_count: vd.member_count || 0,
            id: vd.voting_district_code
          }));
        }

        // Other endpoints return arrays directly
        devLog('📋 Non-ward level - Returning result directly');
        return result || [];
      } catch (error) {
        console.error('❌ Failed to fetch child entities:', error);
        return [];
      }
    },
    enabled: !!level && !!childLevel,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getChildIcon = (childLevel: string) => {
    switch (childLevel) {
      case 'province': return Public;
      case 'region': return AccountBalance;
      case 'municipality': return Business;
      case 'ward': return LocationCity;
      case 'voting_station': return HowToVote;
      default: return LocationOn;
    }
  };

  const getChildColor = (index: number) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.error.main,
    ];
    return colors[index % colors.length];
  };

  const handleChildClick = (childCode: string) => {
    devLog('🖱️ Child clicked:', { childLevel, childCode, level });

    // For ward level, we're showing voting districts, so navigate to members list
    if (level === 'ward' || childLevel === 'voting_station') {
      // Navigate to members list filtered by voting district
      devLog('🗳️ Navigating to members list with voting_district_code:', childCode);
      navigate(`/admin/members?voting_district_code=${childCode}`);
    } else {
      // For other levels, continue hierarchical navigation
      devLog('📊 Navigating to hierarchical dashboard:', childLevel, childCode);
      navigate(`/admin/dashboard/hierarchical/${childLevel}/${childCode}`);
    }
  };

  // Reset displayed count when data changes
  useEffect(() => {
    setDisplayedCount(12);
  }, [childEntities]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);

    // Simulate loading delay for better UX and prevent rapid clicking
    setTimeout(() => {
      const newCount = Math.min(displayedCount + 12, childEntities?.length || 0);
      setDisplayedCount(newCount);
      setIsLoadingMore(false);

      // Scroll to the newly loaded items for better UX
      setTimeout(() => {
        const newItems = document.querySelectorAll('[data-ward-index]');
        if (newItems.length > displayedCount - 12) {
          const firstNewItem = newItems[displayedCount - 12];
          firstNewItem?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }, 100);
    }, 300);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const ChildIcon = getChildIcon(childLevel);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <ChildIcon color="primary" />
            {childLabel} Overview
          </Typography>
          <Chip
            label={`${childEntities?.length || 0} ${childLabel?.toLowerCase()}`}
            color="primary"
            variant="outlined"
          />
        </Box>

        {childEntities && childEntities.length > 0 ? (
          <Grid container spacing={2}>
            {childEntities.slice(0, displayedCount).map((entity: any, index: number) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={`${entity.code || entity.id}-${index}`} data-ward-index={index}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4],
                      borderColor: theme.palette.primary.main,
                    }
                  }}
                >
                  <CardActionArea onClick={() => handleChildClick(entity.code || entity.id)}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar
                          sx={{
                            bgcolor: getChildColor(index),
                            width: 40,
                            height: 40
                          }}
                        >
                          <ChildIcon />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="bold" noWrap>
                            {childLevel === 'ward' ? `Ward ${index + 1}` : entity.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {entity.code}
                          </Typography>
                        </Box>
                        <ArrowForward fontSize="small" color="primary" />
                      </Box>

                      {entity.member_count !== undefined && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Groups fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {entity.member_count.toLocaleString()} members
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box textAlign="center" py={4}>
            <ChildIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No {childLabel?.toLowerCase()} found
            </Typography>
          </Box>
        )}

        {childEntities && childEntities.length > displayedCount && (
          <Box mt={3} textAlign="center">
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              startIcon={isLoadingMore ? <CircularProgress size={16} /> : null}
              sx={{ minWidth: 200 }}
            >
              {isLoadingMore
                ? 'Loading...'
                : `More ${childLabel} (${Math.min(12, childEntities.length - displayedCount)} more)`
              }
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              Showing {displayedCount} of {childEntities.length} {childLabel?.toLowerCase()}
            </Typography>
          </Box>
        )}

        {childEntities && childEntities.length > 0 && displayedCount >= childEntities.length && childEntities.length > 12 && (
          <Box mt={3} textAlign="center">
            <Typography variant="body2" color="text.secondary" sx={{
              p: 2,
              bgcolor: 'success.light',
              color: 'success.contrastText',
              borderRadius: 1,
              display: 'inline-block'
            }}>
              ✓ All {childEntities.length} {childLabel?.toLowerCase()} loaded
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const HierarchicalDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { level, code } = useParams<{ level: string; code?: string }>();
  const [viewMode, setViewMode] = useState<'overview' | 'drill-down'>('overview');

  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();

  // Get municipality context for municipality admin restrictions
  const municipalityContext = useMunicipalityContext();

  // Fetch dashboard data - Always call useQuery, but control with enabled
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['hierarchical-dashboard', level, code],
    queryFn: () => {
      if (!level) {
        return Promise.reject(new Error('Level is required'));
      }
      return apiGet<DashboardData>(`/members/dashboard/stats/${level}${code ? `/${code}` : ''}`);
    },
    enabled: !!level && (level === 'national' || (!!code && code !== 'undefined')),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Auto-redirect to appropriate level when no level is provided
  useEffect(() => {
    if (!level) {
      // Redirect based on user's admin level
      if (municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedMunicipality) {
        navigate(`/admin/dashboard/hierarchical/municipality/${municipalityContext.assignedMunicipality.code}`, { replace: true });
      } else if (provinceContext.shouldRestrictToProvince && provinceContext.assignedProvince) {
        navigate(`/admin/dashboard/hierarchical/province/${provinceContext.assignedProvince.code}`, { replace: true });
      } else if (provinceContext.isNationalAdmin) {
        navigate('/admin/dashboard/hierarchical/national', { replace: true });
      } else {
        // Default to national for other cases
        navigate('/admin/dashboard/hierarchical/national', { replace: true });
      }
    }
  }, [level, provinceContext, municipalityContext, navigate]);

  // Auto-redirect provincial admins to their province dashboard
  useEffect(() => {
    if (provinceContext.shouldRestrictToProvince &&
        provinceContext.assignedProvince &&
        (level === 'national' || (level === 'province' && code !== provinceContext.assignedProvince.code))) {
      navigate(`/admin/dashboard/hierarchical/province/${provinceContext.assignedProvince.code}`, { replace: true });
    }
  }, [provinceContext, level, code, navigate]);

  // Auto-redirect municipality admins to their municipality dashboard
  useEffect(() => {
    if (municipalityContext.shouldRestrictToMunicipality &&
        municipalityContext.assignedMunicipality &&
        (level === 'national' || level === 'province' || level === 'district' ||
         (level === 'municipality' && code !== municipalityContext.assignedMunicipality.code))) {
      navigate(`/admin/dashboard/hierarchical/municipality/${municipalityContext.assignedMunicipality.code}`, { replace: true });
    }
  }, [municipalityContext, level, code, navigate]);

  // Show loading state while redirecting
  if (!level) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Validate level parameter
  const currentLevel = level as keyof typeof LEVEL_CONFIG;
  const levelConfig = LEVEL_CONFIG[currentLevel];

  if (!levelConfig) {
    return (
      <Container>
        <Alert severity="error">
          Invalid dashboard level: {level}. Valid levels are: national, province, region, municipality, ward
        </Alert>
      </Container>
    );
  }

  // Validate province access for provincial admins
  if (provinceContext.shouldRestrictToProvince && level === 'province' && code) {
    if (!provinceContext.canAccessProvince(code)) {
      return (
        <Container>
          <Alert severity="error">
            Access denied: You can only view data for {provinceContext.assignedProvince?.name} province.
          </Alert>
        </Container>
      );
    }
  }

  // Validate municipality access for municipality admins
  if (municipalityContext.shouldRestrictToMunicipality && level === 'municipality' && code) {
    if (!municipalityContext.canAccessMunicipality(code)) {
      return (
        <Container>
          <Alert severity="error">
            Access denied: You can only view data for {municipalityContext.assignedMunicipality?.name} municipality.
          </Alert>
        </Container>
      );
    }
  }

  // Block municipality admins from accessing higher levels
  if (municipalityContext.shouldRestrictToMunicipality &&
      (level === 'national' || level === 'province' || level === 'district')) {
    return (
      <Container>
        <Alert severity="error">
          Access denied: Municipality admins can only view municipality-level data and below.
        </Alert>
      </Container>
    );
  }

  // Generate breadcrumbs based on current level and entity
  const generateBreadcrumbs = () => {
    const breadcrumbs = [
      {
        label: 'National',
        href: '/admin/dashboard/hierarchical/national',
        icon: <Public fontSize="small" />
      }
    ];

    // Only generate additional breadcrumbs if data is loaded
    if (dashboardData && dashboardData.entity && dashboardData.level !== 'national') {
      const entity = dashboardData.entity;

      // Add province breadcrumb if available
      if (entity.province_name && entity.province_code) {
        breadcrumbs.push({
          label: entity.province_name,
          href: `/admin/dashboard/hierarchical/province/${entity.province_code}`,
          icon: <AccountBalance fontSize="small" />
        });
      }

      // Add region breadcrumb if available
      if (entity.region_name && entity.region_code) {
        breadcrumbs.push({
          label: entity.region_name,
          href: `/admin/dashboard/hierarchical/region/${entity.region_code}`,
          icon: <Business fontSize="small" />
        });
      }

      // Add municipality breadcrumb if available and not current level
      if (entity.municipality_name && entity.municipality_code && dashboardData.level !== 'municipality') {
        breadcrumbs.push({
          label: entity.municipality_name,
          href: `/admin/dashboard/hierarchical/municipality/${entity.municipality_code}`,
          icon: <LocationCity fontSize="small" />
        });
      }

      // Add current entity if it's a ward or municipality
      if (dashboardData.level === 'ward' || dashboardData.level === 'municipality') {
        breadcrumbs.push({
          label: entity.name || `${levelConfig.title}`,
          href: location.pathname,
          icon: <LocationOn fontSize="small" />
        });
      }
    }

    return breadcrumbs;
  };

  // Generate stats cards based on level
  const generateStatsCards = () => {
    if (!dashboardData || !dashboardData.member_statistics || !dashboardData.geographic_statistics) {
      return [
        {
          title: 'Loading...',
          value: '---',
          icon: People,
          color: 'primary'
        }
      ];
    }

    const { member_statistics: memberStats, geographic_statistics: geoStats } = dashboardData;
    const cards = [];

    // Member statistics cards - Shows ACTIVE members only (excludes expired/inactive)
    cards.push({
      title: 'Active Members',
      value: memberStats.total_members?.toLocaleString() || '0',
      icon: People,
      color: 'primary',
      trend: {
        value: 5.2,
        isPositive: true
      },
      subtitle: `${memberStats.expired_members || 0} expired members excluded`
    });

    cards.push({
      title: 'Registered Voters',
      value: memberStats.registered_voters?.toLocaleString() || '0',
      icon: HowToVote,
      color: 'success',
      trend: {
        value: 2.1,
        isPositive: true
      },
      subtitle: memberStats.total_members && memberStats.registered_voters
        ? `${Math.round((memberStats.registered_voters / memberStats.total_members) * 100)}% registration rate`
        : 'Registration data unavailable'
    });

    // Geographic statistics cards based on level
    if (geoStats.total_provinces) {
      cards.push({
        title: 'Provinces',
        value: geoStats.total_provinces.toString(),
        icon: AccountBalance,
        color: 'info',
        subtitle: 'Administrative provinces'
      });
    }

    if (geoStats.total_regions) {
      cards.push({
        title: 'Regions',
        value: geoStats.total_regions.toString(),
        icon: Business,
        color: 'warning',
        subtitle: 'Regional districts'
      });
    }

    if (geoStats.total_municipalities) {
      cards.push({
        title: 'Municipalities',
        value: geoStats.total_municipalities.toString(),
        icon: LocationCity,
        color: 'secondary',
        subtitle: 'Municipal areas'
      });
    }

    if (geoStats.total_wards) {
      cards.push({
        title: 'Wards',
        value: geoStats.total_wards.toString(),
        icon: LocationOn,
        color: 'error',
        subtitle: geoStats.wards_in_good_standing
          ? `${geoStats.wards_in_good_standing} in good standing`
          : 'Electoral wards'
      });
    }

    return cards;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">
          Failed to load dashboard data. Please try again later.
        </Alert>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container>
        <Alert severity="warning">
          No dashboard data available for {levelConfig.title.toLowerCase()}.
        </Alert>
      </Container>
    );
  }

  const breadcrumbs = dashboardData ? generateBreadcrumbs() : [
    {
      label: 'National',
      href: '/admin/dashboard/hierarchical/national',
      icon: <Public fontSize="small" />
    }
  ];
  const statsCards = generateStatsCards();
  const LevelIcon = levelConfig.icon;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title={levelConfig.title}
        subtitle={dashboardData && dashboardData.entity && dashboardData.entity.name
          ? `${dashboardData.entity.name} - Comprehensive membership and organizational overview`
          : `Loading ${levelConfig.title.toLowerCase()}...`
        }
        gradient={true}
        breadcrumbs={breadcrumbs.map(b => ({ label: b.label }))}
        badge={{
          label: dashboardData && dashboardData.level ? dashboardData.level.toUpperCase() : currentLevel.toUpperCase(),
          color: 'primary',
        }}
        actions={
          <Box display="flex" gap={2}>
            <ButtonGroup variant="outlined" size="small">
              <Button
                variant={viewMode === 'overview' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('overview')}
              >
                Overview
              </Button>
              <Button
                variant={viewMode === 'drill-down' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('drill-down')}
              >
                Drill Down
              </Button>
            </ButtonGroup>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Province Context Banner for Provincial Admins */}
        <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

        {/* Breadcrumb Navigation */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            {breadcrumbs.map((crumb, index) => (
              <Link
                key={`${crumb.href}-${index}`}
                href={crumb.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(crumb.href);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  textDecoration: 'none',
                  color: index === breadcrumbs.length - 1 ? 'text.primary' : 'primary.main',
                  fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                  '&:hover': {
                    textDecoration: index === breadcrumbs.length - 1 ? 'none' : 'underline'
                  }
                }}
              >
                {crumb.icon}
                {crumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        </Paper>

        {/* Entity Header */}
        <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${levelConfig.color}15, ${levelConfig.color}05)` }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: levelConfig.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LevelIcon fontSize="large" />
              </Box>
              <Box flex={1}>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  {dashboardData && dashboardData.entity ? dashboardData.entity.name : 'Loading...'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {levelConfig.title} • Code: {dashboardData && dashboardData.entity ? dashboardData.entity.code : '---'}
                </Typography>
                <Chip
                  label={dashboardData && dashboardData.timestamp
                    ? `Last Updated: ${new Date(dashboardData.timestamp).toLocaleString()}`
                    : 'Loading...'
                  }
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statsCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={`stat-${stat.title}-${index}`}>
              <StatsCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color as any}
                trend={(stat as any).trend}
                subtitle={(stat as any).subtitle}
                onClick={() => {
                  // Navigate to detailed view based on stat type
                  if (stat.title.includes('Members')) {
                    navigate(`/admin/members?${currentLevel}=${code || 'ZA'}`);
                  }
                }}
              />
            </Grid>
          ))}
        </Grid>

        {/* Drill-down section */}
        {viewMode === 'drill-down' && levelConfig.childLevel && (
          <DrillDownSection
            level={level!}
            code={code}
            childLevel={levelConfig.childLevel}
            childLabel={levelConfig.childLabel}
          />
        )}
      </Container>
    </Box>
  );
};

export default HierarchicalDashboard;
