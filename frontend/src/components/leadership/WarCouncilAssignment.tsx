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
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
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
  member: Member;
  validation?: WarCouncilValidation;
}

const WarCouncilAssignment: React.FC = () => {
  const { showNotification } = useUI();
  const [positions, setPositions] = useState<WarCouncilStructureView[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentDialog, setAssignmentDialog] = useState<AssignmentDialogData | null>(null);
  const [validating, setValidating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Load War Council structure and available members
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [structureData, membersResponse] = await Promise.all([
        LeadershipAPI.getWarCouncilStructure(),
        LeadershipAPI.getEligibleMembers({
          hierarchy_level: 'National',
          entity_id: 1,
          limit: 100
        })
      ]);

      setPositions(structureData);
      setAvailableMembers(membersResponse.members.filter((member: Member) => member.is_eligible));
    } catch (error) {
      console.error('Error loading War Council data:', error);
      showNotification('Failed to load War Council data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Only allow dropping on position cards
    if (!destination.droppableId.startsWith('position-')) return;

    const positionId = parseInt(destination.droppableId.replace('position-', ''));
    const memberId = parseInt(draggableId.replace('member-', ''));

    const position = positions.find(p => p.position_id === positionId);
    const member = availableMembers.find(m => m.member_id === memberId);

    if (!position || !member) return;

    await handleAssignmentAttempt(position, member);
  };

  // Handle assignment attempt (drag-drop or click)
  const handleAssignmentAttempt = async (position: WarCouncilStructureView, member: Member) => {
    try {
      setValidating(true);
      
      // Validate the appointment
      const validation = await LeadershipAPI.validateWarCouncilAppointment({
        position_id: position.position_id,
        member_id: member.member_id,
        appointment_type: 'Appointment',
        hierarchy_level: 'National',
        entity_id: 1
      });

      setAssignmentDialog({
        position,
        member,
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
    if (!assignmentDialog) return;

    try {
      setAssigning(true);
      
      const appointmentData: CreateAppointmentData = {
        position_id: assignmentDialog.position.position_id,
        member_id: assignmentDialog.member.member_id,
        appointment_type: 'Appointment',
        hierarchy_level: 'National',
        entity_id: 1,
        start_date: new Date().toISOString().split('T')[0],
        notes: `War Council appointment: ${assignmentDialog.position.position_name}`
      };

      await LeadershipAPI.createWarCouncilAppointment(appointmentData);
      
      showNotification(
        `Successfully appointed ${assignmentDialog.member.firstname} ${assignmentDialog.member.surname} as ${assignmentDialog.position.position_name}`,
        'success'
      );

      // Refresh data
      await loadData();
      setAssignmentDialog(null);
    } catch (error) {
      console.error('Error creating appointment:', error);
      showNotification('Failed to create appointment', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Get vacant positions
  const vacantPositions = positions.filter(p => p.position_status === 'Vacant');
  const corePositions = vacantPositions.filter(p => !p.province_specific);
  const cctPositions = vacantPositions.filter(p => p.province_specific);

  // Get members eligible for specific position
  const getEligibleMembers = (position: WarCouncilStructureView) => {
    if (!position.province_specific) {
      return availableMembers; // All members eligible for core positions
    }
    // Only members from specific province for CCT positions
    return availableMembers.filter(m => m.province_code === position.province_code);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        War Council Position Assignment
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {/* Left Column - Vacant Positions */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Vacant Positions ({vacantPositions.length})
                </Typography>

                {/* Core Executive Positions */}
                {corePositions.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Core Executive Positions
                    </Typography>
                    <Grid container spacing={2}>
                      {corePositions.map((position) => (
                        <Grid item xs={12} sm={6} key={position.position_id}>
                          <PositionCard 
                            position={position} 
                            onAssign={(member) => handleAssignmentAttempt(position, member)}
                            eligibleMembers={getEligibleMembers(position)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* CCT Deployee Positions */}
                {cctPositions.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" color="secondary" gutterBottom>
                      CCT Deployee Positions
                    </Typography>
                    <Grid container spacing={2}>
                      {cctPositions.map((position) => (
                        <Grid item xs={12} sm={6} key={position.position_id}>
                          <PositionCard 
                            position={position} 
                            onAssign={(member) => handleAssignmentAttempt(position, member)}
                            eligibleMembers={getEligibleMembers(position)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {vacantPositions.length === 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography>All War Council positions are currently filled!</Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Available Members */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Available Members ({availableMembers.length})
                </Typography>

                <Droppable droppableId="available-members" isDropDisabled>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ maxHeight: '600px', overflowY: 'auto' }}
                    >
                      {availableMembers.map((member, index) => (
                        <Draggable
                          key={member.member_id}
                          draggableId={`member-${member.member_id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <MemberCard
                              member={member}
                              provided={provided}
                              isDragging={snapshot.isDragging}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>

                {availableMembers.length === 0 && (
                  <Alert severity="info">
                    <Typography>No eligible members available for assignment.</Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DragDropContext>

      {/* Assignment Confirmation Dialog */}
      <AssignmentDialog
        data={assignmentDialog}
        onClose={() => setAssignmentDialog(null)}
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
  onAssign: (member: Member) => void;
  eligibleMembers: Member[];
}

const PositionCard: React.FC<PositionCardProps> = ({ position, onAssign, eligibleMembers }) => {
  return (
    <Droppable droppableId={`position-${position.position_id}`}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.droppableProps}
          sx={{
            minHeight: '120px',
            border: snapshot.isDraggingOver ? '2px dashed #1976d2' : '1px solid #e0e0e0',
            backgroundColor: snapshot.isDraggingOver ? '#f3f8ff' : 'white',
            transition: 'all 0.2s ease',
          }}
        >
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
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

            <Typography variant="caption" color="text.secondary" display="block">
              {position.description}
            </Typography>

            <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
              Eligible Members: {eligibleMembers.length}
            </Typography>

            {provided.placeholder}
          </CardContent>
        </Card>
      )}
    </Droppable>
  );
};

// Member Card Component
interface MemberCardProps {
  member: Member;
  provided: any;
  isDragging: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, provided, isDragging }) => {
  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      sx={{
        mb: 1,
        cursor: 'grab',
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'rotate(5deg)' : 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      <CardContent sx={{ py: 1.5 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
            {member.firstname[0]}{member.surname[0]}
          </Avatar>
          <Box flex={1}>
            <Typography variant="body2" fontWeight="medium">
              {member.firstname} {member.surname}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {member.membership_number}
            </Typography>
            <Chip
              label={member.province_name}
              size="small"
              sx={{ ml: 1, height: '16px', fontSize: '0.7rem' }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Assignment Dialog Component
interface AssignmentDialogProps {
  data: AssignmentDialogData | null;
  onClose: () => void;
  onConfirm: () => void;
  validating: boolean;
  assigning: boolean;
}

const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  data,
  onClose,
  onConfirm,
  validating,
  assigning,
}) => {
  if (!data) return null;

  const { position, member, validation } = data;
  const isValid = validation?.isValid ?? false;

  return (
    <Dialog open={!!data} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Confirm Position Assignment
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Position: {position.position_name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {position.description}
          </Typography>
          {position.province_name && (
            <Chip
              icon={<LocationIcon />}
              label={position.province_name}
              size="small"
              color="secondary"
              sx={{ mb: 2 }}
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Member: {member.firstname} {member.surname}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Membership Number: {member.membership_number}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Province: {member.province_name}
          </Typography>
        </Box>

        {validating && (
          <Box display="flex" alignItems="center" gap={1} sx={{ my: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Validating appointment...</Typography>
          </Box>
        )}

        {validation && (
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
          disabled={!isValid || validating || assigning}
          startIcon={assigning ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          {assigning ? 'Assigning...' : 'Confirm Assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WarCouncilAssignment;
