/**
 * StatusChip Component
 * Reusable status chip with consistent color coding and icons
 */

import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import {
  CheckCircle,
  Error,
  HourglassEmpty,
  Cancel,
  Info,
  Warning,
  Refresh,
} from '@mui/icons-material';

export type StatusType =
  | 'Completed'
  | 'Processing'
  | 'Failed'
  | 'Cancelled'
  | 'Pending'
  | 'Active'
  | 'Inactive'
  | 'Approved'
  | 'Rejected'
  | 'Under Review';

interface StatusChipProps extends Omit<ChipProps, 'color' | 'icon'> {
  status: StatusType | string;
  showIcon?: boolean;
}

const StatusChip: React.FC<StatusChipProps> = ({
  status,
  showIcon = true,
  ...chipProps
}) => {
  const getStatusColor = (
    status: string
  ): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    const statusLower = status.toLowerCase();
    
    if (
      statusLower.includes('complete') ||
      statusLower.includes('success') ||
      statusLower.includes('active') ||
      statusLower.includes('approved')
    ) {
      return 'success';
    }
    
    if (
      statusLower.includes('fail') ||
      statusLower.includes('error') ||
      statusLower.includes('reject') ||
      statusLower.includes('cancel')
    ) {
      return 'error';
    }
    
    if (
      statusLower.includes('process') ||
      statusLower.includes('pending') ||
      statusLower.includes('review')
    ) {
      return 'info';
    }
    
    if (
      statusLower.includes('warn') ||
      statusLower.includes('inactive')
    ) {
      return 'warning';
    }
    
    return 'default';
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('complete') || statusLower.includes('success') || statusLower.includes('approved')) {
      return <CheckCircle />;
    }
    if (statusLower.includes('process')) {
      return <Refresh />;
    }
    if (statusLower.includes('fail') || statusLower.includes('error') || statusLower.includes('reject')) {
      return <Error />;
    }
    if (statusLower.includes('cancel')) {
      return <Cancel />;
    }
    if (statusLower.includes('pending') || statusLower.includes('review')) {
      return <HourglassEmpty />;
    }
    if (statusLower.includes('warn')) {
      return <Warning />;
    }
    return <Info />;
  };

  return (
    <Chip
      label={status}
      color={getStatusColor(status)}
      icon={showIcon ? getStatusIcon(status) : undefined}
      {...chipProps}
    />
  );
};

export default StatusChip;

