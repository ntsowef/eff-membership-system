import React from 'react';
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
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface MembershipStatusData {
  active_members: number;
  expiring_within_30_days: any[];
  expiring_within_7_days: any[];
  recently_expired: any[];
  inactive_members: any[];
  renewal_statistics: {
    renewals_last_30_days: number;
    average_membership_duration: number;
    renewal_rate: string;
  };
}

interface MembershipStatusOverviewProps {
  onViewDetails?: (status: string) => void;
  onSendNotifications?: (type: string) => void;
}

const MembershipStatusOverview: React.FC<MembershipStatusOverviewProps> = ({
  onViewDetails,
  onSendNotifications
}) => {
  // Fetch membership status data
  const { data: statusData, isLoading, error, refetch } = useQuery({
    queryKey: ['membership-status-overview'],
    queryFn: async () => {
      const response = await api.get('/statistics/membership-status-overview');
      console.log('Membership Status API Response:', response.data);

      if (response.data && response.data.data && response.data.data.membership_status) {
        return response.data.data.membership_status as MembershipStatusData;
      }

      throw new (Error as any)('Invalid membership status data structure');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Membership Status Overview
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }>
          Failed to load membership status data
        </Alert>
      </Box>
    );
  }

  if (!statusData) {
    return null;
  }

  const getUrgencyColor = (count: number, threshold: number) => {
    if (count >= threshold) return 'error';
    if (count >= threshold * 0.5) return 'warning';
    return 'success';
  };

  const getProgressValue = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule color="primary" />
          Membership Status Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={() => refetch()} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Status Cards */}
      <Grid container spacing={3}>
        {/* Expiring Within 7 Days - Urgent */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            border: statusData.expiring_within_7_days.length > 50 ? '2px solid #f44336' : '1px solid #e0e0e0',
            backgroundColor: statusData.expiring_within_7_days.length > 50 ? '#ffebee' : 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    {statusData.expiring_within_7_days.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expiring Within 7 Days
                  </Typography>
                </Box>
                <Error color="error" />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={getProgressValue(statusData.expiring_within_7_days.length, 100)}
                color={getUrgencyColor(statusData.expiring_within_7_days.length, 50)}
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
                    onClick={() => onViewDetails?.('expiring_7')}
                  >
                    View
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Expiring Within 30 Days */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {statusData.expiring_within_30_days.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expiring Within 30 Days
                  </Typography>
                </Box>
                <Warning color="warning" />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={getProgressValue(statusData.expiring_within_30_days.length, 500)}
                color={getUrgencyColor(statusData.expiring_within_30_days.length, 300)}
                sx={{ mb: 1 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip 
                  label="RENEWAL NEEDED" 
                  color="warning" 
                  size="small" 
                  variant="outlined"
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Send Renewal Reminders">
                    <IconButton 
                      size="small" 
                      onClick={() => onSendNotifications?.('30_day_reminder')}
                    >
                      <Notifications fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button 
                    size="small" 
                    onClick={() => onViewDetails?.('expiring_30')}
                  >
                    View
                  </Button>
                </Box>
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
                    {statusData.recently_expired.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recently Expired
                  </Typography>
                </Box>
                <Error color="error" />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={getProgressValue(statusData.recently_expired.length, 200)}
                color="error"
                sx={{ mb: 1 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip 
                  label="GRACE PERIOD" 
                  color="error" 
                  size="small" 
                  variant="outlined"
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Send Grace Period Notices">
                    <IconButton 
                      size="small" 
                      onClick={() => onSendNotifications?.('7_day_grace')}
                    >
                      <Send fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button 
                    size="small" 
                    onClick={() => onViewDetails?.('expired')}
                  >
                    View
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Inactive Members */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" color="text.secondary" fontWeight="bold">
                    {statusData.inactive_members.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inactive Members
                  </Typography>
                </Box>
                <PersonOff color="action" />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={getProgressValue(statusData.inactive_members.length, 300)}
                color="info"
                sx={{ mb: 1 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip 
                  label="90+ DAYS" 
                  color="default" 
                  size="small" 
                  variant="outlined"
                />
                <Button 
                  size="small" 
                  onClick={() => onViewDetails?.('inactive')}
                >
                  View
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Renewal Statistics */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp color="primary" />
            Renewal Statistics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  {statusData.renewal_statistics.renewals_last_30_days}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Renewals Last 30 Days
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {statusData.renewal_statistics.renewal_rate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Renewal Rate
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">
                  {statusData.renewal_statistics.average_membership_duration}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Duration (Days)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MembershipStatusOverview;
