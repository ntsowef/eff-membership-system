import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  Grid,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Remove,
  PlayArrow,
  Stop,
  CheckCircle,
  Error,
  Warning,
  Info,
  Receipt,
  Send,
  Download,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface BulkRenewalData {
  member_ids: string[];
  renewal_type: 'standard' | 'discounted' | 'complimentary' | 'upgrade';
  payment_method: 'online' | 'bank_transfer' | 'cash' | 'cheque' | 'eft';
  renewal_period_months: number;
  amount_per_member: number;
  processed_by: string;
  notes?: string;
  send_confirmation_sms: boolean;
  generate_receipts: boolean;
}

interface BulkRenewalResult {
  successful_renewals: number;
  failed_renewals: number;
  total_revenue: number;
  renewal_details: any[];
}

interface BulkRenewalProcessorProps {
  selectedMembers?: any[];
  onComplete?: (result: BulkRenewalResult) => void;
  onCancel?: () => void;
}

const BulkRenewalProcessor: React.FC<BulkRenewalProcessorProps> = ({
  selectedMembers = [],
  onComplete,
  onCancel
}) => {
  const [renewalData, setRenewalData] = useState<BulkRenewalData>({
    member_ids: selectedMembers.map(m => m.member_id || m.id),
    renewal_type: 'standard',
    payment_method: 'online',
    renewal_period_months: 12,
    amount_per_member: 700,
    processed_by: 'admin', // In real app, get from auth context
    notes: '',
    send_confirmation_sms: true,
    generate_receipts: true
  });

  const [memberIdInput, setMemberIdInput] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingResult, setProcessingResult] = useState<BulkRenewalResult | null>(null);

  // Bulk renewal mutation
  const bulkRenewalMutation = useMutation({
    mutationFn: async (data: BulkRenewalData) => {
      const response = await api.post('/membership-renewal/bulk-renewal', data);
      return response.data.data;
    },
    onSuccess: (result) => {
      setProcessingResult(result.renewal_result);
      onComplete?.(result.renewal_result);
    },
    onError: (error) => {
      console.error('Bulk renewal failed:', error);
    }
  });

  const handleAddMemberId = () => {
    if (memberIdInput.trim() && !renewalData.member_ids.includes(memberIdInput.trim())) {
      setRenewalData(prev => ({
        ...prev,
        member_ids: [...prev.member_ids, memberIdInput.trim()]
      }));
      setMemberIdInput('');
    }
  };

  const handleRemoveMemberId = (memberId: string) => {
    setRenewalData(prev => ({
      ...prev,
      member_ids: prev.member_ids.filter(id => id !== memberId)
    }));
  };

  const handleProcessRenewal = () => {
    if (renewalData.member_ids.length === 0) {
      alert('Please add at least one member ID');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmProcess = () => {
    setShowConfirmDialog(false);
    bulkRenewalMutation.mutate(renewalData);
  };

  const calculateTotalAmount = () => {
    return renewalData.member_ids.length * renewalData.amount_per_member;
  };

  const getRenewalTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'standard': 'Standard Renewal',
      'discounted': 'Discounted Renewal',
      'complimentary': 'Complimentary Renewal',
      'upgrade': 'Membership Upgrade'
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      'online': 'Online Payment',
      'bank_transfer': 'Bank Transfer',
      'cash': 'Cash Payment',
      'cheque': 'Cheque Payment',
      'eft': 'EFT Payment'
    };
    return labels[method] || method;
  };

  if (processingResult) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Bulk Renewal Processing Complete
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="h4" color="success.contrastText" fontWeight="bold">
                  {processingResult.successful_renewals}
                </Typography>
                <Typography variant="body2" color="success.contrastText">
                  Successful Renewals
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                <Typography variant="h4" color="error.contrastText" fontWeight="bold">
                  {processingResult.failed_renewals}
                </Typography>
                <Typography variant="body2" color="error.contrastText">
                  Failed Renewals
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="h4" color="primary.contrastText" fontWeight="bold">
                  R{processingResult.total_revenue.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  Total Revenue
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="h4" color="info.contrastText" fontWeight="bold">
                  {renewalData.member_ids.length}
                </Typography>
                <Typography variant="body2" color="info.contrastText">
                  Total Processed
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Processing Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processingResult.renewal_details.map((detail) => (
                  <TableRow key={detail.member_id}>
                    <TableCell>{detail.member_id}</TableCell>
                    <TableCell>
                      <Chip 
                        label={detail.success ? 'Success' : 'Failed'}
                        color={detail.success ? 'success' : 'error'}
                        size="small"
                        icon={detail.success ? <CheckCircle /> : <Error />}
                      />
                    </TableCell>
                    <TableCell>R{detail.amount_paid.toFixed(2)}</TableCell>
                    <TableCell>{detail.transaction_id}</TableCell>
                    <TableCell>{detail.processing_time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => {
                // Export results to CSV
                const csvContent = processingResult.renewal_details.map(detail => 
                  `${detail.member_id},${detail.success ? 'Success' : 'Failed'},${detail.amount_paid},${detail.transaction_id}`
                ).join('\n');
                const blob = new Blob([`Member ID,Status,Amount,Transaction ID\n${csvContent}`], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `bulk-renewal-results-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                window.URL.revokeObjectURL(url);
              }}
            >
              Export Results
            </Button>
            <Button variant="contained" onClick={onCancel}>
              Close
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bulk Renewal Processing
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Process renewals for multiple members simultaneously
          </Typography>

          {/* Member Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Member Selection ({renewalData.member_ids.length} members)
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Add Member ID"
                value={memberIdInput}
                onChange={(e) => setMemberIdInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMemberId()}
                size="small"
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddMemberId}
                disabled={!memberIdInput.trim()}
              >
                Add
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {renewalData.member_ids.map((memberId) => (
                <Chip
                  key={memberId}
                  label={memberId}
                  onDelete={() => handleRemoveMemberId(memberId)}
                  deleteIcon={<Remove />}
                  variant="outlined"
                />
              ))}
            </Box>

            {renewalData.member_ids.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No members selected. Add member IDs above or select members from the member list.
              </Alert>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Renewal Configuration */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Renewal Type</InputLabel>
                <Select
                  value={renewalData.renewal_type}
                  label="Renewal Type"
                  onChange={(e) => setRenewalData(prev => ({ ...prev, renewal_type: e.target.value as any }))}
                >
                  <MenuItem value="standard">Standard Renewal</MenuItem>
                  <MenuItem value="discounted">Discounted Renewal</MenuItem>
                  <MenuItem value="complimentary">Complimentary Renewal</MenuItem>
                  <MenuItem value="upgrade">Membership Upgrade</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={renewalData.payment_method}
                  label="Payment Method"
                  onChange={(e) => setRenewalData(prev => ({ ...prev, payment_method: e.target.value as any }))}
                >
                  <MenuItem value="online">Online Payment</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="cash">Cash Payment</MenuItem>
                  <MenuItem value="cheque">Cheque Payment</MenuItem>
                  <MenuItem value="eft">EFT Payment</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Renewal Period (Months)"
                type="number"
                value={renewalData.renewal_period_months}
                onChange={(e) => setRenewalData(prev => ({ ...prev, renewal_period_months: parseInt(e.target.value) || 12 }))}
                inputProps={{ min: 1, max: 60 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount per Member (R)"
                type="number"
                value={renewalData.amount_per_member}
                onChange={(e) => setRenewalData(prev => ({ ...prev, amount_per_member: parseFloat(e.target.value) || 0 }))}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Processing Notes"
                multiline
                rows={3}
                value={renewalData.notes}
                onChange={(e) => setRenewalData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this bulk renewal process..."
              />
            </Grid>
          </Grid>

          {/* Options */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Processing Options
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={renewalData.send_confirmation_sms}
                  onChange={(e) => setRenewalData(prev => ({ ...prev, send_confirmation_sms: e.target.checked }))}
                />
              }
              label="Send SMS confirmations to successfully renewed members"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={renewalData.generate_receipts}
                  onChange={(e) => setRenewalData(prev => ({ ...prev, generate_receipts: e.target.checked }))}
                />
              }
              label="Generate digital receipts for completed renewals"
            />
          </Box>

          {/* Summary */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Processing Summary:
            </Typography>
            <Typography variant="body2">
              • {renewalData.member_ids.length} members selected
            </Typography>
            <Typography variant="body2">
              • {getRenewalTypeLabel(renewalData.renewal_type)} via {getPaymentMethodLabel(renewalData.payment_method)}
            </Typography>
            <Typography variant="body2">
              • {renewalData.renewal_period_months} month renewal period
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              • Total Amount: R{calculateTotalAmount().toLocaleString()}
            </Typography>
          </Alert>

          {/* Processing Progress */}
          {bulkRenewalMutation.isPending && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Processing renewals...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Error Display */}
          {bulkRenewalMutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to process bulk renewal. Please try again.
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleProcessRenewal}
              disabled={renewalData.member_ids.length === 0 || bulkRenewalMutation.isPending}
            >
              Process Renewals
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Bulk Renewal Processing</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You are about to process renewals for {renewalData.member_ids.length} members.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total amount: R{calculateTotalAmount().toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmProcess} variant="contained" color="primary">
            Confirm Processing
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkRenewalProcessor;
