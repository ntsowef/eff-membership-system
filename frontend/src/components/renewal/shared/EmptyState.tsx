/**
 * EmptyState Component
 * Reusable empty state with icon, message, and optional action
 */

import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Inbox } from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';

interface EmptyStateProps {
  icon?: SvgIconComponent;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'paper';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction,
  variant = 'default',
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 5,
        textAlign: 'center',
      }}
    >
      <Icon sx={{ fontSize: 64, color: 'text.disabled' }} />
      {title && (
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );

  if (variant === 'paper') {
    return <Paper sx={{ p: 3 }}>{content}</Paper>;
  }

  return content;
};

export default EmptyState;

