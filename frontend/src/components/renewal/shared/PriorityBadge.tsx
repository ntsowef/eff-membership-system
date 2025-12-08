/**
 * PriorityBadge Component
 * Reusable priority badge with consistent color coding
 */

import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import {
  PriorityHigh,
  Remove,
  ArrowUpward,
} from '@mui/icons-material';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Urgent' | 'Critical';

interface PriorityBadgeProps extends Omit<ChipProps, 'color' | 'icon'> {
  priority: PriorityLevel | string;
  showIcon?: boolean;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  ...chipProps
}) => {
  const getPriorityColor = (
    priority: string
  ): 'error' | 'warning' | 'info' | 'default' => {
    const priorityLower = priority.toLowerCase();
    
    if (priorityLower.includes('high') || priorityLower.includes('urgent') || priorityLower.includes('critical')) {
      return 'error';
    }
    if (priorityLower.includes('medium') || priorityLower.includes('normal')) {
      return 'warning';
    }
    if (priorityLower.includes('low')) {
      return 'info';
    }
    return 'default';
  };

  const getPriorityIcon = (priority: string) => {
    const priorityLower = priority.toLowerCase();
    
    if (priorityLower.includes('high') || priorityLower.includes('urgent') || priorityLower.includes('critical')) {
      return <PriorityHigh />;
    }
    if (priorityLower.includes('medium') || priorityLower.includes('normal')) {
      return <ArrowUpward />;
    }
    if (priorityLower.includes('low')) {
      return <Remove />;
    }
    return undefined;
  };

  return (
    <Chip
      label={priority}
      color={getPriorityColor(priority)}
      icon={showIcon ? getPriorityIcon(priority) : undefined}
      size="small"
      sx={{ borderRadius: '50px', ...chipProps.sx }} // Pill shape
      {...chipProps}
    />
  );
};

export default PriorityBadge;

