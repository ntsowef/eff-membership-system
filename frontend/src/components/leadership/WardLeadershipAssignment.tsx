// WardLeadershipAssignment Component
// Simplified ward-level leadership assignment:
// 1. Find the member by ID number (their province/municipality/ward is detected automatically)
// 2. Review the ward membership and pick a vacant position
// 3. Confirm the assignment details in a modal

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Radio,
  Paper
} from '@mui/material';
import {
  Search,
  Person,
  Badge,
  LocationOn,
  AssignmentInd,
  CheckCircle
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LeadershipAPI } from '../../services/leadershipApi';
import type { CreateAppointmentData, LeadershipPosition } from '../../services/leadershipApi';
import { memberApi, enhancedGeographicApi } from '../../services/api';
import { useUI } from '../../store';

// =====================================================
// Interfaces
// =====================================================

interface WardMemberDetails {
  member_id: number;
  membership_number?: string;
  first_name?: string;
  last_name?: string;
  id_number: string;
  ward_code?: string;
  membership_status?: string;
  province_name?: string;
  municipality_name?: string;
}

interface WardDetails {
  ward_id: number;
  ward_code: string;
  ward_name?: string;
  ward_number?: number;
  municipality_name?: string;
  province_name?: string;
}

interface WardLeadershipAssignmentProps {
  onAssignmentComplete?: () => void;
}

type AppointmentMethod = 'Appointed' | 'Elected';
type TenureType = 'Permanent' | 'Interim';

// =====================================================
// WardLeadershipAssignment Component
// =====================================================

