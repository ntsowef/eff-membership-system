import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Refresh,
  Cancel,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  PlayArrow,
} from '@mui/icons-material';

interface QueueJobCardProps {
  jobId: string;
  queueType: 'upload' | 'renewal';
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  fileName?: string;
  uploadedBy?: string;
  createdAt: string;
  processedAt?: string;
  failedReason?: string;
  onRetry?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
}

const QueueJobCard: React.FC<QueueJobCardProps> = ({
  jobId,
  queueType,
  status,
  progress,
  fileName,
  uploadedBy,
  createdAt,
  processedAt,
  failedReason,
  onRetry,
  onCancel,
}) => {
  const theme = useTheme();

  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    waiting: {
      color: theme.palette.info.main,
      icon: Schedule,
      label: 'Waiting',
    },
    active: {
      color: theme.palette.primary.main,
      icon: PlayArrow,
      label: 'Processing',
    },
    completed: {
      color: theme.palette.success.main,
      icon: CheckCircle,
      label: 'Completed',
    },
    failed: {
      color: theme.palette.error.main,
      icon: ErrorIcon,
      label: 'Failed',
    },
    delayed: {
      color: theme.palette.warning.main,
      icon: Schedule,
      label: 'Delayed',
    },
  };

  // Fallback to 'waiting' if status is not recognized
  const config = statusConfig[status] || statusConfig.waiting;
  const StatusIcon = config.icon;

  return (
    <Card
      sx={{
        borderRadius: '12px',
        border: `1px solid ${alpha(config.color, 0.15)}`,
        background: `linear-gradient(135deg, ${alpha(config.color, 0.03)} 0%, ${alpha(config.color, 0.01)} 100%)`,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: `0px 4px 20px ${alpha(config.color, 0.1)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={<StatusIcon sx={{ fontSize: '0.875rem' }} />}
              label={config.label}
              size="small"
              sx={{
                backgroundColor: config.color,
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: '24px',
                borderRadius: '50px',
                '& .MuiChip-icon': {
                  color: '#fff',
                },
              }}
            />
            <Chip
              label={queueType === 'upload' ? 'Member Upload' : 'Renewal'}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.75rem',
                height: '24px',
                borderRadius: '50px',
              }}
            />
          </Box>

          {/* Actions */}
          <Box display="flex" gap={0.5}>
            {status === 'failed' && onRetry && (
              <Tooltip title="Retry Job">
                <IconButton
                  size="small"
                  onClick={() => onRetry(jobId)}
                  sx={{
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {(status === 'waiting' || status === 'delayed') && onCancel && (
              <Tooltip title="Cancel Job">
                <IconButton
                  size="small"
                  onClick={() => onCancel(jobId)}
                  sx={{
                    color: theme.palette.error.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                    },
                  }}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* File Name */}
        {fileName && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mb: 1,
              fontSize: '0.875rem',
              color: theme.palette.text.primary,
            }}
          >
            {fileName}
          </Typography>
        )}

        {/* Progress Bar */}
        {status === 'active' && progress !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: '50px',
                backgroundColor: alpha(config.color, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: '50px',
                  backgroundColor: config.color,
                },
              }}
            />
          </Box>
        )}

        {/* Failed Reason */}
        {status === 'failed' && failedReason && (
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: '8px',
              backgroundColor: alpha(theme.palette.error.main, 0.05),
              border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
            }}
          >
            <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem' }}>
              {failedReason}
            </Typography>
          </Box>
        )}

        {/* Details */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Job ID
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
              {jobId.substring(0, 8)}...
            </Typography>
          </Box>
          {uploadedBy && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Uploaded By
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                {uploadedBy}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Created
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
              {new Date(createdAt).toLocaleString()}
            </Typography>
          </Box>
          {processedAt && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Processed
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                {new Date(processedAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default QueueJobCard;

