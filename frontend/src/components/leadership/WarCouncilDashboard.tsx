import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Paper,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Dashboard,
  Person,
  PersonAdd,
  TrendingUp,
  Warning,
  CheckCircle,
  AccountTree,
  LocationOn,
  Schedule
} from '@mui/icons-material';
import { LeadershipAPI } from '../../services/leadershipApi';
import type { WarCouncilDashboard as WarCouncilDashboardData } from '../../services/leadershipApi';
import { useUI, useAuth } from '../../store';
import { WarCouncilPermissions } from '../../utils/warCouncilPermissions';
import WarCouncilStructure from './WarCouncilStructure';

interface WarCouncilDashboardProps {
  onNavigateToStructure?: () => void;
}

const WarCouncilDashboard: React.FC<WarCouncilDashboardProps> = ({
  onNavigateToStructure
}) => {
  const [dashboard, setDashboard] = useState<WarCouncilDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullStructure, setShowFullStructure] = useState(false);
  const { addNotification } = useUI();
  const { user } = useAuth();

  // Check permissions
  const canViewDashboard = WarCouncilPermissions.canViewWarCouncilDashboard(user);
  const canManageAppointments = WarCouncilPermissions.canManageWarCouncilAppointments(user);
  const uiConfig = WarCouncilPermissions.getUIConfig(user);

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await LeadershipAPI.getWarCouncilDashboard();
      setDashboard(data);
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: `Failed to load War Council Dashboard: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRefresh = () => {
    loadDashboard();
  };

  const handleViewFullStructure = () => {
    if (onNavigateToStructure) {
      onNavigateToStructure();
    } else {
      setShowFullStructure(true);
    }
  };

  if (showFullStructure) {
    return (
      <Box>
        <Button
          onClick={() => setShowFullStructure(false)}
          sx={{ mb: 2 }}
        >
          ← Back to Dashboard
        </Button>
        <WarCouncilStructure onAppointmentComplete={loadDashboard} />
      </Box>
    );
  }

  // Permission check
  if (!canViewDashboard.hasAccess) {
    return (
      <Alert severity="error">
        Access Denied: {WarCouncilPermissions.getPermissionErrorMessage(canViewDashboard)}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Alert severity="error">
        Failed to load War Council Dashboard. Please try again.
      </Alert>
    );
  }

  const { statistics, recent_appointments, vacant_positions } = dashboard;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Dashboard color="primary" sx={{ mr: 1 }} />
          <Typography variant="h4">
            War Council Dashboard
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AccountTree />}
            onClick={handleViewFullStructure}
          >
            View Full Structure
          </Button>
        </Box>
      </Box>

      {/* Statistics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Positions
                  </Typography>
                  <Typography variant="h4">
                    {statistics.total_positions}
                  </Typography>
                </Box>
                <Person color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Filled Positions
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {statistics.filled_positions}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Vacant Positions
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {statistics.vacant_positions}
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Fill Rate
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {statistics.fill_rate_percentage}%
                  </Typography>
                </Box>
                <TrendingUp color="primary" sx={{ fontSize: 40 }} />
              </Box>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={statistics.fill_rate_percentage}
                  color={statistics.fill_rate_percentage >= 80 ? 'success' : statistics.fill_rate_percentage >= 50 ? 'warning' : 'error'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Core vs CCT Breakdown */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Core Executive Positions
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Filled: {statistics.core_positions_filled} / {statistics.core_positions_total}
                </Typography>
                <Chip
                  label={`${Math.round((statistics.core_positions_filled / statistics.core_positions_total) * 100)}%`}
                  color={statistics.core_positions_filled === statistics.core_positions_total ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={(statistics.core_positions_filled / statistics.core_positions_total) * 100}
                color={statistics.core_positions_filled === statistics.core_positions_total ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CCT Deployees (Provincial)
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Filled: {statistics.cct_deployees_filled} / {statistics.cct_deployees_total}
                </Typography>
                <Chip
                  label={`${Math.round((statistics.cct_deployees_filled / statistics.cct_deployees_total) * 100)}%`}
                  color={statistics.cct_deployees_filled === statistics.cct_deployees_total ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={(statistics.cct_deployees_filled / statistics.cct_deployees_total) * 100}
                color={statistics.cct_deployees_filled === statistics.cct_deployees_total ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Appointments and Vacant Positions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Appointments
              </Typography>
              {recent_appointments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No recent appointments
                </Typography>
              ) : (
                <List>
                  {recent_appointments.map((appointment, index) => (
                    <React.Fragment key={appointment.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar>
                            <Person />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={appointment.member_name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {appointment.position_name}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                <Chip
                                  label={appointment.appointment_type}
                                  size="small"
                                  variant="outlined"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  <Schedule sx={{ fontSize: 12, mr: 0.5 }} />
                                  {new Date(appointment.start_date).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recent_appointments.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Vacant Positions
                </Typography>
                {vacant_positions.length > 0 && (
                  <Chip
                    label={`${vacant_positions.length} vacant`}
                    color="warning"
                    size="small"
                  />
                )}
              </Box>
              
              {vacant_positions.length === 0 ? (
                <Alert severity="success">
                  All War Council positions are filled!
                </Alert>
              ) : (
                <List>
                  {vacant_positions.slice(0, 5).map((position, index) => (
                    <React.Fragment key={position.position_id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.light' }}>
                            <PersonAdd />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={position.position_name}
                          secondary={
                            <Box>
                              {position.province_specific && position.province_name && (
                                <Chip
                                  label={position.province_name}
                                  size="small"
                                  variant="outlined"
                                  icon={<LocationOn />}
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(vacant_positions.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {vacant_positions.length > 5 && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            ... and {vacant_positions.length - 5} more vacant positions
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WarCouncilDashboard;
