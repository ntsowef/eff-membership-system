/**
 * ProgressBar Component
 * Reusable progress bar with percentage display
 */

import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  height?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercentage = true,
  color = 'primary',
  height = 8,
}) => {
  const percentage = Math.min(Math.max(value, 0), 100);

  return (
    <Box sx={{ width: '100%' }}>
      {(label || showPercentage) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          {label && (
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          )}
          {showPercentage && (
            <Typography variant="body2" fontWeight="bold">
              {percentage.toFixed(0)}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{
          height,
          borderRadius: height / 2,
          backgroundColor: 'action.hover',
        }}
      />
    </Box>
  );
};

export default ProgressBar;

