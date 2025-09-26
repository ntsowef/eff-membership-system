import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useApplication } from '../../store';

interface PaymentStepProps {
  errors: Record<string, string>;
}

const PaymentStep: React.FC<PaymentStepProps> = ({ errors }) => {
  const { applicationData, updateApplicationData } = useApplication();

  const paymentMethods = [
    'Cash',
    'Bank Transfer',
    'EFT',
    'Credit Card',
    'Debit Card',
    'Mobile Payment'
  ];

  const defaultMembershipFee = 10.00;

  const handleFieldChange = (field: string, value: any) => {
    updateApplicationData({ [field]: value });
  };

  const handlePaymentDateChange = (date: Date | null) => {
    if (date) {
      // Set default values when payment date is selected
      if (!applicationData.payment_amount) {
        handleFieldChange('payment_amount', defaultMembershipFee);
      }
    }
    handleFieldChange('last_payment_date', date ? date.toISOString().split('T')[0] : '');
  };

  const hasPaymentInfo = applicationData.last_payment_date || 
                        applicationData.payment_method || 
                        applicationData.payment_reference;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Card elevation={2}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3}>
              <PaymentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
              <Box>
                <Typography variant="h5" component="h2" gutterBottom>
                  Payment Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Provide payment details if you have already made your membership payment
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Optional Step:</strong> You can complete your application without payment information. 
                Payment can be processed after your application is approved. The standard EFF membership fee is R{defaultMembershipFee.toFixed(2)}.
              </Typography>
            </Alert>

            <Divider sx={{ mb: 3 }} />

            {/* Payment Date */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Payment Date"
                  value={applicationData.last_payment_date ? new Date(applicationData.last_payment_date) : null}
                  onChange={handlePaymentDateChange}
                  maxDate={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.last_payment_date,
                      helperText: errors.last_payment_date || 'Date when payment was made',
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon color="action" />
                          </InputAdornment>
                        ),
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payment Amount"
                  type="number"
                  value={applicationData.payment_amount || ''}
                  onChange={(e) => handleFieldChange('payment_amount', parseFloat(e.target.value) || '')}
                  error={!!errors.payment_amount}
                  helperText={errors.payment_amount || `Standard membership fee: R${defaultMembershipFee.toFixed(2)}`}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MoneyIcon color="action" />
                        <Typography variant="body2" sx={{ ml: 0.5 }}>R</Typography>
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    min: 0,
                    step: 0.01
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.payment_method}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={applicationData.payment_method || ''}
                    onChange={(e) => handleFieldChange('payment_method', e.target.value)}
                    label="Payment Method"
                    startAdornment={
                      <InputAdornment position="start">
                        <PaymentIcon color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="">
                      <em>Select payment method</em>
                    </MenuItem>
                    {paymentMethods.map((method) => (
                      <MenuItem key={method} value={method}>
                        {method}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.payment_method && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.payment_method}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payment Reference"
                  value={applicationData.payment_reference || ''}
                  onChange={(e) => handleFieldChange('payment_reference', e.target.value)}
                  error={!!errors.payment_reference}
                  helperText={errors.payment_reference || 'Transaction reference, receipt number, or confirmation code'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ReceiptIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., TXN123456789, REC-2025-001"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Payment Notes (Optional)"
                  value={applicationData.payment_notes || ''}
                  onChange={(e) => handleFieldChange('payment_notes', e.target.value)}
                  error={!!errors.payment_notes}
                  helperText={errors.payment_notes || 'Additional information about the payment'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <NotesIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., Paid at branch office, Online banking transfer, Cash payment to treasurer..."
                />
              </Grid>
            </Grid>

            {/* Payment Summary */}
            {hasPaymentInfo && (
              <>
                <Divider sx={{ my: 3 }} />
                <Alert severity="success" sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Payment Information Summary
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {applicationData.last_payment_date && (
                      <li>
                        <Typography variant="body2">
                          <strong>Date:</strong> {new Date(applicationData.last_payment_date).toLocaleDateString()}
                        </Typography>
                      </li>
                    )}
                    {applicationData.payment_amount && (
                      <li>
                        <Typography variant="body2">
                          <strong>Amount:</strong> R{parseFloat(applicationData.payment_amount.toString()).toFixed(2)}
                        </Typography>
                      </li>
                    )}
                    {applicationData.payment_method && (
                      <li>
                        <Typography variant="body2">
                          <strong>Method:</strong> {applicationData.payment_method}
                        </Typography>
                      </li>
                    )}
                    {applicationData.payment_reference && (
                      <li>
                        <Typography variant="body2">
                          <strong>Reference:</strong> {applicationData.payment_reference}
                        </Typography>
                      </li>
                    )}
                  </Box>
                </Alert>
              </>
            )}

            {/* Help Information */}
            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Important:</strong> If you haven't made payment yet, you can complete your application 
                and make payment after approval. Our membership team will contact you with payment instructions.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default PaymentStep;
