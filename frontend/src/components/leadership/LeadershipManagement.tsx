// LeadershipManagement Component
// Main dashboard for leadership management functions

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Paper,
  Button,
  Alert,
  CircularProgress,

  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AccountTree,
  People,
  Assignment,
  TrendingUp,
  Add,
  Visibility,
  Analytics,
  PersonAdd,
  HowToVote,
  Dashboard,
  Assessment,
  Person,
  Gavel
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useUI } from '../../store';
import { LeadershipAPI } from '../../services/leadershipApi';
import { apiGet } from '../../lib/api';
import LeadershipAssignment from './LeadershipAssignment';
import LeadershipRoster from './LeadershipRoster';
import WarCouncilDashboard from './WarCouncilDashboard';
import { WarCouncilPermissions } from '../../utils/warCouncilPermissions';
import { useAuth } from '../../store';
import { useProvinceContext, useProvincePageTitle } from '../../hooks/useProvinceContext';
import ProvinceContextBanner from '../common/ProvinceContextBanner';

// =====================================================
// Interfaces
// =====================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface LeadershipStats {
  total_positions: number;
  filled_positions: number;
  vacant_positions: number;
  total_elections: number;
  completed_elections: number;
  upcoming_elections: number;
  recent_appointments: any[];
  positions_by_hierarchy: Array<{
    hierarchy_level: string;
    total_positions: number;
    filled_positions: number;
    vacancy_rate: number;
  }>;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  action: () => void;
}

