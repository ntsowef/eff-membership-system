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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Search, Delete, Warning } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import {
  previewRemovalByIds,
  removeByIds,
  type MemberForRemoval,
  type PreviewByIdsResult,
} from '../../services/selfDataManagementApi';

interface RemoveByIdNumbersTabProps {
  onSuccess?: () => void;
}

const RemoveByIdNumbersTab: React.FC<RemoveByIdNumbersTabProps> = ({ onSuccess }) => {
  const [idNumbersInput, setIdNumbersInput] = useState('');
  const [previewResult, setPreviewResult] = useState<PreviewByIdsResult | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [removalReason, setRemovalReason] = useState('Termination of Membership');
  const [removalType, setRemovalType] = useState('terminated');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (ids: string[]) => previewRemovalByIds(ids),
    onSuccess: (data) => {
      setPreviewResult(data);
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to preview members');
      setPreviewResult(null);
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: () => removeByIds(
      previewResult?.found.map(m => m.id_number) || [],
      removalReason,
      removalType
    ),
    onSuccess: (data) => {
      setSuccess(`Successfully removed ${data.successful} member(s). Batch ID: ${data.batch_id}`);
      setConfirmDialog(false);
      setPreviewResult(null);
      setIdNumbersInput('');
      setConfirmText('');
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to remove members');
    },
  });

  const handlePreview = () => {
    const ids = idNumbersInput
      .split(/[\n,;]/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      setError('Please enter at least one ID number');
      return;
    }

    previewMutation.mutate(ids);
  };

  const handleRemove = () => {
    if (confirmText !== 'REMOVE') {
      setError('Please type REMOVE to confirm');
      return;
    }
    removeMutation.mutate();
  };

  return (
    <Box>
      {/* Input Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Enter ID Numbers to Remove
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter ID numbers separated by new lines, commas, or semicolons
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          placeholder="Enter ID numbers here...&#10;7001015009082&#10;8505125009083&#10;9012125009084"
          value={idNumbersInput}
          onChange={(e) => setIdNumbersInput(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          startIcon={previewMutation.isPending ? <CircularProgress size={20} /> : <Search />}
          onClick={handlePreview}
          disabled={previewMutation.isPending || !idNumbersInput.trim()}
        >
          Preview Members
        </Button>
      </Paper>

      {/* Error/Success Messages */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Preview Results */}
      {previewResult && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Preview Results
            </Typography>
            <Box>
              <Chip label={`Found: ${previewResult.total_found}`} color="success" sx={{ mr: 1 }} />
              <Chip label={`Not Found: ${previewResult.not_found.length}`} color="warning" />
            </Box>
          </Box>

          {/* Found Members Table */}
          {previewResult.found.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Members Found ({previewResult.found.length})
              </Typography>
              <TableContainer sx={{ maxHeight: 300, mb: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID Number</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Province</TableCell>
                      <TableCell>Municipality</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewResult.found.map((member) => (
                      <TableRow key={member.member_id}>
                        <TableCell>{member.id_number}</TableCell>
                        <TableCell>{member.firstname} {member.surname}</TableCell>
                        <TableCell>{member.province_name || '-'}</TableCell>
                        <TableCell>{member.municipality_name || '-'}</TableCell>
                        <TableCell><Chip label={member.membership_status} size="small" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Not Found IDs */}
          {previewResult.not_found.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">IDs Not Found ({previewResult.not_found.length}):</Typography>
              <Typography variant="body2">{previewResult.not_found.join(', ')}</Typography>
            </Alert>
          )}

          {/* Remove Button */}
          {previewResult.found.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={() => setConfirmDialog(true)}
            >
              Remove {previewResult.found.length} Member(s)
            </Button>
          )}
        </Paper>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Warning color="error" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Confirm Member Removal
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>WARNING:</strong> This action will permanently remove {previewResult?.found.length} member(s)
            from the active members list.
            {removalReason === 'Data Cleanup' || removalReason === 'Deceased'
              ? ' Records will be deleted directly without archiving.'
              : ' They will be archived to the expelled members table.'}
          </Alert>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Removal Reason</InputLabel>
            <Select value={removalReason} onChange={(e) => setRemovalReason(e.target.value)} label="Removal Reason">
              <MenuItem value="Termination of Membership">Termination of Membership</MenuItem>
              <MenuItem value="Expelled">Expelled</MenuItem>
              <MenuItem value="Suspended">Suspended</MenuItem>
              <MenuItem value="Deceased">Deceased</MenuItem>
              <MenuItem value="Duplicate Record">Duplicate Record</MenuItem>
              <MenuItem value="Data Cleanup">Data Cleanup</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Removal Type</InputLabel>
            <Select value={removalType} onChange={(e) => setRemovalType(e.target.value)} label="Removal Type">
              <MenuItem value="terminated">Terminated</MenuItem>
              <MenuItem value="expelled">Expelled</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
              <MenuItem value="deceased">Deceased</MenuItem>
              <MenuItem value="data_cleanup">Data Cleanup</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" sx={{ mb: 1 }}>
            Type <strong>REMOVE</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Type REMOVE"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDialog(false); setConfirmText(''); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemove}
            disabled={confirmText !== 'REMOVE' || removeMutation.isPending}
          >
            {removeMutation.isPending ? <CircularProgress size={24} /> : 'Confirm Removal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RemoveByIdNumbersTab;

