import React, { useState } from 'react';
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
  Divider,
  Paper,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon,
  CreditCard,
  CheckCircle,
  Lock,
  Person as PersonIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useApplication } from '../../store';
import { api } from '../../lib/api';
import { devLog } from '../../utils/logger';

interface PaymentStepProps {
  errors: Record<string, string>;
  onPaymentSuccess?: () => void;
}

// Card number formatting: add space every 4 digits
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

// Generate year options (current year + 15 years)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 16 }, (_, i) => String(currentYear + i));
const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

const PaymentStep: React.FC<PaymentStepProps> = ({ errors, onPaymentSuccess }) => {
  const { applicationData, updateApplicationData } = useApplication();

  const paymentMethods = [
    'Cash',
    'Card Payment'
  ];

  const defaultMembershipFee = 10.00;

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleFieldChange = (field: string, value: any) => {
    updateApplicationData({ [field]: value });
  };

  const handlePaymentDateChange = (date: Date | null) => {
    if (date) {
      if (!applicationData.payment_amount) {
        handleFieldChange('payment_amount', defaultMembershipFee);
      }
    }
    handleFieldChange('last_payment_date', date ? date.toISOString().split('T')[0] : '');
  };

  const handlePaymentMethodChange = (method: string) => {
    handleFieldChange('payment_method', method);
    setPaymentCompleted(false);
    setPaymentError('');
    // Reset card fields
    setCardNumber('');
    setCardHolder('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvv('');
  };

  const isCardPayment = applicationData.payment_method === 'Card Payment';
  const cardBrand = detectBrand(cardNumber);

  // Validate card form
  const isCardFormValid =
    cardNumber.replace(/\s/g, '').length >= 13 &&
    cardHolder.trim().length >= 2 &&
    expiryMonth !== '' &&
    expiryYear !== '' &&
    cvv.length >= 3;

  // Submit card payment
  const handleCardPayment = async () => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const response = await api.post('/payments/process-card-payment', {
        memberId: 0,
        amount: applicationData.payment_amount || defaultMembershipFee,
        paymentType: 'Registration',
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardHolder,
        expiryMonth,
        expiryYear,
        cvv,
      });

      const result = response.data;
      devLog('💳 Card payment result:', result);

      // Handle 3DS redirect
      if (result.redirectUrl) {
        devLog('🔐 Redirecting to 3DS:', result.redirectUrl);
        window.location.href = result.redirectUrl;
        return;
      }

      if (result.success) {
        setPaymentCompleted(true);
        const today = new Date().toISOString().split('T')[0];
        updateApplicationData({
          payment_method: 'Card Payment',
          payment_reference: result.transactionId || `PP-${result.paymentId}`,
          last_payment_date: today,
          payment_amount: applicationData.payment_amount || defaultMembershipFee,
          payment_notes: `Peach Payments - ${result.paymentBrand || 'Card'} payment`,
        } as any);

        // Auto-advance to Review step after 2 seconds
        if (onPaymentSuccess) {
          setTimeout(() => {
            onPaymentSuccess();
          }, 2000);
        }
      } else {
        setPaymentError(result.message || 'Payment failed. Please check your card details and try again.');
      }
    } catch (err: any) {
      console.error('❌ Card payment error:', err);
      setPaymentError(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPaymentInfo = applicationData.last_payment_date || 
                        applicationData.payment_method || 
                        applicationData.payment_reference;

  // Processing state
  if (isProcessing) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <CircularProgress size={60} sx={{ color: '#DC143C' }} />
                <Typography variant="h6" sx={{ mt: 3, fontWeight: 600 }}>Processing your payment...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Please wait while we process your card payment. Do not close this page.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </LocalizationProvider>
    );
  }

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
                  Complete your membership payment to finalize your application
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Membership Fee:</strong> The standard EFF membership fee is R{defaultMembershipFee.toFixed(2)}.
                Select your preferred payment method below.
              </Typography>
            </Alert>

            <Divider sx={{ mb: 3 }} />

            {/* Payment Method Selection */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.payment_method}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={applicationData.payment_method || ''}
                    label="Payment Method"
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
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
                  label="Payment Amount"
                  type="number"
                  value={applicationData.payment_amount || defaultMembershipFee}
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
            </Grid>

            {/* ============================================================= */}
            {/* Card Payment → Custom Card Input Form                          */}
            {/* ============================================================= */}
            {isCardPayment && !paymentCompleted && (
              <Box sx={{ mt: 3 }}>
                {/* Payment error */}
                {paymentError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPaymentError('')}>
                    {paymentError}
                  </Alert>
                )}

                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    border: '2px solid',
                    borderColor: '#DC143C',
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.03) 0%, rgba(139, 0, 0, 0.02) 100%)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CreditCard sx={{ color: '#DC143C' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Secure Card Payment
                    </Typography>
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
                          }
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
                    sx={{
                      mt: 3,
                      background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                      color: 'white',
                      fontWeight: 700,
                      py: 1.5,
                      borderRadius: 3,
                      fontSize: '1rem',
                      textTransform: 'none',
                      boxShadow: '0 6px 20px rgba(220, 20, 60, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 28px rgba(220, 20, 60, 0.5)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                        color: 'rgba(0, 0, 0, 0.26)',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    {isProcessing
                      ? 'Processing Payment...'
                      : `Pay R${(applicationData.payment_amount || defaultMembershipFee).toFixed(2)} Now`}
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                    <Lock sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      256-bit SSL encryption • Powered by Peach Payments
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* ============================================================= */}
            {/* Payment Completed Successfully                                 */}
            {/* ============================================================= */}
            {isCardPayment && paymentCompleted && (
              <Alert
                severity="success"
                icon={<CheckCircle sx={{ fontSize: 28 }} />}
                sx={{
                  mt: 3,
                  border: '2px solid',
                  borderColor: 'success.main',
                  borderRadius: 3,
                  '& .MuiAlert-message': { width: '100%' },
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Payment Successful!
                </Typography>
                <Typography variant="body2">
                  Your card payment of R{(applicationData.payment_amount || defaultMembershipFee).toFixed(2)} has been processed successfully.
                  Reference: <strong>{applicationData.payment_reference}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  You can now proceed to the next step to review and submit your application.
                </Typography>
              </Alert>
            )}

            {/* ============================================================= */}
            {/* Cash Payment → Manual entry fields                             */}
            {/* ============================================================= */}
            {applicationData.payment_method === 'Cash' && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Please visit your nearest branch office to complete the cash payment.
                    Bring your ID number for verification.
                  </Typography>
                </Alert>

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
                      label="Payment Reference"
                      value={applicationData.payment_reference || ''}
                      onChange={(e) => handleFieldChange('payment_reference', e.target.value)}
                      error={!!errors.payment_reference}
                      helperText={errors.payment_reference || 'Receipt number or confirmation code'}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ReceiptIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      placeholder="e.g., REC-2025-001"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Payment Notes (Optional)"
                      value={applicationData.payment_notes || ''}
                      onChange={(e) => handleFieldChange('payment_notes', e.target.value)}
                      helperText="Additional information about the payment"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                            <NotesIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      placeholder="e.g., Cash payment at branch office..."
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Payment Summary (for Cash or completed Card) */}
            {hasPaymentInfo && (applicationData.payment_method === 'Cash' || paymentCompleted) && (
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

            {/* Help for no method selected */}
            {!applicationData.payment_method && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Important:</strong> If you haven't made payment yet, you can complete your application 
                  and make payment after approval. Our membership team will contact you with payment instructions.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default PaymentStep;