const WardLeadershipAssignment: React.FC<WardLeadershipAssignmentProps> = ({
  onAssignmentComplete
}) => {
  // ==================== State ====================

  // Step 1: Member search
  const [idNumber, setIdNumber] = useState('');
  const [member, setMember] = useState<WardMemberDetails | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Step 2: Ward members list
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(0);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);

  // Position selection + modal
  const [selectedPosition, setSelectedPosition] = useState<LeadershipPosition | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [appointmentMethod, setAppointmentMethod] = useState<AppointmentMethod>('Appointed');
  const [tenureType, setTenureType] = useState<TenureType>('Permanent');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [appointmentNotes, setAppointmentNotes] = useState('');

  const { addNotification } = useUI();
  const queryClient = useQueryClient();

  // The ward is derived from the searched member's profile
  const wardCode = member?.ward_code || null;

  // ==================== Ward Details Query ====================

  // Resolve the member's ward_code to the ward entity (ward_id) and its
  // province/municipality names for display
  const {
    data: wardDetails,
    isLoading: wardLoading,
    error: wardError
  } = useQuery({
    queryKey: ['ward-details', wardCode],
    queryFn: async () => {
      const response = await enhancedGeographicApi.getWard(wardCode!);
      return response?.data as WardDetails;
    },
    enabled: !!wardCode,
    staleTime: 10 * 60 * 1000
  });

  const wardId = wardDetails?.ward_id ?? null;
  const wardLabel = wardDetails
    ? wardDetails.ward_name || `Ward ${wardDetails.ward_number || wardDetails.ward_code}`
    : wardCode
      ? `Ward ${wardCode}`
      : '';

  // ==================== Vacant Positions Query ====================

  const {
    data: vacantPositions = [],
    isLoading: positionsLoading,
    error: positionsError
  } = useQuery({
    queryKey: ['ward-leadership-positions', wardId],
    queryFn: async () => {
      const positions = await LeadershipAPI.getPositions({
        hierarchy_level: 'Ward',
        entity_id: wardId!,
        vacant_only: true
      });
      // Defensive client-side filter: only truly vacant, active positions
      return positions.filter(p => p.is_active !== false && p.position_status !== 'Filled');
    },
    enabled: !!wardId
  });

  // ==================== Ward Members Query ====================

  // All members registered in the selected ward
  const {
    data: wardMembersData,
    isLoading: wardMembersLoading,
    error: wardMembersError
  } = useQuery({
    queryKey: ['ward-members', wardCode, memberPage, memberRowsPerPage, memberSearch],
    queryFn: () => LeadershipAPI.getMembers({
      ward_code: wardCode!,
      page: memberPage + 1,
      limit: memberRowsPerPage,
      q: memberSearch.trim() || undefined
    }),
    enabled: !!wardCode,
    staleTime: 2 * 60 * 1000
  });

  const wardMembers = wardMembersData?.members || [];
  const wardMembersPagination = wardMembersData?.pagination || { total: 0 };

  // ==================== Member Search ====================

  const handleSearchMember = useCallback(async () => {
    const trimmed = idNumber.trim();
    if (!/^\d{13}$/.test(trimmed)) {
      setSearchError('ID number must be exactly 13 digits');
      setMember(null);
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);
      const response = await memberApi.getMemberByIdNumber(trimmed);
      const found = response?.data;
      if (!found?.member_id) {
        throw new Error('Member not found');
      }
      if (!found.ward_code) {
        throw new Error('This member has no ward assigned on their profile, so a ward assignment cannot be made.');
      }
      setMember(found as WardMemberDetails);
      setMemberPage(0);
      setMemberSearch('');
      setSelectedPosition(null);
    } catch (error: any) {
      setMember(null);
      const message = error?.response?.data?.error?.message
        || error?.response?.data?.message
        || error?.message
        || 'Member not found';
      setSearchError(message);
    } finally {
      setSearching(false);
    }
  }, [idNumber]);

  const handleClearMember = () => {
    setMember(null);
    setIdNumber('');
    setSearchError(null);
    setSelectedPosition(null);
    setMemberPage(0);
    setMemberSearch('');
  };

  // Select a member directly from the ward membership list
  const handleSelectWardMember = (wardMember: any) => {
    setMember({
      member_id: wardMember.member_id,
      membership_number: wardMember.membership_number,
      first_name: wardMember.first_name || wardMember.firstname,
      last_name: wardMember.last_name || wardMember.surname,
      id_number: wardMember.id_number,
      ward_code: wardMember.ward_code || wardCode || undefined,
      membership_status: wardMember.membership_status
    });
    setSearchError(null);
  };

  // ==================== Position Selection ====================

  const handlePositionSelect = (positionId: number | '') => {
    if (positionId === '') {
      setSelectedPosition(null);
      return;
    }
    const position = vacantPositions.find(p => p.id === positionId) || null;
    setSelectedPosition(position);
    if (position) {
      // Reset modal form to defaults and open the dialog
      setAppointmentMethod('Appointed');
      setTenureType('Permanent');
      setStartDate(new Date());
      setAppointmentNotes('');
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPosition(null);
  };

  // ==================== Create Appointment ====================

  const createAppointmentMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => LeadershipAPI.createAppointment(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        message: `${selectedPosition?.position_name} assigned successfully!`
      });
      // Refresh ward positions so the filled position disappears from the dropdown
      queryClient.invalidateQueries({ queryKey: ['ward-leadership-positions', wardId] });
      queryClient.invalidateQueries({ queryKey: ['leadership-appointments'] });
      handleCloseModal();
      onAssignmentComplete?.();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error?.message || 'Failed to create appointment'
      });
    }
  });

  const handleSubmitAssignment = () => {
    if (!member || !wardId || !selectedPosition || !startDate) return;

    // "Interim" tenure maps to the Interim appointment_type;
    // "Permanent" tenure uses the selected appointment method
    const appointmentType: CreateAppointmentData['appointment_type'] =
      tenureType === 'Interim' ? 'Interim' : appointmentMethod;

    const payload: CreateAppointmentData = {
      position_id: selectedPosition.id,
      member_id: member.member_id,
      hierarchy_level: 'Ward',
      entity_id: wardId,
      appointment_type: appointmentType,
      start_date: startDate.toISOString().split('T')[0],
      appointment_notes: appointmentNotes.trim() || undefined
    };

    createAppointmentMutation.mutate(payload);
  };

  // ==================== Render ====================

  const memberName = member
    ? [member.first_name, member.last_name].filter(Boolean).join(' ')
    : '';

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentInd color="primary" />
          Ward Leadership Assignment
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Search a member by ID number — their province, municipality and ward are detected automatically — then choose a vacant position to assign.
        </Typography>

        {/* Step 1: Member Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              1. Find Member by ID Number
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID Number"
                  placeholder="Enter 13-digit ID number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchMember()}
                  disabled={searching}
                  inputProps={{ maxLength: 13, inputMode: 'numeric' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Badge fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <Search />}
                  onClick={handleSearchMember}
                  disabled={searching || idNumber.trim().length !== 13}
                  fullWidth
                >
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </Grid>
              {member && (
                <Grid item xs={12} md={3}>
                  <Button variant="outlined" onClick={handleClearMember} fullWidth>
                    Clear
                  </Button>
                </Grid>
              )}
            </Grid>

            {searchError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {searchError}
              </Alert>
            )}

            {member && (
              <Alert severity="success" icon={<Person />} sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography variant="subtitle2">{memberName}</Typography>
                  {member.membership_number && (
                    <Chip size="small" label={`Membership No: ${member.membership_number}`} />
                  )}
                  {member.membership_status && (
                    <Chip
                      size="small"
                      label={member.membership_status}
                      color={member.membership_status === 'Active' ? 'success' : 'default'}
                    />
                  )}
                </Box>
                {/* Geographic location detected from the member's profile */}
                <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                  <LocationOn fontSize="small" />
                  {wardLoading ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={14} />
                      <Typography variant="body2">Detecting ward location...</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2">
                      {[
                        wardDetails?.province_name || member.province_name,
                        wardDetails?.municipality_name || member.municipality_name,
                        wardLabel
                      ].filter(Boolean).join(' › ') || `Ward ${member.ward_code}`}
                    </Typography>
                  )}
                </Box>
                {wardError ? (
                  <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                    Could not resolve ward details: {(wardError as Error).message}
                  </Typography>
                ) : null}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Ward Membership + Vacant Position Selection */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Ward Membership {wardLabel ? `— ${wardLabel}` : ''}
            </Typography>

            {!wardCode ? (
              <Alert severity="info">
                Search a member by ID number above — their ward will be detected automatically.
              </Alert>
            ) : (
              <>
                {/* Search within ward members */}
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search ward members by name or ID number..."
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setMemberPage(0);
                  }}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />

                {wardMembersError ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load ward members: {(wardMembersError as Error).message}
                  </Alert>
                ) : wardMembersLoading ? (
                  <Box display="flex" alignItems="center" gap={1} py={2}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading ward members...</Typography>
                  </Box>
                ) : wardMembers.length === 0 ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No members found in {wardLabel || 'this ward'}.
                  </Alert>
                ) : (
                  <>
                    {/* All ward membership — click a row to select the member */}
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox" />
                            <TableCell>Name</TableCell>
                            <TableCell>ID Number</TableCell>
                            <TableCell>Membership No</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {wardMembers.map((wardMember: any) => {
                            const isSelected = member?.member_id === wardMember.member_id;
                            const name = wardMember.full_name
                              || `${wardMember.first_name || wardMember.firstname || ''} ${wardMember.last_name || wardMember.surname || ''}`.trim()
                              || 'Unknown Name';
                            return (
                              <TableRow
                                key={wardMember.member_id}
                                hover
                                selected={isSelected}
                                onClick={() => handleSelectWardMember(wardMember)}
                                sx={{ cursor: 'pointer' }}
                              >
                                <TableCell padding="checkbox">
                                  <Radio checked={isSelected} size="small" />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                                    {name}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {wardMember.id_number}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {wardMember.membership_number || '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={wardMember.membership_status || 'Active'}
                                    size="small"
                                    color={(wardMember.membership_status || 'Active') === 'Active' ? 'success' : 'default'}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={wardMembersPagination.total || 0}
                      rowsPerPage={memberRowsPerPage}
                      page={memberPage}
                      onPageChange={(_e, newPage) => setMemberPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setMemberRowsPerPage(parseInt(e.target.value, 10));
                        setMemberPage(0);
                      }}
                    />
                  </>
                )}

                {/* Vacant position dropdown */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Assign to Vacant Position
                </Typography>

                {!member ? (
                  <Alert severity="info">
                    Select a member from the ward membership above (or search by ID number in step 1) to enable position selection.
                  </Alert>
                ) : wardError ? (
                  <Alert severity="error">
                    Failed to resolve the member's ward: {(wardError as Error).message}
                  </Alert>
                ) : wardLoading || !wardId ? (
                  <Box display="flex" alignItems="center" gap={1} py={2}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Resolving ward details...</Typography>
                  </Box>
                ) : positionsError ? (
                  <Alert severity="error">
                    Failed to load vacant positions: {(positionsError as Error).message}
                  </Alert>
                ) : positionsLoading ? (
                  <Box display="flex" alignItems="center" gap={1} py={2}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading vacant positions...</Typography>
                  </Box>
                ) : vacantPositions.length === 0 ? (
                  <Alert severity="warning" icon={<CheckCircle />}>
                    All leadership positions for {wardLabel || 'this ward'} are currently filled.
                    No positions are available for assignment.
                  </Alert>
                ) : (
                  <FormControl fullWidth>
                    <InputLabel>Vacant Position</InputLabel>
                    <Select
                      value={selectedPosition?.id ?? ''}
                      label="Vacant Position"
                      onChange={(e) => handlePositionSelect(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={createAppointmentMutation.isPending}
                    >
                      <MenuItem value="">
                        <em>Select a position...</em>
                      </MenuItem>
                      {vacantPositions.map((position) => (
                        <MenuItem key={position.id} value={position.id}>
                          {position.position_name} ({position.position_code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Assignment Modal */}
        <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
          <DialogTitle>Confirm Ward Leadership Assignment</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, mt: 1 }}>
              <Alert severity="info">
                Assigning <strong>{memberName}</strong>
                {member?.membership_number ? ` (${member.membership_number})` : ''} as{' '}
                <strong>{selectedPosition?.position_name}</strong>
                {wardLabel ? ` in ${wardLabel}` : ''}
              </Alert>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Appointment Method
                </Typography>
                <ToggleButtonGroup
                  value={appointmentMethod}
                  exclusive
                  fullWidth
                  onChange={(_e, value) => value && setAppointmentMethod(value)}
                >
                  <ToggleButton value="Appointed">Appointed</ToggleButton>
                  <ToggleButton value="Elected">Elected</ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Tenure Type
                </Typography>
                <ToggleButtonGroup
                  value={tenureType}
                  exclusive
                  fullWidth
                  onChange={(_e, value) => value && setTenureType(value)}
                >
                  <ToggleButton value="Permanent">Permanent</ToggleButton>
                  <ToggleButton value="Interim">Interim</ToggleButton>
                </ToggleButtonGroup>
                {tenureType === 'Interim' && (
                  <Typography variant="caption" color="text.secondary">
                    Interim assignments are recorded with the "Interim" appointment type.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12}>
                <DatePicker
                  label="Assignment Date"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes (optional)"
                  multiline
                  rows={3}
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  inputProps={{ maxLength: 1000 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} disabled={createAppointmentMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitAssignment}
              disabled={!startDate || createAppointmentMutation.isPending}
              startIcon={createAppointmentMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <AssignmentInd />}
            >
              {createAppointmentMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default WardLeadershipAssignment;
