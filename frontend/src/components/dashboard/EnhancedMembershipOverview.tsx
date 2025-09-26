import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import {
  Warning,
  Error,
  Schedule,
  PersonOff,
  TrendingUp,
  Refresh,
  Notifications,
  Send,
  Visibility,
  Assessment
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { membershipExpirationApi } from '../../services/membershipExpirationApi';
import { useMembershipExpirationStore } from '../../store/membershipExpirationStore';
import { PRIORITY_COLORS, CATEGORY_COLORS } from '../../types/membershipExpiration';

interface EnhancedMembershipOverviewProps {
  onViewDetails?: (type: 'expiring-soon' | 'expired', filter?: string) => void;
  onSendNotifications?: (type: '30_day_reminder' | '7_day_urgent' | 'expired_today') => void;
}

const EnhancedMembershipOverview: React.FC<EnhancedMembershipOverviewProps> = ({
  onViewDetails,
  onSendNotifications
}) => {
  const {
    enhancedOverview,
    setEnhancedOverview,
    setOverviewLoading,
    setOverviewError
  } = useMembershipExpirationStore();

  // Fetch enhanced overview data using React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['enhanced-membership-overview'],
    queryFn: membershipExpirationApi.getEnhancedOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  // Update store state when query state changes
  useEffect(() => {
    setOverviewLoading(isLoading);

    if (error) {
      setOverviewError(error.message || 'Failed to fetch overview data');
    } else {
      setOverviewError(null);
    }

    // Set data when available
    if (data) {
      setEnhancedOverview(data.enhanced_overview);
    }
  }, [data, isLoading, error, setEnhancedOverview, setOverviewLoading, setOverviewError]);

  const handleRefresh = () => {
    refetch();
  };

  const getUrgencyColor = (count: number, threshold: number): 'error' | 'warning' | 'info' => {
    if (count >= threshold * 2) return 'error';
    if (count >= threshold) return 'warning';
    return 'info';
  };

  const getProgressValue = (count: number, max: number): number => {
    return Math.min((count / max) * 100, 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading membership overview...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !enhancedOverview) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Retry
              </Button>
            }
          >
            {error?.message || 'Failed to load membership overview data'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Enhanced Membership Status Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time data from optimized database views
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View Analytics">
              <IconButton onClick={() => onViewDetails?.('expiring-soon')}>
                <Assessment />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Key Metrics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Urgent Renewals */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              border: enhancedOverview.urgent_renewals > 50 ? '2px solid #f44336' : '1px solid #e0e0e0',
              backgroundColor: enhancedOverview.urgent_renewals > 50 ? '#ffebee' : 'white'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" color="error.main" fontWeight="bold">
                      {enhancedOverview.urgent_renewals}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Urgent Renewals
                    </Typography>
                  </Box>
                  <Error color="error" />
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={getProgressValue(enhancedOverview.urgent_renewals, 100)}
                  color={getUrgencyColor(enhancedOverview.urgent_renewals, 50)}
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label="URGENT" 
                    color="error" 
                    size="small" 
                    variant="filled"
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Send Urgent Notifications">
                      <IconButton 
                        size="small" 
                        onClick={() => onSendNotifications?.('7_day_urgent')}
                      >
                        <Send fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button 
                      size="small" 
                      onClick={() => onViewDetails?.('expiring-soon', 'Urgent (1 Week)')}
                    >
                      View
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Expiring Soon */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      {enhancedOverview.total_expiring_soon}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Expiring Soon (30 Days)
                    </Typography>
                  </Box>
                  <Warning color="warning" />
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={getProgressValue(enhancedOverview.total_expiring_soon, 1000)}
                  color="warning"
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label="EXPIRING" 
                    color="warning" 
                    size="small" 
                    variant="filled"
                  />
                  <Button 
                    size="small" 
                    onClick={() => onViewDetails?.('expiring-soon')}
                  >
                    View All
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recently Expired */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" color="error.main" fontWeight="bold">
                      {enhancedOverview.recently_expired}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recently Expired
                    </Typography>
                  </Box>
                  <PersonOff color="error" />
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={getProgressValue(enhancedOverview.recently_expired, 2000)}
                  color="error"
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label="EXPIRED" 
                    color="error" 
                    size="small" 
                    variant="outlined"
                  />
                  <Button 
                    size="small" 
                    onClick={() => onViewDetails?.('expired', 'Recently Expired')}
                  >
                    View
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Expired */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      {enhancedOverview.total_expired}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Expired
                    </Typography>
                  </Box>
                  <Schedule color="disabled" />
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={getProgressValue(enhancedOverview.total_expired, 5000)}
                  color="inherit"
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label="ALL EXPIRED" 
                    color="default" 
                    size="small" 
                    variant="outlined"
                  />
                  <Button 
                    size="small" 
                    onClick={() => onViewDetails?.('expired')}
                  >
                    View All
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Summary Statistics */}
        <Grid container spacing={3}>
          {/* Priority Breakdown */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Expiring Soon by Priority
            </Typography>
            <Stack spacing={2}>
              {enhancedOverview.expiring_soon_summary.map((item) => (
                <Box key={item.renewal_priority} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={item.renewal_priority}
                      color={PRIORITY_COLORS[item.renewal_priority as keyof typeof PRIORITY_COLORS] as any}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {item.count}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>

          {/* Category Breakdown */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Expired by Category
            </Typography>
            <Stack spacing={2}>
              {enhancedOverview.expired_summary.map((item) => (
                <Box key={item.expiry_category} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={item.expiry_category}
                      color={CATEGORY_COLORS[item.expiry_category as keyof typeof CATEGORY_COLORS] as any}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {item.count}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EnhancedMembershipOverview;
