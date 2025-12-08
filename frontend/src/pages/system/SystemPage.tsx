import React, { useState, Fragment } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,

  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  Settings,
  Security,
  Storage,
  People,
  Backup,
  Monitor,
  CloudSync,
  MoreVert,
  Edit,
  Delete,
  Refresh,
  CheckCircle,
  Warning,
  Error,
  Info,
  Computer,
  Speed,
  NetworkCheck,
  Api,
  Shield,
  Key,
  Lock,
  Visibility,
  Save,
  RestartAlt,
  Download
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '../../services/api';
import MaintenanceModeControl from '../../components/admin/MaintenanceModeControl';
import MaintenanceIndicator from '../../components/common/MaintenanceIndicator';
import { useNotification } from '../../hooks/useNotification';

// Interfaces
interface SystemInfo {
  version: string;
  environment: string;
  uptime: string;
  lastRestart: string;
  status: 'healthy' | 'warning' | 'error';
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeUsers: number;
  totalRequests: number;
  errorRate: number;
  responseTime: number;
}

interface SystemSetting {
  id: string;
  category: string;
  name: string;
  description: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number' | 'select';
  options?: string[];
  sensitive?: boolean;
}

interface SystemLog {
  id: string;
  source?: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  category: string;
  message: string;
  details?: string;
}

const SystemPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logDetailsDialogOpen, setLogDetailsDialogOpen] = useState(false);
  const [logDetailData, setLogDetailData] = useState<any>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [settingValue, setSettingValue] = useState<string | boolean | number>('');
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();

  // Fetch system overview with real data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['system-overview'],
    queryFn: async () => {
      const response = await systemApi.getSystemOverview();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch system settings from API
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await systemApi.getSettings();
      return response.data;
    },
  });

  // Fetch system logs from API
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['system-logs'],
    queryFn: async () => {
      const response = await systemApi.getSystemLogs();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch backup statistics
  const { data: backupStats, isLoading: backupStatsLoading, refetch: refetchBackupStats } = useQuery({
    queryKey: ['backup-stats'],
    queryFn: async () => {
      const response = await systemApi.getBackupStats();
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch backup list
  const { data: backupsData, isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const response = await systemApi.getBackups();
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: () => systemApi.createBackup(),
    onSuccess: () => {
      showSuccess('Backup created successfully');
      refetchBackupStats();
      refetchBackups();
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to create backup');
    }
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: (backupId: number) => systemApi.deleteBackup(backupId),
    onSuccess: () => {
      showSuccess('Backup deleted successfully');
      refetchBackupStats();
      refetchBackups();
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to delete backup');
    }
  });

  // Handle backup creation
  const handleCreateBackup = () => {
    if (window.confirm('Are you sure you want to create a database backup? This may take a few minutes.')) {
      createBackupMutation.mutate();
    }
  };

  // Handle backup download
  const handleDownloadBackup = (backupId: number) => {
    const downloadUrl = systemApi.downloadBackup(backupId);
    window.open(downloadUrl, '_blank');
  };

  // Handle backup deletion
  const handleDeleteBackup = (backupId: number) => {
    if (window.confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      deleteBackupMutation.mutate(backupId);
    }
  };

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      return await systemApi.updateSetting(key, value);
    },
    onSuccess: () => {
      showSuccess('Setting updated successfully');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setSettingsDialogOpen(false);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to update setting');
    },
  });

  // Extract real data from API response
  const systemInfo: SystemInfo = {
    version: overviewData?.system_info?.version || '2.1.0',
    environment: overviewData?.system_info?.environment || 'Production',
    uptime: overviewData?.system_info?.uptime || 'Loading...',
    lastRestart: overviewData?.system_info?.last_restart || new Date().toISOString(),
    status: overviewData?.system_info?.status || 'healthy'
  };

  const systemMetrics: SystemMetrics = {
    cpu: overviewData?.system_metrics?.cpu || 0,
    memory: overviewData?.system_metrics?.memory || 0,
    disk: overviewData?.system_metrics?.disk || 0,
    network: overviewData?.system_metrics?.network || 0,
    activeUsers: overviewData?.system_metrics?.active_users || 0,
    totalRequests: overviewData?.system_metrics?.total_requests || 0,
    errorRate: overviewData?.system_metrics?.error_rate || 0,
    responseTime: overviewData?.system_metrics?.response_time || 0
  };

  // Map database settings to UI format
  const systemSettings: SystemSetting[] = settingsData?.settings?.map((setting: any) => {
    // Map setting_key to UI-friendly format
    const categoryMap: Record<string, string> = {
      'membership_fee': 'General',
      'membership_duration': 'General',
      'renewal_reminder_days': 'Notifications',
      'system_email': 'Notifications',
      'enable_sms_notifications': 'Notifications',
      'analytics_cache_duration': 'General',
    };

    const nameMap: Record<string, string> = {
      'membership_fee': 'Membership Fee (ZAR)',
      'membership_duration': 'Membership Duration (months)',
      'renewal_reminder_days': 'Renewal Reminder Days',
      'system_email': 'System Email',
      'enable_sms_notifications': 'SMS Notifications',
      'analytics_cache_duration': 'Analytics Cache Duration (seconds)',
    };

    // Map backend types to frontend types
    let frontendType: 'string' | 'boolean' | 'number' | 'select' = 'string';
    if (setting.setting_type === 'boolean') {
      frontendType = 'boolean';
    } else if (setting.setting_type === 'integer' || setting.setting_type === 'float') {
      frontendType = 'number';
    } else if (setting.setting_type === 'string') {
      frontendType = 'string';
    }

    return {
      id: setting.setting_key,
      category: categoryMap[setting.setting_key] || 'General',
      name: nameMap[setting.setting_key] || setting.setting_key,
      description: setting.description || '',
      value: setting.value,
      type: frontendType,
    };
  }) || [];

  // Map real logs from API
  const systemLogs: SystemLog[] = (logsData?.logs || []).map((log: any) => ({
    id: String(log.id),
    source: log.source,
    timestamp: log.timestamp,
    level: log.level,
    category: log.category,
    message: log.message,
    details: typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, log: SystemLog) => {
    setAnchorEl(event.currentTarget);
    setSelectedLog(log);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = async () => {
    if (!selectedLog) return;

    try {
      const response = await systemApi.getLogDetail(selectedLog.source || 'audit', selectedLog.id);
      setLogDetailData(response.data);
      setLogDetailsDialogOpen(true);
      handleMenuClose();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to fetch log details');
    }
  };

  const handleExportLogs = () => {
    try {
      const exportUrl = systemApi.exportLogsCSV();
      window.open(exportUrl, '_blank');
      showSuccess('Logs export started. Download will begin shortly.');
      handleMenuClose();
    } catch (error: any) {
      showError('Failed to export logs');
    }
  };

  const handleSettingEdit = (setting: SystemSetting) => {
    setSelectedSetting(setting);
    setSettingValue(setting.value);
    setSettingsDialogOpen(true);
  };

  const handleSettingSave = () => {
    if (selectedSetting) {
      updateSettingMutation.mutate({
        key: selectedSetting.id,
        value: settingValue
      });
      setSelectedSetting(null);
      setSettingValue('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <Info />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      case 'debug': return <span>🐛</span>;
      default: return <Info />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings color="primary" />
            System Administration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor system health, manage settings, and view system logs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<RestartAlt />}
            color="warning"
            onClick={() => console.log('System restart')}
          >
            Restart System
          </Button>
        </Box>
      </Box>

      {/* System Status Overview */}
      {overviewLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, mb: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Computer />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color="primary.main">
                        {systemInfo.version}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        System Version
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircle />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color="success.main">
                        {systemInfo.uptime}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        System Uptime
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <People />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color="info.main">
                        {systemMetrics.activeUsers.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Sessions
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: getStatusColor(systemInfo.status) === 'success' ? 'success.main' : 'warning.main' }}>
                      {systemInfo.status === 'healthy' ? <CheckCircle /> : <Warning />}
                    </Avatar>
                    <Box>
                      <Chip
                        label={systemInfo.status.toUpperCase()}
                        color={getStatusColor(systemInfo.status) as any}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        System Status
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Database Statistics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <People />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color="secondary.main">
                        {overviewData?.database_stats?.total_members?.toLocaleString() || '0'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Members
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircle />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color="success.main">
                        {overviewData?.database_stats?.active_members?.toLocaleString() || '0'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Members
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <People />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color="info.main">
                        {overviewData?.database_stats?.new_members_30d?.toLocaleString() || '0'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        New Members (30d)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <Security />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color="warning.main">
                        {overviewData?.database_stats?.total_users?.toLocaleString() || '0'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        System Users
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* System Metrics */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Monitor />
            System Performance Metrics
          </Typography>
          {overviewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">CPU Usage</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {systemMetrics.cpu > 0 ? `${systemMetrics.cpu}%` : 'N/A'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant={systemMetrics.cpu > 0 ? 'determinate' : 'indeterminate'}
                      value={systemMetrics.cpu}
                      color={systemMetrics.cpu > 80 ? 'error' : systemMetrics.cpu > 60 ? 'warning' : 'primary'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Memory Usage</Typography>
                      <Typography variant="body2" fontWeight="bold">{systemMetrics.memory}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={systemMetrics.memory}
                      color={systemMetrics.memory > 80 ? 'error' : systemMetrics.memory > 60 ? 'warning' : 'primary'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Disk Usage</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {systemMetrics.disk > 0 ? `${systemMetrics.disk}%` : 'N/A'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant={systemMetrics.disk > 0 ? 'determinate' : 'indeterminate'}
                      value={systemMetrics.disk}
                      color={systemMetrics.disk > 80 ? 'error' : systemMetrics.disk > 60 ? 'warning' : 'primary'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Cache Hit Rate</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {overviewData?.cache_stats?.hit_rate?.toFixed(1) || '0'}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={overviewData?.cache_stats?.hit_rate || 0}
                      color="info"
                    />
                  </Box>
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main">
                      {systemMetrics.totalRequests.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Requests (24h)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {systemMetrics.errorRate.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Error Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {overviewData?.database_stats?.active_sessions?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Sessions
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {systemInfo.environment}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Environment
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<Settings />} label="Settings" />
          <Tab icon={<Security />} label="Security" />
          <Tab icon={<Storage />} label="Logs" />
          <Tab icon={<Backup />} label="Backup" />
          <Tab icon={<Api />} label="API" />
          <Tab icon={<Monitor />} label="Maintenance" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings />
              System Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure system-wide settings and preferences
            </Typography>

            {/* Loading State */}
            {settingsLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <LinearProgress sx={{ width: '100%' }} />
              </Box>
            )}

            {/* No Settings Message */}
            {!settingsLoading && systemSettings.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No system settings found. Please check database configuration.
                </Typography>
              </Box>
            )}

            {/* Settings by Category */}
            {!settingsLoading && systemSettings.length > 0 && ['General', 'Security', 'Notifications', 'Backup'].map((category) => {
              const categorySettings = systemSettings.filter(setting => setting.category === category);

              // Only show category if it has settings
              if (categorySettings.length === 0) return null;

              return (
                <Box key={category} sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom color="primary.main">
                    {category}
                  </Typography>
                  <List>
                    {categorySettings.map((setting) => (
                      <Fragment key={setting.id}>
                        <ListItem>
                          <ListItemText
                            primary={setting.name}
                            secondary={setting.description}
                          />
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {setting.type === 'boolean' ? (
                                <Switch
                                  checked={setting.value as boolean}
                                  onChange={(e) => {
                                    updateSettingMutation.mutate({
                                      key: setting.id,
                                      value: e.target.checked
                                    });
                                  }}
                                  disabled={updateSettingMutation.isPending}
                                />
                              ) : (
                                <Chip
                                  label={setting.value.toString()}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              <IconButton
                                size="small"
                                onClick={() => handleSettingEdit(setting)}
                              >
                                <Edit />
                              </IconButton>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />
                      </Fragment>
                    ))}
                  </List>
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security />
              Security Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage security settings, access controls, and authentication
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Shield />
                      Authentication
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><Key /></ListItemIcon>
                        <ListItemText
                          primary="Two-Factor Authentication"
                          secondary="Require 2FA for all users"
                        />
                        <ListItemSecondaryAction>
                          <Switch checked={true} />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Lock /></ListItemIcon>
                        <ListItemText
                          primary="Password Policy"
                          secondary="Strong password requirements"
                        />
                        <ListItemSecondaryAction>
                          <Chip label="Strong" color="success" size="small" />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Speed /></ListItemIcon>
                        <ListItemText
                          primary="Session Timeout"
                          secondary="60 minutes"
                        />
                        <ListItemSecondaryAction>
                          <IconButton size="small">
                            <Edit />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NetworkCheck />
                      Access Control
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><Api /></ListItemIcon>
                        <ListItemText
                          primary="API Rate Limiting"
                          secondary="1000 requests per hour"
                        />
                        <ListItemSecondaryAction>
                          <Switch checked={true} />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Computer /></ListItemIcon>
                        <ListItemText
                          primary="IP Whitelisting"
                          secondary="Restrict access by IP"
                        />
                        <ListItemSecondaryAction>
                          <Switch checked={false} />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><People /></ListItemIcon>
                        <ListItemText
                          primary="Role-Based Access"
                          secondary="Enforce role permissions"
                        />
                        <ListItemSecondaryAction>
                          <Switch checked={true} />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Storage />
                  System Logs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and monitor system activity logs
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleExportLogs}
                >
                  Export Logs
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['system-logs'] })}
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Loading State */}
            {logsLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Empty State */}
            {!logsLoading && systemLogs.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No system logs found. Logs will appear here as system activities occur.
                </Typography>
              </Box>
            )}

            {/* Logs Table */}
            {!logsLoading && systemLogs.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {systemLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(log.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getLogLevelIcon(log.level)}
                          label={log.level.toUpperCase()}
                          color={getLogLevelColor(log.level) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {log.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, log)}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Log Actions Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleViewDetails}>
                <ListItemIcon>
                  <Visibility fontSize="small" />
                </ListItemIcon>
                <ListItemText>View Details</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleExportLogs}>
                <ListItemIcon>
                  <Download fontSize="small" />
                </ListItemIcon>
                <ListItemText>Export All Logs</ListItemText>
              </MenuItem>
            </Menu>
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Backup />
              Backup Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage system backups and data recovery
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Backup Status
                    </Typography>
                    {backupStatsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        <List>
                          <ListItem>
                            <ListItemText
                              primary="Last Backup"
                              secondary={
                                backupStats?.latestBackup
                                  ? new Date(backupStats.latestBackup.created_at).toLocaleString()
                                  : 'No backups yet'
                              }
                            />
                            <ListItemSecondaryAction>
                              <Chip
                                label={backupStats?.latestBackup?.status || 'N/A'}
                                color={backupStats?.latestBackup?.status === 'success' ? 'success' : 'default'}
                                size="small"
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Backup Size"
                              secondary={backupStats?.latestBackup?.sizeFormatted || 'N/A'}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Total Backups"
                              secondary={`${backupStats?.successfulBackups || 0} successful, ${backupStats?.failedBackups || 0} failed`}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Total Storage Used"
                              secondary={backupStats?.totalSizeFormatted || '0 Bytes'}
                            />
                          </ListItem>
                        </List>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="contained"
                            startIcon={createBackupMutation.isPending ? <CircularProgress size={16} /> : <Backup />}
                            fullWidth
                            onClick={handleCreateBackup}
                            disabled={createBackupMutation.isPending}
                          >
                            {createBackupMutation.isPending ? 'Creating Backup...' : 'Start Backup Now'}
                          </Button>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Backup History
                    </Typography>
                    {backupsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : backupsData?.backups?.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          No backups found. Create your first backup above.
                        </Typography>
                      </Box>
                    ) : (
                      <List>
                        {backupsData?.backups?.slice(0, 10).map((backup: any) => (
                          <ListItem
                            key={backup.backup_id}
                            secondaryAction={
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={backup.status}
                                  color={backup.status === 'success' ? 'success' : 'error'}
                                  size="small"
                                />
                                {backup.status === 'success' && (
                                  <>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDownloadBackup(backup.backup_id)}
                                      title="Download backup"
                                    >
                                      <CloudSync />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteBackup(backup.backup_id)}
                                      title="Delete backup"
                                    >
                                      <Delete />
                                    </IconButton>
                                  </>
                                )}
                              </Box>
                            }
                          >
                            <ListItemText
                              primary={new Date(backup.created_at).toLocaleString()}
                              secondary={`${backup.sizeFormatted} • ${backup.filename}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Api />
              API Management & System Statistics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Monitor API usage and system statistics
            </Typography>

            {overviewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.main">
                          {systemMetrics.totalRequests.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Requests (24h)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {overviewData?.database_stats?.active_sessions?.toLocaleString() || '0'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Sessions
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="error.main">
                          {systemMetrics.errorRate.toFixed(2)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Error Rate
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Database Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="primary.main">
                            {overviewData?.database_stats?.total_members?.toLocaleString() || '0'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Members
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="success.main">
                            {overviewData?.database_stats?.active_members?.toLocaleString() || '0'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Active Members
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="info.main">
                            {overviewData?.database_stats?.new_members_30d?.toLocaleString() || '0'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            New Members (30d)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="warning.main">
                            {overviewData?.database_stats?.total_users?.toLocaleString() || '0'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            System Users
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Cache Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Chip
                            label={overviewData?.cache_stats?.connected ? 'Connected' : 'Disconnected'}
                            color={overviewData?.cache_stats?.connected ? 'success' : 'error'}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Cache Status
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="primary.main">
                            {overviewData?.cache_stats?.hit_rate?.toFixed(1) || '0'}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Hit Rate
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="info.main">
                            {overviewData?.cache_stats?.total_keys?.toLocaleString() || '0'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Keys
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="success.main">
                            {overviewData?.cache_stats?.memory_usage?.toFixed(1) || '0'} MB
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Memory Usage
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Maintenance Tab */}
      {tabValue === 5 && (
        <Box>
          <MaintenanceIndicator showForAdmins={true} />
          <MaintenanceModeControl />
        </Box>
      )}

      {/* Log Details Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => console.log('View log details')}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => console.log('Export log')}>
          <CloudSync sx={{ mr: 1 }} />
          Export Log
        </MenuItem>
        <MenuItem onClick={() => console.log('Delete log')} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete Log
        </MenuItem>
      </Menu>

      {/* Log Details Dialog */}
      <Dialog
        open={logDetailsDialogOpen}
        onClose={() => {
          setLogDetailsDialogOpen(false);
          setLogDetailData(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info />
          Log Details
        </DialogTitle>
        <DialogContent dividers>
          {logDetailData ? (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Log ID
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {logDetailData.id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {logDetailData.source?.toUpperCase()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {new Date(logDetailData.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Level
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={logDetailData.level?.toUpperCase()}
                      color={getLogLevelColor(logDetailData.level) as any}
                      size="small"
                    />
                  </Box>
                </Grid>
                {logDetailData.user_name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      User
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.user_name}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.user_email && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      User Email
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.user_email}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.ip_address && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      IP Address
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.ip_address}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.category && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Category
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.category}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.action && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Action
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.action}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.entity_type && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Entity Type
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.entity_type}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.entity_id && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Entity ID
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.entity_id}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.session_id && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Session ID
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: 'break-all' }}>
                      {logDetailData.session_id}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.message && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Message
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.message}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {logDetailData.description}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.user_agent && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      User Agent
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: 'break-all' }}>
                      {logDetailData.user_agent}
                    </Typography>
                  </Grid>
                )}
                {logDetailData.old_values && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Old Values
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                        {JSON.stringify(logDetailData.old_values, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {logDetailData.new_values && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      New Values
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                        {JSON.stringify(logDetailData.new_values, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {logDetailData.details && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Additional Details
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                        {typeof logDetailData.details === 'object'
                          ? JSON.stringify(logDetailData.details, null, 2)
                          : logDetailData.details}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {logDetailData.metadata && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Metadata
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                        {JSON.stringify(logDetailData.metadata, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLogDetailsDialogOpen(false);
              setLogDetailData(null);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Edit Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Setting: {selectedSetting?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedSetting?.description}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Current Value: <strong>{String(selectedSetting?.value)}</strong>
          </Typography>

          {selectedSetting?.type === 'string' && (
            <TextField
              fullWidth
              label="Value"
              value={settingValue}
              onChange={(e) => setSettingValue(e.target.value)}
              margin="normal"
            />
          )}

          {selectedSetting?.type === 'number' && (
            <TextField
              fullWidth
              label="Value"
              type="number"
              value={settingValue}
              onChange={(e) => setSettingValue(Number(e.target.value))}
              margin="normal"
            />
          )}

          {selectedSetting?.type === 'boolean' && (
            <FormControl fullWidth margin="normal">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Disabled</Typography>
                <Switch
                  checked={settingValue as boolean}
                  onChange={(e) => setSettingValue(e.target.checked)}
                />
                <Typography>Enabled</Typography>
              </Box>
            </FormControl>
          )}

          {selectedSetting?.type === 'select' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Value</InputLabel>
              <Select
                value={settingValue}
                label="Value"
                onChange={(e) => setSettingValue(e.target.value)}
              >
                {selectedSetting.options?.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSettingSave}
            startIcon={<Save />}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemPage;
