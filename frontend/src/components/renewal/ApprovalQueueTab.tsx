/**
 * Approval Queue Tab Component
 * Displays pending approvals with approve/reject actions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Refresh,
  HourglassEmpty,
} from '@mui/icons-material';
import {
  getPendingApprovals,
  approveRenewal,
  rejectRenewal,
} from '../../services/renewalBulkUploadService';
import type { ApprovalRequest } from '../../types/renewalBulkUpload';

const ApprovalQueueTab: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await getPendingApprovals();
      if (response.success) {
        setApprovals(response.data.renewals || []);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setApprovalNotes('');
    setShowApproveDialog(true);
  };

  const handleReject = (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const confirmApprove = async () => {
    if (!selectedApproval) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const response = await approveRenewal(selectedApproval.approval_id, {
        approval_notes: approvalNotes,
      });
      if (response.success) {
        setSuccessMessage('Renewal approved successfully');
        setShowApproveDialog(false);
        fetchApprovals();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to approve renewal');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedApproval) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const response = await rejectRenewal(selectedApproval.approval_id, {
        rejection_reason: rejectionReason,
      });
      if (response.success) {
        setSuccessMessage('Renewal rejected successfully');
        setShowRejectDialog(false);
        fetchApprovals();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to reject renewal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (priority) {
      case 'Urgent':
        return 'error';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      default:
        return 'default';
    }
  };

  // Filter approvals
  const filteredApprovals = approvals.filter((approval) => {
    const matchesLevel = levelFilter === 'all' || approval.approval_level === levelFilter;
    const matchesPriority = priorityFilter === 'all' || approval.review_priority === priorityFilter;
    return matchesLevel && matchesPriority;
  });

  // Paginate approvals
  const paginatedApprovals = filteredApprovals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Approval Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and approve/reject pending renewals
          </Typography>
        </Box>
        <Button
          startIcon={<Refresh />}
          onClick={fetchApprovals}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Approval Level</InputLabel>
              <Select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                label="Approval Level"
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="Provincial">Provincial</MenuItem>
                <MenuItem value="Regional">Regional</MenuItem>
                <MenuItem value="National">National</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                label="Priority"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="Urgent">Urgent</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member ID</TableCell>
              <TableCell>Member Name</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Requested At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedApprovals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {loading ? 'Loading...' : 'No pending approvals'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedApprovals.map((approval) => (
                <TableRow key={approval.approval_id} hover>
                  <TableCell>{approval.member_id_number || 'N/A'}</TableCell>
                  <TableCell>{approval.member_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip label={approval.approval_level} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={approval.review_priority}
                      color={getPriorityColor(approval.review_priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{approval.review_reason || 'N/A'}</TableCell>
                  <TableCell>{approval.requested_by_name || 'N/A'}</TableCell>
                  <TableCell>
                    {new Date(approval.requested_at).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => handleApprove(approval)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleReject(approval)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredApprovals.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Renewal</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to approve this renewal?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Approval Notes (Optional)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="Add any notes about this approval..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmApprove}
            variant="contained"
            color="success"
            disabled={actionLoading}
            startIcon={<CheckCircle />}
          >
            {actionLoading ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Renewal</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this renewal.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason *"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this renewal is being rejected..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmReject}
            variant="contained"
            color="error"
            disabled={actionLoading || !rejectionReason.trim()}
            startIcon={<Cancel />}
          >
            {actionLoading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalQueueTab;

