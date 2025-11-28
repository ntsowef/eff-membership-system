import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

const ErrorPageDemo: React.FC = () => {
  const navigate = useNavigate();
  const [testError, setTestError] = useState<Error | null>(null);

  const errorPages = [
    {
      code: 400,
      name: 'Bad Request',
      route: '/error/bad-request',
      description: 'Invalid request data or malformed parameters',
      color: '#ff9800',
      icon: '⚠️',
    },
    {
      code: 401,
      name: 'Unauthorized',
      route: '/error/access-denied',
      description: 'Authentication required or invalid credentials',
      color: '#f44336',
      icon: '🔐',
    },
    {
      code: 403,
      name: 'Access Denied',
      route: '/error/access-denied',
      description: 'Insufficient permissions to access resource',
      color: '#f44336',
      icon: '🚫',
    },
    {
      code: 404,
      name: 'Not Found',
      route: '/error/not-found',
      description: 'The requested page or resource does not exist',
      color: '#2196f3',
      icon: '🔍',
    },
    {
      code: 500,
      name: 'Server Error',
      route: '/error/server-error',
      description: 'Internal server error or unexpected condition',
      color: '#f44336',
      icon: '🔧',
    },
    {
      code: 503,
      name: 'Service Unavailable',
      route: '/error/service-unavailable',
      description: 'Service temporarily unavailable or under maintenance',
      color: '#2196f3',
      icon: '🚧',
    },
  ];

  const handleViewErrorPage = (route: string) => {
    navigate(route);
  };

  const handleTriggerJSError = () => {
    // This will trigger the ErrorBoundary
    setTestError(new Error('This is a test JavaScript error for ErrorBoundary demonstration'));
    throw new Error('Test JavaScript Error - This should be caught by ErrorBoundary');
  };

  const handleTriggerAPIError = async (statusCode: number) => {
    try {
      // Simulate API error by making a request to a non-existent endpoint
      const response = await fetch(`/api/v1/test-error/${statusCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Triggered API error:', error);
      // The error interceptor should handle this automatically
    }
  };

  if (testError) {
    throw testError;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <ErrorIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Error Pages Demo
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Test and preview all error pages in the EFF Membership System
            </Typography>
          </Box>
        </Stack>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            This demo page allows you to test all error pages and error handling mechanisms. 
            Each error page is designed to be both professional and user-friendly with helpful guidance.
          </Typography>
        </Alert>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityIcon /> Error Pages Preview
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {errorPages.map((errorPage) => (
            <Grid item xs={12} md={6} lg={4} key={errorPage.code}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                    <Typography variant="h2" sx={{ fontSize: '2rem' }}>
                      {errorPage.icon}
                    </Typography>
                    <Box>
                      <Chip 
                        label={errorPage.code} 
                        sx={{ 
                          backgroundColor: errorPage.color,
                          color: 'white',
                          fontWeight: 'bold',
                          mb: 1,
                        }} 
                      />
                      <Typography variant="h6" component="h3">
                        {errorPage.name}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {errorPage.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewErrorPage(errorPage.route)}
                    sx={{ 
                      backgroundColor: errorPage.color,
                      '&:hover': {
                        backgroundColor: errorPage.color,
                        filter: 'brightness(0.9)',
                      },
                    }}
                  >
                    View Page
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugReportIcon /> Error Handling Tests
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  JavaScript Error (ErrorBoundary)
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Test the React ErrorBoundary component by triggering a JavaScript error.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CodeIcon />}
                  onClick={handleTriggerJSError}
                >
                  Trigger JS Error
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  API Error Simulation
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Test API error handling by simulating different HTTP error responses.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {[400, 401, 403, 404, 500, 503].map((code) => (
                    <Button
                      key={code}
                      variant="outlined"
                      size="small"
                      onClick={() => handleTriggerAPIError(code)}
                    >
                      {code}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="warning" sx={{ mt: 4 }}>
          <Typography variant="body2">
            <strong>Note:</strong> This demo page is for development and testing purposes only. 
            In production, error pages will be triggered automatically by the system when errors occur.
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
};

export default ErrorPageDemo;
