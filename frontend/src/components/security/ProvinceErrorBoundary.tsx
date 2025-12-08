import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Box, Button, Typography, Paper } from '@mui/material';
import { Refresh, Home, Security } from '@mui/icons-material';
import { logSecurityViolation } from '../../utils/provinceValidation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isSecurityError: boolean;
}

/**
 * Error boundary specifically designed to handle province-related security errors
 * and provide appropriate fallback UI
 */
class ProvinceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isSecurityError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a security-related error
    const isSecurityError = error.message.includes('Access denied') ||
                           error.message.includes('Unauthorized') ||
                           error.message.includes('Insufficient permissions') ||
                           error.message.includes('province');

    return {
      hasError: true,
      error,
      isSecurityError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log security violations
    if (this.state.isSecurityError) {
      logSecurityViolation(
        0, // User ID not available in error boundary
        'unknown',
        `Error boundary caught security error: ${error.message}`,
        undefined,
        undefined
      );
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ProvinceErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isSecurityError: false
    });
  };

  handleGoHome = () => {
    window.location.href = '/admin/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Security error UI
      if (this.state.isSecurityError) {
        return (
          <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Security color="error" sx={{ fontSize: 64, mb: 2 }} />
              
              <Typography variant="h5" component="h1" gutterBottom color="error">
                Access Restricted
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                {this.state.error?.message || 'You do not have permission to access this resource.'}
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>Security Notice:</strong> This access attempt has been logged for security purposes.
                  If you believe this is an error, please contact your system administrator.
                </Typography>
              </Alert>
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<Home />}
                  onClick={this.handleGoHome}
                  color="primary"
                >
                  Go to Dashboard
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
              </Box>
            </Paper>
          </Box>
        );
      }

      // General error UI
      return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" component="h1" gutterBottom color="error">
              Something went wrong
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              An unexpected error occurred while loading this page.
            </Typography>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error.message}
                </Typography>
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
                color="primary"
              >
                Try Again
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
              >
                Go to Dashboard
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ProvinceErrorBoundary;
