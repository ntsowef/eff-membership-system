import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  IconButton,
} from '@mui/material';
import { ArrowBack, Refresh, Email, Sms } from '@mui/icons-material';

interface OTPVerificationFormProps {
  userId: number;
  phoneNumberMasked: string;
  emailMasked: string;
  expiresAt?: Date;
  isExistingOtp?: boolean;
  onVerify: (otpCode: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
}

const OTPVerificationForm: React.FC<OTPVerificationFormProps> = ({
  userId,
  phoneNumberMasked,
  emailMasked,
  expiresAt,
  isExistingOtp,
  onVerify,
  onResend,
  onBack,
  loading = false,
  error = null,
}) => {
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate time remaining until OTP expires
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtpCode = [...otpCode];
    newOtpCode[index] = value;
    setOtpCode(newOtpCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only process if it's 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtpCode = pastedData.split('');
      setOtpCode(newOtpCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.join('');
    
    if (code.length === 6) {
      await onVerify(code);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendSuccess(false);
    try {
      await onResend();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } finally {
      setResending(false);
    }
  };

  const isComplete = otpCode.every(digit => digit !== '');

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <IconButton onClick={onBack} sx={{ mb: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Enter Verification Code
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isExistingOtp
                ? 'You have an active OTP. Please check your messages for the code sent earlier.'
                : 'We sent a verification code to your registered phone and email.'}
            </Typography>
          </Box>

          {/* Delivery Info */}
          <Stack spacing={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Sms fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">
                SMS: {phoneNumberMasked}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Email fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">
                Email: {emailMasked}
              </Typography>
            </Box>
          </Stack>

          {/* OTP Input Fields */}
          <Box display="flex" gap={1} justifyContent="center">
            {otpCode.map((digit, index) => (
              <TextField
                key={index}
                inputRef={(el) => (inputRefs.current[index] = el)}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e as any)}
                onPaste={index === 0 ? handlePaste : undefined}
                inputProps={{
                  maxLength: 1,
                  style: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' },
                }}
                sx={{ width: 56 }}
                disabled={loading}
              />
            ))}
          </Box>

          {/* Time Remaining */}
          {timeRemaining && (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {timeRemaining === 'Expired' ? (
                <span style={{ color: 'red' }}>Code expired. Please request a new one.</span>
              ) : (
                `Code expires in: ${timeRemaining}`
              )}
            </Typography>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" onClose={() => {}}>
              {error}
            </Alert>
          )}

          {/* Success Message */}
          {resendSuccess && (
            <Alert severity="success">
              Verification code resent successfully!
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={!isComplete || loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>

          {/* Resend Button */}
          <Button
            variant="text"
            onClick={handleResend}
            disabled={resending || loading}
            startIcon={resending ? <CircularProgress size={16} /> : <Refresh />}
          >
            {resending ? 'Resending...' : 'Resend Code'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default OTPVerificationForm;

