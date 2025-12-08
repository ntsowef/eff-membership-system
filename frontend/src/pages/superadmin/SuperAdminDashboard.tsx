import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  CloudUpload,
  Storage,
  Memory,
  Speed,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import StatsCard from '../../components/ui/StatsCard';
import SystemHealthCard from '../../components/superadmin/SystemHealthCard';
import { SuperAdminAPI } from '../../lib/superAdminApi';

const SuperAdminDashboard: React.FC = () => {
  const theme = useTheme();

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['superAdminDashboard'],
    queryFn: () => SuperAdminAPI.getDashboardData(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const data = dashboardData?.data || {};
  const systemHealth = data.system_health || {};
  const userStats = data.user_statistics || {};
  const queueStats = data.queue_statistics || {};
  const storageStats = data.storage_statistics || {};

  // Calculate total queue jobs
  const totalQueueJobs = (queueStats.uploads?.total || 0) + (queueStats.renewals?.total || 0);
  const activeQueueJobs = (queueStats.uploads?.active || 0) + (queueStats.renewals?.active || 0);

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total Users',
      value: userStats.total_users?.toLocaleString() || '0',
      subtitle: `${userStats.active_users || 0} active`,
      icon: People,
      color: 'primary' as const,
    },
    {
      title: 'Queue Jobs',
      value: totalQueueJobs.toLocaleString(),
      subtitle: `${activeQueueJobs} processing`,
      icon: CloudUpload,
      color: 'info' as const,
    },
    {
      title: 'Total Uploads',
      value: queueStats.total_completed?.toLocaleString() || '0',
      subtitle: `${queueStats.total_active || 0} active`,
      icon: CloudUpload,
      color: 'success' as const,
    },
    {
      title: 'System Health',
      value: systemHealth.status === 'healthy' ? '100%' : systemHealth.status === 'degraded' ? '75%' : '50%',
      subtitle: systemHealth.status || 'Unknown',
      icon: systemHealth.status === 'healthy' ? CheckCircle : Warning,
      color: systemHealth.status === 'healthy' ? 'success' as const : 'warning' as const,
    },
  ];

  if (isLoading) {
    return (
      <Box>
        <PageHeader
          title="Super Admin Dashboard"
          subtitle="System-wide monitoring and management"
          gradient
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <PageHeader
          title="Super Admin Dashboard"
          subtitle="System-wide monitoring and management"
          gradient
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load dashboard data. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="System-wide monitoring and management"
        gradient
        badge={{
          label: 'Super Admin',
          color: 'error',
        }}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatsCard
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* System Health Cards */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          mb: 3,
          color: theme.palette.text.primary,
        }}
      >
        System Health
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <SystemHealthCard
            title="Database"
            status={systemHealth.components?.find((c: any) => c.name === 'database')?.status || 'unknown'}
            message={`Response time: ${systemHealth.components?.find((c: any) => c.name === 'database')?.response_time || 0}ms`}
            details={[
              { label: 'Connections', value: systemHealth.metrics?.database?.connections || 0 },
              { label: 'Max Connections', value: systemHealth.metrics?.database?.max_connections || 0 },
              { label: 'Uptime', value: `${Math.floor((systemHealth.metrics?.database?.uptime || 0) / 3600)}h` },
            ]}
            lastChecked={systemHealth.timestamp}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <SystemHealthCard
            title="Redis"
            status={systemHealth.components?.find((c: any) => c.name === 'cache')?.status || 'unknown'}
            message={`Response time: ${systemHealth.components?.find((c: any) => c.name === 'cache')?.response_time || 0}ms`}
            details={[
              { label: 'Connected', value: systemHealth.metrics?.cache?.connected ? 'Yes' : 'No' },
              { label: 'Memory Usage', value: `${systemHealth.metrics?.cache?.memory_usage || 0} MB` },
              { label: 'Keys Count', value: systemHealth.metrics?.cache?.keys_count || 0 },
            ]}
            lastChecked={systemHealth.timestamp}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <SystemHealthCard
            title="File System"
            status={systemHealth.components?.find((c: any) => c.name === 'filesystem')?.status || 'unknown'}
            message={storageStats.diskSpace?.hasSpace ? 'Sufficient space available' : 'Low disk space'}
            details={[
              { label: 'Total Space', value: `${storageStats.diskSpace?.totalGB || 0} GB` },
              { label: 'Free Space', value: `${storageStats.diskSpace?.freeGB || 0} GB` },
              { label: 'Used Space', value: `${((storageStats.diskSpace?.totalGB || 0) - (storageStats.diskSpace?.freeGB || 0)).toFixed(2)} GB` },
            ]}
            lastChecked={systemHealth.timestamp}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default SuperAdminDashboard;

