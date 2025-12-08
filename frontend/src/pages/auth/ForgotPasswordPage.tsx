import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Paper,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import PublicHeader from '../../components/layout/PublicHeader';
import { authApi } from '../../services/api';

// Validation schema
const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
}).required();

// Infer type from yup schema
type ForgotPasswordFormData = yup.InferType<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Call the forgot password API
      await authApi.forgotPassword(data.email);
      setIsSuccess(true);
    } catch (error: any) {
      // Always show success to prevent email enumeration attacks
      // The backend also returns success regardless of whether email exists
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
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
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(46, 125, 50, 0.2)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 100px rgba(46, 125, 50, 0.1)',
              animation: 'fadeIn 0.5s ease-out',
              '@keyframes fadeIn': {
                '0%': { opacity: 0, transform: 'scale(0.95)' },
                '100%': { opacity: 1, transform: 'scale(1)' }
              }
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
                color: 'white',
                p: 4,
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
              <CheckCircleIcon
                sx={{
                  fontSize: 64,
                  mb: 2,
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' }
                  }
                }}
              />
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
                Check Your Email
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.95,
                  fontWeight: 500,
                  letterSpacing: '0.3px'
                }}
              >
                Password reset instructions sent
              </Typography>
            </Box>

            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <Typography
                variant="body1"
                color="text.secondary"
                paragraph
                sx={{ fontSize: '1.05rem', lineHeight: 1.7 }}
              >
                We've sent password reset instructions to your email address.
                Please check your inbox and follow the link to reset your password.
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                paragraph
                sx={{ fontSize: '0.95rem' }}
              >
                Didn't receive the email? Check your spam folder or try again.
              </Typography>

              <Stack spacing={2.5} sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/login"
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1rem',
                    background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
                    boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #256D28 0%, #145018 100%)',
                      boxShadow: '0 6px 20px rgba(46, 125, 50, 0.5)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  Back to Login
                </Button>

                <Button
                  variant="text"
                  onClick={() => {
                    setIsSuccess(false);
                    form.reset();
                  }}
                  sx={{
                    textTransform: 'none',
                    color: '#2E7D32',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'rgba(46, 125, 50, 0.08)'
                    }
                  }}
                >
                  Try Different Email
                </Button>
              </Stack>
            </CardContent>
          </Paper>
        </Container>
        </Box>
      </Box>
    );
  }

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
              Reset Password
            </Typography>
            <Typography
              variant="body1"
              sx={{
                opacity: 0.95,
                fontWeight: 500,
                letterSpacing: '0.3px'
              }}
            >
              Enter your email to receive reset instructions
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

            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
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
                      autoFocus
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

                {/* Submit Button */}
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
                      <SendIcon />
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
                  {isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
                </Button>

                {/* Back to Login */}
                <Button
                  component={RouterLink}
                  to="/login"
                  fullWidth
                  variant="text"
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    color: '#DC143C',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(220, 20, 60, 0.08)',
                      color: '#8B0000'
                    }
                  }}
                >
                  Back to Login
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Paper>

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

export default ForgotPasswordPage;
