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
  Avatar
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
  RestartAlt
} from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { apiGet, apiPost, apiPatch } from '../../lib/api';
import MaintenanceModeControl from '../../components/admin/MaintenanceModeControl';
import MaintenanceIndicator from '../../components/common/MaintenanceIndicator';

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
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [settingValue, setSettingValue] = useState<string | boolean | number>('');

  // Mock data - in real implementation, these would come from APIs
  const systemInfo: SystemInfo = {
    version: '2.1.0',
    environment: 'Production',
    uptime: '15 days, 8 hours',
    lastRestart: '2025-08-11T10:30:00Z',
    status: 'healthy'
  };

  const systemMetrics: SystemMetrics = {
    cpu: 45,
    memory: 68,
    disk: 32,
    network: 12,
    activeUsers: 1247,
    totalRequests: 89432,
    errorRate: 0.02,
    responseTime: 145
  };

  const systemSettings: SystemSetting[] = [
    {
      id: 'app_name',
      category: 'General',
      name: 'Application Name',
      description: 'The display name of the application',
      value: 'Membership Management System',
      type: 'string'
    },
    {
      id: 'maintenance_mode',
      category: 'General',
      name: 'Maintenance Mode',
      description: 'Enable maintenance mode to restrict access',
      value: false,
      type: 'boolean'
    },
    {
      id: 'max_upload_size',
      category: 'General',
      name: 'Max Upload Size (MB)',
      description: 'Maximum file upload size in megabytes',
      value: 10,
      type: 'number'
    },
    {
      id: 'session_timeout',
      category: 'Security',
      name: 'Session Timeout (minutes)',
      description: 'User session timeout duration',
      value: 60,
      type: 'number'
    },
    {
      id: 'password_policy',
      category: 'Security',
      name: 'Password Policy',
      description: 'Password complexity requirements',
      value: 'strong',
      type: 'select',
      options: ['weak', 'medium', 'strong', 'very_strong']
    },
    {
      id: 'two_factor_auth',
      category: 'Security',
      name: 'Two-Factor Authentication',
      description: 'Require 2FA for all users',
      value: true,
      type: 'boolean'
    },
    {
      id: 'email_notifications',
      category: 'Notifications',
      name: 'Email Notifications',
      description: 'Enable email notifications',
      value: true,
      type: 'boolean'
    },
    {
      id: 'sms_notifications',
      category: 'Notifications',
      name: 'SMS Notifications',
      description: 'Enable SMS notifications',
      value: false,
      type: 'boolean'
    },
    {
      id: 'backup_frequency',
      category: 'Backup',
      name: 'Backup Frequency',
      description: 'Automated backup frequency',
      value: 'daily',
      type: 'select',
      options: ['hourly', 'daily', 'weekly', 'monthly']
    },
    {
      id: 'backup_retention',
      category: 'Backup',
      name: 'Backup Retention (days)',
      description: 'Number of days to retain backups',
      value: 30,
      type: 'number'
    }
  ];

  const systemLogs: SystemLog[] = [
    {
      id: '1',
      timestamp: '2025-08-26T15:30:00Z',
      level: 'info',
      category: 'Authentication',
      message: 'User login successful',
      details: 'User: admin@example.com, IP: 192.168.1.100'
    },
    {
      id: '2',
      timestamp: '2025-08-26T15:25:00Z',
      level: 'warning',
      category: 'Performance',
      message: 'High memory usage detected',
      details: 'Memory usage: 85%, Threshold: 80%'
    },
    {
      id: '3',
      timestamp: '2025-08-26T15:20:00Z',
      level: 'error',
      category: 'Database',
      message: 'Database connection timeout',
      details: 'Connection pool exhausted, retrying...'
    },
    {
      id: '4',
      timestamp: '2025-08-26T15:15:00Z',
      level: 'info',
      category: 'System',
      message: 'Backup completed successfully',
      details: 'Backup size: 2.3GB, Duration: 45 minutes'
    },
    {
      id: '5',
      timestamp: '2025-08-26T15:10:00Z',
      level: 'debug',
      category: 'API',
      message: 'API rate limit exceeded',
      details: 'Client: 192.168.1.200, Endpoint: /api/v1/members'
    }
  ];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, log: SystemLog) => {
    setAnchorEl(event.currentTarget);
    setSelectedLog(log);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLog(null);
  };

  const handleSettingEdit = (setting: SystemSetting) => {
    setSelectedSetting(setting);
    setSettingValue(setting.value);
    setSettingsDialogOpen(true);
  };

  const handleSettingSave = () => {
    if (selectedSetting) {
      // In real implementation, this would call an API to update the setting
      console.log('Saving setting:', selectedSetting.id, 'Value:', settingValue);
      setSettingsDialogOpen(false);
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
                    Active Users
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

      {/* System Metrics */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Monitor />
            System Performance Metrics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <Typography variant="body2" fontWeight="bold">{systemMetrics.cpu}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
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
                  <Typography variant="body2" fontWeight="bold">{systemMetrics.disk}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemMetrics.disk}
                  color={systemMetrics.disk > 80 ? 'error' : systemMetrics.disk > 60 ? 'warning' : 'primary'}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Network I/O</Typography>
                  <Typography variant="body2" fontWeight="bold">{systemMetrics.network} MB/s</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemMetrics.network}
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
                  Total Requests
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {systemMetrics.errorRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Error Rate
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {systemMetrics.responseTime}ms
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Response Time
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

            {/* Settings by Category */}
            {['General', 'Security', 'Notifications', 'Backup'].map((category) => (
              <Box key={category} sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom color="primary.main">
                  {category}
                </Typography>
                <List>
                  {systemSettings
                    .filter(setting => setting.category === category)
                    .map((setting) => (
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
                                  onChange={() => console.log('Toggle setting:', setting.id)}
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
            ))}
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
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => console.log('Refresh logs')}
              >
                Refresh
              </Button>
            </Box>

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
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Last Backup"
                          secondary="2025-08-26 03:00 AM"
                        />
                        <ListItemSecondaryAction>
                          <Chip label="Success" color="success" size="small" />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Backup Size"
                          secondary="2.3 GB"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Next Scheduled"
                          secondary="2025-08-27 03:00 AM"
                        />
                      </ListItem>
                    </List>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<Backup />}
                        fullWidth
                        onClick={() => console.log('Start backup')}
                      >
                        Start Backup Now
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Backup History
                    </Typography>
                    <List>
                      {[
                        { date: '2025-08-26', size: '2.3 GB', status: 'success' },
                        { date: '2025-08-25', size: '2.2 GB', status: 'success' },
                        { date: '2025-08-24', size: '2.1 GB', status: 'success' },
                        { date: '2025-08-23', size: '2.0 GB', status: 'failed' }
                      ].map((backup, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={backup.date}
                            secondary={backup.size}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={backup.status}
                              color={backup.status === 'success' ? 'success' : 'error'}
                              size="small"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
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
              API Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Monitor API usage, manage keys, and configure endpoints
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main">
                      {systemMetrics.totalRequests.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total API Requests
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {systemMetrics.responseTime}ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Response Time
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {systemMetrics.errorRate}%
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
                API Endpoints Status
              </Typography>
              <List>
                {[
                  { endpoint: '/api/v1/members', status: 'healthy', requests: 45230 },
                  { endpoint: '/api/v1/leadership', status: 'healthy', requests: 12450 },
                  { endpoint: '/api/v1/elections', status: 'healthy', requests: 8920 },
                  { endpoint: '/api/v1/analytics', status: 'warning', requests: 3210 }
                ].map((api, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={api.endpoint}
                      secondary={`${api.requests.toLocaleString()} requests`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={api.status}
                        color={api.status === 'healthy' ? 'success' : 'warning'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
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
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedSetting?.description}
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
