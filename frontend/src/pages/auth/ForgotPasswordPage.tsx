import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  Paper,
  Stack,
  useTheme
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Validation schema
const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
}).required();

// Infer type from schema to ensure compatibility with yupResolver
type ForgotPasswordFormData = yup.InferType<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: Implement forgot password API call
      // await UserManagementAPI.forgotPassword(data.email);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSuccess(true);
    } catch (error: any) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
          display: 'flex',
          alignItems: 'center',
          py: 3
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={24}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                color: 'white',
                p: 4,
                textAlign: 'center'
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                Check Your Email
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Password reset instructions sent
              </Typography>
            </Box>

            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary" paragraph>
                We've sent password reset instructions to your email address. 
                Please check your inbox and follow the link to reset your password.
              </Typography>
              
              <Typography variant="body2" color="textSecondary" paragraph>
                Didn't receive the email? Check your spam folder or try again.
              </Typography>

              <Stack spacing={2} sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/login"
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
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
                  sx={{ textTransform: 'none' }}
                >
                  Try Different Email
                </Button>
              </Stack>
            </CardContent>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: 3
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              color: 'white',
              p: 4,
              textAlign: 'center'
            }}
          >
            <BusinessIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Reset Password
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Enter your email to receive reset instructions
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3, borderRadius: 2 }}
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
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={isSubmitting}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
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
                  startIcon={<SendIcon />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 600
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
                    fontWeight: 500
                  }}
                >
                  Back to Login
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="textSecondary">
            © 2024 Membership Management System. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;
