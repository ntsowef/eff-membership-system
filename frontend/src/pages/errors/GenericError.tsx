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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
interface ErrorPageProps {
  statusCode?: number;
  message?: string;
  details?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
}

const GenericError: React.FC<ErrorPageProps> = ({
  statusCode = 500,
  message = 'An unexpected error occurred',
  details,
  onRetry,
  onGoHome,
  onGoBack: _onGoBack,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      navigate('/');
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  // const _handleGoBack = () => {
  //   if (onGoBack) {
  //     onGoBack();
  //   } else {
  //     navigate(-1);
  //   }
  // };

  const getErrorColor = (code: number) => {
    if (code >= 400 && code < 500) return theme.palette.warning.main;
    if (code >= 500) return theme.palette.error.main;
    return theme.palette.info.main;
  };

  const getErrorEmoji = (code: number) => {
    if (code === 400) return '⚠️';
    if (code === 401 || code === 403) return '🚫';
    if (code === 404) return '🔍';
    if (code >= 500) return '🔧';
    return '❗';
  };

  const errorColor = getErrorColor(statusCode);
  const errorEmoji = getErrorEmoji(statusCode);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(errorColor, 0.1)} 0%, ${alpha(errorColor, 0.05)} 100%)`,
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
            border: `2px solid ${alpha(errorColor, 0.2)}`,
          }}
        >
          {/* Animated Error Icon */}
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
                background: `linear-gradient(135deg, ${alpha(errorColor, 0.2)} 0%, ${alpha(errorColor, 0.1)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'error-pulse 2s infinite',
                '@keyframes error-pulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    boxShadow: `0 0 0 0 ${alpha(errorColor, 0.4)}`,
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    boxShadow: `0 0 0 15px ${alpha(errorColor, 0)}`,
                  },
                },
              }}
            >
              <ErrorIcon
                sx={{
                  fontSize: 60,
                  color: errorColor,
                  animation: 'shake 1s ease-in-out infinite alternate',
                  '@keyframes shake': {
                    '0%': { transform: 'rotate(-2deg)' },
                    '100%': { transform: 'rotate(2deg)' },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Error Code */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', md: '6rem' },
              fontWeight: 'bold',
              color: errorColor,
              marginBottom: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {statusCode}
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
            {errorEmoji} {message}
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
            We encountered an unexpected issue while processing your request. 
            Our team has been notified and is working to resolve this problem.
          </Typography>

          {/* Error Details (if provided) */}
          {details && (
            <Box sx={{ marginBottom: 4 }}>
              <Accordion
                sx={{
                  backgroundColor: alpha(theme.palette.grey[500], 0.1),
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                    },
                  }}
                >
                  <CodeIcon sx={{ marginRight: 1, color: theme.palette.text.secondary }} />
                  <Typography variant="body2" color="text.secondary">
                    Technical Details
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      backgroundColor: alpha(theme.palette.grey[900], 0.05),
                      padding: 2,
                      borderRadius: 1,
                      textAlign: 'left',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {details}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

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
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{
                minWidth: 160,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                backgroundColor: errorColor,
                '&:hover': {
                  backgroundColor: alpha(errorColor, 0.8),
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[8],
                },
                transition: 'all 0.3s ease',
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              sx={{
                minWidth: 160,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                borderWidth: 2,
                borderColor: errorColor,
                color: errorColor,
                '&:hover': {
                  borderWidth: 2,
                  borderColor: errorColor,
                  backgroundColor: alpha(errorColor, 0.1),
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
                transition: 'all 0.3s ease',
              }}
            >
              Go Home
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
            Error ID: {Date.now().toString(36).toUpperCase()} • {new Date().toLocaleString()}
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default GenericError;
