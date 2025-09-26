import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  Paper
} from '@mui/material';
import {
  Person,
  LocationOn,
  CheckCircle,
  Warning,
  Search
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LeadershipAPI } from '../../services/leadershipApi';
import type { WarCouncilStructureView, CreateAppointmentData, WarCouncilValidation } from '../../services/leadershipApi';
import { useUI, useAuth } from '../../store';
import { WarCouncilValidator } from '../../utils/warCouncilValidation';

interface WarCouncilAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  position: WarCouncilStructureView;
  onAppointmentComplete: () => void;
}

interface Member {
  member_id: number;
  membership_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  province_name?: string;
  municipality_name?: string;
  ward_name?: string;
}

const WarCouncilAppointmentDialog: React.FC<WarCouncilAppointmentDialogProps> = ({
  open,
  onClose,
  position,
  onAppointmentComplete
}) => {
  const [step, setStep] = useState<'select-member' | 'appointment-details'>('select-member');
  const [eligibleMembers, setEligibleMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<WarCouncilValidation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [appointmentType, setAppointmentType] = useState<'Elected' | 'Appointed' | 'Acting' | 'Interim'>('Appointed');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');

  const { addNotification } = useUI();
  const { user } = useAuth();

  // Load eligible members when dialog opens
  useEffect(() => {
    if (open && position) {
      loadEligibleMembers();
    }
  }, [open, position]);

  // Filter members based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMembers(eligibleMembers);
    } else {
      const filtered = eligibleMembers.filter(member =>
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.membership_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, eligibleMembers]);

  const loadEligibleMembers = async () => {
    try {
      setLoading(true);
      const members = await LeadershipAPI.getEligibleMembersForWarCouncilPosition(position.position_id);
      setEligibleMembers(members);
      setFilteredMembers(members);
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: `Failed to load eligible members: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSelect = async (member: Member) => {
    setSelectedMember(member);
    
    // Validate the appointment
    try {
      setValidating(true);
      const validationResult = await LeadershipAPI.validateWarCouncilAppointment(
        position.position_id,
        member.member_id
      );
      setValidation(validationResult);
      
      if (validationResult.isValid) {
        setStep('appointment-details');
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: `Failed to validate appointment: ${error.message}`
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmitAppointment = async () => {
    if (!selectedMember || !startDate) {
      addNotification({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    // Client-side validation
    const validationData = {
      positionId: position.position_id,
      memberId: selectedMember.member_id,
      appointmentType,
      startDate,
      endDate: endDate || undefined,
      memberProvince: selectedMember.province_name,
      memberName: selectedMember.full_name
    };

    const clientValidation = WarCouncilValidator.validateAppointmentForm(validationData);

    if (!clientValidation.isValid) {
      const { errorMessage } = WarCouncilValidator.formatValidationMessages(clientValidation);
      addNotification({
        type: 'error',
        message: errorMessage || 'Validation failed'
      });
      return;
    }

    // Show warnings if any
    if (clientValidation.warnings.length > 0) {
      const { warningMessage } = WarCouncilValidator.formatValidationMessages(clientValidation);
      addNotification({
        type: 'warning',
        message: warningMessage || 'Please review the warnings'
      });
    }

    try {
      setSubmitting(true);

      const appointmentData: CreateAppointmentData = {
        position_id: position.position_id,
        member_id: selectedMember.member_id,
        hierarchy_level: 'National',
        entity_id: 1,
        appointment_type: appointmentType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
        appointment_notes: appointmentNotes.trim() || undefined
      };

      await LeadershipAPI.createWarCouncilAppointment(appointmentData);
      onAppointmentComplete();
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: `Failed to create appointment: ${error.message}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('select-member');
    setSelectedMember(null);
    setSearchTerm('');
    setValidation(null);
    setAppointmentType('Appointed');
    setStartDate(new Date());
    setEndDate(null);
    setAppointmentNotes('');
    onClose();
  };

  const renderMemberSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Member for {position.position_name}
      </Typography>
      
      {position.province_specific && position.province_name && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This position requires a member from {position.province_name} province.
        </Alert>
      )}

      <TextField
        fullWidth
        placeholder="Search by name, membership number, or email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
        }}
        sx={{ mb: 2 }}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
          <List>
            {filteredMembers.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No eligible members found"
                  secondary={searchTerm ? "Try adjusting your search terms" : "No members meet the requirements for this position"}
                />
              </ListItem>
            ) : (
              filteredMembers.map((member, index) => (
                <React.Fragment key={member.member_id}>
                  <ListItemButton
                    onClick={() => handleMemberSelect(member)}
                    disabled={validating}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.full_name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {member.membership_number}
                          </Typography>
                          {member.province_name && (
                            <Chip
                              label={member.province_name}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                  {index < filteredMembers.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>
        </Paper>
      )}

      {validating && (
        <Box display="flex" justifyContent="center" alignItems="center" py={2}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">Validating appointment...</Typography>
        </Box>
      )}

      {validation && !validation.isValid && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Appointment validation failed:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}
    </Box>
  );

  const renderAppointmentDetails = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Appointment Details
      </Typography>

      {selectedMember && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ mr: 2 }}>
              <Person />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {selectedMember.full_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedMember.membership_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Position: {position.position_name}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      <Box display="flex" flexDirection="column" gap={3}>
        <FormControl fullWidth>
          <InputLabel>Appointment Type</InputLabel>
          <Select
            value={appointmentType}
            label="Appointment Type"
            onChange={(e) => setAppointmentType(e.target.value as any)}
          >
            <MenuItem value="Appointed">Appointed</MenuItem>
            <MenuItem value="Elected">Elected</MenuItem>
            <MenuItem value="Acting">Acting</MenuItem>
            <MenuItem value="Interim">Interim</MenuItem>
          </Select>
        </FormControl>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date *"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
          
          <DatePicker
            label="End Date (Optional)"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth />}
            minDate={startDate || undefined}
          />
        </LocalizationProvider>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Appointment Notes (Optional)"
          value={appointmentNotes}
          onChange={(e) => setAppointmentNotes(e.target.value)}
          placeholder="Add any relevant notes about this appointment..."
        />
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Person color="primary" />
          <Typography variant="h6">
            War Council Appointment
          </Typography>
          {position.province_specific && position.province_name && (
            <Chip
              label={position.province_name}
              size="small"
              color="primary"
              variant="outlined"
              icon={<LocationOn />}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {step === 'select-member' ? renderMemberSelection() : renderAppointmentDetails()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        
        {step === 'appointment-details' && (
          <Button
            onClick={() => setStep('select-member')}
            disabled={submitting}
          >
            Back
          </Button>
        )}
        
        {step === 'appointment-details' && (
          <Button
            variant="contained"
            onClick={handleSubmitAppointment}
            disabled={submitting || !selectedMember || !startDate}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {submitting ? 'Creating...' : 'Create Appointment'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WarCouncilAppointmentDialog;
