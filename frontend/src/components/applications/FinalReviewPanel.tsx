import React, { useState } from 'react';
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
  Alert,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Person,
  CheckCircle,
  Cancel,
  Warning,
  AccountBalance,
  Gavel,
  Assignment
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { twoTierApprovalApi } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import { format } from 'date-fns';

interface FinalReviewPanelProps {
  application: any;
  canReview: boolean;
  currentUserId: number;
}

const FinalReviewPanel: React.FC<FinalReviewPanelProps> = ({
  application,
  canReview,
  currentUserId
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | null;
  }>({ open: false, action: null });
  
  const [reviewForm, setReviewForm] = useState({
    status: 'Approved' as 'Approved' | 'Rejected',
    rejection_reason: '',
    admin_notes: ''
  });

  // Check separation of duties
  const canPerformFinalReview = canReview && application.financial_reviewed_by !== currentUserId;

  // Start final review mutation
  const startReviewMutation = useMutation({
    mutationFn: () => twoTierApprovalApi.startFinalReview(application.id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', application.id] });
      showNotification('Final review started successfully', 'success');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to start final review', 'error');
    }
  });

  // Complete final review mutation
  const completeReviewMutation = useMutation({
    mutationFn: (reviewData: any) => twoTierApprovalApi.completeFinalReview(application.id.toString(), reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', application.id] });
      setReviewDialog({ open: false, action: null });
      setReviewForm({
        status: 'Approved',
        rejection_reason: '',
        admin_notes: ''
      });
      showNotification(`Final review completed: ${reviewForm.status}`, 'success');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to complete final review', 'error');
    }
  });

  const handleStartReview = () => {
    startReviewMutation.mutate();
  };

  const handleReviewAction = (action: 'approve' | 'reject') => {
    setReviewForm({
      ...reviewForm,
      status: action === 'approve' ? 'Approved' : 'Rejected'
    });
    setReviewDialog({ open: true, action });
  };

  const handleSubmitReview = () => {
    if (reviewForm.status === 'Rejected' && !reviewForm.rejection_reason) {
      showNotification('Rejection reason is required when rejecting', 'error');
      return;
    }

    completeReviewMutation.mutate(reviewForm);
  };

  const getWorkflowStageColor = (stage: string) => {
    switch (stage) {
      case 'Payment Approved': return 'success';
      case 'Final Review': return 'warning';
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Workflow Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Final Review Status
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Chip
                label={application.workflow_stage}
                color={getWorkflowStageColor(application.workflow_stage)}
                size="small"
              />
            </Grid>
            <Grid item>
              <Chip
                label={`Status: ${application.status}`}
                color={application.status === 'Approved' ? 'success' : application.status === 'Rejected' ? 'error' : 'info'}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Financial Review Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial Review Summary
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <AccountBalance />
              </ListItemIcon>
              <ListItemText
                primary="Financial Status"
                secondary={
                  <Chip
                    label={application.financial_status}
                    color={application.financial_status === 'Approved' ? 'success' : 'error'}
                    size="small"
                  />
                }
              />
            </ListItem>
            
            {application.financial_reviewed_at && (
              <ListItem>
                <ListItemIcon>
                  <Assignment />
                </ListItemIcon>
                <ListItemText
                  primary="Financial Review Date"
                  secondary={format(new Date(application.financial_reviewed_at), 'PPpp')}
                />
              </ListItem>
            )}
            
            {application.financial_reviewer_name && (
              <ListItem>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText
                  primary="Financial Reviewer"
                  secondary={application.financial_reviewer_name}
                />
              </ListItem>
            )}
            
            {application.financial_admin_notes && (
              <ListItem>
                <ListItemText
                  primary="Financial Review Notes"
                  secondary={application.financial_admin_notes}
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Separation of Duties Check */}
      {!canPerformFinalReview && application.financial_reviewed_by === currentUserId && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Separation of Duties:</strong> You cannot perform the final review on an application that you financially reviewed. 
          This application must be reviewed by a different membership approver.
        </Alert>
      )}

      {/* Final Review Actions */}
      {canPerformFinalReview && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Final Review Actions
            </Typography>
            
            {application.workflow_stage === 'Payment Approved' && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  This application has been financially approved and is ready for final membership review. 
                  Click "Start Final Review" to begin the membership approval process.
                </Alert>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Gavel />}
                  onClick={handleStartReview}
                  disabled={startReviewMutation.isPending}
                >
                  {startReviewMutation.isPending ? 'Starting...' : 'Start Final Review'}
                </Button>
              </Box>
            )}
            
            {application.workflow_stage === 'Final Review' && (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This application is under final review. Review all application details and make the final membership decision.
                </Alert>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleReviewAction('approve')}
                    disabled={completeReviewMutation.isPending}
                  >
                    Approve Membership
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => handleReviewAction('reject')}
                    disabled={completeReviewMutation.isPending}
                  >
                    Reject Application
                  </Button>
                </Box>
              </Box>
            )}
            
            {application.workflow_stage === 'Approved' && (
              <Alert severity="success">
                This application has been approved and the membership has been created.
                {application.final_reviewed_at && (
                  <Box sx={{ mt: 1 }}>
                    <strong>Approved on:</strong> {format(new Date(application.final_reviewed_at), 'PPpp')}
                  </Box>
                )}
              </Alert>
            )}
            
            {application.workflow_stage === 'Rejected' && application.status === 'Rejected' && (
              <Alert severity="error">
                This application has been rejected during final review.
                {application.rejection_reason && (
                  <Box sx={{ mt: 1 }}>
                    <strong>Reason:</strong> {application.rejection_reason}
                  </Box>
                )}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, action: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          {reviewDialog.action === 'approve' ? 'Approve Membership' : 'Reject Application'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity={reviewDialog.action === 'approve' ? 'success' : 'error'} sx={{ mb: 3 }}>
              You are about to {reviewDialog.action} this membership application.
              {reviewDialog.action === 'approve' 
                ? ' A new membership record will be created and the applicant will be notified.'
                : ' The application will be rejected and the applicant will be notified.'
              }
            </Alert>
            
            {reviewDialog.action === 'reject' && (
              <TextField
                fullWidth
                label="Rejection Reason"
                multiline
                rows={3}
                value={reviewForm.rejection_reason}
                onChange={(e) => setReviewForm({ ...reviewForm, rejection_reason: e.target.value })}
                required
                sx={{ mb: 2 }}
                helperText="Please provide a clear reason for rejecting the application"
              />
            )}
            
            <TextField
              fullWidth
              label="Admin Notes"
              multiline
              rows={3}
              value={reviewForm.admin_notes}
              onChange={(e) => setReviewForm({ ...reviewForm, admin_notes: e.target.value })}
              helperText="Optional notes for internal record keeping"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog({ open: false, action: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            disabled={completeReviewMutation.isPending || (reviewDialog.action === 'reject' && !reviewForm.rejection_reason)}
          >
            {completeReviewMutation.isPending ? 'Processing...' : `${reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Application`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinalReviewPanel;
