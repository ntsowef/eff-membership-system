import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

interface Application {
  id: number;
  application_number: string;
  first_name: string;
  last_name: string;
  id_number: string;
  date_of_birth: string;
  gender: string;
  email?: string;
  cell_number: string;
  residential_address: string;
  ward_code: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  hierarchy_level?: string;
  entity_name?: string;
  membership_type?: string;
  signature_type?: string;
  declaration_accepted?: boolean;
  constitution_accepted?: boolean;
  created_at: string;
  submitted_at?: string;
}

interface ApplicationApprovalCardProps {
  application: Application;
  onApprove: (applicationId: number, adminNotes?: string) => Promise<void>;
  onReject: (applicationId: number, rejectionReason: string, adminNotes?: string) => Promise<void>;
  loading?: boolean;
}

const ApplicationApprovalCard: React.FC<ApplicationApprovalCardProps> = ({
  application,
  onApprove,
  onReject,
  loading = false
}) => {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'primary';
      case 'Under Review': return 'warning';
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  const handleApprove = async () => {
    try {
      await onApprove(application.id, adminNotes);
      setApproveDialogOpen(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Error approving application:', error);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }
    
    try {
      await onReject(application.id, rejectionReason, adminNotes);
      setRejectDialogOpen(false);
      setRejectionReason('');
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting application:', error);
    }
  };

  const canApproveOrReject = application.status === 'Submitted' || application.status === 'Under Review';

  return (
    <>
      <Card sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="h3">
              {application.application_number}
            </Typography>
            <Chip 
              label={application.status} 
              color={getStatusColor(application.status) as any}
              size="small"
            />
          </Box>

          {/* Personal Information */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" mb={1}>
                <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1">
                  <strong>{application.first_name} {application.last_name}</strong>
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" ml={4}>
                ID: {application.id_number}
              </Typography>
              <Typography variant="body2" color="text.secondary" ml={4}>
                DOB: {new Date(application.date_of_birth).toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" ml={4}>
                Gender: {application.gender}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              {application.email && (
                <Box display="flex" alignItems="center" mb={1}>
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">{application.email}</Typography>
                </Box>
              )}
              <Box display="flex" alignItems="center" mb={1}>
                <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">{application.cell_number}</Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">Ward: {application.ward_code}</Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Membership Details */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Hierarchy Level:</strong>
              </Typography>
              <Typography variant="body2">{application.hierarchy_level || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Entity/Branch:</strong>
              </Typography>
              <Typography variant="body2">{application.entity_name || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>Membership Type:</strong>
              </Typography>
              <Typography variant="body2">{application.membership_type || 'Regular'}</Typography>
            </Grid>
          </Grid>

          {/* Party Declaration Status */}
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              <strong>Party Declaration:</strong>
            </Typography>
            <Box display="flex" gap={2}>
              <Chip 
                label={`Declaration: ${application.declaration_accepted ? 'Accepted' : 'Not Accepted'}`}
                color={application.declaration_accepted ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`Constitution: ${application.constitution_accepted ? 'Accepted' : 'Not Accepted'}`}
                color={application.constitution_accepted ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`Signature: ${application.signature_type || 'None'}`}
                color={application.signature_type ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {/* Timestamps */}
          <Typography variant="caption" color="text.secondary">
            Applied: {new Date(application.created_at).toLocaleString()}
            {application.submitted_at && (
              <> • Submitted: {new Date(application.submitted_at).toLocaleString()}</>
            )}
          </Typography>

          {/* Action Buttons */}
          {canApproveOrReject && (
            <Box mt={2} display="flex" gap={2}>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => setApproveDialogOpen(true)}
                disabled={loading}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => setRejectDialogOpen(true)}
                disabled={loading}
              >
                Reject
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Application</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Approving this application will create a new member record and membership entry.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Admin Notes (Optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any notes about the approval..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleApprove} 
            variant="contained" 
            color="success"
            disabled={loading}
          >
            Approve Application
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Application</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please provide a clear reason for rejecting this application.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Rejection Reason *"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Incomplete documentation, Invalid ID number..."
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Admin Notes (Optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any additional notes..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleReject} 
            variant="contained" 
            color="error"
            disabled={loading || !rejectionReason.trim()}
          >
            Reject Application
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApplicationApprovalCard;
