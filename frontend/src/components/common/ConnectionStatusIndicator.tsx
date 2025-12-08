/**
 * Connection Status Indicator
 * 
 * Small indicator showing connection and service health status.
 * Displays in the header/footer with tooltip information.
 */

import React from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { useUIStore } from '../../store';

const ConnectionStatusIndicator: React.FC = () => {
  const {
    connectionStatus,
    serviceStatus,
    lastHealthCheck,
    healthError
  } = useUIStore();

  const getStatusConfig = () => {
    // Checking state
    if (connectionStatus === 'checking') {
      return {
        icon: <CircularProgress size={16} />,
        label: 'Checking',
        color: 'default' as const,
        tooltip: 'Checking connection status...'
      };
    }

    // Disconnected state
    if (connectionStatus === 'disconnected') {
      return {
        icon: <ErrorIcon fontSize="small" />,
        label: 'Offline',
        color: 'error' as const,
        tooltip: healthError || 'Cannot connect to backend server'
      };
    }

    // Service unhealthy
    if (serviceStatus === 'unhealthy') {
      return {
        icon: <ErrorIcon fontSize="small" />,
        label: 'Service Down',
        color: 'error' as const,
        tooltip: healthError || 'Backend services are unavailable'
      };
    }

    // Service degraded
    if (serviceStatus === 'degraded') {
      return {
        icon: <WarningIcon fontSize="small" />,
        label: 'Degraded',
        color: 'warning' as const,
        tooltip: healthError || 'System running with reduced performance'
      };
    }

    // Connected and healthy
    if (connectionStatus === 'connected' && serviceStatus === 'healthy') {
      return {
        icon: <CheckCircleIcon fontSize="small" />,
        label: 'Online',
        color: 'success' as const,
        tooltip: 'All systems operational'
      };
    }

    // Unknown state
    return {
      icon: <HelpOutlineIcon fontSize="small" />,
      label: 'Unknown',
      color: 'default' as const,
      tooltip: 'Connection status unknown'
    };
  };

  const config = getStatusConfig();

  const getLastCheckText = () => {
    if (!lastHealthCheck) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastHealthCheck.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `Checked ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Checked ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Checked ${hours}h ago`;
  };

  const tooltipContent = (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {config.tooltip}
      </Typography>
      {lastHealthCheck && (
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {getLastCheckText()}
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        sx={{
          height: 28,
          fontSize: '0.75rem',
          fontWeight: 500,
          cursor: 'help',
          '& .MuiChip-icon': {
            marginLeft: '8px'
          }
        }}
      />
    </Tooltip>
  );
};

export default ConnectionStatusIndicator;

