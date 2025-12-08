import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  Paper,
  Stack,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import PublicHeader from '../../components/layout/PublicHeader';
import { authApi } from '../../services/api';

const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password')
}).required();

// Infer type from yup schema
type ResetPasswordFormData = yup.InferType<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  const handleSubmit = async (data: any) => {
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await authApi.resetPassword(token, data.password);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <PublicHeader />
        <Container maxWidth="sm" sx={{ pt: 12 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="error" gutterBottom>Invalid Reset Link</Typography>
            <Typography color="text.secondary" paragraph>
              This password reset link is invalid or has expired.
            </Typography>
            <Button component={RouterLink} to="/forgot-password" variant="contained">
              Request New Reset Link
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (isSuccess) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <PublicHeader />
        <Container maxWidth="sm" sx={{ pt: 12 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>Password Reset Successful!</Typography>
            <Typography color="text.secondary" paragraph>
              Your password has been successfully reset. You can now log in with your new password.
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <PublicHeader />
      <Container maxWidth="sm" sx={{ pt: 12 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>Reset Your Password</Typography>
          <Typography color="text.secondary" align="center" paragraph>
            Enter your new password below.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Stack spacing={3}>
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />

              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                sx={{ py: 1.5, background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)' }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
              </Button>

              <Button
                component={RouterLink}
                to="/login"
                fullWidth
                variant="text"
                startIcon={<ArrowBackIcon />}
              >
                Back to Login
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;

