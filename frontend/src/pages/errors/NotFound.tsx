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
  SearchOff as SearchOffIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  Explore as ExploreIcon,
} from '@mui/icons-material';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const funnyMessages = [
    "This page went on vacation and forgot to leave a forwarding address!",
    "Our page is playing hide and seek... and it's really good at it!",
    "404: Page not found. But hey, you found this awesome error page!",
    "This page is like my motivation on Monday morning - nowhere to be found!",
    "The page you're looking for is in another castle! 🏰",
  ];

  const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
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
            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          {/* Animated Search Icon */}
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
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'float 3s ease-in-out infinite',
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-10px)' },
                },
              }}
            >
              <SearchOffIcon
                sx={{
                  fontSize: 60,
                  color: theme.palette.primary.main,
                  animation: 'wiggle 2s ease-in-out infinite',
                  '@keyframes wiggle': {
                    '0%, 100%': { transform: 'rotate(0deg)' },
                    '25%': { transform: 'rotate(-5deg)' },
                    '75%': { transform: 'rotate(5deg)' },
                  },
                }}
              />
            </Box>
            <ExploreIcon
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                fontSize: 30,
                color: theme.palette.secondary.main,
                animation: 'spin 4s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
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
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              animation: 'glow 2s ease-in-out infinite alternate',
              '@keyframes glow': {
                '0%': { filter: 'brightness(1)' },
                '100%': { filter: 'brightness(1.2)' },
              },
            }}
          >
            404
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
            🔍 Page Not Found!
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
            The page you're looking for seems to have vanished into the digital void. 
            It might have been moved, deleted, or perhaps it never existed in the first place. 
            Don't worry though - even the best explorers sometimes take a wrong turn!
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
              🎯 Fun Fact!
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
              }}
            >
              The 404 error code was named after room 404 at CERN, where the World Wide Web was born. 
              Legend says that's where the first web server was located!
            </Typography>
          </Box>

          {/* Suggestions */}
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              borderRadius: 2,
              padding: 2,
              marginBottom: 4,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.success.main,
                fontWeight: 'medium',
                marginBottom: 1,
              }}
            >
              💡 What you can do:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                textAlign: 'left',
                lineHeight: 1.8,
              }}
            >
              • Check the URL for typos<br />
              • Use the navigation menu to find what you need<br />
              • Go back to the previous page<br />
              • Start fresh from the homepage
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
              Take Me Home
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
            Lost? Don't worry, even GPS gets confused sometimes! 🗺️
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default NotFound;
