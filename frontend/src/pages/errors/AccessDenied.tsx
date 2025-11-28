import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Lock as LockIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={8}
          sx={{
            padding: 6,
            textAlign: 'center',
            borderRadius: 4,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
            border: `2px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }}
        >
          {/* Animated Lock Icon */}
          <Box
            sx={{
              position: 'relative',
              display: 'inline-block',
              marginBottom: 3,
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)} 0%, ${alpha(theme.palette.error.main, 0.1)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                    boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.4)}`,
                  },
                  '70%': {
                    transform: 'scale(1.05)',
                    boxShadow: `0 0 0 10px ${alpha(theme.palette.error.main, 0)}`,
                  },
                  '100%': {
                    transform: 'scale(1)',
                    boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0)}`,
                  },
                },
              }}
            >
              <LockIcon
                sx={{
                  fontSize: 60,
                  color: theme.palette.error.main,
                  animation: 'shake 1s infinite',
                  '@keyframes shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
                  },
                }}
              />
            </Box>
            <SecurityIcon
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                fontSize: 30,
                color: theme.palette.warning.main,
                animation: 'bounce 2s infinite',
                '@keyframes bounce': {
                  '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
                  '40%': { transform: 'translateY(-10px)' },
                  '60%': { transform: 'translateY(-5px)' },
                },
              }}
            />
          </Box>

          {/* Error Code */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', md: '6rem' },
              fontWeight: 'bold',
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            403
          </Typography>

          {/* Main Message */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              color: theme.palette.text.primary,
              marginBottom: 2,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            🚫 Access Denied!
          </Typography>

          {/* Funny but Professional Message */}
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.text.secondary,
              marginBottom: 1,
              fontStyle: 'italic',
            }}
          >
            "Sorry, this area is more exclusive than a VIP lounge!"
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              marginBottom: 4,
              maxWidth: 600,
              margin: '0 auto 2rem auto',
              lineHeight: 1.6,
            }}
          >
            It looks like you don't have the proper credentials to access this page. 
            Don't worry, it happens to the best of us! Maybe you need to log in with 
            different permissions, or perhaps this content is reserved for specific user roles.
          </Typography>

          {/* Fun Facts */}
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              borderRadius: 2,
              padding: 2,
              marginBottom: 4,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.info.main,
                fontWeight: 'medium',
                marginBottom: 1,
              }}
            >
              💡 Did you know?
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
              }}
            >
              HTTP 403 errors were first introduced in 1992. That's older than the World Wide Web itself!
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              sx={{
                minWidth: 160,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[8],
                },
                transition: 'all 0.3s ease',
              }}
            >
              Go Home
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ArrowBackIcon />}
              onClick={handleGoBack}
              sx={{
                minWidth: 160,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
                transition: 'all 0.3s ease',
              }}
            >
              Go Back
            </Button>
          </Stack>

          {/* Footer Message */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              marginTop: 4,
              color: theme.palette.text.disabled,
              fontStyle: 'italic',
            }}
          >
            If you believe this is an error, please contact your system administrator.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default AccessDenied;
