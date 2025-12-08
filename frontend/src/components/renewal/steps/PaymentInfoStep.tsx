/**
 * Step 3: Payment Information
 * Collects payment details for renewal
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Payment,
  CreditCard,
  AccountBalance,
  Money,
  PhoneAndroid,
  Info,
} from '@mui/icons-material';
import { useRenewalStore } from '../../../store/renewalStore';
import { formatCurrency } from '../../../services/renewalApi';

const RENEWAL_AMOUNT = 10.0; // Standard renewal amount (24 months)

const PaymentInfoStep: React.FC = () => {
  const { memberData, formData, updateFormData, setCurrentStep, goToPreviousStep } = useRenewalStore();

  const [paymentMethod, setPaymentMethod] = useState<string>(formData.payment_method || 'Cash');
  const [paymentReference, setPaymentReference] = useState<string>(formData.payment_reference || '');
  const [amount, setAmount] = useState<number>(formData.amount_paid || RENEWAL_AMOUNT);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!memberData) {
    return (
      <Alert severity="error">
        No member data found. Please go back and enter your ID number.
      </Alert>
    );
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Card':
        return <CreditCard />;
      case 'EFT':
        return <AccountBalance />;
      case 'Mobile':
        return <PhoneAndroid />;
      case 'Cash':
      default:
        return <Money />;
    }
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    // Validate amount
    if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Update form data
    updateFormData({
      payment_method: paymentMethod as any,
      payment_reference: paymentReference,
      amount_paid: amount,
    });

    // Move to confirmation step
    setCurrentStep('confirmation');
  };

  return (
    <Box>
      {/* Payment Summary Card */}
      <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Payment sx={{ fontSize: 40, color: 'primary.dark' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Renewal Payment
              </Typography>
              <Typography variant="body2">
                Complete your payment to renew your membership for 24 months
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Amount Due
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(RENEWAL_AMOUNT)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Payment color="primary" />
          <Typography variant="h6">Payment Method</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Payment Method</InputLabel>
          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            label="Select Payment Method"
            startAdornment={
              <InputAdornment position="start">
                {getPaymentMethodIcon(paymentMethod)}
              </InputAdornment>
            }
          >
            <MenuItem value="Cash">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Money />
                <Box>
                  <Typography variant="body1">Cash</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay in cash at branch office
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
            <MenuItem value="Card">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCard />
                <Box>
                  <Typography variant="body1">Credit/Debit Card</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay online with card
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
            <MenuItem value="EFT">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalance />
                <Box>
                  <Typography variant="body1">EFT/Bank Transfer</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Direct bank transfer
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
            <MenuItem value="Mobile">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneAndroid />
                <Box>
                  <Typography variant="body1">Mobile Payment</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay via mobile money
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Payment Method Instructions */}
        {paymentMethod === 'EFT' && (
          <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Bank Transfer Details:</strong>
            </Typography>
            <Typography variant="body2">
              Bank: Standard Bank<br />
              Account Name: EFF Membership<br />
              Account Number: 1234567890<br />
              Branch Code: 051001<br />
              Reference: {memberData.membership_number || memberData.id_number}
            </Typography>
          </Alert>
        )}

        {paymentMethod === 'Cash' && (
          <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
            <Typography variant="body2">
              Please visit your nearest branch office to complete the cash payment. Bring your ID number and membership number for verification.
            </Typography>
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Payment Reference (Optional)"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              helperText="Enter transaction reference if available"
              placeholder="e.g., TXN123456"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              error={!!errors.amount}
              helperText={errors.amount || `Standard renewal: ${formatCurrency(RENEWAL_AMOUNT)}`}
              InputProps={{
                startAdornment: <InputAdornment position="start">R</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Terms and Conditions */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Terms and Conditions
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ maxHeight: 200, overflowY: 'auto', p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
          <Typography variant="body2" paragraph>
            By renewing your membership, you agree to the following terms and conditions:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Your membership will be renewed for a period of 24 months from the payment date.</li>
            <li>The renewal fee is non-refundable once processed.</li>
            <li>You agree to abide by the organization's constitution and code of conduct.</li>
            <li>Your personal information will be used in accordance with our privacy policy.</li>
            <li>You will receive a confirmation email once your renewal is processed.</li>
            <li>Your digital membership card will be available immediately after approval.</li>
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                setErrors((prev) => ({ ...prev, terms: '' }));
              }}
            />
          }
          label="I have read and accept the terms and conditions"
        />
        {errors.terms && (
          <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
            {errors.terms}
          </Typography>
        )}
      </Paper>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ArrowBack />}
          onClick={goToPreviousStep}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          fullWidth
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={!termsAccepted}
        >
          Review & Confirm
        </Button>
      </Box>
    </Box>
  );
};

export default PaymentInfoStep;

