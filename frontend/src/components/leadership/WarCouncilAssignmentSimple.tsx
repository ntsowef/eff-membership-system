import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LeadershipAPI } from '../../services/leadershipApi';
import type { 
  WarCouncilStructureView, 
  CreateAppointmentData, 
  WarCouncilValidation 
} from '../../services/leadershipApi';
import { useUI } from '../../store';

interface Member {
  member_id: number;
  firstname: string;
  surname: string;
  membership_number: string;
  province_code: string;
  province_name: string;
  current_position?: string;
  is_eligible: boolean;
}

interface AssignmentDialogData {
  position: WarCouncilStructureView;
  members: Member[];
  selectedMember?: Member;
  validation?: WarCouncilValidation;
}

const WarCouncilAssignmentSimple: React.FC = () => {
  const { showNotification } = useUI();
  const [positions, setPositions] = useState<WarCouncilStructureView[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentDialog, setAssignmentDialog] = useState<AssignmentDialogData | null>(null);
  const [validating, setValidating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Load War Council structure
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const structureData = await LeadershipAPI.getWarCouncilStructure();
      // Extract the all_positions array from the structured response
      setPositions(structureData.structure.all_positions);
    } catch (error) {
      console.error('Error loading War Council data:', error);
      showNotification('Failed to load War Council data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open assignment dialog for a position
  const openAssignmentDialog = async (position: WarCouncilStructureView) => {
    try {
      setLoading(true);
      
      // Get eligible members for this position
      const members = await LeadershipAPI.getEligibleMembersForWarCouncilPosition(position.position_id);
      
      setAssignmentDialog({
        position,
        members: members.filter((member: Member) => {
          // For CCT positions, only show members from the same province
          if (position.province_specific && position.province_code) {
            return member.province_code === position.province_code;
          }
          // For core positions, show all eligible members
          return true;
        })
      });
    } catch (error) {
      console.error('Error loading eligible members:', error);
      showNotification('Failed to load eligible members', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Select a member for assignment
  const selectMember = async (member: Member) => {
    if (!assignmentDialog) return;

    try {
      setValidating(true);
      
      // Validate the appointment
      const validation = await LeadershipAPI.validateWarCouncilAppointment({
        position_id: assignmentDialog.position.position_id,
        member_id: member.member_id,
        appointment_type: 'Appointment',
        hierarchy_level: 'National',
        entity_id: 1
      });

      setAssignmentDialog({
        ...assignmentDialog,
        selectedMember: member,
        validation
      });
    } catch (error) {
      console.error('Error validating appointment:', error);
      showNotification('Failed to validate appointment', 'error');
    } finally {
      setValidating(false);
    }
  };

  // Confirm and create appointment
  const confirmAssignment = async () => {
    if (!assignmentDialog?.selectedMember) return;

    try {
      setAssigning(true);
      
      const appointmentData: CreateAppointmentData = {
        position_id: assignmentDialog.position.position_id,
        member_id: assignmentDialog.selectedMember.member_id,
        appointment_type: 'Appointment',
        hierarchy_level: 'National',
        entity_id: 1,
        start_date: new Date().toISOString().split('T')[0],
        notes: `War Council appointment: ${assignmentDialog.position.position_name}`
      };

      await LeadershipAPI.createWarCouncilAppointment(appointmentData);
      
      showNotification(
        `Successfully appointed ${assignmentDialog.selectedMember.firstname} ${assignmentDialog.selectedMember.surname} as ${assignmentDialog.position.position_name}`,
        'success'
      );

      // Refresh data and close dialog
      await loadData();
      setAssignmentDialog(null);
    } catch (error) {
      console.error('Error creating appointment:', error);
      showNotification('Failed to create appointment', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Get vacant positions (with safety check)
  const vacantPositions = Array.isArray(positions) ? positions.filter(p => p.position_status === 'Vacant') : [];
  const corePositions = vacantPositions.filter(p => !p.province_specific);
  const cctPositions = vacantPositions.filter(p => p.province_specific);

  if (loading && !assignmentDialog) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">
          War Council Position Assignment
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Core Executive Positions */}
        {corePositions.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Vacant Core Executive Positions ({corePositions.length})
                </Typography>
                <Grid container spacing={2}>
                  {corePositions.map((position) => (
                    <Grid item xs={12} sm={6} md={4} key={position.position_id}>
                      <PositionCard 
                        position={position} 
                        onAssign={() => openAssignmentDialog(position)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* CCT Deployee Positions */}
        {cctPositions.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="secondary" gutterBottom>
                  <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Vacant CCT Deployee Positions ({cctPositions.length})
                </Typography>
                <Grid container spacing={2}>
                  {cctPositions.map((position) => (
                    <Grid item xs={12} sm={6} md={4} key={position.position_id}>
                      <PositionCard 
                        position={position} 
                        onAssign={() => openAssignmentDialog(position)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {vacantPositions.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="success">
              <Typography>All War Council positions are currently filled!</Typography>
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* Assignment Dialog */}
      <AssignmentDialog
        data={assignmentDialog}
        onClose={() => setAssignmentDialog(null)}
        onSelectMember={selectMember}
        onConfirm={confirmAssignment}
        validating={validating}
        assigning={assigning}
      />
    </Box>
  );
};

// Position Card Component
interface PositionCardProps {
  position: WarCouncilStructureView;
  onAssign: () => void;
}

const PositionCard: React.FC<PositionCardProps> = ({ position, onAssign }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {position.position_name}
        </Typography>
        
        {position.province_name && (
          <Chip
            icon={<LocationIcon />}
            label={position.province_name}
            size="small"
            color="secondary"
            sx={{ mb: 1 }}
          />
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {position.description}
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAssign}
          fullWidth
          size="small"
        >
          Assign Member
        </Button>
      </CardContent>
    </Card>
  );
};

// Assignment Dialog Component
interface AssignmentDialogProps {
  data: AssignmentDialogData | null;
  onClose: () => void;
  onSelectMember: (member: Member) => void;
  onConfirm: () => void;
  validating: boolean;
  assigning: boolean;
}

const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  data,
  onClose,
  onSelectMember,
  onConfirm,
  validating,
  assigning,
}) => {
  if (!data) return null;

  const { position, members, selectedMember, validation } = data;
  const isValid = validation?.isValid ?? false;

  return (
    <Dialog open={!!data} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Assign Member to {position.position_name}
        {position.province_name && (
          <Chip
            icon={<LocationIcon />}
            label={position.province_name}
            size="small"
            color="secondary"
            sx={{ ml: 1 }}
          />
        )}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {position.description}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Eligible Members ({members.length})
        </Typography>

        {members.length === 0 ? (
          <Alert severity="warning">
            No eligible members found for this position.
          </Alert>
        ) : (
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {members.map((member) => (
              <ListItem
                key={member.member_id}
                sx={{
                  border: selectedMember?.member_id === member.member_id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: selectedMember?.member_id === member.member_id ? '#f3f8ff' : 'white'
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    {member.firstname[0]}{member.surname[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${member.firstname} ${member.surname}`}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {member.membership_number}
                      </Typography>
                      <Chip
                        label={member.province_name}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    variant={selectedMember?.member_id === member.member_id ? "contained" : "outlined"}
                    size="small"
                    onClick={() => onSelectMember(member)}
                    disabled={validating}
                  >
                    {selectedMember?.member_id === member.member_id ? 'Selected' : 'Select'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {validating && (
          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Validating appointment...</Typography>
          </Box>
        )}

        {validation && selectedMember && (
          <Box sx={{ mt: 2 }}>
            {isValid ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                This appointment is valid and can be processed.
              </Alert>
            ) : (
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="body2" gutterBottom>
                  This appointment cannot be processed:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {validation.errors.map((error, index) => (
                    <li key={index}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={assigning}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={!selectedMember || !isValid || validating || assigning}
          startIcon={assigning ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          {assigning ? 'Assigning...' : 'Confirm Assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WarCouncilAssignmentSimple;
