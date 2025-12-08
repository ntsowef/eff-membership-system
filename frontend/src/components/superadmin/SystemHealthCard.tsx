import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
} from '@mui/icons-material';

interface SystemHealthCardProps {
  title: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  message?: string;
  details?: Array<{ label: string; value: string | number }>;
  lastChecked?: string;
}

const SystemHealthCard: React.FC<SystemHealthCardProps> = ({
  title,
  status,
  message,
  details,
  lastChecked,
}) => {
  const theme = useTheme();

  const statusConfig = {
    healthy: {
      color: theme.palette.success.main,
      icon: CheckCircle,
      label: 'Healthy',
      bgColor: alpha(theme.palette.success.main, 0.08),
    },
    degraded: {
      color: theme.palette.warning.main,
      icon: Warning,
      label: 'Degraded',
      bgColor: alpha(theme.palette.warning.main, 0.08),
    },
    critical: {
      color: theme.palette.error.main,
      icon: ErrorIcon,
      label: 'Critical',
      bgColor: alpha(theme.palette.error.main, 0.08),
    },
    unknown: {
      color: theme.palette.info.main,
      icon: Info,
      label: 'Unknown',
      bgColor: alpha(theme.palette.info.main, 0.08),
    },
  };

  // Fallback to 'unknown' if status is not recognized or undefined
  const config = statusConfig[status] || statusConfig.unknown;
  const StatusIcon = config.icon;

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${config.bgColor} 0%, ${alpha(config.color, 0.02)} 100%)`,
        border: `1px solid ${alpha(config.color, 0.15)}`,
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0px 12px 40px ${alpha(config.color, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.125rem',
              color: theme.palette.text.primary,
            }}
          >
            {title}
          </Typography>
          <Chip
            icon={<StatusIcon sx={{ fontSize: '1rem' }} />}
            label={config.label}
            size="small"
            sx={{
              backgroundColor: config.color,
              color: '#fff',
              fontWeight: 600,
              borderRadius: '50px',
              '& .MuiChip-icon': {
                color: '#fff',
              },
            }}
          />
        </Box>

        {/* Message */}
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, fontSize: '0.875rem' }}
          >
            {message}
          </Typography>
        )}

        {/* Details */}
        {details && details.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {details.map((detail, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  py: 1,
                  borderBottom:
                    index < details.length - 1
                      ? `1px solid ${alpha(theme.palette.divider, 0.5)}`
                      : 'none',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  {detail.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: theme.palette.text.primary,
                  }}
                >
                  {detail.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Last Checked */}
        {lastChecked && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 2, fontSize: '0.75rem' }}
          >
            Last checked: {lastChecked}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthCard;

