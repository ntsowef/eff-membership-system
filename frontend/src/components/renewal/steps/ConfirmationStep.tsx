/**
 * Step 4: Confirmation & Submit
 * Displays summary and processes renewal.
 * For Card payments: shows inline card form for S2S payment via Peach Payments.
 * For Cash/EFT/Mobile: processes directly.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Warning,
  Person,
  Payment,
  CreditCard,
  Lock,
  Person as PersonIcon,
  PictureAsPdf,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRenewalStore } from '../../../store/renewalStore';
import { processRenewal, formatCurrency, formatDate } from '../../../services/renewalApi';
import { devLog } from '../../../utils/logger';
import { queryKeys } from '../../../lib/queryClient';
import { showSuccess } from '../../../utils/sweetAlert';
import { api } from '../../../lib/api';
import {
  sectionCardSx,
  summaryBannerSx,
  backButtonSx,
  cancelButtonSx,
  primaryActionSx,
  finalSubmitActionSx,
} from '../renewalWizardStyles';

// Card number formatting
const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').substring(0, 16);
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

// Detect card brand from BIN
const detectBrand = (num: string): 'visa' | 'mastercard' | 'unknown' => {
  const cleaned = num.replace(/\s/g, '');
  if (/^4/.test(cleaned)) return 'visa';
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
  return 'unknown';
};

// Year/month options
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 16 }, (_, i) => String(currentYear + i));
const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

const ConfirmationStep: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { memberData, formData, setRenewalResult, goToPreviousStep, resetRenewal } = useRenewalStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Card form state (for Card payments)
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  if (!memberData) {
    return (
      <Alert severity="error">
        No member data found. Please go back and enter your ID number.
      </Alert>
    );
  }

  const isCardPayment = formData.payment_method === 'Card';
  const cardBrand = detectBrand(cardNumber);

  const isCardFormValid =
    cardNumber.replace(/\s/g, '').length >= 13 &&
    cardHolder.trim().length >= 2 &&
    expiryMonth !== '' &&
    expiryYear !== '' &&
    cvv.length >= 3;

  // Process card payment via S2S
  const handleCardPayment = async () => {
    setError('');
    setIsProcessing(true);

    try {
      // First update member data via renewal process (non-card fields)
      const renewalData = {
        id_number: memberData.id_number,
        payment_method: 'Card' as const,
        payment_reference: '',
        amount_paid: formData.amount_paid,
        shopperResultUrl: `${window.location.origin}/renewal/payment-result`,
        updated_member_data: {
          email: formData.email,
          cell_number: formData.cell_number,
          landline_number: formData.landline_number,
          residential_address: formData.residential_address,
          postal_address: formData.postal_address,
        },
      };

      // Process the card payment directly via S2S endpoint
      const cardResponse = await api.post('/payments/process-card-payment', {
        memberId: memberData.member_id,
        amount: formData.amount_paid,
        paymentType: 'Renewal',
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardHolder,
        expiryMonth,
        expiryYear,
        cvv,
      });

      const result = cardResponse.data;
      devLog('💳 S2S card payment result:', result);

      // Handle 3DS redirect
      if (result.redirectUrl) {
        devLog('🔐 Redirecting to 3DS:', result.redirectUrl);
        window.location.href = result.redirectUrl;
        return;
      }

      if (result.success) {
        // Payment succeeded — also update member data
        try {
          // Process the renewal data update (without card payment again)
          await api.post('/renewals/process', {
            ...renewalData,
            payment_method: 'Card',
            payment_reference: result.transactionId || `PP-${result.paymentId}`,
          });
        } catch (updateErr) {
          devLog('⚠️ Member data update after card payment:', updateErr);
          // Payment succeeded even if member update had issues
        }

        // Invalidate caches
        await queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
        await queryClient.invalidateQueries({ queryKey: ['renewals'] });
        await queryClient.invalidateQueries({ queryKey: ['analytics'] });

        showSuccess('Your membership has been renewed for 24 months.', 'Payment Successful!');
        resetRenewal();
        navigate('/');
      } else {
        setError(result.message || 'Payment failed. Please check your card details and try again.');
      }
    } catch (err: any) {
      console.error('Error processing card payment:', err);
      setError(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsProcessing(true);

    try {
      // Card payment → show card form only if not already paid on the payment step
      if (isCardPayment && !formData.payment_reference) {
        setShowCardForm(true);
        setIsProcessing(false);
        return;
      }

      // Non-card payment → direct processing
      const renewalData = {
        id_number: memberData.id_number,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        amount_paid: formData.amount_paid,
        shopperResultUrl: `${window.location.origin}/renewal/payment-result`,
        proof_of_payment: formData.proof_of_payment,
        updated_member_data: {
          email: formData.email,
          cell_number: formData.cell_number,
          landline_number: formData.landline_number,
          residential_address: formData.residential_address,
          postal_address: formData.postal_address,
        },
      };

      const result = await processRenewal(renewalData);

      setRenewalResult(result);

      await queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      await queryClient.invalidateQueries({ queryKey: ['renewals'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['statistics'] });

      showSuccess('Your membership has been renewed for 24 months.', 'Renewal Successful!');
      resetRenewal();
      navigate('/');
    } catch (err: any) {
      console.error('Error processing renewal:', err);
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasUpdates =
    formData.email !== memberData.email ||
    formData.cell_number !== memberData.cell_number ||
    formData.landline_number !== memberData.landline_number ||
    formData.residential_address !== memberData.residential_address ||
    formData.postal_address !== memberData.postal_address;

  // Processing overlay (remains inside the white card & outer red shell)
  if (isProcessing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} sx={{ color: '#DC143C' }} />
        <Typography variant="h6" sx={{ mt: 3, fontWeight: 600 }}>
          Processing your renewal...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please wait while we process your renewal. Do not close this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Header */}
      <Card elevation={0} sx={summaryBannerSx}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle sx={{ fontSize: 36, color: '#DC143C' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {showCardForm ? 'Complete Your Payment' : 'Review Your Renewal'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Card Payment Form (S2S) */}
      {showCardForm && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            border: '2px solid',
            borderColor: '#DC143C',
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.03) 0%, rgba(139, 0, 0, 0.02) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <CreditCard sx={{ color: '#DC143C' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Secure Card Payment</Typography>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Box
                component="img"
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png"
                alt="Visa"
                sx={{ height: 20, opacity: cardBrand === 'visa' || cardBrand === 'unknown' ? 1 : 0.3 }}
              />
              <Box
                component="img"
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
                alt="Mastercard"
                sx={{ height: 20, opacity: cardBrand === 'mastercard' || cardBrand === 'unknown' ? 1 : 0.3 }}
              />
            </Box>
          </Box>

          <Grid container spacing={2.5}>
            {/* Card Number */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                inputProps={{ maxLength: 19, autoComplete: 'cc-number' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCard color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    letterSpacing: '0.1em',
                  },
                }}
              />
            </Grid>

            {/* Cardholder Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cardholder Name"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                placeholder="JOHN DOE"
                inputProps={{ autoComplete: 'cc-name' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Expiry Month */}
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Month</InputLabel>
                <Select
                  value={expiryMonth}
                  label="Month"
                  onChange={(e) => setExpiryMonth(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Expiry Year */}
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={expiryYear}
                  label="Year"
                  onChange={(e) => setExpiryYear(e.target.value)}
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* CVV */}
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="CVV"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                placeholder="•••"
                inputProps={{ maxLength: 4, autoComplete: 'cc-csc' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" sx={{ fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Pay Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleCardPayment}
            disabled={!isCardFormValid || isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <Lock />}
            sx={{ ...primaryActionSx, mt: 3 }}
          >
            {isProcessing
              ? 'Processing Payment...'
              : `Pay ${formatCurrency(formData.amount_paid)} Now`}
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
            <Lock sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              256-bit SSL encryption • Powered by Peach Payments
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Personal Information Summary (hidden during card form) */}
      {!showCardForm && (
        <>
          <Paper elevation={0} sx={sectionCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Person sx={{ color: '#DC143C' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Personal Information</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Full Name</Typography>
                <Typography variant="body1">{memberData.firstname} {memberData.surname}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">ID Number</Typography>
                <Typography variant="body1">{memberData.id_number}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Membership Number</Typography>
                <Typography variant="body1" fontWeight="bold">{memberData.membership_number}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Current Expiry Date</Typography>
                <Typography variant="body1">
                  {memberData.expiry_date ? formatDate(memberData.expiry_date) : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Updated Contact Information */}
          {hasUpdates && (
            <Paper
              elevation={0}
              sx={{
                ...sectionCardSx,
                border: '2px solid',
                borderColor: 'warning.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Warning color="warning" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Updated Information</Typography>
                <Chip label="Changes Detected" color="warning" size="small" sx={{ ml: 'auto' }} />
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {formData.email !== memberData.email && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Email Address</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                        {memberData.email || 'Not set'}
                      </Typography>
                      <Typography variant="body2">→</Typography>
                      <Typography variant="body1" fontWeight="bold">{formData.email}</Typography>
                    </Box>
                  </Grid>
                )}
                {formData.cell_number !== memberData.cell_number && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Cell Phone Number</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                        {memberData.cell_number || 'Not set'}
                      </Typography>
                      <Typography variant="body2">→</Typography>
                      <Typography variant="body1" fontWeight="bold">{formData.cell_number}</Typography>
                    </Box>
                  </Grid>
                )}
                {formData.residential_address !== memberData.residential_address && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Residential Address</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                        {memberData.residential_address || 'Not set'}
                      </Typography>
                      <Typography variant="body2">→</Typography>
                      <Typography variant="body1" fontWeight="bold">{formData.residential_address}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Payment Summary */}
          <Paper elevation={0} sx={sectionCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Payment sx={{ color: '#DC143C' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Payment Details</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                <Typography variant="body1">{formData.payment_method}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Amount</Typography>
                <Typography variant="h6" sx={{ color: '#8B0000', fontWeight: 700 }}>
                  {formatCurrency(formData.amount_paid)}
                </Typography>
              </Grid>
              {formData.payment_reference && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Payment Reference</Typography>
                  <Typography variant="body1">{formData.payment_reference}</Typography>
                </Grid>
              )}
              {formData.proof_of_payment && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Attached Proof of Payment</Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      mt: 0.5,
                      border: '1px solid',
                      borderColor: 'success.light',
                      borderRadius: 2,
                      bgcolor: 'rgba(46, 125, 50, 0.04)',
                    }}
                  >
                    {formData.proof_of_payment.mime_type === 'application/pdf' ? (
                      <PictureAsPdf sx={{ fontSize: 32, color: '#d32f2f' }} />
                    ) : (
                      <Box
                        component="img"
                        src={formData.proof_of_payment.file_data}
                        alt="PoP Preview"
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formData.proof_of_payment.filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {((formData.proof_of_payment.file_size || 0) / (1024 * 1024)).toFixed(2)} MB
                      </Typography>
                    </Box>
                    <Chip
                      icon={<CheckCircle fontSize="small" />}
                      label="Verified Attachment"
                      color="success"
                      size="small"
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Navigation Buttons (hidden during card form) */}
      {!showCardForm && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mt: 2,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={goToPreviousStep}
            disabled={isProcessing}
            sx={backButtonSx}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => {
                resetRenewal();
                navigate('/');
              }}
              disabled={isProcessing}
              sx={cancelButtonSx}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="large"
              endIcon={
                isProcessing
                  ? <CircularProgress size={20} color="inherit" />
                  : (isCardPayment && !formData.payment_reference ? <CreditCard /> : <CheckCircle />)
              }
              onClick={handleSubmit}
              disabled={isProcessing}
              sx={isCardPayment && !formData.payment_reference ? primaryActionSx : finalSubmitActionSx}
            >
              {isProcessing
                ? 'Processing...'
                : isCardPayment && !formData.payment_reference
                  ? 'Proceed to Payment'
                  : 'Confirm Renewal'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Back button during card form */}
      {showCardForm && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => setShowCardForm(false)}
            disabled={isProcessing}
            sx={backButtonSx}
          >
            Back to Review
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ConfirmationStep;
