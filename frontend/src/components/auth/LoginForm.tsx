import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Link,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { UserManagementAPI } from '../../lib/userManagementApi';

// Validation schemas
const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required')
});

const mfaSchema = yup.object({
  mfaToken: yup.string().length(6, 'MFA token must be 6 digits').required('MFA token is required')
});

interface LoginFormData {
  email: string;
  password: string;
}

interface MFAFormData {
  mfaToken: string;
}

interface LoginFormProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [loginData, setLoginData] = useState<LoginFormData | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const mfaForm = useForm<MFAFormData>({
    resolver: yupResolver(mfaSchema),
    defaultValues: {
      mfaToken: ''
    }
  });

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      // First, check if MFA is required for this user
      // Note: In a real implementation, you might want to check this after initial auth
      const response = await UserManagementAPI.login(data.email, data.password);
      
      if (response.success) {
        if (response.data.requires_mfa) {
          setLoginData(data);
          setMfaRequired(true);
          setStep('mfa');
        } else {
          onLoginSuccess(response.data.user, response.data.token);
        }
      }
    } catch (error: any) {
      if (error.response?.data?.error?.code === 'MFA_REQUIRED') {
        setLoginData(data);
        setMfaRequired(true);
        setStep('mfa');
      } else {
        setError(error.response?.data?.error?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerification = async (data: MFAFormData) => {
    if (!loginData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await UserManagementAPI.login(
        loginData.email, 
        loginData.password, 
        data.mfaToken
      );
      
      if (response.success) {
        onLoginSuccess(response.data.user, response.data.token);
      }
    } catch (error: any) {
      setError(error.response?.data?.error?.message || 'Invalid MFA token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('login');
    setLoginData(null);
    setMfaRequired(false);
    setError(null);
    mfaForm.reset();
  };

  const steps = ['Login', 'Two-Factor Authentication'];

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
      p={2}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Membership System
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Secure Admin Access
            </Typography>
          </Box>

          {mfaRequired && (
            <Box mb={3}>
              <Stepper activeStep={step === 'login' ? 0 : 1} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <Box mb={2}>
                <Controller
                  name="email"
                  control={loginForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email Address"
                      type="email"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Box>

              <Box mb={3}>
                <Controller
                  name="password"
                  control={loginForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{ mb: 2 }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={mfaForm.handleSubmit(handleMFAVerification)}>
              <Box textAlign="center" mb={3}>
                <SecurityIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Two-Factor Authentication
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Enter the 6-digit code from your authenticator app
                </Typography>
              </Box>

              <Box mb={3}>
                <Controller
                  name="mfaToken"
                  control={mfaForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Authentication Code"
                      placeholder="000000"
                      inputProps={{ 
                        maxLength: 6,
                        style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SecurityIcon />}
                sx={{ mb: 2 }}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={handleBackToLogin}
                disabled={loading}
              >
                Back to Login
              </Button>
            </form>
          )}

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Demo Accounts:
            </Typography>
            <Typography variant="caption" display="block" color="textSecondary">
              Super Admin: admin@membership.org / Admin123!
            </Typography>
            <Typography variant="caption" display="block" color="textSecondary">
              Province Admin: gauteng.admin@membership.org / ProvAdmin123!
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;
