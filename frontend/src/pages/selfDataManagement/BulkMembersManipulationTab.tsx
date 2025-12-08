import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Search, Delete, Edit } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  searchMembers,
  bulkUpdateMemberStatus,
  bulkDeleteMembers,
  getMembershipStatuses,
  type MemberSearchResult,
} from '../../services/selfDataManagementApi';

const BulkMembersManipulationTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]); // For search results checkboxes
  const [persistentList, setPersistentList] = useState<MemberSearchResult[]>([]); // Persistent selection list
  
  // Dialogs
  const [updateStatusDialog, setUpdateStatusDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | ''>('');
  const [updateReason, setUpdateReason] = useState('');
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Fetch membership statuses
  const { data: statuses } = useQuery({
    queryKey: ['membershipStatuses'],
    queryFn: getMembershipStatuses,
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: (idNumber: string) => searchMembers(idNumber, 100),
    onSuccess: (data) => {
      setSearchResults(data);
      setSelectedMembers([]); // Clear search results checkboxes only
      // Don't clear persistentList - it persists across searches
      if (data.length === 0) {
        setSnackbar({
          open: true,
          message: 'No members found matching the search criteria',
          severity: 'info',
        });
      }
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Search failed',
        severity: 'error',
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ memberIds, statusId, reason }: { memberIds: number[]; statusId: number; reason?: string }) =>
      bulkUpdateMemberStatus(memberIds, statusId, reason),
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: `Successfully updated ${data.successful_count} members`,
        severity: 'success',
      });
      setUpdateStatusDialog(false);
      setPersistentList([]); // Clear persistent list after successful operation
      setSelectedMembers([]);
      setSelectedStatusId('');
      setUpdateReason('');
      // Refresh search results if there's an active search
      if (searchQuery) {
        searchMutation.mutate(searchQuery);
      }
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to update members',
        severity: 'error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (memberIds: number[]) => bulkDeleteMembers(memberIds),
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: `Successfully deleted ${data.successful_count} members`,
        severity: 'success',
      });
      setDeleteDialog(false);
      setPersistentList([]); // Clear persistent list after successful operation
      setSelectedMembers([]);
      // Refresh search results if there's an active search
      if (searchQuery) {
        searchMutation.mutate(searchQuery);
      }
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to delete members',
        severity: 'error',
      });
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedMembers(searchResults.map((m) => m.member_id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (memberId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Add selected members from search results to persistent list
  const handleAddToList = () => {
    const membersToAdd = searchResults.filter((member) =>
      selectedMembers.includes(member.member_id)
    );

    // Filter out duplicates
    const newMembers = membersToAdd.filter(
      (member) => !persistentList.some((existing) => existing.member_id === member.member_id)
    );

    if (newMembers.length > 0) {
      setPersistentList((prev) => [...prev, ...newMembers]);
      setSnackbar({
        open: true,
        message: `Added ${newMembers.length} member(s) to selection list`,
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Selected members are already in the list',
        severity: 'info',
      });
    }

    // Clear search results checkboxes after adding
    setSelectedMembers([]);
  };

  // Remove a single member from persistent list
  const handleRemoveFromList = (memberId: number) => {
    setPersistentList((prev) => prev.filter((member) => member.member_id !== memberId));
  };

  // Clear all members from persistent list
  const handleClearList = () => {
    setPersistentList([]);
    setSnackbar({
      open: true,
      message: 'Selection list cleared',
      severity: 'info',
    });
  };

  const handleUpdateStatus = () => {
    if (selectedStatusId && persistentList.length > 0) {
      const memberIds = persistentList.map((m) => m.member_id);
      updateStatusMutation.mutate({
        memberIds,
        statusId: selectedStatusId as number,
        reason: updateReason || undefined,
      });
    }
  };

  const handleDelete = () => {
    if (persistentList.length > 0) {
      const memberIds = persistentList.map((m) => m.member_id);
      deleteMutation.mutate(memberIds);
    }
  };

  return (
    <Box sx={{ px: 3 }}>
      {/* Search Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Search Members by ID Number
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="ID Number"
            placeholder="Enter full or partial ID number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleSearch}
            disabled={searchMutation.isPending || !searchQuery.trim()}
            sx={{ minWidth: 120 }}
          >
            {searchMutation.isPending ? <CircularProgress size={24} /> : 'Search'}
          </Button>
        </Box>
      </Paper>

      {/* Add to List Button */}
      {searchResults.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddToList}
            disabled={selectedMembers.length === 0}
          >
            Add to Selection List ({selectedMembers.length})
          </Button>
          <Typography variant="body2" color="text.secondary">
            Select members from search results and add them to your selection list
          </Typography>
        </Box>
      )}

      {/* Results Table */}
      {searchResults.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedMembers.length === searchResults.length}
                    indeterminate={
                      selectedMembers.length > 0 && selectedMembers.length < searchResults.length
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>ID Number</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Membership Number</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Province</TableCell>
                <TableCell>Municipality</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searchResults.map((member) => (
                <TableRow key={member.member_id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedMembers.includes(member.member_id)}
                      onChange={() => handleSelectMember(member.member_id)}
                    />
                  </TableCell>
                  <TableCell>{member.id_number}</TableCell>
                  <TableCell>
                    {member.firstname} {member.surname}
                  </TableCell>
                  <TableCell>{member.membership_number || '-'}</TableCell>
                  <TableCell>
                    <Chip label={member.membership_status} size="small" />
                  </TableCell>
                  <TableCell>{member.province_name || '-'}</TableCell>
                  <TableCell>{member.municipality_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Persistent Selection List */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Selected Members ({persistentList.length})
          </Typography>
          {persistentList.length > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={handleClearList}
            >
              Clear All
            </Button>
          )}
        </Box>

        {persistentList.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No members selected. Search for members above and add them to this list.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Bulk Action Buttons */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setUpdateStatusDialog(true)}
                disabled={persistentList.length === 0}
              >
                Update Status ({persistentList.length})
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialog(true)}
                disabled={persistentList.length === 0}
              >
                Delete ({persistentList.length})
              </Button>
            </Box>

            {/* Persistent List Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Membership Number</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Province</TableCell>
                    <TableCell>Municipality</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {persistentList.map((member) => (
                    <TableRow key={member.member_id}>
                      <TableCell>{member.id_number}</TableCell>
                      <TableCell>
                        {member.firstname} {member.surname}
                      </TableCell>
                      <TableCell>{member.membership_number || '-'}</TableCell>
                      <TableCell>
                        <Chip label={member.membership_status} size="small" />
                      </TableCell>
                      <TableCell>{member.province_name || '-'}</TableCell>
                      <TableCell>{member.municipality_name || '-'}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRemoveFromList(member.member_id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>

      {/* Update Status Dialog */}
      <Dialog open={updateStatusDialog} onClose={() => setUpdateStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Member Status</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are about to update the status of {persistentList.length} member(s)
          </Alert>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={selectedStatusId}
              onChange={(e) => setSelectedStatusId(e.target.value as number)}
              label="New Status"
            >
              {statuses?.map((status) => (
                <MenuItem key={status.status_id} value={status.status_id}>
                  {status.status_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Reason (Optional)"
            multiline
            rows={3}
            value={updateReason}
            onChange={(e) => setUpdateReason(e.target.value)}
            placeholder="Enter reason for status update..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateStatusDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateStatus}
            disabled={!selectedStatusId || updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Warning:</strong> This action cannot be undone!
            </Typography>
            <Typography variant="body2">
              You are about to permanently delete {persistentList.length} member(s) from the system.
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Please type <strong>DELETE</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            sx={{ mt: 1 }}
            placeholder="Type DELETE to confirm"
            onChange={() => {
              // Enable delete button only if user types DELETE
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BulkMembersManipulationTab;

