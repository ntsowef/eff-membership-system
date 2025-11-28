import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Tooltip,
  Autocomplete,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  SwapHoriz as ReplaceIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wardAuditApi } from '../../services/wardAuditApi';

interface WardDelegateManagementProps {
  wardCode: string;
  wardName: string;
}

interface DelegateFormData {
  member_id: number | null;
  assembly_code: 'SRPA' | 'PPA' | 'NPA';
  selection_method: 'Elected' | 'Appointed' | 'Ex-Officio';
  term_start_date: string;
  term_end_date: string;
  notes: string;
}

interface WardMember {
  member_id: number;
  firstname: string;
  surname: string;
  full_name: string;
  id_number: string;
  membership_status: string;
  cell_number: string;
  active_delegate_count: number;
  delegate_assemblies: string | null;
}

const WardDelegateManagement: React.FC<WardDelegateManagementProps> = ({ wardCode, wardName }) => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<any>(null);
  const [formData, setFormData] = useState<DelegateFormData>({
    member_id: null,
    assembly_code: 'SRPA',
    selection_method: 'Elected',
    term_start_date: '',
    term_end_date: '',
    notes: '',
  });
  const [replaceData, setReplaceData] = useState({
    new_member_id: null as number | null,
    reason: '',
  });
  const [selectedMember, setSelectedMember] = useState<WardMember | null>(null);
  const [replaceMember, setReplaceMember] = useState<WardMember | null>(null);

  // Fetch ward delegates
  const { data: delegates = [], isLoading } = useQuery({
    queryKey: ['ward-delegates', wardCode],
    queryFn: () => wardAuditApi.getWardDelegates(wardCode),
  });

  // Fetch assembly types
  const { data: assemblyTypes = [] } = useQuery({
    queryKey: ['assembly-types'],
    queryFn: () => wardAuditApi.getAssemblyTypes(),
  });

  // Fetch ward members for delegate assignment
  const { data: wardMembers = [] } = useQuery<WardMember[]>({
    queryKey: ['ward-members', wardCode],
    queryFn: () => wardAuditApi.getWardMembers(wardCode),
    enabled: openDialog || openReplaceDialog,
  });

  // Assign delegate mutation
  const assignDelegateMutation = useMutation({
    mutationFn: (data: any) => wardAuditApi.assignDelegate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward-delegates', wardCode] });
      queryClient.invalidateQueries({ queryKey: ['ward-compliance-details', wardCode] });
      setOpenDialog(false);
      resetForm();
    },
  });

  // Replace delegate mutation
  const replaceDelegateMutation = useMutation({
    mutationFn: ({ delegateId, newMemberId, reason }: any) =>
      wardAuditApi.replaceDelegateAssignment(delegateId, newMemberId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward-delegates', wardCode] });
      queryClient.invalidateQueries({ queryKey: ['ward-compliance-details', wardCode] });
      setOpenReplaceDialog(false);
      setSelectedDelegate(null);
      setReplaceData({ new_member_id: '', reason: '' });
    },
  });

  // Remove delegate mutation
  const removeDelegateMutation = useMutation({
    mutationFn: ({ delegateId, reason }: any) =>
      wardAuditApi.removeDelegateAssignment(delegateId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward-delegates', wardCode] });
      queryClient.invalidateQueries({ queryKey: ['ward-compliance-details', wardCode] });
    },
  });

  const resetForm = () => {
    setFormData({
      member_id: null,
      assembly_code: 'SRPA',
      selection_method: 'Elected',
      term_start_date: '',
      term_end_date: '',
      notes: '',
    });
    setSelectedMember(null);
  };

  const handleSubmit = () => {
    if (!formData.member_id || !formData.assembly_code) return;

    assignDelegateMutation.mutate({
      ward_code: wardCode,
      member_id: formData.member_id,
      assembly_code: formData.assembly_code,
      selection_method: formData.selection_method,
      term_start_date: formData.term_start_date,
      term_end_date: formData.term_end_date,
      notes: formData.notes,
    });
  };

  const handleReplace = () => {
    if (!selectedDelegate || !replaceData.new_member_id || !replaceData.reason) return;

    replaceDelegateMutation.mutate({
      delegateId: selectedDelegate.delegate_id,
      newMemberId: replaceData.new_member_id,
      reason: replaceData.reason,
    });
  };

  const handleRemove = (delegate: any) => {
    const reason = prompt('Please provide a reason for removing this delegate:');
    if (!reason) return;

    removeDelegateMutation.mutate({
      delegateId: delegate.delegate_id,
      reason,
    });
  };

  const handleChange = (field: keyof DelegateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Count delegates by assembly
  const DELEGATE_LIMIT = 3;
  const srpaDelegates = delegates.filter((d: any) => d.assembly_code === 'SRPA' && d.delegate_status === 'Active').length;
  const ppaDelegates = delegates.filter((d: any) => d.assembly_code === 'PPA' && d.delegate_status === 'Active').length;
  const npaDelegates = delegates.filter((d: any) => d.assembly_code === 'NPA' && d.delegate_status === 'Active').length;

  // Check if current assembly has reached limit
  const currentAssemblyCount = useMemo(() => {
    if (formData.assembly_code === 'SRPA') return srpaDelegates;
    if (formData.assembly_code === 'PPA') return ppaDelegates;
    if (formData.assembly_code === 'NPA') return npaDelegates;
    return 0;
  }, [formData.assembly_code, srpaDelegates, ppaDelegates, npaDelegates]);

  const canAssignToCurrentAssembly = currentAssemblyCount < DELEGATE_LIMIT;

  // Filter available members (not already assigned to the selected assembly)
  const availableMembers = useMemo(() => {
    const assignedMemberIds = delegates
      .filter((d: any) => d.assembly_code === formData.assembly_code && d.delegate_status === 'Active')
      .map((d: any) => d.member_id);

    return wardMembers.filter(m => !assignedMemberIds.includes(m.member_id));
  }, [wardMembers, delegates, formData.assembly_code]);

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Ward Delegates - {wardName}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Assign Delegate
            </Button>
          </Box>

          {/* Delegate Summary */}
          <Box display="flex" gap={2} mb={3}>
            <Tooltip title={srpaDelegates >= DELEGATE_LIMIT ? 'Maximum delegates reached' : `${DELEGATE_LIMIT - srpaDelegates} slots remaining`}>
              <Chip
                label={`SRPA: ${srpaDelegates}/${DELEGATE_LIMIT}`}
                color={srpaDelegates >= DELEGATE_LIMIT ? 'error' : srpaDelegates > 0 ? 'success' : 'default'}
                icon={srpaDelegates >= DELEGATE_LIMIT ? <WarningIcon /> : undefined}
              />
            </Tooltip>
            <Tooltip title={ppaDelegates >= DELEGATE_LIMIT ? 'Maximum delegates reached' : `${DELEGATE_LIMIT - ppaDelegates} slots remaining`}>
              <Chip
                label={`PPA: ${ppaDelegates}/${DELEGATE_LIMIT}`}
                color={ppaDelegates >= DELEGATE_LIMIT ? 'error' : ppaDelegates > 0 ? 'success' : 'default'}
                icon={ppaDelegates >= DELEGATE_LIMIT ? <WarningIcon /> : undefined}
              />
            </Tooltip>
            <Tooltip title={npaDelegates >= DELEGATE_LIMIT ? 'Maximum delegates reached' : `${DELEGATE_LIMIT - npaDelegates} slots remaining`}>
              <Chip
                label={`NPA: ${npaDelegates}/${DELEGATE_LIMIT}`}
                color={npaDelegates >= DELEGATE_LIMIT ? 'error' : npaDelegates > 0 ? 'success' : 'default'}
                icon={npaDelegates >= DELEGATE_LIMIT ? <WarningIcon /> : undefined}
              />
            </Tooltip>
          </Box>

          {isLoading ? (
            <Typography>Loading delegates...</Typography>
          ) : delegates.length === 0 ? (
            <Alert severity="info">
              No delegates assigned. Click "Assign Delegate" to add delegates for SRPA, PPA, and NPA assemblies.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member Name</TableCell>
                    <TableCell>Assembly</TableCell>
                    <TableCell>Selection Method</TableCell>
                    <TableCell>Selection Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {delegates.map((delegate: any) => (
                    <TableRow key={delegate.delegate_id}>
                      <TableCell>{delegate.member_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={delegate.assembly_code}
                          size="small"
                          color={
                            delegate.assembly_code === 'SRPA' ? 'primary' :
                            delegate.assembly_code === 'PPA' ? 'secondary' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{delegate.selection_method}</TableCell>
                      <TableCell>
                        {new Date(delegate.selection_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={delegate.delegate_status}
                          size="small"
                          color={delegate.delegate_status === 'Active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {delegate.delegate_status === 'Active' && (
                          <>
                            <Tooltip title="Replace Delegate">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedDelegate(delegate);
                                  setOpenReplaceDialog(true);
                                }}
                              >
                                <ReplaceIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove Delegate">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemove(delegate)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Assign Delegate Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Assign Ward Delegate</DialogTitle>
        <DialogContent>
          {!canAssignToCurrentAssembly && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Maximum limit of {DELEGATE_LIMIT} delegates reached for {formData.assembly_code}.
              Please select a different assembly or remove an existing delegate first.
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Assembly Type"
                value={formData.assembly_code}
                onChange={(e) => {
                  handleChange('assembly_code', e.target.value);
                  setSelectedMember(null);
                  handleChange('member_id', null);
                }}
                required
              >
                <MenuItem value="SRPA">
                  SRPA (Sub-Regional) - {srpaDelegates}/{DELEGATE_LIMIT} assigned
                </MenuItem>
                <MenuItem value="PPA">
                  PPA (Provincial) - {ppaDelegates}/{DELEGATE_LIMIT} assigned
                </MenuItem>
                <MenuItem value="NPA">
                  NPA (National) - {npaDelegates}/{DELEGATE_LIMIT} assigned
                </MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                options={availableMembers}
                value={selectedMember}
                onChange={(_, newValue) => {
                  setSelectedMember(newValue);
                  handleChange('member_id', newValue?.member_id || null);
                }}
                getOptionLabel={(option) => `${option.full_name} (ID: ${option.member_id})`}
                renderOption={(props, option) => {
                  const { key, ...rest } = props as any;
                  return (
                    <Box component="li" {...rest} key={key}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" component="span">
                          {option.full_name}
                          {option.active_delegate_count > 0 && (
                            <Chip
                              size="small"
                              label={`Delegate: ${option.delegate_assemblies}`}
                              color="info"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="span">
                          ID: {option.member_id} | Status: {option.membership_status || 'Unknown'} | Cell: {option.cell_number || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Member"
                    required
                    helperText={`${availableMembers.length} eligible members available for ${formData.assembly_code}`}
                  />
                )}
                disabled={!canAssignToCurrentAssembly}
                noOptionsText="No eligible members available"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Selection Method"
                value={formData.selection_method}
                onChange={(e) => handleChange('selection_method', e.target.value)}
              >
                <MenuItem value="Elected">Elected</MenuItem>
                <MenuItem value="Appointed">Appointed</MenuItem>
                <MenuItem value="Ex-Officio">Ex-Officio</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Term Start Date"
                value={formData.term_start_date}
                onChange={(e) => handleChange('term_start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Term End Date"
                value={formData.term_end_date}
                onChange={(e) => handleChange('term_end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about the delegate assignment"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={assignDelegateMutation.isPending || !formData.member_id || !canAssignToCurrentAssembly}
          >
            {assignDelegateMutation.isPending ? 'Assigning...' : 'Assign Delegate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Replace Delegate Dialog */}
      <Dialog open={openReplaceDialog} onClose={() => setOpenReplaceDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Replace Delegate</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="info">
                Replacing: {selectedDelegate?.member_name} ({selectedDelegate?.assembly_code})
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                options={wardMembers.filter(m => m.member_id !== selectedDelegate?.member_id)}
                value={replaceMember}
                onChange={(_, newValue) => {
                  setReplaceMember(newValue);
                  setReplaceData(prev => ({ ...prev, new_member_id: newValue?.member_id || null }));
                }}
                getOptionLabel={(option) => `${option.full_name} (ID: ${option.member_id})`}
                renderOption={(props, option) => {
                  const { key, ...rest } = props as any;
                  return (
                    <Box component="li" {...rest} key={key}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" component="span">
                          {option.full_name}
                          {option.active_delegate_count > 0 && (
                            <Chip
                              size="small"
                              label={`Delegate: ${option.delegate_assemblies}`}
                              color="info"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="span">
                          ID: {option.member_id} | Status: {option.membership_status || 'Unknown'} | Cell: {option.cell_number || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Replacement Member"
                    required
                    helperText="Choose a member to replace the current delegate"
                  />
                )}
                noOptionsText="No eligible members available"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for Replacement"
                value={replaceData.reason}
                onChange={(e) => setReplaceData(prev => ({ ...prev, reason: e.target.value }))}
                required
                placeholder="e.g., Original delegate resigned, relocated, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReplaceDialog(false)}>Cancel</Button>
          <Button
            onClick={handleReplace}
            variant="contained"
            disabled={replaceDelegateMutation.isPending || !replaceData.new_member_id || !replaceData.reason}
          >
            {replaceDelegateMutation.isPending ? 'Replacing...' : 'Replace Delegate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WardDelegateManagement;

