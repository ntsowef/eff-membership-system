/**
 * LoadingState Component
 * Reusable loading state with spinner and optional message
 */

import React from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

interface LoadingStateProps {
  message?: string;
  size?: number;
  fullHeight?: boolean;
  variant?: 'default' | 'paper';
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 40,
  fullHeight = false,
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
        py: fullHeight ? 10 : 5,
        minHeight: fullHeight ? '400px' : 'auto',
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (variant === 'paper') {
    return <Paper sx={{ p: 3 }}>{content}</Paper>;
  }

  return content;
};

export default LoadingState;

