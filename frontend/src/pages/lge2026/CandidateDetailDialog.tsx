import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Grid, Chip, IconButton, Button, Divider,
  Alert, CircularProgress, TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import type { Lge2026Candidate } from '../../types/lge2026';
import lge2026Api from '../../services/lge2026Api';

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  nominated: 'warning',
  approved: 'success',
  withdrawn: 'default',
};

function parseSAIdNumber(idNumber: string | undefined): { dob: string; gender: string } {
  if (!idNumber || idNumber.length < 10) return { dob: '—', gender: '—' };
  const yy = idNumber.substring(0, 2);
  const mm = idNumber.substring(2, 4);
  const dd = idNumber.substring(4, 6);
  const genderDigits = parseInt(idNumber.substring(6, 10));
  const year = parseInt(yy) > 30 ? `19${yy}` : `20${yy}`;
  return {
    dob: `${year}-${mm}-${dd}`,
    gender: genderDigits >= 5000 ? 'Male' : 'Female',
  };
}

interface CandidateDetailDialogProps {
  open: boolean;
  onClose: () => void;
  candidate: Lge2026Candidate | null;
  onUpdated?: (updated: Lge2026Candidate) => void;
}

const LabelValue: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2">{value || '—'}</Typography>
  </Box>
);

const CandidateDetailDialog: React.FC<CandidateDetailDialogProps> = ({ open, onClose, candidate, onUpdated }) => {
  const queryClient = useQueryClient();
  const cvInputRef = useRef<HTMLInputElement>(null);
  const iecInputRef = useRef<HTMLInputElement>(null);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [iecFile, setIecFile] = useState<File | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstname, setEditFirstname] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editCellNumber, setEditCellNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Upload mutation — must be before any early return
  const uploadMutation = useMutation({
    mutationFn: () =>
      lge2026Api.uploadCandidateDocuments(
        candidate!.candidate_id,
        cvFile || undefined,
        iecFile || undefined,
      ),
    onSuccess: () => {
      setCvFile(null);
      setIecFile(null);
      if (cvInputRef.current) cvInputRef.current.value = '';
      if (iecInputRef.current) iecInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['lge2026'] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-active-candidate'] });
    },
  });

  // Save member details mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      lge2026Api.updateMemberDetails(candidate!.candidate_id, {
        firstname: editFirstname.trim(),
        surname: editSurname.trim(),
        cell_number: editCellNumber.trim() || '',
        email: editEmail.trim() || '',
      }),
    onSuccess: (updatedCandidate) => {
      setIsEditing(false);
      onUpdated?.(updatedCandidate);
      queryClient.invalidateQueries({ queryKey: ['lge2026'] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-active-candidate'] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-eligible-members'] });
      queryClient.invalidateQueries({ queryKey: ['lge2026-all-candidates'] });
    },
  });

  if (!candidate) return null;

  const { dob, gender } = parseSAIdNumber(candidate.id_number);

  const handleStartEdit = () => {
    setEditFirstname(candidate.member_firstname || '');
    setEditSurname(candidate.member_surname || '');
    setEditCellNumber(candidate.cell_number || '');
    setEditEmail(candidate.email || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    saveMutation.reset();
  };

  const handleDownload = async (docType: 'cv' | 'iec_form_c2') => {
    try {
      await lge2026Api.downloadCandidateDocument(candidate.candidate_id, docType);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  const handlePrint = () => {
    const printArea = document.getElementById('candidate-print-area');
    if (!printArea) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Candidate Detail — ${candidate.member_name}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#333}
      .section-title{font-size:14px;font-weight:bold;margin:16px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
      .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 24px}
      .label{font-size:11px;color:#888;margin-bottom:2px}.value{font-size:13px;margin-bottom:8px}
      .chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:bold}</style></head>
      <body>${printArea.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const hasPendingFiles = cvFile || iecFile;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Ward Councillor Candidate — IEC Detail Card
        <Box>
          <IconButton onClick={handlePrint} size="small" sx={{ mr: 1 }}>
            <PrintIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box id="candidate-print-area">
          {/* Personal Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>
              Personal Information
            </Typography>
            {!isEditing ? (
              <IconButton size="small" onClick={handleStartEdit} title="Edit details">
                <EditIcon fontSize="small" />
              </IconButton>
            ) : (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !editFirstname.trim() || !editSurname.trim()}
                  title="Save changes"
                >
                  {saveMutation.isPending ? <CircularProgress size={18} /> : <SaveIcon fontSize="small" />}
                </IconButton>
                <IconButton size="small" onClick={handleCancelEdit} title="Cancel">
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>

          {saveMutation.isError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {(saveMutation.error as any)?.message || 'Failed to save'}
            </Alert>
          )}
          {saveMutation.isSuccess && (
            <Alert severity="success" sx={{ mb: 1 }}>
              Member details saved successfully!
            </Alert>
          )}

          <Grid container spacing={2}>
            {isEditing ? (
              <>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="First Name"
                    value={editFirstname}
                    onChange={(e) => setEditFirstname(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Surname"
                    value={editSurname}
                    onChange={(e) => setEditSurname(e.target.value)}
                    required
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12} sm={4}>
                <LabelValue label="Full Name" value={candidate.member_name} />
              </Grid>
            )}
            <Grid item xs={12} sm={isEditing ? 3 : 4}>
              <LabelValue label="ID Number" value={candidate.id_number} />
            </Grid>
            <Grid item xs={6} sm={isEditing ? 1.5 : 2}>
              <LabelValue label="Date of Birth" value={dob} />
            </Grid>
            <Grid item xs={6} sm={isEditing ? 1.5 : 2}>
              <LabelValue label="Gender" value={gender} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Contact Details */}
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Contact Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {isEditing ? (
                <TextField
                  fullWidth
                  size="small"
                  label="Cell Number"
                  value={editCellNumber}
                  onChange={(e) => setEditCellNumber(e.target.value)}
                />
              ) : (
                <LabelValue label="Cell Number" value={candidate.cell_number} />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              {isEditing ? (
                <TextField
                  fullWidth
                  size="small"
                  label="Email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              ) : (
                <LabelValue label="Email" value={candidate.email} />
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Geographic Assignment */}
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Geographic Assignment
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <LabelValue label="Province" value={(candidate as any).province_code} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <LabelValue label="Municipality" value={(candidate as any).municipality_name} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <LabelValue label="Ward Code" value={candidate.ward_code} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <LabelValue label="Ward Name" value={candidate.ward_name} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <LabelValue label="Voting District" value={
                candidate.voting_district_name
                  ? `${candidate.voting_district_name} (${candidate.voting_district_code})`
                  : candidate.voting_district_code
              } />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Candidacy Information */}
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Candidacy Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box>
                  <Chip
                    size="small"
                    label={candidate.status.toUpperCase()}
                    color={STATUS_COLOR[candidate.status] || 'default'}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4}>
              <LabelValue
                label="Nominated Date"
                value={new Date(candidate.nominated_at).toLocaleDateString()}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <LabelValue label="Nominated By" value={candidate.nominated_by_name} />
            </Grid>
            {candidate.status === 'approved' && (
              <>
                <Grid item xs={6} sm={4}>
                  <LabelValue
                    label="Approved Date"
                    value={candidate.decided_at ? new Date(candidate.decided_at).toLocaleDateString() : '—'}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <LabelValue label="Decided By" value={candidate.decided_by_name} />
                </Grid>
              </>
            )}
            {candidate.campaign_statement && (
              <Grid item xs={12}>
                <LabelValue label="Campaign Statement" value={candidate.campaign_statement} />
              </Grid>
            )}
            {candidate.notes && (
              <Grid item xs={12}>
                <LabelValue label="Notes" value={candidate.notes} />
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Supporting Documents Section */}
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Supporting Documents
        </Typography>

        <Grid container spacing={2}>
          {/* CV */}
          <Grid item xs={12} sm={6}>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: candidate.cv_path ? 'success.main' : (cvFile ? 'info.main' : 'grey.400'),
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                bgcolor: candidate.cv_path ? 'success.50' : (cvFile ? 'info.50' : 'grey.50'),
                minHeight: 90,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <input
                ref={cvInputRef}
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 10 * 1024 * 1024) {
                    alert('File size must be less than 10MB');
                    return;
                  }
                  if (f) setCvFile(f);
                }}
              />

              {candidate.cv_path ? (
                <Box>
                  <CheckCircleIcon color="success" sx={{ fontSize: 26, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    Candidate CV
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {candidate.cv_original_name || 'Uploaded'}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload('cv')}
                    >
                      Download
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => cvInputRef.current?.click()}
                    >
                      Replace
                    </Button>
                  </Box>
                  {cvFile && (
                    <Typography variant="caption" color="info.main" sx={{ mt: 0.5, display: 'block' }}>
                      New: {cvFile.name}
                    </Typography>
                  )}
                </Box>
              ) : cvFile ? (
                <Box>
                  <DescriptionIcon color="info" sx={{ fontSize: 26, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold" color="info.main">
                    {cvFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(cvFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setCvFile(null);
                        if (cvInputRef.current) cvInputRef.current.value = '';
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{ cursor: 'pointer', width: '100%' }}
                  onClick={() => cvInputRef.current?.click()}
                >
                  <UploadFileIcon sx={{ fontSize: 26, mb: 0.5, color: 'grey.500' }} />
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                    Candidate CV
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click to upload — PDF, JPEG, PNG, DOC (Max 10MB)
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* IEC Form C2 */}
          <Grid item xs={12} sm={6}>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: candidate.iec_form_c2_path ? 'success.main' : (iecFile ? 'info.main' : 'grey.400'),
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                bgcolor: candidate.iec_form_c2_path ? 'success.50' : (iecFile ? 'info.50' : 'grey.50'),
                minHeight: 90,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <input
                ref={iecInputRef}
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 10 * 1024 * 1024) {
                    alert('File size must be less than 10MB');
                    return;
                  }
                  if (f) setIecFile(f);
                }}
              />

              {candidate.iec_form_c2_path ? (
                <Box>
                  <CheckCircleIcon color="success" sx={{ fontSize: 26, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    IEC Form C2
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {candidate.iec_form_c2_original_name || 'Uploaded'}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload('iec_form_c2')}
                    >
                      Download
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => iecInputRef.current?.click()}
                    >
                      Replace
                    </Button>
                  </Box>
                  {iecFile && (
                    <Typography variant="caption" color="info.main" sx={{ mt: 0.5, display: 'block' }}>
                      New: {iecFile.name}
                    </Typography>
                  )}
                </Box>
              ) : iecFile ? (
                <Box>
                  <DescriptionIcon color="info" sx={{ fontSize: 26, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold" color="info.main">
                    {iecFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(iecFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setIecFile(null);
                        if (iecInputRef.current) iecInputRef.current.value = '';
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{ cursor: 'pointer', width: '100%' }}
                  onClick={() => iecInputRef.current?.click()}
                >
                  <UploadFileIcon sx={{ fontSize: 26, mb: 0.5, color: 'grey.500' }} />
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                    IEC Form C2
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click to upload — PDF, JPEG, PNG, DOC (Max 10MB)
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {uploadMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(uploadMutation.error as any)?.message || 'Failed to upload documents'}
          </Alert>
        )}

        {uploadMutation.isSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Documents uploaded successfully!
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ '@media print': { display: 'none' } }}>
        <Button onClick={onClose}>Close</Button>
        {hasPendingFiles && (
          <Button
            variant="contained"
            startIcon={uploadMutation.isPending ? <CircularProgress size={20} /> : <UploadFileIcon />}
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Documents'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CandidateDetailDialog;
