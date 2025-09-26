import React, { useState, useEffect } from 'react';
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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  AccountBalance,
  Payment,
  Receipt,
  CheckCircle,
  Cancel,
  AttachMoney,
  Refresh,
  History,
  ExpandMore,
  ExpandLess,
  Info,
  Timeline,
  Assessment
} from '@mui/icons-material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { twoTierApprovalApi, financialTransactionApi } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';

interface EnhancedFinancialReviewPanelProps {
  entity: any; // Can be application or renewal
  entityType: 'application' | 'renewal';
  payments: any[];
  approvalStatus: any;
  canReview: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedFinancialReviewPanel: React.FC<EnhancedFinancialReviewPanelProps> = ({
  entity,
  entityType,
  payments,
  approvalStatus,
  canReview
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState(0);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | null;
  }>({ open: false, action: null });
  
  const [reviewForm, setReviewForm] = useState({
    financial_status: 'Approved' as 'Approved' | 'Rejected',
    financial_rejection_reason: '',
    financial_admin_notes: ''
  });

  // Fetch comprehensive transaction data for the member
  const { data: memberTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['memberTransactions', entity.member_id],
    queryFn: () => financialTransactionApi.queryTransactions({
      member_id: entity.member_id,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'DESC'
    }),
    enabled: !!entity.member_id && showTransactionHistory
  });

  // Fetch audit trail for the current entity
  const { data: auditTrail, isLoading: auditLoading } = useQuery({
    queryKey: ['auditTrail', entityType, entity.id],
    queryFn: () => {
      if (entityType === 'renewal') {
        return twoTierApprovalApi.getRenewalAuditTrail(entity.id.toString());
      } else {
        return twoTierApprovalApi.getWorkflowAuditTrail(entity.id.toString());
      }
    },
    enabled: !!entity.id
  });

