import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Devices as DevicesIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/reduxStore';
import {
  fetchUserStatistics,
  fetchPendingWorkflows,
  fetchMySessions,
  fetchMFAStatus
} from '../../store/userManagementSlice';

const UserManagementDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    userStatistics,
    statisticsLoading,
    statisticsError,
    pendingWorkflows,
    workflowsLoading,
    mySessions,
    sessionsLoading,
    mfaStatus,
    mfaLoading
  } = useAppSelector(state => state.userManagement);

  useEffect(() => {
    dispatch(fetchUserStatistics());
    dispatch(fetchPendingWorkflows());
    dispatch(fetchMySessions());
    dispatch(fetchMFAStatus());
  }, [dispatch]);

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    subtitle?: string;
  }> = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (statisticsError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load dashboard data: {statisticsError}
      </Alert>
    );
  }

  const mfaAdoptionRate = userStatistics 
    ? Math.round((userStatistics.mfa_enabled_users / userStatistics.admin_users) * 100)
    : 0;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        User Management Dashboard
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={userStatistics?.total_users || 0}
            icon={<PeopleIcon fontSize="large" />}
            color="primary"
            subtitle={`${userStatistics?.active_users || 0} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Admin Users"
            value={userStatistics?.admin_users || 0}
            icon={<AdminIcon fontSize="large" />}
            color="secondary"
            subtitle="All admin levels"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="MFA Adoption"
            value={`${mfaAdoptionRate}%`}
            icon={<SecurityIcon fontSize="large" />}
            color={mfaAdoptionRate >= 80 ? 'success' : mfaAdoptionRate >= 50 ? 'warning' : 'error'}
            subtitle={`${userStatistics?.mfa_enabled_users || 0} users`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Sessions"
            value={mySessions.length}
            icon={<DevicesIcon fontSize="large" />}
            color="info"
            subtitle="Your sessions"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Admin Level Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Admin Level Distribution
              </Typography>
              {statisticsLoading ? (
                <LinearProgress />
              ) : (
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Chip label="National" color="error" size="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="National Admins" 
                      secondary={`${userStatistics?.national_admins || 0} users`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Chip label="Province" color="warning" size="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Province Admins" 
                      secondary={`${userStatistics?.province_admins || 0} users`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Chip label="District" color="info" size="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="District Admins" 
                      secondary={`${userStatistics?.district_admins || 0} users`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Chip label="Municipal" color="primary" size="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Municipal Admins"
                      secondary={`${userStatistics?.municipal_admins || 0} users`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Chip label="Ward" color="secondary" size="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Ward Admins" 
                      secondary={`${userStatistics?.ward_admins || 0} users`}
                    />
                  </ListItem>
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Workflows */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Pending Approvals
                </Typography>
                <Chip 
                  label={pendingWorkflows.length} 
                  color={pendingWorkflows.length > 0 ? 'warning' : 'success'}
                  size="small"
                />
              </Box>
              {workflowsLoading ? (
                <LinearProgress />
              ) : pendingWorkflows.length === 0 ? (
                <Box textAlign="center" py={2}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    No pending approvals
                  </Typography>
                </Box>
              ) : (
                <List>
                  {pendingWorkflows.slice(0, 5).map((workflow) => (
                    <ListItem key={workflow.id}>
                      <ListItemIcon>
                        <ScheduleIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${workflow.admin_level} Admin Request`}
                        secondary={`Requested ${new Date(workflow.created_at).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                  {pendingWorkflows.length > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Button variant="text" size="small">
                            View all {pendingWorkflows.length} pending requests
                          </Button>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Security Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Status
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    {mfaStatus?.enabled ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Multi-Factor Authentication"
                    secondary={
                      mfaStatus?.enabled 
                        ? "Enabled and active" 
                        : mfaStatus?.required 
                          ? "Required but not enabled" 
                          : "Optional"
                    }
                  />
                  {!mfaStatus?.enabled && mfaStatus?.required && (
                    <Button variant="outlined" size="small" color="warning">
                      Enable MFA
                    </Button>
                  )}
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <DevicesIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Active Sessions"
                    secondary={`${mySessions.length} active sessions`}
                  />
                  <Button variant="outlined" size="small">
                    Manage
                  </Button>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button variant="contained" fullWidth>
                  Create New Admin
                </Button>
                <Button variant="outlined" fullWidth>
                  View All Users
                </Button>
                <Button variant="outlined" fullWidth>
                  Review Pending Requests
                </Button>
                <Button variant="outlined" fullWidth>
                  System Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserManagementDashboard;
