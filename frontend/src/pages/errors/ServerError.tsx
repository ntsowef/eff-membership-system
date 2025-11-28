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
  BugReport as BugReportIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

const ServerError: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const funnyMessages = [
    "Our server is having a coffee break... a really long one!",
    "Something went wrong, but don't worry - our hamsters are working on it!",
    "The server threw a tantrum. We're giving it some time to cool down.",
    "Error 500: Our server is doing its best impression of a broken toaster!",
    "Houston, we have a problem... and by Houston, we mean our server room!",
  ];

  const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

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
          {/* Animated Bug Icon */}
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
                animation: 'glitch 2s infinite',
                '@keyframes glitch': {
                  '0%, 100%': { 
                    transform: 'translate(0)',
                    filter: 'hue-rotate(0deg)',
                  },
                  '10%': { 
                    transform: 'translate(-2px, 2px)',
                    filter: 'hue-rotate(90deg)',
                  },
                  '20%': { 
                    transform: 'translate(-2px, -2px)',
                    filter: 'hue-rotate(180deg)',
                  },
                  '30%': { 
                    transform: 'translate(2px, 2px)',
                    filter: 'hue-rotate(270deg)',
                  },
                  '40%': { 
                    transform: 'translate(2px, -2px)',
                    filter: 'hue-rotate(360deg)',
                  },
                },
              }}
            >
              <BugReportIcon
                sx={{
                  fontSize: 60,
                  color: theme.palette.error.main,
                  animation: 'buzz 0.5s infinite alternate',
                  '@keyframes buzz': {
                    '0%': { transform: 'scale(1) rotate(0deg)' },
                    '100%': { transform: 'scale(1.1) rotate(2deg)' },
                  },
                }}
              />
            </Box>
            <BuildIcon
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                fontSize: 30,
                color: theme.palette.warning.main,
                animation: 'wrench 2s ease-in-out infinite',
                '@keyframes wrench': {
                  '0%, 100%': { transform: 'rotate(0deg)' },
                  '25%': { transform: 'rotate(15deg)' },
                  '75%': { transform: 'rotate(-15deg)' },
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
              animation: 'flicker 3s infinite',
              '@keyframes flicker': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.8 },
                '75%': { opacity: 0.9 },
              },
            }}
          >
            500
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
            🔧 Internal Server Error!
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
            "{randomMessage}"
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
            Something unexpected happened on our end. Our technical team has been notified 
            and is working hard to fix the issue. In the meantime, you can try refreshing 
            the page or come back in a few minutes.
          </Typography>

          {/* Technical Info */}
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.warning.main, 0.1),
              borderRadius: 2,
              padding: 2,
              marginBottom: 4,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.warning.main,
                fontWeight: 'medium',
                marginBottom: 1,
              }}
            >
              🔍 Technical Details:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
                textAlign: 'left',
                lineHeight: 1.8,
              }}
            >
              • Error Code: HTTP 500 Internal Server Error<br />
              • Time: {new Date().toLocaleString()}<br />
              • Status: Our team has been automatically notified<br />
              • Expected Resolution: Usually within 15-30 minutes
            </Typography>
          </Box>

          {/* What to do */}
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
              💡 What you can try:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                textAlign: 'left',
                lineHeight: 1.8,
              }}
            >
              • Refresh the page (sometimes it's just a temporary hiccup)<br />
              • Wait a few minutes and try again<br />
              • Clear your browser cache<br />
              • Check our status page for updates
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
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{
                minWidth: 160,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.main} 100%)`,
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
                '&:hover': {
                  borderWidth: 2,
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
            We apologize for the inconvenience. Our servers are usually much better behaved! 🤖
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default ServerError;
