import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  // Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Link,
  CircularProgress,
  // Divider,
  // useTheme,
  // useMediaQuery,
  Paper,
  Stack
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Login as LoginIcon,
  // Security as SecurityIcon,
  // Business as BusinessIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth, useUI } from '../../store';
import { UserManagementAPI } from '../../lib/userManagementApi';
import PublicHeader from '../../components/layout/PublicHeader';
import OTPVerificationForm from '../../components/auth/OTPVerificationForm';
import { api } from '../../lib/api';

// Validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  rememberMe: yup.boolean()
});

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const LoginPage: React.FC = () => {
  // const theme = useTheme();
  // const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { addNotification, setLoading } = useUI();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP state
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otpData, setOtpData] = useState<{
    userId: number;
    phoneNumberMasked: string;
    emailMasked: string;
    expiresAt?: Date;
    isExistingOtp?: boolean;
  } | null>(null);

  const form = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setError(null);
    setLoading(true);

    try {
      const response = await UserManagementAPI.login(data.email, data.password);

      if (response.success) {
        // Check if OTP is required
        if (response.data.requires_otp) {
          // Show OTP form
          setOtpData({
            userId: response.data.user_id,
            phoneNumberMasked: response.data.phone_number_masked,
            emailMasked: response.data.email_masked,
            expiresAt: response.data.otp_expires_at ? new Date(response.data.otp_expires_at) : undefined,
            isExistingOtp: response.data.is_existing_otp,
          });
          setShowOtpForm(true);

          addNotification({
            type: 'info',
            message: response.message || 'Please enter the verification code sent to your phone and email.'
          });
        } else {
          // Store remember me preference
          if (data.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberMe');
          }

          // Login user with session ID
          login(response.data.user, response.data.token, response.data.session_id);

          addNotification({
            type: 'success',
            message: `Welcome back, ${response.data.user.name}!`
          });

          // Navigate to intended destination or role-based dashboard
          let defaultDashboard = '/admin/dashboard';

          // Redirect super admin users to Super Admin Dashboard
          if (response.data.user.role === 'SUPER_ADMIN') {
            defaultDashboard = '/admin/super-admin/dashboard';
          }

          const from = (location.state as any)?.from?.pathname || defaultDashboard;

          // Use React Router navigation (client-side, no page reload)
          // This preserves the Zustand store state and axios interceptors
          console.log('✅ Login successful, redirecting to:', from);
          navigate(from, { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please try again.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleOtpVerify = async (otpCode: string) => {
    if (!otpData) return;

    setIsSubmitting(true);
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', {
        user_id: otpData.userId,
        otp_code: otpCode,
      });

      if (response.data.success) {
        // Store remember me preference
        const rememberMe = form.getValues('rememberMe');
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }

        // Login user with session ID
        login(response.data.data.user, response.data.data.token, response.data.data.session_id);

        addNotification({
          type: 'success',
          message: `Welcome back, ${response.data.data.user.name}!`
        });

        // Navigate to intended destination or role-based dashboard
        let defaultDashboard = '/admin/dashboard';

        // Redirect super admin users to Super Admin Dashboard
        if (response.data.data.user.role === 'SUPER_ADMIN') {
          defaultDashboard = '/admin/super-admin/dashboard';
        }

        const from = (location.state as any)?.from?.pathname || defaultDashboard;
        console.log('✅ OTP verified, redirecting to:', from);
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);

      let errorMessage = 'Invalid verification code. Please try again.';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many verification attempts. Please try again later.';
      }

      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleOtpResend = async () => {
    if (!otpData) return;

    try {
      const response = await api.post('/auth/resend-otp', {
        user_id: otpData.userId,
      });

      if (response.data.success) {
        // Update OTP data with new expiration
        setOtpData({
          ...otpData,
          expiresAt: response.data.data.otp_expires_at ? new Date(response.data.data.otp_expires_at) : undefined,
          isExistingOtp: response.data.data.is_existing_otp,
        });

        addNotification({
          type: 'success',
          message: response.data.message || 'Verification code resent successfully!'
        });
      }
    } catch (error: any) {
      console.error('OTP resend error:', error);

      let errorMessage = 'Failed to resend verification code. Please try again.';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      addNotification({
        type: 'error',
        message: errorMessage
      });

      throw error; // Re-throw to let the OTP form handle it
    }
  };

  const handleBackToLogin = () => {
    setShowOtpForm(false);
    setOtpData(null);
    setError(null);
  };

  return (
    <Box>
      {/* Sticky Header */}
      <PublicHeader />

      <Box
        sx={{
          minHeight: 'calc(100vh - 72px)',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #8B0000 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(220, 20, 60, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 0, 0, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }
        }}
      >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        {/* Show OTP form if OTP is required */}
        {showOtpForm && otpData ? (
          <OTPVerificationForm
            userId={otpData.userId}
            phoneNumberMasked={otpData.phoneNumberMasked}
            emailMasked={otpData.emailMasked}
            expiresAt={otpData.expiresAt}
            isExistingOtp={otpData.isExistingOtp}
            onVerify={handleOtpVerify}
            onResend={handleOtpResend}
            onBack={handleBackToLogin}
            loading={isSubmitting}
            error={error}
          />
        ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(220, 20, 60, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 100px rgba(220, 20, 60, 0.1)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.4), 0 0 120px rgba(220, 20, 60, 0.15)'
            }
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
              color: 'white',
              p: 3,
              textAlign: 'center',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
              }
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              fontWeight="700"
              gutterBottom
              sx={{
                letterSpacing: '0.5px',
                textShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              EFF Membership Portal
            </Typography>
            <Typography
              variant="body1"
              sx={{
                opacity: 0.95,
                fontWeight: 500,
                letterSpacing: '0.3px'
              }}
            >
              Secure Administrative Access
            </Typography>
          </Box>

          <CardContent sx={{ p: 5 }}>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  border: '1px solid rgba(211, 47, 47, 0.3)',
                  animation: 'slideInDown 0.4s ease-out',
                  '@keyframes slideInDown': {
                    '0%': { opacity: 0, transform: 'translateY(-10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={form.handleSubmit(handleSubmit as any)} noValidate>
              <Stack spacing={3}>
                {/* Email Field */}
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email Address"
                      type="email"
                      autoComplete="email"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={isSubmitting}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon sx={{ color: '#DC143C' }} />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(220, 20, 60, 0.1)'
                          },
                          '&.Mui-focused': {
                            boxShadow: '0 4px 16px rgba(220, 20, 60, 0.15)'
                          }
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#DC143C',
                          borderWidth: '2px'
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#DC143C',
                          fontWeight: 600
                        }
                      }}
                    />
                  )}
                />

                {/* Password Field */}
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={isSubmitting}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: '#DC143C' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={togglePasswordVisibility}
                              edge="end"
                              disabled={isSubmitting}
                              aria-label="toggle password visibility"
                              sx={{
                                color: '#DC143C',
                                '&:hover': {
                                  backgroundColor: 'rgba(220, 20, 60, 0.08)'
                                }
                              }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(220, 20, 60, 0.1)'
                          },
                          '&.Mui-focused': {
                            boxShadow: '0 4px 16px rgba(220, 20, 60, 0.15)'
                          }
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#DC143C',
                          borderWidth: '2px'
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#DC143C',
                          fontWeight: 600
                        }
                      }}
                    />
                  )}
                />

                {/* Remember Me & Forgot Password */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Controller
                    name="rememberMe"
                    control={form.control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            {...field}
                            checked={field.value}
                            disabled={isSubmitting}
                            sx={{
                              color: '#DC143C',
                              '&.Mui-checked': {
                                color: '#DC143C'
                              }
                            }}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Remember me
                          </Typography>
                        }
                      />
                    )}
                  />

                  <Link
                    component={RouterLink}
                    to="/forgot-password"
                    variant="body2"
                    sx={{
                      textDecoration: 'none',
                      color: '#DC143C',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: '#8B0000',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                {/* Login Button */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <LoginIcon />
                    )
                  }
                  sx={{
                    py: 1.8,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                    boxShadow: '0 4px 14px rgba(220, 20, 60, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                      boxShadow: '0 6px 20px rgba(220, 20, 60, 0.5)',
                      transform: 'translateY(-2px)'
                    },
                    '&:active': {
                      transform: 'translateY(0)'
                    },
                    '&.Mui-disabled': {
                      background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.5) 0%, rgba(139, 0, 0, 0.5) 100%)',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Paper>
        )}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            © 2025 EFF Membership Management System. All rights reserved.
          </Typography>
        </Box>
      </Container>
      </Box>
    </Box>
  );
};

export default LoginPage;
