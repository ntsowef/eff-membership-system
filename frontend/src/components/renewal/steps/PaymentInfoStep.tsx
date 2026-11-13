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
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Payment,
  CreditCard,
  AccountBalance,
  Money,
  PhoneAndroid,
  CloudUpload,
  Delete,
  PictureAsPdf,
  CheckCircle,
  Lock,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRenewalStore } from '../../../store/renewalStore';
import { formatCurrency } from '../../../services/renewalApi';
import { api } from '../../../lib/api';
import {
  sectionCardSx,
  summaryBannerSx,
  backButtonSx,
  cancelButtonSx,
  primaryActionSx,
} from '../renewalWizardStyles';

const RENEWAL_AMOUNT = 10.0; // Standard renewal amount (24 months)

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

const PaymentInfoStep: React.FC = () => {
  const navigate = useNavigate();
  const { memberData, formData, updateFormData, setCurrentStep, goToPreviousStep, resetRenewal } = useRenewalStore();

  const [paymentMethod, setPaymentMethod] = useState<string>(formData.payment_method || 'Cash');
  const [paymentReference, setPaymentReference] = useState<string>(formData.payment_reference || '');
  const [amount, setAmount] = useState<number>(formData.amount_paid || RENEWAL_AMOUNT);
  const [proofOfPayment, setProofOfPayment] = useState<any>(formData.proof_of_payment || null);
  const [fileError, setFileError] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Card payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(
    Boolean(formData.payment_method === 'Card' && formData.payment_reference)
  );
  const [paymentError, setPaymentError] = useState('');

  if (!memberData) {
    return (
      <Alert severity="error">
        No member data found. Please go back and enter your ID number.
      </Alert>
    );
  }

  const isCardPayment = paymentMethod === 'Card';
  const cardBrand = detectBrand(cardNumber);

  // Validate card form
  const isCardFormValid =
    cardNumber.replace(/\s/g, '').length >= 13 &&
    cardHolder.trim().length >= 2 &&
    expiryMonth !== '' &&
    expiryYear !== '' &&
    cvv.length >= 3;

  const handlePaymentMethodChange = (newMethod: string) => {
    setPaymentMethod(newMethod);
    setPaymentError('');
    setErrors({});
    if (newMethod !== 'Card') {
      setPaymentCompleted(false);
    }
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const response = await api.post('/payments/process-card-payment', {
        memberId: memberData.member_id,
        amount: amount,
        paymentType: 'Renewal',
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardHolder,
        expiryMonth,
        expiryYear,
        cvv,
      });

      const result = response.data;

      // Handle 3DS redirect if required
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      if (result.success) {
        setPaymentCompleted(true);
        const ref = result.transactionId || `PP-${result.paymentId}`;
        setPaymentReference(ref);
        updateFormData({
          payment_method: 'Card',
          payment_reference: ref,
          amount_paid: amount,
        });
      } else {
        setPaymentError(result.message || 'Payment failed. Please check your card details and try again.');
      }
    } catch (err: any) {
      console.error('Card payment error:', err);
      setPaymentError(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

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

  const handleFileUpload = (file: File) => {
    setFileError('');
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only JPEG, PNG, and PDF files are allowed.');
      return;
    }
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      setFileError('File size exceeds the 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const popData = {
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        file_data: base64Data,
      };
      setProofOfPayment(popData);
      updateFormData({ proof_of_payment: popData });
    };
    reader.onerror = () => {
      setFileError('Failed to read the file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProofOfPayment = () => {
    setProofOfPayment(null);
    updateFormData({ proof_of_payment: undefined });
    setFileError('');
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    // Validate amount
    if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Validate card payment
    if (isCardPayment && !paymentCompleted) {
      newErrors.payment = 'Please complete your card payment before proceeding';
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
      proof_of_payment: proofOfPayment || undefined,
    });

    // Move to confirmation step
    setCurrentStep('confirmation');
  };

  return (
    <Box>
      {/* Payment Summary Card */}
      <Card elevation={0} sx={summaryBannerSx}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Payment sx={{ fontSize: 36, color: '#DC143C' }} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Renewal Payment
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="caption" color="text.secondary">
                Amount Due
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#8B0000' }}>
                {formatCurrency(RENEWAL_AMOUNT)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Paper elevation={0} sx={sectionCardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Payment sx={{ color: '#DC143C' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Payment Method</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Payment Method</InputLabel>
          <Select
            value={paymentMethod}
            onChange={(e) => handlePaymentMethodChange(e.target.value)}
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
                <Typography variant="body1">Cash</Typography>
              </Box>
            </MenuItem>
            <MenuItem value="Card">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCard />
                <Typography variant="body1">Card Payment</Typography>
              </Box>
            </MenuItem>
            <MenuItem value="EFT">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalance />
                <Typography variant="body1">EFT / Bank Transfer</Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* ============================================================= */}
        {/* Card Payment Form (Peach Payments)                            */}
        {/* ============================================================= */}
        {isCardPayment && !paymentCompleted && (
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              mb: 3,
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

            {paymentError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPaymentError('')}>
                {paymentError}
              </Alert>
            )}

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
                : `Pay R${amount.toFixed(2)} Now`}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
              <Lock sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                256-bit SSL encryption • Powered by Peach Payments
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Card Payment Completed Alert */}
        {isCardPayment && paymentCompleted && (
          <Alert
            severity="success"
            icon={<CheckCircle sx={{ fontSize: 28 }} />}
            sx={{
              mb: 3,
              border: '2px solid',
              borderColor: 'success.main',
              borderRadius: 3,
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Payment Successful!
            </Typography>
            <Typography variant="body2">
              Your card payment of R{amount.toFixed(2)} has been processed successfully.
              Reference: <strong>{paymentReference}</strong>
            </Typography>
          </Alert>
        )}

        {errors.payment && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {errors.payment}
          </Alert>
        )}

        {/* ============================================================= */}
        {/* Proof of Payment Upload (Only for Cash & EFT)                 */}
        {/* ============================================================= */}
        {(paymentMethod === 'Cash' || paymentMethod === 'EFT') && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Proof of Payment (Required for Cash / EFT verification)
            </Typography>

            {proofOfPayment ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: 'rgba(46, 125, 50, 0.04)',
                  borderColor: 'success.main',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {proofOfPayment.mime_type === 'application/pdf' ? (
                    <PictureAsPdf sx={{ fontSize: 40, color: '#d32f2f' }} />
                  ) : (
                    <Box
                      component="img"
                      src={proofOfPayment.file_data}
                      alt="Proof of Payment"
                      sx={{
                        width: 48,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid #ddd',
                      }}
                    />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {proofOfPayment.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {((proofOfPayment.file_size || 0) / (1024 * 1024)).toFixed(2)} MB • Ready for renewal
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={<CheckCircle fontSize="small" />}
                    label="Attached"
                    color="success"
                    size="small"
                  />
                  <Tooltip title="Remove file">
                    <IconButton color="error" size="small" onClick={handleRemoveProofOfPayment}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            ) : (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: fileError ? 'error.main' : '#ccc',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: '#fafafa',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                  '&:hover': {
                    borderColor: '#DC143C',
                    bgcolor: 'rgba(220, 20, 60, 0.02)',
                  },
                }}
                onClick={() => document.getElementById('pop-file-input-renewal')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  id="pop-file-input-renewal"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <CloudUpload sx={{ fontSize: 36, color: '#DC143C', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Upload Proof of Payment (Receipt / Deposit Slip / Bank Confirmation)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Click to browse or drag & drop (PDF, JPG, PNG up to 5MB)
                </Typography>
              </Box>
            )}

            {fileError && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {fileError}
              </Typography>
            )}
          </Box>
        )}

        {/* Reference and Amount Fields (Only for Cash and EFT) */}
        {(paymentMethod === 'Cash' || paymentMethod === 'EFT') && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Reference (Optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
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
                helperText={errors.amount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Terms and Conditions */}
      <Paper elevation={0} sx={sectionCardSx}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Terms and Conditions
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ maxHeight: 200, overflowY: 'auto', p: 2, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
          <Typography variant="body2" paragraph>
            By renewing your membership, you agree to the following terms and conditions:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Your membership will be renewed for a period of 24 months from the payment date.</li>
            <li>The renewal fee is non-refundable once processed.</li>
            <li>You agree to abide by the organization's constitution and code of conduct.</li>
            <li>Your personal information will be used in accordance with our privacy policy.</li>
            <li>You will receive a confirmation once your renewal is processed.</li>
            <li>Your digital membership card will be updated immediately upon renewal completion.</li>
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
              sx={{
                color: 'rgba(220, 20, 60, 0.5)',
                '&.Mui-checked': { color: '#DC143C' },
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

      {/* Navigation Buttons aligned with /apply */}
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
            sx={cancelButtonSx}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={handleNext}
            disabled={!termsAccepted || (isCardPayment && !paymentCompleted)}
            sx={primaryActionSx}
          >
            {isCardPayment && !paymentCompleted
              ? 'Pay with Card above to Continue'
              : 'Review & Confirm'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PaymentInfoStep;
