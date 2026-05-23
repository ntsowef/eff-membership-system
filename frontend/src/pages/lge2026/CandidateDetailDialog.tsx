import React from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Grid, Chip, IconButton, Button, Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { Lge2026Candidate } from '../../types/lge2026';

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
}

const LabelValue: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2">{value || '—'}</Typography>
  </Box>
);

const CandidateDetailDialog: React.FC<CandidateDetailDialogProps> = ({ open, onClose, candidate }) => {
  if (!candidate) return null;

  const { dob, gender } = parseSAIdNumber(candidate.id_number);

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
          <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 1 }}>
            Personal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <LabelValue label="Full Name" value={candidate.member_name} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <LabelValue label="ID Number" value={candidate.id_number} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <LabelValue label="Date of Birth" value={dob} />
            </Grid>
            <Grid item xs={6} sm={2}>
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
              <LabelValue label="Cell Number" value={candidate.cell_number} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LabelValue label="Email" value={candidate.email} />
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
      </DialogContent>

      <DialogActions sx={{ '@media print': { display: 'none' } }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CandidateDetailDialog;
