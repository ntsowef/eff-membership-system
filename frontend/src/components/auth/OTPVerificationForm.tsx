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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Email,
  Sms,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material';
import { api } from '../../lib/api';

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

// Time threshold for showing emergency access button (5 minutes in milliseconds)
const EMERGENCY_ACCESS_THRESHOLD_MS = 5 * 60 * 1000;

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

  // Emergency access state
  const [waitingTime, setWaitingTime] = useState(0); // Time waiting in seconds
  const [showEmergencyButton, setShowEmergencyButton] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyUrgency, setEmergencyUrgency] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [emergencyDuration, setEmergencyDuration] = useState(24);
  const [submittingEmergency, setSubmittingEmergency] = useState(false);
  const [emergencySuccess, setEmergencySuccess] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const waitingStartTime = useRef<number>(Date.now());

  // Track waiting time and show emergency button after 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - waitingStartTime.current;
      setWaitingTime(Math.floor(elapsed / 1000));

      if (elapsed >= EMERGENCY_ACCESS_THRESHOLD_MS && !showEmergencyButton) {
        setShowEmergencyButton(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showEmergencyButton]);

  // Format waiting time display
  const formatWaitingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Handle emergency access request submission
  const handleEmergencySubmit = async () => {
    if (!emergencyReason.trim()) {
      setEmergencyError('Please provide a reason for emergency access');
      return;
    }

    setSubmittingEmergency(true);
    setEmergencyError(null);

    try {
      const response = await api.post('/emergency-access/request-preauth', {
        user_id: userId,
        reason: emergencyReason,
        urgency_level: emergencyUrgency,
        contact_phone: emergencyPhone || undefined,
        contact_email: emergencyEmail || undefined,
        duration_hours: emergencyDuration,
      });

      if (response.data.success) {
        setEmergencySuccess(true);
        setEmergencyDialogOpen(false);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to submit emergency access request';
      setEmergencyError(errorMessage);
    } finally {
      setSubmittingEmergency(false);
    }
  };

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

          {/* Waiting Time Display */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={1}
            sx={{
              py: 1,
              px: 2,
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }}
          >
            <AccessTimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Waiting: {formatWaitingTime(waitingTime)}
            </Typography>
          </Box>

          {/* Emergency Access Success Message */}
          {emergencySuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Emergency access request submitted!
              </Typography>
              <Typography variant="body2">
                A National Administrator will review your request shortly. You can still enter your OTP code if it arrives.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                For urgent matters, contact the National Admin directly.
              </Typography>
            </Alert>
          )}

          {/* Emergency Access Button - Shows after 5 minutes */}
          <Collapse in={showEmergencyButton && !emergencySuccess}>
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WarningIcon color="warning" fontSize="small" />
                <Typography variant="body2" fontWeight="bold" color="warning.dark">
                  Haven't received your code?
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                If you've been waiting for more than 5 minutes and haven't received your verification code, you can request emergency access.
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                startIcon={<SupportAgentIcon />}
                onClick={() => setEmergencyDialogOpen(true)}
              >
                Request Emergency Access
              </Button>
            </Box>
          </Collapse>
        </Stack>
      </Box>

      {/* Emergency Access Request Dialog */}
      <Dialog
        open={emergencyDialogOpen}
        onClose={() => setEmergencyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SupportAgentIcon color="warning" />
            Request Emergency Access
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Submit this request if you cannot receive OTP codes. A National Administrator will review and may grant temporary access.
            </Alert>

            {emergencyError && (
              <Alert severity="error" onClose={() => setEmergencyError(null)}>
                {emergencyError}
              </Alert>
            )}

            <TextField
              label="Reason for Emergency Access"
              multiline
              rows={3}
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              placeholder="Explain why you cannot receive the OTP code (e.g., SMS not being delivered, phone issues, etc.)"
              required
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Urgency Level</InputLabel>
              <Select
                value={emergencyUrgency}
                label="Urgency Level"
                onChange={(e) => setEmergencyUrgency(e.target.value as any)}
              >
                <MenuItem value="low">Low - Can wait a few hours</MenuItem>
                <MenuItem value="normal">Normal - Need access today</MenuItem>
                <MenuItem value="high">High - Need access within an hour</MenuItem>
                <MenuItem value="critical">Critical - Need immediate access</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Contact Phone (Optional)"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="Alternative phone number to reach you"
              fullWidth
            />

            <TextField
              label="Contact Email (Optional)"
              value={emergencyEmail}
              onChange={(e) => setEmergencyEmail(e.target.value)}
              placeholder="Alternative email address"
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Access Duration Needed</InputLabel>
              <Select
                value={emergencyDuration}
                label="Access Duration Needed"
                onChange={(e) => setEmergencyDuration(Number(e.target.value))}
              >
                <MenuItem value={1}>1 hour</MenuItem>
                <MenuItem value={4}>4 hours</MenuItem>
                <MenuItem value={8}>8 hours</MenuItem>
                <MenuItem value={24}>24 hours</MenuItem>
                <MenuItem value={48}>48 hours</MenuItem>
                <MenuItem value={72}>72 hours (3 days)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleEmergencySubmit}
            disabled={submittingEmergency || !emergencyReason.trim()}
            startIcon={submittingEmergency ? <CircularProgress size={20} /> : <SupportAgentIcon />}
          >
            {submittingEmergency ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default OTPVerificationForm;

