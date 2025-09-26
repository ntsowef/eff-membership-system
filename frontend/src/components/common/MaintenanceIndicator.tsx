import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Collapse,
  IconButton,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Build as BuildIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useMaintenance } from '../../contexts/MaintenanceContext';

interface MaintenanceIndicatorProps {
  showForAdmins?: boolean;
  compact?: boolean;
  dismissible?: boolean;
}

const MaintenanceIndicator: React.FC<MaintenanceIndicatorProps> = ({
  showForAdmins = true,
  compact = false,
  dismissible = false
}) => {
  const { status, canBypass, isMaintenanceActive } = useMaintenance();
  const [dismissed, setDismissed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  // Don't show if maintenance is not active
  if (!isMaintenanceActive || !status) {
    return null;
  }

  // Don't show if user can bypass and showForAdmins is false
  if (canBypass && !showForAdmins) {
    return null;
  }

  // Don't show if dismissed
  if (dismissed && dismissible) {
    return null;
  }

  const getStatusColor = () => {
    if (canBypass) return 'info';
    
    switch (status.maintenance_level) {
      case 'full_system': return 'error';
      case 'api_only': return 'warning';
      case 'frontend_only': return 'warning';
      case 'specific_modules': return 'info';
      default: return 'warning';
    }
  };

  const getStatusIcon = () => {
    if (status.status === 'scheduled') return <ScheduleIcon />;
    return <BuildIcon />;
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'full_system': return 'Full System';
      case 'api_only': return 'API Only';
      case 'frontend_only': return 'Frontend Only';
      case 'specific_modules': return 'Specific Modules';
      default: return level;
    }
  };

  const formatTimeUntilEnd = () => {
    if (!status.minutes_until_end || status.minutes_until_end <= 0) {
      return null;
    }

    const minutes = status.minutes_until_end;
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  };

  if (compact) {
    return (
      <Tooltip title={canBypass ? 'You can bypass maintenance mode' : status.maintenance_message}>
        <Chip
          icon={getStatusIcon()}
          label={canBypass ? 'Maintenance (Bypass)' : 'Maintenance Mode'}
          color={getStatusColor() as any}
          size="small"
          variant={canBypass ? 'outlined' : 'filled'}
        />
      </Tooltip>
    );
  }

  return (
    <Alert
      severity={getStatusColor() as any}
      icon={getStatusIcon()}
      action={
        <Box display="flex" alignItems="center">
          {!dismissible && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
          {dismissible && (
            <IconButton
              size="small"
              onClick={() => setDismissed(true)}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      }
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography variant="subtitle2" component="div">
          {canBypass ? (
            <>
              <WarningIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              System Under Maintenance (You can bypass)
            </>
          ) : (
            'System Under Maintenance'
          )}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
          <Chip
            label={getLevelText(status.maintenance_level)}
            size="small"
            variant="outlined"
          />
          
          {status.status === 'scheduled' && (
            <Chip
              label="Scheduled"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          
          {formatTimeUntilEnd() && (
            <Chip
              label={`Ends in ${formatTimeUntilEnd()}`}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Box>

        <Collapse in={expanded}>
          <Box mt={1}>
            <Typography variant="body2">
              {status.maintenance_message}
            </Typography>
            
            {status.enabled_by_name && (
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Initiated by: {status.enabled_by_name}
              </Typography>
            )}
            
            {canBypass && (
              <Typography variant="caption" color="info.main" display="block" mt={0.5}>
                As an administrator, you can continue using the system during maintenance.
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
    </Alert>
  );
};

export default MaintenanceIndicator;
