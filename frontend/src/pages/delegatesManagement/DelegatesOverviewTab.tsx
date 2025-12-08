import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { delegatesManagementApi } from '../../services/delegatesManagementApi';
import type { DelegateFilters } from '../../services/delegatesManagementApi';

interface DelegatesOverviewTabProps {
  filters: DelegateFilters;
}

const DelegatesOverviewTab: React.FC<DelegatesOverviewTabProps> = ({ filters }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedDelegate, setSelectedDelegate] = useState<any>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Fetch delegates
  const { data: delegates = [], isLoading, error } = useQuery({
    queryKey: ['all-delegates', filters],
    queryFn: () => delegatesManagementApi.getAllDelegates(filters),
  });

  // Update delegate mutation
  const updateMutation = useMutation({
    mutationFn: ({ delegateId, data }: { delegateId: number; data: any }) =>
      delegatesManagementApi.updateDelegate(delegateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-delegates'] });
      queryClient.invalidateQueries({ queryKey: ['delegate-statistics'] });
      setOpenEditDialog(false);
      setSelectedDelegate(null);
    },
  });

  // Remove delegate mutation
  const removeMutation = useMutation({
    mutationFn: ({ delegateId, reason }: { delegateId: number; reason: string }) =>
      delegatesManagementApi.removeDelegate(delegateId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-delegates'] });
      queryClient.invalidateQueries({ queryKey: ['delegate-statistics'] });
      setOpenRemoveDialog(false);
      setSelectedDelegate(null);
      setRemoveReason('');
    },
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEdit = (delegate: any) => {
    setSelectedDelegate(delegate);
    setEditNotes(delegate.notes || '');
    setOpenEditDialog(true);
  };

  const handleRemove = (delegate: any) => {
    setSelectedDelegate(delegate);
    setOpenRemoveDialog(true);
  };

  const handleSaveEdit = () => {
    if (selectedDelegate) {
      updateMutation.mutate({
        delegateId: selectedDelegate.delegate_id,
        data: { notes: editNotes },
      });
    }
  };

  const handleConfirmRemove = () => {
    if (selectedDelegate && removeReason.trim()) {
      removeMutation.mutate({
        delegateId: selectedDelegate.delegate_id,
        reason: removeReason,
      });
    }
  };

  const getAssemblyColor = (code: string) => {
    switch (code) {
      case 'SRPA': return 'primary';
      case 'PPA': return 'secondary';
      case 'NPA': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load delegates. Please try again later.
      </Alert>
    );
  }

  if (delegates.length === 0) {
    return (
      <Alert severity="info">
        No delegates found matching the selected filters.
      </Alert>
    );
  }

  const paginatedDelegates = delegates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        All Delegates ({delegates.length})
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member Name</TableCell>
              <TableCell>Ward</TableCell>
              <TableCell>Municipality</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Assembly</TableCell>
              <TableCell>Selection Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedDelegates.map((delegate: any) => (
              <TableRow key={delegate.delegate_id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {delegate.member_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {delegate.id_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{delegate.ward_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {delegate.ward_code}
                  </Typography>
                </TableCell>
                <TableCell>{delegate.municipality_name}</TableCell>
                <TableCell>{delegate.province_name}</TableCell>
                <TableCell>
                  <Chip
                    label={delegate.assembly_code}
                    size="small"
                    color={getAssemblyColor(delegate.assembly_code)}
                  />
                </TableCell>
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
                  {delegate.cell_number && (
                    <Tooltip title={delegate.cell_number}>
                      <IconButton size="small">
                        <PhoneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {delegate.email && (
                    <Tooltip title={delegate.email}>
                      <IconButton size="small">
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  {delegate.delegate_status === 'Active' && (
                    <>
                      <Tooltip title="Edit Notes">
                        <IconButton size="small" onClick={() => handleEdit(delegate)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove Delegate">
                        <IconButton size="small" color="error" onClick={() => handleRemove(delegate)}>
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

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={delegates.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Delegate Notes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={updateMutation.isPending}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={openRemoveDialog} onClose={() => setOpenRemoveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Delegate</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will mark the delegate as inactive. Please provide a reason.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for Removal"
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemoveDialog(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmRemove}
            variant="contained"
            color="error"
            disabled={!removeReason.trim() || removeMutation.isPending}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DelegatesOverviewTab;

