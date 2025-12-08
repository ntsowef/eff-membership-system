import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,

  Alert,
  CircularProgress,

  Tabs,
  Tab,
  Avatar,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  AccountTree,
  Person,
  PersonAdd,

  LocationOn,
  CheckCircle,
  Cancel,

  Refresh
} from '@mui/icons-material';
import { LeadershipAPI } from '../../services/leadershipApi';
import type { WarCouncilStructure as WarCouncilStructureData, WarCouncilStructureView } from '../../services/leadershipApi';
import { useUI, useAuth } from '../../store';
import { WarCouncilPermissions } from '../../utils/warCouncilPermissions';
import WarCouncilAppointmentDialog from './WarCouncilAppointmentDialog';
import WarCouncilAssignmentSimple from './WarCouncilAssignmentSimple';

interface WarCouncilStructureProps {
  onAppointmentComplete?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`war-council-tabpanel-${index}`}
      aria-labelledby={`war-council-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const WarCouncilStructure: React.FC<WarCouncilStructureProps> = ({
  onAppointmentComplete
}) => {
  const [structure, setStructure] = useState<WarCouncilStructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<WarCouncilStructureView | null>(null);
  const { addNotification } = useUI();
  const { user } = useAuth();

  // Check permissions
  const canViewStructure = WarCouncilPermissions.canViewWarCouncil(user as any);
  const canManageAppointments = WarCouncilPermissions.canManageWarCouncilAppointments(user as any);
  const uiConfig = WarCouncilPermissions.getUIConfig(user as any);

  // Load War Council Structure
  const loadStructure = async () => {
    try {
      setLoading(true);
      const data = await LeadershipAPI.getWarCouncilStructure();
      setStructure(data);
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: `Failed to load War Council Structure: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructure();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAppointMember = (position: WarCouncilStructureView) => {
    // Check permissions first
    if (!canManageAppointments.hasAccess) {
      addNotification({
        type: 'error',
        message: WarCouncilPermissions.getPermissionErrorMessage(canManageAppointments)
      });
      return;
    }

    if (position.position_status === 'Filled') {
      addNotification({
        type: 'warning',
        message: `Position ${position.position_name} is already filled`
      });
      return;
    }
    setSelectedPosition(position);
    setAppointmentDialogOpen(true);
  };

  const handleAppointmentComplete = () => {
    setAppointmentDialogOpen(false);
    setSelectedPosition(null);
    loadStructure(); // Refresh data
    if (onAppointmentComplete) {
      onAppointmentComplete();
    }
    addNotification({
      type: 'success',
      message: 'War Council appointment completed successfully'
    });
  };

  const renderPositionCard = (position: WarCouncilStructureView) => (
    <Card key={position.position_id} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              {position.position_name}
              {position.province_specific && position.province_name && (
                <Chip
                  label={position.province_name}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ ml: 1 }}
                  icon={<LocationOn />}
                />
              )}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {position.description}
            </Typography>

            {position.member_name ? (
              <Box display="flex" alignItems="center" mt={1}>
                <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {position.member_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {position.membership_number} • {position.appointment_type}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Position vacant
              </Typography>
            )}
          </Box>

          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Chip
              label={position.position_status}
              color={position.position_status === 'Filled' ? 'success' : 'warning'}
              size="small"
              icon={position.position_status === 'Filled' ? <CheckCircle /> : <Cancel />}
            />
            
            {position.position_status === 'Vacant' && uiConfig.showAppointmentButtons && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<PersonAdd />}
                onClick={() => handleAppointMember(position)}
                sx={{ mt: 1 }}
              >
                Appoint
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderStatisticsCards = () => {
    if (!structure) return null;

    const { statistics } = structure;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Positions
              </Typography>
              <Typography variant="h4">
                {statistics.total_positions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Filled Positions
              </Typography>
              <Typography variant="h4" color="success.main">
                {statistics.filled_positions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Vacant Positions
              </Typography>
              <Typography variant="h4" color="warning.main">
                {statistics.vacant_positions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Fill Rate
              </Typography>
              <Typography variant="h4" color="primary.main">
                {statistics.fill_rate_percentage}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Permission check
  if (!canViewStructure.hasAccess) {
    return (
      <Alert severity="error">
        Access Denied: {WarCouncilPermissions.getPermissionErrorMessage(canViewStructure)}
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

  if (!structure) {
    return (
      <Alert severity="error">
        Failed to load War Council Structure. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <AccountTree color="primary" sx={{ mr: 1 }} />
          <Typography variant="h4">
            War Council Structure
          </Typography>
        </Box>
        <Tooltip title="Refresh Structure">
          <IconButton onClick={loadStructure} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Statistics Cards */}
      {renderStatisticsCards()}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="war council tabs">
            <Tab label="Overview" />
            <Tab label="Core Positions" />
            <Tab label="CCT Deployees" />
            <Tab label="All Positions" />
            {canManageAppointments.hasAccess && <Tab label="Assign Positions" />}
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Core Executive Positions ({structure.statistics.core_positions_filled}/{structure.statistics.core_positions_total})
              </Typography>
              {structure.structure.core_positions.slice(0, 3).map(renderPositionCard)}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                CCT Deployees ({structure.statistics.cct_deployees_filled}/{structure.statistics.cct_deployees_total})
              </Typography>
              {structure.structure.cct_deployees.slice(0, 3).map(renderPositionCard)}
              {structure.structure.cct_deployees.length > 3 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ... and {structure.structure.cct_deployees.length - 3} more CCT Deployees
                </Typography>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Core Positions Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Core Executive Positions
          </Typography>
          {structure.structure.core_positions.map(renderPositionCard)}
        </TabPanel>

        {/* CCT Deployees Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            CCT Deployees (Provincial Representatives)
          </Typography>
          {structure.structure.cct_deployees.map(renderPositionCard)}
        </TabPanel>

        {/* All Positions Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Complete War Council Structure
          </Typography>
          {structure.structure.all_positions.map(renderPositionCard)}
        </TabPanel>

        {/* Assignment Tab */}
        {canManageAppointments.hasAccess && (
          <TabPanel value={tabValue} index={4}>
            <WarCouncilAssignmentSimple />
          </TabPanel>
        )}
      </Card>

      {/* Appointment Dialog */}
      {selectedPosition && (
        <WarCouncilAppointmentDialog
          open={appointmentDialogOpen}
          onClose={() => setAppointmentDialogOpen(false)}
          position={selectedPosition}
          onAppointmentComplete={handleAppointmentComplete}
        />
      )}
    </Box>
  );
};

export default WarCouncilStructure;
