import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  useTheme,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterIcon,
  Speed as SpeedIcon,
  BarChart as BarChartIcon,
  List as ListIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import { useSecureApi } from '../../hooks/useSecureApi';
import ProvinceBreakdownCharts from './ProvinceBreakdownCharts';

interface ExpiredMembersData {
  national_summary: {
    total_expired: number;
    total_expiring_soon: number;
    total_expiring_urgent: number;
    total_members: number;
  };
  province_breakdown: Array<{
    province_code: string;
    province_name: string;
    expired_count: number;
    expiring_soon_count: number;
    expiring_urgent_count: number;
    total_members: number;
    expired_percentage: number;
  }>;
  subregional_breakdown?: Array<{
    municipality_code: string;
    municipality_name: string;
    expired_count: number;
    expiring_soon_count: number;
    expiring_urgent_count: number;
    total_members: number;
    expired_percentage: number;
  }>;
  ward_breakdown?: Array<{
    ward_code: string;
    ward_name: string;
    expired_count: number;
    expiring_soon_count: number;
    expiring_urgent_count: number;
    total_members: number;
    expired_percentage: number;
  }>;
  filtered_by_province: boolean;
  province_code: string | null;
}

interface ExpiredMembersSectionProps {
  onViewExpiredMembers?: () => void;
  onFilterByProvince?: (provinceCode: string) => void;
}

