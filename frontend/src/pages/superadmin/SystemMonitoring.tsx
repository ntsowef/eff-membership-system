import React, { useState } from 'react';
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Storage,
  Memory,
  Speed,
  CloudQueue,
  PlayArrow,
  Pause,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import SystemHealthCard from '../../components/superadmin/SystemHealthCard';
import { SuperAdminAPI } from '../../lib/superAdminApi';
import { useNotification } from '../../hooks/useNotification';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const SystemMonitoring: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [tabValue, setTabValue] = useState(0);

  // Fetch Redis metrics
  const { data: redisData, isLoading: redisLoading, refetch: refetchRedis } = useQuery({
    queryKey: ['redisMetrics'],
    queryFn: () => SuperAdminAPI.getRedisMetrics(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch database connection stats
  const { data: dbData, isLoading: dbLoading, refetch: refetchDb } = useQuery({
    queryKey: ['databaseConnections'],
    queryFn: () => SuperAdminAPI.getDatabaseConnectionStats(),
    refetchInterval: 10000,
  });

  // Fetch queue system stats
  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['queueSystemStats'],
    queryFn: () => SuperAdminAPI.getQueueSystemStats(),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time monitoring
  });

  const redisMetrics = redisData?.data || {};
  const dbStats = dbData?.data || {};
  const queueStats = queueData?.data || {};

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    refetchRedis();
    refetchDb();
    refetchQueue();
  };

  // Pause/Resume queue mutations
  const pauseQueueMutation = useMutation({
    mutationFn: (queueType: 'upload' | 'renewal') => SuperAdminAPI.pauseQueue(queueType),
    onSuccess: (_, queueType) => {
      showSuccess(`${queueType === 'upload' ? 'Upload' : 'Renewal'} queue paused`);
      queryClient.invalidateQueries({ queryKey: ['queueSystemStats'] });
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Failed to pause queue');
    },
  });

  const resumeQueueMutation = useMutation({
    mutationFn: (queueType: 'upload' | 'renewal') => SuperAdminAPI.resumeQueue(queueType),
    onSuccess: (_, queueType) => {
      showSuccess(`${queueType === 'upload' ? 'Upload' : 'Renewal'} queue resumed`);
      queryClient.invalidateQueries({ queryKey: ['queueSystemStats'] });
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Failed to resume queue');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return theme.palette.success.main;
      case 'idle': return theme.palette.info.main;
      case 'paused': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getJobStateChip = (state: string) => {
    switch (state) {
      case 'completed':
        return <Chip size="small" icon={<CheckCircle />} label="Completed" color="success" />;
      case 'failed':
        return <Chip size="small" icon={<ErrorIcon />} label="Failed" color="error" />;
      case 'active':
        return <Chip size="small" icon={<PlayArrow />} label="Active" color="primary" />;
      case 'waiting':
        return <Chip size="small" icon={<HourglassEmpty />} label="Waiting" color="default" />;
      case 'delayed':
        return <Chip size="small" icon={<Schedule />} label="Delayed" color="warning" />;
      default:
        return <Chip size="small" label={state} />;
    }
  };

  return (
    <Box>
      <PageHeader
        title="System Monitoring"
        subtitle="Real-time system performance and health metrics"
        gradient
        actions={[
          <ActionButton
            key="refresh"
            icon={Speed}
            onClick={handleRefresh}
            variant="outlined"
          >
            Refresh
          </ActionButton>,
        ]}
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9375rem',
              borderRadius: '8px 8px 0 0',
              minHeight: 48,
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main,
            },
          }}
        >
          <Tab icon={<Storage />} iconPosition="start" label="Database" />
          <Tab icon={<Memory />} iconPosition="start" label="Redis" />
          <Tab icon={<CloudQueue />} iconPosition="start" label="Queue System" />
        </Tabs>
      </Box>

      {/* Database Tab */}
      <TabPanel value={tabValue} index={0}>
        {dbLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SystemHealthCard
                title="Connection Pool"
                status={dbStats.status || 'unknown'}
                message={dbStats.message}
                details={[
                  { label: 'Total Connections', value: dbStats.total_connections || 0 },
                  { label: 'Active Connections', value: dbStats.active_connections || 0 },
                  { label: 'Idle Connections', value: dbStats.idle_connections || 0 },
                  { label: 'Waiting Connections', value: dbStats.waiting_connections || 0 },
                ]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Connection Details
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Pool Size
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {dbStats.pool_size || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Max Connections
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {dbStats.max_connections || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Utilization
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                        {dbStats.utilization || '0%'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Redis Tab */}
      <TabPanel value={tabValue} index={1}>
        {redisLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <SystemHealthCard
                title="Redis Server"
                status={redisMetrics.status || 'unknown'}
                message={redisMetrics.message}
                details={[
                  { label: 'Connected Clients', value: redisMetrics.connected_clients || 0 },
                  { label: 'Used Memory', value: redisMetrics.used_memory_human || 'N/A' },
                  { label: 'Total Keys', value: redisMetrics.total_keys || 0 },
                  { label: 'Uptime', value: redisMetrics.uptime_in_days ? `${redisMetrics.uptime_in_days} days` : 'N/A' },
                ]}
              />
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Queue System Tab */}
      <TabPanel value={tabValue} index={2}>
        {queueLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Queue Health Overview */}
            <Grid item xs={12}>
              <SystemHealthCard
                title="Queue System Health"
                status={queueStats.health?.status || 'unknown'}
                message={queueStats.health?.message}
                details={[
                  { label: 'Total Waiting', value: queueStats.summary?.totalWaiting || 0 },
                  { label: 'Total Active', value: queueStats.summary?.totalActive || 0 },
                  { label: 'Total Completed', value: queueStats.summary?.totalCompleted || 0 },
                  { label: 'Total Failed', value: queueStats.summary?.totalFailed || 0 },
                ]}
              />
            </Grid>

            {/* Processing Rate Card */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: '16px', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUp color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Processing Rate
                    </Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                    {queueStats.summary?.processingRate?.lastHour || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    jobs completed in the last hour
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Upload Queue Card */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: '16px', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {queueStats.queues?.upload?.name || 'Upload Queue'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size="small"
                        label={queueStats.queues?.upload?.status || 'unknown'}
                        sx={{
                          bgcolor: alpha(getStatusColor(queueStats.queues?.upload?.status || ''), 0.1),
                          color: getStatusColor(queueStats.queues?.upload?.status || ''),
                          fontWeight: 600,
                        }}
                      />
                      {queueStats.queues?.upload?.isPaused ? (
                        <Tooltip title="Resume Queue">
                          <IconButton
                            size="small"
                            onClick={() => resumeQueueMutation.mutate('upload')}
                            disabled={resumeQueueMutation.isPending}
                          >
                            <PlayArrow fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Pause Queue">
                          <IconButton
                            size="small"
                            onClick={() => pauseQueueMutation.mutate('upload')}
                            disabled={pauseQueueMutation.isPending}
                          >
                            <Pause fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Waiting</Typography>
                      <Typography variant="h6">{queueStats.queues?.upload?.stats?.waiting || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Active</Typography>
                      <Typography variant="h6" color="primary">{queueStats.queues?.upload?.stats?.active || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Completed</Typography>
                      <Typography variant="h6" color="success.main">{queueStats.queues?.upload?.stats?.completed || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Failed</Typography>
                      <Typography variant="h6" color="error.main">{queueStats.queues?.upload?.stats?.failed || 0}</Typography>
                    </Grid>
                  </Grid>
                  {queueStats.queues?.upload?.stats?.active > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress variant="indeterminate" />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Renewal Queue Card */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: '16px', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {queueStats.queues?.renewal?.name || 'Renewal Queue'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size="small"
                        label={queueStats.queues?.renewal?.status || 'unknown'}
                        sx={{
                          bgcolor: alpha(getStatusColor(queueStats.queues?.renewal?.status || ''), 0.1),
                          color: getStatusColor(queueStats.queues?.renewal?.status || ''),
                          fontWeight: 600,
                        }}
                      />
                      {queueStats.queues?.renewal?.isPaused ? (
                        <Tooltip title="Resume Queue">
                          <IconButton
                            size="small"
                            onClick={() => resumeQueueMutation.mutate('renewal')}
                            disabled={resumeQueueMutation.isPending}
                          >
                            <PlayArrow fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Pause Queue">
                          <IconButton
                            size="small"
                            onClick={() => pauseQueueMutation.mutate('renewal')}
                            disabled={pauseQueueMutation.isPending}
                          >
                            <Pause fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Waiting</Typography>
                      <Typography variant="h6">{queueStats.queues?.renewal?.stats?.waiting || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Active</Typography>
                      <Typography variant="h6" color="primary">{queueStats.queues?.renewal?.stats?.active || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Completed</Typography>
                      <Typography variant="h6" color="success.main">{queueStats.queues?.renewal?.stats?.completed || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Failed</Typography>
                      <Typography variant="h6" color="error.main">{queueStats.queues?.renewal?.stats?.failed || 0}</Typography>
                    </Grid>
                  </Grid>
                  {queueStats.queues?.renewal?.stats?.active > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress variant="indeterminate" />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Upload Jobs Table */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Recent Upload Jobs
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Progress</TableCell>
                          <TableCell>Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(queueStats.queues?.upload?.recentJobs || []).slice(0, 5).map((job: any) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {job.id?.toString().slice(0, 8)}...
                              </Typography>
                            </TableCell>
                            <TableCell>{getJobStateChip(job.state)}</TableCell>
                            <TableCell>
                              {job.state === 'active' ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={job.progress || 0}
                                    sx={{ width: 60 }}
                                  />
                                  <Typography variant="caption">{job.progress || 0}%</Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  {job.state === 'completed' ? '100%' : '-'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {job.finishedAt
                                  ? new Date(job.finishedAt).toLocaleTimeString()
                                  : job.createdAt
                                    ? new Date(job.createdAt).toLocaleTimeString()
                                    : '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!queueStats.queues?.upload?.recentJobs || queueStats.queues?.upload?.recentJobs.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No recent jobs
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Renewal Jobs Table */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Recent Renewal Jobs
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Progress</TableCell>
                          <TableCell>Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(queueStats.queues?.renewal?.recentJobs || []).slice(0, 5).map((job: any) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {job.id?.toString().slice(0, 8)}...
                              </Typography>
                            </TableCell>
                            <TableCell>{getJobStateChip(job.state)}</TableCell>
                            <TableCell>
                              {job.state === 'active' ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={job.progress || 0}
                                    sx={{ width: 60 }}
                                  />
                                  <Typography variant="caption">{job.progress || 0}%</Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  {job.state === 'completed' ? '100%' : '-'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {job.finishedAt
                                  ? new Date(job.finishedAt).toLocaleTimeString()
                                  : job.createdAt
                                    ? new Date(job.createdAt).toLocaleTimeString()
                                    : '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!queueStats.queues?.renewal?.recentJobs || queueStats.queues?.renewal?.recentJobs.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No recent jobs
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Failed Jobs Alert */}
            {(queueStats.summary?.totalFailed || 0) > 0 && (
              <Grid item xs={12}>
                <Alert
                  severity="warning"
                  action={
                    <ActionButton
                      icon={Refresh}
                      onClick={() => refetchQueue()}
                      size="small"
                    >
                      Refresh
                    </ActionButton>
                  }
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {queueStats.summary?.totalFailed} failed job(s) detected
                  </Typography>
                  <Typography variant="body2">
                    Check the Queue Management page to view details and retry failed jobs.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </TabPanel>
    </Box>
  );
};

export default SystemMonitoring;

