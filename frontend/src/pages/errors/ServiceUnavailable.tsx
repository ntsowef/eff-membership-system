import React, { useState, useEffect } from 'react';
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
  LinearProgress,
} from '@mui/material';
import {
  CloudOff as CloudOffIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const ServiceUnavailable: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
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
            border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          {/* Animated Cloud Icon */}
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
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.2)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'drift 4s ease-in-out infinite',
                '@keyframes drift': {
                  '0%, 100%': { transform: 'translateX(0px) translateY(0px)' },
                  '25%': { transform: 'translateX(5px) translateY(-5px)' },
                  '50%': { transform: 'translateX(-5px) translateY(-10px)' },
                  '75%': { transform: 'translateX(-5px) translateY(5px)' },
                },
              }}
            >
              <CloudOffIcon
                sx={{
                  fontSize: 60,
                  color: theme.palette.info.main,
                  animation: 'fade 2s ease-in-out infinite alternate',
                  '@keyframes fade': {
                    '0%': { opacity: 0.7 },
                    '100%': { opacity: 1 },
                  },
                }}
              />
            </Box>
            <ScheduleIcon
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                fontSize: 30,
                color: theme.palette.warning.main,
                animation: 'tick 1s infinite',
                '@keyframes tick': {
                  '0%, 50%': { transform: 'rotate(0deg)' },
                  '25%': { transform: 'rotate(6deg)' },
                  '75%': { transform: 'rotate(-6deg)' },
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
              background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            503
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
            🚧 Service Temporarily Unavailable!
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
            "We're giving our servers a well-deserved spa day!"
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
            Our service is temporarily unavailable due to maintenance or high traffic. 
            Don't worry - we're working hard to get everything back up and running. 
            This is usually a short-term issue that resolves itself quickly.
          </Typography>

          {/* Countdown Timer */}
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: 2,
              padding: 3,
              marginBottom: 4,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 'medium',
                marginBottom: 2,
              }}
            >
              ⏱️ Auto-refresh in:
            </Typography>
            <Typography
              variant="h3"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 'bold',
                marginBottom: 2,
                fontFamily: 'monospace',
              }}
            >
              {countdown}s
            </Typography>
            <LinearProgress
              variant="determinate"
              value={((60 - countdown) / 60) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                },
              }}
            />
          </Box>

          {/* Status Information */}
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
              📊 Current Status:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                textAlign: 'left',
                lineHeight: 1.8,
              }}
            >
              • Service: Temporarily Unavailable<br />
              • Estimated Resolution: 5-15 minutes<br />
              • Affected Services: Web Application<br />
              • Last Update: {new Date().toLocaleTimeString()}
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
                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.info.dark} 0%, ${theme.palette.info.main} 100%)`,
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[8],
                },
                transition: 'all 0.3s ease',
              }}
            >
              Refresh Now
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
            Thank you for your patience while we make things even better! 🛠️
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default ServiceUnavailable;