  // Start financial review mutation
  const startReviewMutation = useMutation({
    mutationFn: () => {
      if (entityType === 'renewal') {
        return twoTierApprovalApi.startRenewalFinancialReview(entity.id.toString());
      } else {
        return twoTierApprovalApi.startFinancialReview(entity.id.toString());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entity.id] });
      showNotification('Financial review started successfully', 'success');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to start financial review', 'error');
    }
  });

  // Complete financial review mutation
  const completeReviewMutation = useMutation({
    mutationFn: (reviewData: any) => {
      if (entityType === 'renewal') {
        return twoTierApprovalApi.completeRenewalFinancialReview(entity.id.toString(), reviewData);
      } else {
        return twoTierApprovalApi.completeFinancialReview(entity.id.toString(), reviewData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entity.id] });
      setReviewDialog({ open: false, action: null });
      setReviewForm({
        financial_status: 'Approved',
        financial_rejection_reason: '',
        financial_admin_notes: ''
      });
      showNotification(`Financial review completed: ${reviewForm.financial_status}`, 'success');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to complete financial review', 'error');
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleStartReview = () => {
    startReviewMutation.mutate();
  };

  const handleReviewAction = (action: 'approve' | 'reject') => {
    setReviewForm({
      ...reviewForm,
      financial_status: action === 'approve' ? 'Approved' : 'Rejected'
    });
    setReviewDialog({ open: true, action });
  };

  const handleSubmitReview = () => {
    if (reviewForm.financial_status === 'Rejected' && !reviewForm.financial_rejection_reason) {
      showNotification('Rejection reason is required when rejecting', 'error');
      return;
    }

    completeReviewMutation.mutate(reviewForm);
  };

  const getWorkflowStageColor = (stage: string) => {
    switch (stage) {
      case 'Submitted': return 'info';
      case 'Financial Review': return 'warning';
      case 'Payment Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  const getFinancialStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Under Review': return 'warning';
      case 'Pending': return 'info';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      {/* Enhanced Status Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                {entityType === 'renewal' ? 'Renewal' : 'Application'} Financial Review Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={entity.workflow_stage || entity.financial_status || 'Pending'}
                  color={getWorkflowStageColor(entity.workflow_stage || entity.financial_status)}
                  size="small"
                />
                <Chip
                  label={`Financial: ${entity.financial_status || 'Pending'}`}
                  color={getFinancialStatusColor(entity.financial_status)}
                  size="small"
                />
                {entity.amount && (
                  <Chip
                    icon={<AttachMoney />}
                    label={formatCurrency(entity.amount)}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Tooltip title="Refresh Data">
                  <IconButton 
                    onClick={() => queryClient.invalidateQueries({ queryKey: [entityType, entity.id] })}
                    size="small"
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="View Transaction History">
                  <IconButton 
                    onClick={() => setShowTransactionHistory(!showTransactionHistory)}
                    size="small"
                    color={showTransactionHistory ? 'primary' : 'default'}
                  >
                    <History />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Enhanced Tabbed Interface */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="financial review tabs">
            <Tab label="Payment Details" icon={<Payment />} />
            <Tab label="Review Actions" icon={<AccountBalance />} />
            <Tab label="Audit Trail" icon={<Timeline />} />
            <Tab label="Analytics" icon={<Assessment />} />
          </Tabs>
        </Box>

        {/* Payment Details Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Payment Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><Payment /></ListItemIcon>
                  <ListItemText
                    primary="Payment Method"
                    secondary={entity.payment_method || 'Not specified'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AttachMoney /></ListItemIcon>
                  <ListItemText
                    primary="Amount"
                    secondary={entity.amount ? formatCurrency(entity.amount) : 'Not specified'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Receipt /></ListItemIcon>
                  <ListItemText
                    primary="Reference"
                    secondary={entity.payment_reference || 'Not specified'}
                  />
                </ListItem>
                {entity.payment_date && (
                  <ListItem>
                    <ListItemIcon><Info /></ListItemIcon>
                    <ListItemText
                      primary="Payment Date"
                      secondary={formatDate(entity.payment_date)}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {payments && payments.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Payment Transactions
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Method</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={payment.verification_status} 
                                size="small" 
                                color={payment.verification_status === 'verified' ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>{formatDate(payment.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Review Actions Tab */}
        <TabPanel value={activeTab} index={1}>
          {canReview ? (
            <Box>
              {(entity.workflow_stage === 'Submitted' || entity.financial_status === 'Pending') && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This {entityType} is ready for financial review. Click "Start Financial Review" to begin the payment verification process.
                  </Alert>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AccountBalance />}
                    onClick={handleStartReview}
                    disabled={startReviewMutation.isPending}
                  >
                    {startReviewMutation.isPending ? 'Starting...' : 'Start Financial Review'}
                  </Button>
                </Box>
              )}
              
              {(entity.workflow_stage === 'Financial Review' || entity.financial_status === 'Under Review') && (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    This {entityType} is under financial review. Verify the payment information and approve or reject the payment.
                  </Alert>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleReviewAction('approve')}
                      disabled={completeReviewMutation.isPending}
                    >
                      Approve Payment
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleReviewAction('reject')}
                      disabled={completeReviewMutation.isPending}
                    >
                      Reject Payment
                    </Button>
                  </Box>
                </Box>
              )}
              
              {(entity.workflow_stage === 'Payment Approved' || entity.financial_status === 'Approved') && (
                <Alert severity="success">
                  Payment has been approved and the {entityType} has been forwarded for final processing.
                </Alert>
              )}
              
              {(entity.workflow_stage === 'Rejected' || entity.financial_status === 'Rejected') && (
                <Alert severity="error">
                  Payment was rejected during financial review.
                  {entity.financial_rejection_reason && (
                    <Box sx={{ mt: 1 }}>
                      <strong>Reason:</strong> {entity.financial_rejection_reason}
                    </Box>
                  )}
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              You do not have permission to perform financial review actions on this {entityType}.
            </Alert>
          )}
        </TabPanel>

        {/* Audit Trail Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Financial Review Audit Trail
          </Typography>
          {auditLoading ? (
            <Typography>Loading audit trail...</Typography>
          ) : auditTrail && auditTrail.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditTrail.map((entry: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip 
                          label={entry.action} 
                          size="small" 
                          color={entry.action.includes('approved') ? 'success' : entry.action.includes('rejected') ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{entry.user_name}</TableCell>
                      <TableCell>{formatDate(entry.created_at)}</TableCell>
                      <TableCell>{entry.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">No audit trail entries found.</Typography>
          )}
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Member Transaction Analytics
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={showTransactionHistory ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowTransactionHistory(!showTransactionHistory)}
            sx={{ mb: 2 }}
          >
            {showTransactionHistory ? 'Hide' : 'Show'} Transaction History
          </Button>

          <Collapse in={showTransactionHistory}>
            {transactionsLoading ? (
              <Typography>Loading transaction history...</Typography>
            ) : memberTransactions?.transactions && memberTransactions.transactions.length > 0 ? (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Recent Transactions for {entity.member_name || entity.first_name + ' ' + entity.last_name}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {memberTransactions.transactions.map((transaction: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{transaction.transaction_type}</TableCell>
                          <TableCell align="right">{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={transaction.overall_status} 
                              size="small" 
                              color={transaction.overall_status === 'Complete' ? 'success' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {memberTransactions.summary && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Summary Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Total Transactions</Typography>
                        <Typography variant="h6">{memberTransactions.summary.status_breakdown.approved + memberTransactions.summary.status_breakdown.pending}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                        <Typography variant="h6">{formatCurrency(memberTransactions.summary.total_amount)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Completed</Typography>
                        <Typography variant="h6">{formatCurrency(memberTransactions.summary.completed_amount)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Average</Typography>
                        <Typography variant="h6">{formatCurrency(memberTransactions.summary.avg_amount)}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography color="text.secondary">No transaction history found for this member.</Typography>
            )}
          </Collapse>
        </TabPanel>
      </Card>

      {/* Enhanced Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, action: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          {reviewDialog.action === 'approve' ? 'Approve Payment' : 'Reject Payment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity={reviewDialog.action === 'approve' ? 'success' : 'error'} sx={{ mb: 3 }}>
              You are about to {reviewDialog.action} the payment for this {entityType}.
              {reviewDialog.action === 'approve' 
                ? ` The ${entityType} will be forwarded for final processing.`
                : ` The ${entityType} will be rejected and the member will be notified.`
              }
            </Alert>
            
            {reviewDialog.action === 'reject' && (
              <TextField
                fullWidth
                label="Rejection Reason"
                multiline
                rows={3}
                value={reviewForm.financial_rejection_reason}
                onChange={(e) => setReviewForm({ ...reviewForm, financial_rejection_reason: e.target.value })}
                required
                sx={{ mb: 2 }}
                helperText="Please provide a clear reason for rejecting the payment"
              />
            )}
            
            <TextField
              fullWidth
              label="Admin Notes"
              multiline
              rows={3}
              value={reviewForm.financial_admin_notes}
              onChange={(e) => setReviewForm({ ...reviewForm, financial_admin_notes: e.target.value })}
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
            disabled={completeReviewMutation.isPending || (reviewDialog.action === 'reject' && !reviewForm.financial_rejection_reason)}
          >
            {completeReviewMutation.isPending ? 'Processing...' : `${reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Payment`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedFinancialReviewPanel;
