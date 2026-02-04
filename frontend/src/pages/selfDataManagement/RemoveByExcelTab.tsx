import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
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
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import { CloudUpload, Delete, Warning, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import {
  previewRemovalByExcel,
  removeByExcel,
  type PreviewExcelResult,
  type ExcelPreviewRow,
} from '../../services/selfDataManagementApi';

interface RemoveByExcelTabProps {
  onSuccess?: () => void;
}

const RemoveByExcelTab: React.FC<RemoveByExcelTabProps> = ({ onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewExcelResult | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [removalReason, setRemovalReason] = useState('Termination of Membership');
  const [removalType, setRemovalType] = useState('terminated');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Record<number, number>>({});

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (file: File) => previewRemovalByExcel(file),
    onSuccess: (data) => {
      setPreviewResult(data);
      setError(null);
      // Initialize selections for rows with multiple matches
      const selections: Record<number, number> = {};
      data.found.forEach(row => {
        if (row.member) {
          selections[row.row_number] = row.member.member_id;
        } else if (row.members && row.members.length > 0) {
          selections[row.row_number] = row.members[0].member_id;
        }
      });
      setSelectedMembers(selections);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to preview Excel file');
      setPreviewResult(null);
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: () => {
      const membersToRemove = previewResult?.found.map(row => {
        const memberId = selectedMembers[row.row_number];
        const member = row.member || row.members?.find(m => m.member_id === memberId);
        return {
          member_id: memberId,
          id_number: member?.id_number,
          row_number: row.row_number,
          subregion: row.excel_data.subregion,
          ward_no: row.excel_data.ward_no,
          name_and_surname: row.excel_data.name_and_surname,
          province_name: member?.province_name,
          search_method: row.search_method,
          match_confidence: row.match_confidence,
        };
      }) || [];
      return removeByExcel(membersToRemove, removalReason, removalType, selectedFile?.name);
    },
    onSuccess: (data) => {
      setSuccess(`Successfully removed ${data.successful} member(s). Batch ID: ${data.batch_id}`);
      setConfirmDialog(false);
      setPreviewResult(null);
      setSelectedFile(null);
      setConfirmText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to remove members');
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewResult(null);
      setError(null);
    }
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleRemove = () => {
    if (confirmText !== 'REMOVE') {
      setError('Please type REMOVE to confirm');
      return;
    }
    removeMutation.mutate();
  };

  const getMemberDisplay = (row: ExcelPreviewRow) => {
    if (row.member) {
      return `${row.member.firstname} ${row.member.surname} (${row.member.id_number})`;
    }
    if (row.members && row.members.length > 0) {
      const selected = row.members.find(m => m.member_id === selectedMembers[row.row_number]);
      if (selected) return `${selected.firstname} ${selected.surname} (${selected.id_number})`;
    }
    return '-';
  };

  return (
    <Box>
      {/* Upload Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Upload Excel File</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload an Excel file with columns: #, SUBREGION, WARD NO., NAME AND SURNAME, ID NUMBER
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} ref={fileInputRef} style={{ display: 'none' }} id="excel-upload" />
          <label htmlFor="excel-upload">
            <Button variant="outlined" component="span" startIcon={<CloudUpload />}>Select File</Button>
          </label>
          {selectedFile && <Chip label={selectedFile.name} onDelete={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} />}
          <Button variant="contained" onClick={handlePreview} disabled={!selectedFile || previewMutation.isPending} startIcon={previewMutation.isPending ? <CircularProgress size={20} /> : undefined}>
            Preview
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {previewResult && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Preview Results</Typography>
            <Box>
              <Chip icon={<CheckCircle />} label={`Found: ${previewResult.total_found}`} color="success" sx={{ mr: 1 }} />
              <Chip icon={<ErrorIcon />} label={`Not Found: ${previewResult.not_found.length}`} color="warning" />
            </Box>
          </Box>
          {previewResult.found.length > 0 && (
            <TableContainer sx={{ maxHeight: 400, mb: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Excel Name</TableCell>
                    <TableCell>Excel ID</TableCell>
                    <TableCell>Matched Member</TableCell>
                    <TableCell>Province</TableCell>
                    <TableCell>Match Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewResult.found.map((row) => (
                    <TableRow key={row.row_number}>
                      <TableCell>{row.row_number}</TableCell>
                      <TableCell>{row.excel_data.name_and_surname}</TableCell>
                      <TableCell>{row.excel_data.id_number || '-'}</TableCell>
                      <TableCell>{row.requires_selection && row.members ? (
                        <FormControl size="small" fullWidth>
                          <Select value={selectedMembers[row.row_number] || ''} onChange={(e) => setSelectedMembers(prev => ({ ...prev, [row.row_number]: e.target.value as number }))}>
                            {row.members.map(m => <MenuItem key={m.member_id} value={m.member_id}>{m.firstname} {m.surname} ({m.id_number})</MenuItem>)}
                          </Select>
                        </FormControl>
                      ) : getMemberDisplay(row)}</TableCell>
                      <TableCell>{row.member?.province_name || row.members?.[0]?.province_name || '-'}</TableCell>
                      <TableCell><Chip label={row.match_confidence} size="small" color={row.match_confidence === 'exact' ? 'success' : 'warning'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {previewResult.not_found.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Not Found ({previewResult.not_found.length} rows):</Typography>
              {previewResult.not_found.slice(0, 5).map(nf => <Typography key={nf.row_number} variant="body2">Row {nf.row_number}: {nf.excel_data.name_and_surname} - {nf.reason}</Typography>)}
              {previewResult.not_found.length > 5 && <Typography variant="body2">...and {previewResult.not_found.length - 5} more</Typography>}
            </Alert>
          )}
          {previewResult.found.length > 0 && (
            <Button variant="contained" color="error" startIcon={<Delete />} onClick={() => setConfirmDialog(true)}>
              Remove {previewResult.found.length} Member(s)
            </Button>
          )}
        </Paper>
      )}

      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Warning color="error" sx={{ mr: 1, verticalAlign: 'middle' }} />Confirm Member Removal</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}><strong>WARNING:</strong> This will permanently remove {previewResult?.found.length} member(s).</Alert>
          <FormControl fullWidth sx={{ mb: 2 }}><InputLabel>Removal Reason</InputLabel><Select value={removalReason} onChange={(e) => setRemovalReason(e.target.value)} label="Removal Reason">
            <MenuItem value="Termination of Membership">Termination of Membership</MenuItem><MenuItem value="Expelled">Expelled</MenuItem><MenuItem value="Suspended">Suspended</MenuItem><MenuItem value="Deceased">Deceased</MenuItem>
          </Select></FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}><InputLabel>Removal Type</InputLabel><Select value={removalType} onChange={(e) => setRemovalType(e.target.value)} label="Removal Type">
            <MenuItem value="terminated">Terminated</MenuItem><MenuItem value="expelled">Expelled</MenuItem><MenuItem value="suspended">Suspended</MenuItem><MenuItem value="deceased">Deceased</MenuItem>
          </Select></FormControl>
          <Typography variant="body2" sx={{ mb: 1 }}>Type <strong>REMOVE</strong> to confirm:</Typography>
          <TextField fullWidth value={confirmText} onChange={(e) => setConfirmText(e.target.value.toUpperCase())} placeholder="Type REMOVE" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDialog(false); setConfirmText(''); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRemove} disabled={confirmText !== 'REMOVE' || removeMutation.isPending}>
            {removeMutation.isPending ? <CircularProgress size={24} /> : 'Confirm Removal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RemoveByExcelTab;

