/**
 * Connection Status Banner
 * 
 * Displays a prominent banner when backend connectivity or service health issues are detected.
 * Shows different messages and actions based on the type of issue.
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  LinearProgress,
  Typography
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CloudOff as CloudOffIcon
} from '@mui/icons-material';
import { useUIStore } from '../../store';
import { healthMonitorService } from '../../services/healthMonitorService';

const ConnectionStatusBanner: React.FC = () => {
  const {
    connectionStatus,
    serviceStatus,
    healthError,
    showConnectionBanner,
    setShowConnectionBanner
  } = useUIStore();

  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleClose = () => {
    setShowConnectionBanner(false);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await healthMonitorService.checkNow();
    } finally {
      // Keep showing retry state for a moment
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Determine severity and message
  const getSeverityAndMessage = () => {
    if (connectionStatus === 'disconnected') {
      return {
        severity: 'error' as const,
        icon: <CloudOffIcon />,
        title: 'Backend Server Unreachable',
        message: 'Cannot connect to the backend server. Please check your internet connection or try again later.',
        showRetry: true,
        showRefresh: true
      };
    }

    if (serviceStatus === 'unhealthy') {
      if (healthError?.includes('Database')) {
        return {
          severity: 'error' as const,
          icon: <ErrorIcon />,
          title: 'Database Connection Failure',
          message: 'The system cannot connect to the database. Data operations are temporarily unavailable.',
          showRetry: true,
          showRefresh: false
        };
      }
      return {
        severity: 'error' as const,
        icon: <ErrorIcon />,
        title: 'Service Unavailable',
        message: 'The system is currently experiencing issues. Please try again in a few moments.',
        showRetry: true,
        showRefresh: false
      };
    }

    if (serviceStatus === 'degraded') {
      return {
        severity: 'warning' as const,
        icon: <WarningIcon />,
        title: 'Reduced Performance',
        message: 'The cache service is unavailable. The system may be slower than usual, but all features remain functional.',
        showRetry: false,
        showRefresh: false
      };
    }

    return null;
  };

  const config = getSeverityAndMessage();

  if (!showConnectionBanner || !config) {
    return null;
  }

  return (
    <Collapse in={showConnectionBanner}>
      <Alert
        severity={config.severity}
        icon={config.icon}
        sx={{
          borderRadius: 0,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {config.showRetry && (
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
            {config.showRefresh && (
              <Button
                color="inherit"
                size="small"
                onClick={handleRefresh}
              >
                Refresh Page
              </Button>
            )}
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle sx={{ fontWeight: 'bold' }}>{config.title}</AlertTitle>
        <Typography variant="body2">{config.message}</Typography>
        {isRetrying && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress color="inherit" />
          </Box>
        )}
      </Alert>
    </Collapse>
  );
};

export default ConnectionStatusBanner;