const ExpiredMembersSection: React.FC<ExpiredMembersSectionProps> = ({
  onViewExpiredMembers,
  onFilterByProvince
}) => {
  const theme = useTheme();
  const provinceContext = useProvinceContext();
  const municipalityContext = useMunicipalityContext();
  const { secureGet, getProvinceFilter } = useSecureApi();

  // State for chart view mode
  const [viewMode, setViewMode] = useState<'gauge' | 'bar' | 'list'>('gauge');

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

  const { data: expiredDataRaw, isLoading, error } = useQuery<any>({
    queryKey: ['expired-members-stats', provinceFilter, municipalityContext.getMunicipalityFilter()],
    queryFn: () => secureGet('/statistics/expired-members', getFilterParams()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  // Extract data from API response (handles both { data: {...} } and direct {...} structures)
  const expiredData = expiredDataRaw?.data || expiredDataRaw;

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Expired Members Overview
          </Typography>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Loading expired members data...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error || !expiredData || !expiredData.national_summary) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load expired members data. Please try again later.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { national_summary, province_breakdown, filtered_by_province, subregional_breakdown, ward_breakdown } = expiredData;
  const filtered_by_municipality = (expiredData as any).filtered_by_municipality;

  // Calculate percentages with proper numeric conversion
  // Use Number() instead of parseInt() to handle both strings and numbers correctly
  const totalMembers = Number(national_summary.total_members) || 0;
  const totalExpired = Number(national_summary.total_expired) || 0;
  const totalExpiringSoon = Number(national_summary.total_expiring_soon) || 0;
  const totalExpiringUrgent = Number(national_summary.total_expiring_urgent) || 0;

  const expiredPercentage = totalMembers > 0
    ? (totalExpired / totalMembers) * 100
    : 0;

  const expiringSoonPercentage = totalMembers > 0
    ? (totalExpiringSoon / totalMembers) * 100
    : 0;

  const urgentPercentage = totalMembers > 0
    ? (totalExpiringUrgent / totalMembers) * 100
    : 0;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Expired Members Overview
            {filtered_by_municipality && (
              <Chip
                label={`${municipalityContext.assignedMunicipality?.name || 'Municipality'} Only`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {filtered_by_province && !filtered_by_municipality && (
              <Chip
                label={`${provinceContext.assignedProvince?.name || 'Province'} Only`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Typography>
          {onViewExpiredMembers && (
            <Tooltip title="View detailed expired members list">
              <IconButton onClick={onViewExpiredMembers} size="small">
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* National/Provincial Summary */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center" p={2} bgcolor={theme.palette.error.light} borderRadius={1}>
              <Typography variant="h4" color="error.contrastText" fontWeight="bold">
                {totalExpired.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="error.contrastText">
                Expired Members
              </Typography>
              <Typography variant="caption" color="error.contrastText">
                {expiredPercentage.toFixed(1)}% of total
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center" p={2} bgcolor={theme.palette.warning.light} borderRadius={1}>
              <Typography variant="h4" color="warning.contrastText" fontWeight="bold">
                {totalExpiringSoon.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="warning.contrastText">
                Expiring Soon (30 days)
              </Typography>
              <Typography variant="caption" color="warning.contrastText">
                {expiringSoonPercentage.toFixed(1)}% of total
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center" p={2} bgcolor={theme.palette.info.light} borderRadius={1}>
              <Typography variant="h4" color="info.contrastText" fontWeight="bold">
                {totalExpiringUrgent.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="info.contrastText">
                Urgent (7 days)
              </Typography>
              <Typography variant="caption" color="info.contrastText">
                {urgentPercentage.toFixed(1)}% of total
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center" p={2} bgcolor={theme.palette.success.light} borderRadius={1}>
              <Typography variant="h4" color="success.contrastText" fontWeight="bold">
                {(totalMembers - totalExpired - totalExpiringSoon).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="success.contrastText">
                Active Members
              </Typography>
              <Typography variant="caption" color="success.contrastText">
                {((1 - (expiredPercentage + expiringSoonPercentage) / 100) * 100).toFixed(1)}% of total
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Province Breakdown - Only show for national admins */}
        {!filtered_by_province && !filtered_by_municipality && provinceContext.isNationalAdmin && province_breakdown.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon color="primary" />
                Province Breakdown
              </Typography>

              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_event, newMode) => {
                  if (newMode !== null) {
                    setViewMode(newMode);
                  }
                }}
                size="small"
                aria-label="chart view mode"
              >
                <ToggleButton value="gauge" aria-label="gauge charts">
                  <Tooltip title="Gauge Charts View">
                    <SpeedIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="bar" aria-label="bar chart">
                  <Tooltip title="Stacked Bar Chart View">
                    <BarChartIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="list" aria-label="list view">
                  <Tooltip title="List View">
                    <ListIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Chart Views */}
            {(viewMode === 'gauge' || viewMode === 'bar') && (
              <ProvinceBreakdownCharts
                data={province_breakdown}
                viewMode={viewMode}
                onFilterByProvince={onFilterByProvince}
              />
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <>
                <List dense>
                  {province_breakdown
                    .sort((a, b) => {
                      const aTotal = (parseInt(String(a.expired_count), 10) || 0) + (parseInt(String(a.expiring_soon_count), 10) || 0);
                      const bTotal = (parseInt(String(b.expired_count), 10) || 0) + (parseInt(String(b.expiring_soon_count), 10) || 0);
                      return bTotal - aTotal;
                    })
                    .slice(0, 5) // Show top 5 provinces with most expired/expiring members
                    .map((province) => {
                      const totalAtRisk = (parseInt(String(province.expired_count), 10) || 0) + (parseInt(String(province.expiring_soon_count), 10) || 0);
                      const provinceTotalMembers = parseInt(String(province.total_members), 10) || 0;
                      const riskPercentage = provinceTotalMembers > 0
                        ? (totalAtRisk / provinceTotalMembers) * 100
                        : 0;

                      return (
                        <ListItem
                          key={province.province_code}
                          sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <ListItemIcon>
                            {riskPercentage > 15 ? (
                              <ErrorIcon color="error" />
                            ) : riskPercentage > 10 ? (
                              <WarningIcon color="warning" />
                            ) : (
                              <ScheduleIcon color="info" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" component="span">
                                  {province.province_name}
                                </Typography>
                                <span style={{ display: 'flex', gap: '8px' }}>
                                  <Chip
                                    label={`${parseInt(String(province.expired_count), 10) || 0} expired`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={`${parseInt(String(province.expiring_soon_count), 10) || 0} expiring`}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                </span>
                              </span>
                            }
                            secondary={
                              <span>
                                <Typography variant="caption" color="text.secondary" component="span" display="block">
                                  {riskPercentage.toFixed(1)}% at risk • {province.total_members.toLocaleString()} total members
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(riskPercentage, 100)}
                                  color={riskPercentage > 15 ? 'error' : riskPercentage > 10 ? 'warning' : 'info'}
                                  sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                />
                              </span>
                            }
                          />
                          {onFilterByProvince && (
                            <Tooltip title={`Filter by ${province.province_name}`}>
                              <IconButton
                                size="small"
                                onClick={() => onFilterByProvince(province.province_code)}
                              >
                                <FilterIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </ListItem>
                      );
                    })}
                </List>

                {province_breakdown.length > 5 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Showing top 5 provinces by expired/expiring members. {province_breakdown.length - 5} more provinces available.
                  </Typography>
                )}
              </>
            )}
          </>
        )}

        {/* Sub-Regional Breakdown - Only show for province admins */}
        {filtered_by_province && !filtered_by_municipality && subregional_breakdown && subregional_breakdown.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon color="primary" />
                Sub-Regional Breakdown ({provinceContext.assignedProvince?.name})
              </Typography>
            </Box>

            <List dense>
              {subregional_breakdown
                .sort((a, b) => {
                  const aTotal = (parseInt(String(a.expired_count), 10) || 0) + (parseInt(String(a.expiring_soon_count), 10) || 0);
                  const bTotal = (parseInt(String(b.expired_count), 10) || 0) + (parseInt(String(b.expiring_soon_count), 10) || 0);
                  return bTotal - aTotal;
                })
                .slice(0, 10) // Show top 10 sub-regions
                .map((subregion) => {
                  const totalAtRisk = (parseInt(String(subregion.expired_count), 10) || 0) + (parseInt(String(subregion.expiring_soon_count), 10) || 0);
                  const subregionTotalMembers = parseInt(String(subregion.total_members), 10) || 0;
                  const riskPercentage = subregionTotalMembers > 0
                    ? (totalAtRisk / subregionTotalMembers) * 100
                    : 0;

                  return (
                    <ListItem
                      key={subregion.municipality_code}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemIcon>
                        {riskPercentage > 15 ? (
                          <ErrorIcon color="error" />
                        ) : riskPercentage > 10 ? (
                          <WarningIcon color="warning" />
                        ) : (
                          <ScheduleIcon color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" component="span">
                              {subregion.municipality_name}
                            </Typography>
                            <Box display="flex" gap={1}>
                              <Chip
                                label={`${subregion.expired_count} expired`}
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ borderRadius: '50px' }} // Pill shape
                              />
                              <Chip
                                label={`${subregion.expiring_soon_count} expiring`}
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ borderRadius: '50px' }} // Pill shape
                              />
                            </Box>
                          </span>
                        }
                        secondary={
                          <span>
                            <Typography variant="caption" color="text.secondary" component="span" display="block">
                              {riskPercentage.toFixed(1)}% at risk • {subregion.total_members.toLocaleString()} total members
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(riskPercentage, 100)}
                              color={riskPercentage > 15 ? 'error' : riskPercentage > 10 ? 'warning' : 'info'}
                              sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                            />
                          </span>
                        }
                      />
                    </ListItem>
                  );
                })}
            </List>

            {subregional_breakdown.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing top 10 sub-regions by expired/expiring members. {subregional_breakdown.length - 10} more sub-regions available.
              </Typography>
            )}
          </>
        )}

        {/* Ward Breakdown - Only show for municipality admins */}
        {filtered_by_municipality && ward_breakdown && ward_breakdown.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon color="primary" />
                Ward Breakdown ({municipalityContext.assignedMunicipality?.name})
              </Typography>
            </Box>

            <List dense>
              {ward_breakdown
                .sort((a, b) => {
                  const aTotal = (parseInt(String(a.expired_count), 10) || 0) + (parseInt(String(a.expiring_soon_count), 10) || 0);
                  const bTotal = (parseInt(String(b.expired_count), 10) || 0) + (parseInt(String(b.expiring_soon_count), 10) || 0);
                  return bTotal - aTotal;
                })
                .slice(0, 10) // Show top 10 wards
                .map((ward) => {
                  const totalAtRisk = (parseInt(String(ward.expired_count), 10) || 0) + (parseInt(String(ward.expiring_soon_count), 10) || 0);
                  const wardTotalMembers = parseInt(String(ward.total_members), 10) || 0;
                  const riskPercentage = wardTotalMembers > 0
                    ? (totalAtRisk / wardTotalMembers) * 100
                    : 0;

                  return (
                    <ListItem
                      key={ward.ward_code}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemIcon>
                        {riskPercentage > 15 ? (
                          <ErrorIcon color="error" />
                        ) : riskPercentage > 10 ? (
                          <WarningIcon color="warning" />
                        ) : (
                          <ScheduleIcon color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" component="span">
                              {ward.ward_name}
                            </Typography>
                            <Box display="flex" gap={1}>
                              <Chip
                                label={`${ward.expired_count} expired`}
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                              <Chip
                                label={`${ward.expiring_soon_count} expiring`}
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            </Box>
                          </span>
                        }
                        secondary={
                          <span>
                            <Typography variant="caption" color="text.secondary" component="span" display="block">
                              {riskPercentage.toFixed(1)}% at risk • {ward.total_members.toLocaleString()} total members
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(riskPercentage, 100)}
                              color={riskPercentage > 15 ? 'error' : riskPercentage > 10 ? 'warning' : 'info'}
                              sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                            />
                          </span>
                        }
                      />
                    </ListItem>
                  );
                })}
            </List>

            {ward_breakdown.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing top 10 wards by expired/expiring members. {ward_breakdown.length - 10} more wards available.
              </Typography>
            )}
          </>
        )}

        {/* Alert for high expiration rates */}
        {(expiredPercentage + expiringSoonPercentage) > 20 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>High Expiration Alert:</strong> {(expiredPercentage + expiringSoonPercentage).toFixed(1)}% of members 
              are expired or expiring soon. Consider implementing a renewal campaign.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiredMembersSection;
