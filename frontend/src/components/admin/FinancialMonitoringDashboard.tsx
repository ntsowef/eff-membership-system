import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AccountBalance as RevenueIcon,
  Payment as PaymentIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  CheckCircle as ApprovedIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  VerifiedUser as VerifyIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface FinancialData {
  daily_revenue: number;
  pending_verifications: number;
  failed_transactions: number;
  approval_ready_count: number;
  total_applications_today: number;
}

interface PendingPayment {
  id: number;
  application_id: number;
  amount: number;
  receipt_number: string;
  receipt_image_path?: string;
  first_name: string;
  last_name: string;
  email: string;
  cell_number: string;
  created_at: string;
}

interface ReadyApplication {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  payment_amount: number;
  payment_method: string;
  submitted_at: string;
  workflow_status: any;
}

const FinancialMonitoringDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [readyApplications, setReadyApplications] = useState<ReadyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Verification dialog state
  const [verificationDialog, setVerificationDialog] = useState<{
    open: boolean;
    payment: PendingPayment | null;
  }>({ open: false, payment: null });
  
  const [verificationForm, setVerificationForm] = useState({
    amountVerified: '',
    verificationStatus: 'approved' as 'approved' | 'rejected',
    verificationNotes: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Load financial monitoring data
      const monitoringResponse = await fetch(`/api/v1/payments/monitoring/dashboard?date=${dateStr}`);
      const monitoringData = await monitoringResponse.json();
      
      if (monitoringData.success) {
        setFinancialData(monitoringData.data);
      }

      // Load pending cash payments
      const pendingResponse = await fetch('/api/v1/payments/pending-cash-payments');
      const pendingData = await pendingResponse.json();
      
      if (pendingData.success) {
        setPendingPayments(pendingData.data);
      }

      // Load applications ready for approval
      const readyResponse = await fetch('/api/v1/payments/ready-for-approval');
      const readyData = await readyResponse.json();
      
      if (readyData.success) {
        setReadyApplications(readyData.data);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!verificationDialog.payment) return;

    try {
      const response = await fetch(`/api/v1/payments/verify-cash-payment/${verificationDialog.payment.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifiedBy: 1, // TODO: Get from auth context
          amountVerified: parseFloat(verificationForm.amountVerified),
          verificationStatus: verificationForm.verificationStatus,
          verificationNotes: verificationForm.verificationNotes
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setVerificationDialog({ open: false, payment: null });
        setVerificationForm({
          amountVerified: '',
          verificationStatus: 'approved',
          verificationNotes: ''
        });
        loadDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to verify payment:', error);
    }
  };

  const handleBulkApproval = async () => {
    const applicationIds = readyApplications.map(app => app.id);
    
    try {
      const response = await fetch('/api/v1/payments/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationIds,
          approvedBy: 1, // TODO: Get from auth context
          adminNotes: 'Bulk approval from financial monitoring dashboard'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        loadDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to process bulk approval:', error);
    }
  };

  const openVerificationDialog = (payment: PendingPayment) => {
    setVerificationDialog({ open: true, payment });
    setVerificationForm({
      amountVerified: payment.amount.toString(),
      verificationStatus: 'approved',
      verificationNotes: ''
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Financial Monitoring Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newValue) => newValue && setSelectedDate(newValue)}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
          </LocalizationProvider>
          <IconButton onClick={loadDashboardData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Financial Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <RevenueIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    R{financialData?.daily_revenue?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Daily Revenue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PendingIcon color="warning" />
                <Box>
                  <Typography variant="h6">
                    {financialData?.pending_verifications || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Verifications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ErrorIcon color="error" />
                <Box>
                  <Typography variant="h6">
                    {financialData?.failed_transactions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed Transactions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ApprovedIcon color="success" />
                <Box>
                  <Typography variant="h6">
                    {financialData?.approval_ready_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready for Approval
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PaymentIcon color="info" />
                <Box>
                  <Typography variant="h6">
                    {financialData?.total_applications_today || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Applications Today
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different sections */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`Pending Verifications (${pendingPayments.length})`} />
          <Tab label={`Ready for Approval (${readyApplications.length})`} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Cash Payments Requiring Verification</Typography>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Application ID</TableCell>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Receipt Number</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.application_id}</TableCell>
                      <TableCell>{payment.first_name} {payment.last_name}</TableCell>
                      <TableCell>R{payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{payment.receipt_number}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{payment.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.cell_number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Verify Payment">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openVerificationDialog(payment)}
                            >
                              <VerifyIcon />
                            </IconButton>
                          </Tooltip>
                          {payment.receipt_image_path && (
                            <Tooltip title="View Receipt">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => window.open(`/uploads/receipts/${payment.receipt_image_path}`, '_blank')}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Applications Ready for Approval</Typography>
              {readyApplications.length > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleBulkApproval}
                  startIcon={<ApprovedIcon />}
                >
                  Bulk Approve All ({readyApplications.length})
                </Button>
              )}
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Application ID</TableCell>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {readyApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.id}</TableCell>
                      <TableCell>{app.first_name} {app.last_name}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>R{app.payment_amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <Chip
                          label={app.payment_method}
                          size="small"
                          color={app.payment_method === 'card' ? 'success' : 'info'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip label="Ready" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Verification Dialog */}
      <Dialog
        open={verificationDialog.open}
        onClose={() => setVerificationDialog({ open: false, payment: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Verify Cash Payment
        </DialogTitle>
        <DialogContent>
          {verificationDialog.payment && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Verifying payment for {verificationDialog.payment.first_name} {verificationDialog.payment.last_name}
                <br />
                Receipt Number: {verificationDialog.payment.receipt_number}
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amount Verified"
                    type="number"
                    value={verificationForm.amountVerified}
                    onChange={(e) => setVerificationForm(prev => ({
                      ...prev,
                      amountVerified: e.target.value
                    }))}
                    InputProps={{
                      startAdornment: 'R'
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Verification Status</InputLabel>
                    <Select
                      value={verificationForm.verificationStatus}
                      onChange={(e) => setVerificationForm(prev => ({
                        ...prev,
                        verificationStatus: e.target.value as 'approved' | 'rejected'
                      }))}
                    >
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Verification Notes"
                    multiline
                    rows={3}
                    value={verificationForm.verificationNotes}
                    onChange={(e) => setVerificationForm(prev => ({
                      ...prev,
                      verificationNotes: e.target.value
                    }))}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialog({ open: false, payment: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleVerifyPayment}
            variant="contained"
            color={verificationForm.verificationStatus === 'approved' ? 'success' : 'error'}
          >
            {verificationForm.verificationStatus === 'approved' ? 'Approve' : 'Reject'} Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancialMonitoringDashboard;