// =====================================================
// Tab Panel Component
// =====================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`leadership-tabpanel-${index}`}
      aria-labelledby={`leadership-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// =====================================================
// LeadershipManagement Component
// =====================================================

const LeadershipManagement: React.FC = () => {
  // ==================== State ====================
  const [tabValue, setTabValue] = useState(0);
  const { addNotification } = useUI();
  const { user } = useAuth();

  // Get province context for provincial admin restrictions
  useProvinceContext();
  const pageTitle = useProvincePageTitle('Leadership Management');

  // Check War Council permissions
  const warCouncilUIConfig = WarCouncilPermissions.getUIConfig(user as any);

  // ==================== API Queries ====================
  
  // Fetch leadership statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{ analytics: LeadershipStats }>({
    queryKey: ['leadership-stats'],
    queryFn: () => apiGet<{ analytics: LeadershipStats }>('/analytics/leadership'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch organizational structures
  const { data: structuresData, isLoading: structuresLoading } = useQuery({
    queryKey: ['leadership-structures'],
    queryFn: () => LeadershipAPI.getOrganizationalStructures(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch recent appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['recent-appointments'],
    queryFn: () => LeadershipAPI.getCurrentAppointments({}),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const stats: LeadershipStats = statsData?.analytics ?? ({} as LeadershipStats);
  const structures = structuresData || [];
  const recentAppointments = appointmentsData?.appointments || [];

  // ==================== Event Handlers ====================
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAssignmentComplete = () => {
    addNotification({
      type: 'success',
      message: 'Assignment completed successfully!'
    });
    // Refresh data
    // queryClient.invalidateQueries(['leadership-stats']);
    // queryClient.invalidateQueries(['recent-appointments']);
  };

  // ==================== Quick Actions ====================
  
  // Calculate tab indices based on War Council visibility
  const getTabIndex = (tabName: string): number => {
    const baseTabs = ['overview', 'assignment', 'leaders'];
    let index = baseTabs.indexOf(tabName);

    if (index !== -1) return index;

    // For tabs after War Council, adjust index based on visibility
    const warCouncilIndex = warCouncilUIConfig.showWarCouncilTab ? 3 : -1;
    const structureIndex = warCouncilUIConfig.showWarCouncilTab ? 4 : 3;
    const reportsIndex = warCouncilUIConfig.showWarCouncilTab ? 5 : 4;

    switch (tabName) {
      case 'war-council': return warCouncilIndex;
      case 'structure': return structureIndex;
      case 'reports': return reportsIndex;
      default: return 0;
    }
  };

  const quickActions: QuickAction[] = [
    {
      title: 'New Assignment',
      description: 'Assign member to leadership position',
      icon: <PersonAdd />,
      color: 'primary',
      action: () => setTabValue(getTabIndex('assignment'))
    },
    ...(warCouncilUIConfig.showWarCouncilTab ? [{
      title: 'War Council',
      description: 'Manage War Council Structure',
      icon: <Gavel />,
      color: 'error' as const,
      action: () => setTabValue(getTabIndex('war-council'))
    }] : []),
    {
      title: 'Create Election',
      description: 'Set up new leadership election',
      icon: <HowToVote />,
      color: 'secondary',
      action: () => addNotification({ type: 'info', message: 'Election creation coming soon!' })
    },
    {
      title: 'View Reports',
      description: 'Generate leadership reports',
      icon: <Assessment />,
      color: 'info',
      action: () => setTabValue(getTabIndex('reports'))
    },
    {
      title: 'Manage Structure',
      description: 'Update organizational structure',
      icon: <AccountTree />,
      color: 'warning',
      action: () => setTabValue(getTabIndex('structure'))
    }
  ];

  // ==================== Helper Functions ====================
  
  const getHierarchyColor = (level: string) => {
    switch (level) {
      case 'National': return 'error';
      case 'Province': return 'warning';
      case 'Municipality': return 'info';
      case 'Ward': return 'success';
      default: return 'default';
    }
  };

  const calculateFillRate = (filled: number, total: number) => {
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  };

  // ==================== Render ====================
  
  return (
    <Box>
      {/* Province Context Banner for Provincial Admins */}
      <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTree color="primary" />
          {pageTitle}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive leadership assignment and management system
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<Dashboard />} label="Overview" />
          <Tab icon={<Assignment />} label="Assignment" />
          <Tab icon={<People />} label="Leaders" />
          {warCouncilUIConfig.showWarCouncilTab && (
            <Tab icon={<Gavel />} label="War Council" />
          )}
          <Tab icon={<AccountTree />} label="Structure" />
          <Tab icon={<Analytics />} label="Reports" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      
      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <People sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h4" color="primary.main">
                      {statsLoading ? '...' : stats.total_positions || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Positions
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
                  <Assignment sx={{ fontSize: 40, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {statsLoading ? '...' : stats.filled_positions || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Filled Positions
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
                  <Add sx={{ fontSize: 40, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {statsLoading ? '...' : stats.vacant_positions || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vacant Positions
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
                  <TrendingUp sx={{ fontSize: 40, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {statsLoading ? '...' : calculateFillRate(stats.filled_positions, stats.total_positions)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fill Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  {quickActions.map((action, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color={action.color}
                        startIcon={action.icon}
                        onClick={action.action}
                        sx={{ 
                          height: 80, 
                          flexDirection: 'column',
                          gap: 1,
                          textTransform: 'none'
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {action.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Recent Appointments
                  </Typography>
                  <Tooltip title="View All">
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </Box>

                {appointmentsLoading && (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                )}

                {!appointmentsLoading && recentAppointments.length === 0 && (
                  <Alert severity="info">
                    No recent appointments found.
                  </Alert>
                )}

                {!appointmentsLoading && recentAppointments.length > 0 && (
                  <List dense>
                    {recentAppointments.slice(0, 5).map((appointment, index) => (
                      <ListItem key={index} divider={index < 4}>
                        <ListItemIcon>
                          <Person />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${appointment.member_name || 'Unknown Member'} → ${appointment.position_name}`}
                          secondary={`${appointment.hierarchy_level} • ${new Date(appointment.created_at).toLocaleDateString()}`}
                        />
                        <Chip
                          label={appointment.appointment_type}
                          size="small"
                          color="primary"
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Hierarchy Statistics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Leadership Fill Rates by Hierarchy
                </Typography>
                
                {statsLoading && (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                )}

                {!statsLoading && stats.positions_by_hierarchy && (
                  <Grid container spacing={2}>
                    {stats.positions_by_hierarchy.map((level) => (
                      <Grid item xs={12} sm={6} md={3} key={level.hierarchy_level}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Chip
                                label={level.hierarchy_level}
                                size="small"
                                color={getHierarchyColor(level.hierarchy_level) as any}
                              />
                            </Box>
                            <Typography variant="h6">
                              {level.filled_positions}/{level.total_positions}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {calculateFillRate(level.filled_positions, level.total_positions)}% filled
                            </Typography>
                            <Typography variant="caption" color="error.main">
                              {level.vacancy_rate}% vacancy rate
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Assignment Tab */}
      <TabPanel value={tabValue} index={1}>
        <LeadershipAssignment onAssignmentComplete={handleAssignmentComplete} />
      </TabPanel>

      {/* Leaders Tab */}
      <TabPanel value={tabValue} index={2}>
        <LeadershipRoster />
      </TabPanel>

      {/* War Council Tab */}
      {warCouncilUIConfig.showWarCouncilTab && (
        <TabPanel value={tabValue} index={getTabIndex('war-council')}>
          <WarCouncilDashboard onNavigateToStructure={() => setTabValue(getTabIndex('structure'))} />
        </TabPanel>
      )}

      {/* Structure Tab */}
      <TabPanel value={tabValue} index={getTabIndex('structure')}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Organizational Structure
            </Typography>
            
            {structuresLoading && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}

            {!structuresLoading && structures.length === 0 && (
              <Alert severity="info">
                No organizational structures found.
              </Alert>
            )}

            {!structuresLoading && structures.length > 0 && (
              <Grid container spacing={2}>
                {structures.map((structure, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <AccountTree color="primary" />
                          <Box>
                            <Typography variant="h6">
                              {structure.structure_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {structure.structure_code}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={structure.hierarchy_level}
                          size="small"
                          color={getHierarchyColor(structure.hierarchy_level) as any}
                        />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {structure.total_positions} positions
                        </Typography>
                        {structure.description && (
                          <Typography variant="caption" color="text.secondary">
                            {structure.description}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Reports Tab */}
      <TabPanel value={tabValue} index={getTabIndex('reports')}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Leadership Reports & Analytics
            </Typography>
            <Alert severity="info">
              Advanced reporting features coming soon! This will include:
              <ul>
                <li>Leadership tenure analysis</li>
                <li>Appointment history reports</li>
                <li>Election participation statistics</li>
                <li>Vacancy trend analysis</li>
                <li>Performance metrics</li>
              </ul>
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default LeadershipManagement;
