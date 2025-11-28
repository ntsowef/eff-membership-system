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
  ErrorOutline as ErrorOutlineIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const BadRequest: React.FC = () => {
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
        background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.1)} 100%)`,
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
            border: `2px solid ${alpha(theme.palette.warning.main, 0.2)}`,
          }}
        >
          {/* Animated Warning Icon */}
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
                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.2)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'warning-pulse 2s infinite',
                '@keyframes warning-pulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    boxShadow: `0 0 0 0 ${alpha(theme.palette.warning.main, 0.4)}`,
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    boxShadow: `0 0 0 15px ${alpha(theme.palette.warning.main, 0)}`,
                  },
                },
              }}
            >
              <ErrorOutlineIcon
                sx={{
                  fontSize: 60,
                  color: theme.palette.warning.main,
                  animation: 'tilt 1.5s ease-in-out infinite alternate',
                  '@keyframes tilt': {
                    '0%': { transform: 'rotate(-3deg)' },
                    '100%': { transform: 'rotate(3deg)' },
                  },
                }}
              />
            </Box>
            <WarningIcon
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                fontSize: 30,
                color: theme.palette.error.main,
                animation: 'blink 1s infinite',
                '@keyframes blink': {
                  '0%, 50%': { opacity: 1 },
                  '51%, 100%': { opacity: 0.3 },
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
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.error.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            400
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
            ⚠️ Bad Request!
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
            "Your request got lost in translation!"
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
            Something about your request didn't quite make sense to our server. 
            It's like ordering a pizza with ice cream toppings - technically possible, 
            but probably not what you intended! Please check your input and try again.
          </Typography>

          {/* Common Causes */}
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
              🔍 Common causes:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                textAlign: 'left',
                lineHeight: 1.8,
              }}
            >
              • Invalid form data or missing required fields<br />
              • Malformed URL or query parameters<br />
              • Incorrect file format or size<br />
              • Invalid characters in the request
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
              startIcon={<ArrowBackIcon />}
              onClick={handleGoBack}
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
            Don't worry, even the best requests sometimes need a second try! 🎯
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default BadRequest;
