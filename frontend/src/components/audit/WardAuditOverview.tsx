import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Assessment,
  Refresh
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import { useSecureApi } from '../../hooks/useSecureApi';
import { useWardMembershipAuditStore } from '../../store/wardMembershipAuditStore';
import { WARD_STANDING_COLORS } from '../../types/wardMembershipAudit';

interface WardAuditOverviewProps {
  onViewWardDetails: (standing: string) => void;
  onViewMunicipalityDetails: (performance: string) => void;
  onShowMessage: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const WardAuditOverview: React.FC<WardAuditOverviewProps> = ({
  onViewWardDetails,
  onViewMunicipalityDetails,
  onShowMessage
}) => {
  const {
    auditOverview,
    setAuditOverview,
    setOverviewLoading,
    setOverviewError,
    overviewLoading,
    overviewError
  } = useWardMembershipAuditStore();

  useProvinceContext();
  const municipalityContext = useMunicipalityContext();
  const { secureGet, getProvinceFilter } = useSecureApi();

  // Fetch audit overview data with province and municipality filtering
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ward-audit-overview', getProvinceFilter(), municipalityContext.getMunicipalityFilter()],
    queryFn: async () => {
      let params = getProvinceFilter() ? { province_code: getProvinceFilter() } : {};

      // Apply municipality filtering for municipality admin
      params = applyMunicipalityFilter(params, municipalityContext);

      return secureGet('/audit/ward-membership/overview', params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  // Update store when data changes
  useEffect(() => {
    setOverviewLoading(isLoading);
    
    if (error) {
      setOverviewError(error.message || 'Failed to fetch audit overview');
    } else {
      setOverviewError(null);
    }

    if (data) {
      setAuditOverview(data.audit_overview);
    }
  }, [data, isLoading, error, setAuditOverview, setOverviewLoading, setOverviewError]);

  const handleRefresh = async () => {
    try {
      await refetch();
      onShowMessage('Audit data refreshed successfully', 'success');
    } catch (error) {
      onShowMessage('Failed to refresh audit data', 'error');
    }
  };

  if (overviewLoading && !auditOverview) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (overviewError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {overviewError}
        <Button onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!auditOverview) {
    return (
      <Alert severity="info">
        No audit data available. Please refresh to load data.
      </Alert>
    );
  }

  const getStandingIcon = (standing: string) => {
    switch (standing) {
      case 'Good Standing':
        return <CheckCircle color="success" />;
      case 'Acceptable Standing':
        return <Warning color="warning" />;
      case 'Needs Improvement':
        return <TrendingDown color="error" />;
      default:
        return <Assessment />;
    }
  };

  // Helper function to get performance icon (currently unused but kept for future use)
  // const getPerformanceIcon = (performance: string) => {
  //   return performance === 'Performing Municipality'
  //     ? <TrendingUp color="success" />
  //     : <TrendingDown color="error" />;
  // };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Refresh Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Ward Membership Audit Overview
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Refresh Data
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Ward Statistics Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Wards
              </Typography>
              <Typography variant="h3" color="primary">
                {(auditOverview.total_wards || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all municipalities
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Compliance
              </Typography>
              <Typography variant="h3" color="primary">
                {auditOverview.overall_compliance_percentage?.toFixed(1) || '0.0'}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={auditOverview.overall_compliance_percentage || 0}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
                color={(auditOverview.overall_compliance_percentage || 0) >= 70 ? 'success' : 'error'}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Wards in Good/Acceptable Standing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Active Members
              </Typography>
              <Typography variant="h3" color="primary">
                {(auditOverview.total_active_members || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg: {auditOverview.avg_active_per_ward?.toFixed(1) || '0.0'} per ward
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Municipality Performance
              </Typography>
              <Typography variant="h3" color="primary">
                {auditOverview.municipal_compliance_percentage?.toFixed(1) || '0.0'}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average compliance across municipalities
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Ward Standing Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ward Standing Distribution
              </Typography>
              <List>
                {auditOverview.standing_distribution.map((item) => (
                  <ListItem
                    key={item.standing_level}
                    button
                    onClick={() => onViewWardDetails(item.ward_standing)}
                    sx={{ borderRadius: 1, mb: 1 }}
                  >
                    <ListItemIcon>
                      {getStandingIcon(item.ward_standing)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">
                            {item.ward_standing}
                          </Typography>
                          <Chip
                            label={`${item.ward_count} (${item.percentage?.toFixed(1) || '0.0'}%)`}
                            color={WARD_STANDING_COLORS[item.ward_standing] as any}
                            size="small"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Municipality Performance Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Municipality Performance Summary
              </Typography>
              <List>
                <ListItem
                  button
                  onClick={() => onViewMunicipalityDetails('Performing Municipality')}
                  sx={{ borderRadius: 1, mb: 1 }}
                >
                  <ListItemIcon>
                    <TrendingUp color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">
                          Performing Municipalities
                        </Typography>
                        <Chip
                          label={auditOverview.performing_municipalities}
                          color="success"
                          size="small"
                        />
                      </Box>
                    }
                  />
                </ListItem>
                <ListItem
                  button
                  onClick={() => onViewMunicipalityDetails('Underperforming Municipality')}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon>
                    <TrendingDown color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">
                          Underperforming Municipalities
                        </Typography>
                        <Chip
                          label={auditOverview.underperforming_municipalities}
                          color="error"
                          size="small"
                        />
                      </Box>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performing Municipalities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Municipalities
              </Typography>
              <List>
                {auditOverview.top_performing_municipalities.slice(0, 5).map((municipality, index) => (
                  <ListItem key={municipality.municipality_name} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Chip
                        label={index + 1}
                        color="success"
                        size="small"
                        sx={{ minWidth: 32 }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={municipality.municipality_name}
                      secondary={`${municipality.compliance_percentage?.toFixed(1) || '0.0'}% compliance • ${municipality.total_active_members.toLocaleString()} members`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Municipalities Needing Attention */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Municipalities Needing Attention
              </Typography>
              <List>
                {auditOverview.municipalities_needing_attention.slice(0, 5).map((municipality) => (
                  <ListItem key={municipality.municipality_name} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Warning color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={municipality.municipality_name}
                      secondary={`${municipality.compliance_percentage?.toFixed(1) || '0.0'}% compliance • ${municipality.wards_needed_compliance} wards needed`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WardAuditOverview;
