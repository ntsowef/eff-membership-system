// LeadershipRoster Component
// Lists current leaders by structure and allows suspend/terminate actions

import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Delete,
  Person,
  FilterList,
  ViewModule,
  ViewList,
  LocationOn,
  DeleteForever,
  Pause,
  MoreVert
} from '@mui/icons-material';
import { LeadershipAPI, type LeadershipAppointmentDetails } from '../../services/leadershipApi';
import GeographicSelector, { type GeographicSelection } from './GeographicSelector';
import { useProvinceContext } from '../../hooks/useProvinceContext';

const levelOptions = ['National', 'Province', 'Municipality', 'Ward'] as const;

type Level = typeof levelOptions[number];
type ViewMode = 'cards' | 'table';

const LeadershipRoster: React.FC = () => {
  const [level, setLevel] = useState<Level>('National');
  const [geo, setGeo] = useState<GeographicSelection | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();

  // Action menu state
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<LeadershipAppointmentDetails | null>(null);

  // Dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ appt?: LeadershipAppointmentDetails; reason: string; endDate?: string }>({ reason: '' });
  const [terminateError, setTerminateError] = useState<string>('');
  const [removeError, setRemoveError] = useState<string>('');
  const [removalReason, setRemovalReason] = useState<string>('');

  const queryClient = useQueryClient();

  const filters = useMemo(() => {
    const f: any = {};
    if (level) f.hierarchy_level = level;
    if (geo?.entityId) f.entity_id = geo.entityId;
    if (search.trim()) f.q = search.trim();
    return f;
  }, [level, geo, search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leadership-appointments', filters],
    queryFn: () => LeadershipAPI.getCurrentAppointments(filters),
    staleTime: 60_000,
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, reason, endDate }: { id: number; reason: string; endDate?: string }) =>
      LeadershipAPI.terminateAppointment(id, reason, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadership-appointments'] });
      setConfirmOpen(false);
      setConfirmData({ reason: '' });
      setTerminateError('');
    },
    onError: (e: any) => {
      const msg = e?.message || 'Failed to terminate appointment';
      setTerminateError(msg);
    }
  });

  const removeFromPositionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      LeadershipAPI.removeFromPosition(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadership-appointments'] });
      setRemoveConfirmOpen(false);
      setSelectedAppointment(null);
      setRemoveError('');
      setRemovalReason('');
    },
    onError: (error: any) => {
      setRemoveError(error.response?.data?.error?.message || 'Failed to remove from position');
    }
  });

  const appointments = data?.appointments || [];

  const handleAskTerminate = (appt: LeadershipAppointmentDetails) => {
    setConfirmData({ appt, reason: '' });
    setConfirmOpen(true);
  };

  const handleAskRemoveFromPosition = (appt: LeadershipAppointmentDetails) => {
    setSelectedAppointment(appt);
    setRemoveConfirmOpen(true);
    setRemoveError('');
    setRemovalReason('');
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, appt: LeadershipAppointmentDetails) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedAppointment(appt);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedAppointment(null);
  };

  const handleConfirmTerminate = () => {
    if (!confirmData.appt) return;
    const reason = (confirmData.reason || '').trim();
    if (reason.length < 10) {
      setTerminateError('Reason must be at least 10 characters.');
      return;
    }
    setTerminateError('');
    terminateMutation.mutate({ id: confirmData.appt.id, reason, endDate: confirmData.endDate });
  };

  const handleConfirmRemoveFromPosition = () => {
    if (!selectedAppointment) return;
    const reason = removalReason.trim();
    if (reason.length < 5) {
      setRemoveError('Reason must be at least 5 characters.');
      return;
    }
    setRemoveError('');
    removeFromPositionMutation.mutate({ id: selectedAppointment.id, reason });
  };

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" /> Leadership Roster
              </Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField select fullWidth label="Leadership Level" value={level} onChange={e => setLevel(e.target.value as Level)}>
                {levelOptions.map(l => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField fullWidth label="Search leader or position" value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <FilterList /> }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  View:
                </Typography>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                >
                  <ToggleButton value="cards" aria-label="card view">
                    <Tooltip title="Card View">
                      <ViewModule />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="table" aria-label="table view">
                    <Tooltip title="Table View">
                      <ViewList />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {level !== 'National' && (
        <GeographicSelector hierarchyLevel={level} onSelectionChange={setGeo} />
      )}

      <Card>
        <CardContent>
          {isLoading && (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          )}
          {error && (
            <Alert severity="error">Failed to load appointments</Alert>
          )}
          {!isLoading && appointments.length === 0 && (
            <Alert severity="info">No leaders found for this scope.</Alert>
          )}

          {/* Card View */}
          {viewMode === 'cards' && (
            <Grid container spacing={2}>
              {appointments.map(appt => (
                <Grid item xs={12} md={6} key={appt.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Position</Typography>
                          <Typography variant="h6">{appt.position_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{appt.position_code}</Typography>
                          <Box mt={1}>
                            <Chip label={appt.hierarchy_level} size="small" color={
                              appt.hierarchy_level === 'National' ? 'error' : appt.hierarchy_level === 'Province' ? 'warning' : appt.hierarchy_level === 'Municipality' ? 'info' : 'success'
                            } />
                          </Box>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="subtitle2" color="text.secondary">Leader</Typography>
                          <Typography variant="h6">{appt.member_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{appt.member_number}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {appt.entity_name || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" justifyContent="space-between" mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          Started: {new Date(appt.start_date).toLocaleDateString()}
                        </Typography>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Actions">
                            <IconButton
                              onClick={(e) => handleActionMenuOpen(e, appt)}
                              size="small"
                            >
                              <MoreVert />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell>Leader</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Appointed By</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appointments.map(appt => (
                    <TableRow key={appt.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {appt.position_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appt.position_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {appt.member_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appt.member_number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appt.hierarchy_level}
                          size="small"
                          color={
                            appt.hierarchy_level === 'National' ? 'error' :
                            appt.hierarchy_level === 'Province' ? 'warning' :
                            appt.hierarchy_level === 'Municipality' ? 'info' : 'success'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">
                            {appt.entity_name || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(appt.start_date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appt.appointed_by_name || 'System'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionMenuOpen(e, appt)}
                          >
                            <MoreVert />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Terminate dialog */}
      <Dialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setTerminateError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Terminate/Suspend Appointment</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will set the appointment to a non-active state. Provide a reason and optional end date.
          </Alert>
          {terminateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {terminateError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Reason"
            value={confirmData.reason}
            onChange={e => setConfirmData(prev => ({ ...prev, reason: e.target.value }))}
            multiline rows={3}
            error={(confirmData.reason || '').trim().length > 0 && (confirmData.reason || '').trim().length < 10}
            helperText={((confirmData.reason || '').trim().length < 10) ? 'Reason must be at least 10 characters.' : ' '}
          />
          <TextField
            fullWidth
            type="date"
            label="End date (optional)"
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
            value={confirmData.endDate || ''}
            onChange={e => setConfirmData(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmOpen(false); setTerminateError(''); }}>Cancel</Button>
          <Button onClick={handleConfirmTerminate} variant="contained" color="error" disabled={terminateMutation.isPending || (confirmData.reason || '').trim().length < 10}>
            {terminateMutation.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => {
            handleActionMenuClose();
            if (selectedAppointment) handleAskTerminate(selectedAppointment);
          }}
        >
          <ListItemIcon>
            <Pause fontSize="small" />
          </ListItemIcon>
          <ListItemText>Suspend/Terminate</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleActionMenuClose();
            if (selectedAppointment) handleAskRemoveFromPosition(selectedAppointment);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteForever fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Remove from Position</ListItemText>
        </MenuItem>
      </Menu>

      {/* Remove from Position Confirmation Dialog */}
      <Dialog open={removeConfirmOpen} onClose={() => setRemoveConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForever />
          Remove from Leadership Position
        </DialogTitle>
        <DialogContent>
          {removeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {removeError}
            </Alert>
          )}
          <Typography variant="body1" sx={{ mb: 2 }}>
            Remove this member from their leadership position? The position will become <strong>vacant</strong> and available for new appointments.
          </Typography>
          {selectedAppointment && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Position: <strong>{selectedAppointment.position_name}</strong>
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Member: <strong>{selectedAppointment.member_name}</strong>
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Level: <strong>{selectedAppointment.hierarchy_level}</strong>
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Entity: <strong>{selectedAppointment.entity_name}</strong>
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Reason for Removal"
            multiline
            rows={3}
            value={removalReason}
            onChange={(e) => setRemovalReason(e.target.value)}
            placeholder="Enter reason for removing this member from the position..."
            sx={{ mb: 2 }}
            error={removeError.includes('Reason')}
            helperText="Minimum 5 characters required"
          />
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This will mark the appointment as "Completed" and make the position vacant for new appointments.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmRemoveFromPosition}
            variant="contained"
            color="error"
            disabled={removeFromPositionMutation.isPending || removalReason.trim().length < 5}
            startIcon={removeFromPositionMutation.isPending ? <CircularProgress size={16} /> : <DeleteForever />}
          >
            {removeFromPositionMutation.isPending ? 'Removing...' : 'Remove from Position'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeadershipRoster;

