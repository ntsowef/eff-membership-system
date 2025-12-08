/**
 * SeverityBadge Component
 * Reusable severity badge for fraud cases and alerts
 */

import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import {
  Error,
  Warning,
  Info,
  ReportProblem,
} from '@mui/icons-material';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface SeverityBadgeProps extends Omit<ChipProps, 'color' | 'icon'> {
  severity: SeverityLevel | string;
  showIcon?: boolean;
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showIcon = true,
  ...chipProps
}) => {
  const getSeverityColor = (
    severity: string
  ): 'error' | 'warning' | 'info' | 'default' => {
    const severityLower = severity.toLowerCase();
    
    if (severityLower.includes('critical') || severityLower.includes('high')) {
      return 'error';
    }
    if (severityLower.includes('medium')) {
      return 'warning';
    }
    if (severityLower.includes('low')) {
      return 'info';
    }
    return 'default';
  };

  const getSeverityIcon = (severity: string) => {
    const severityLower = severity.toLowerCase();
    
    if (severityLower.includes('critical')) {
      return <Error />;
    }
    if (severityLower.includes('high')) {
      return <ReportProblem />;
    }
    if (severityLower.includes('medium')) {
      return <Warning />;
    }
    if (severityLower.includes('low')) {
      return <Info />;
    }
    return undefined;
  };

  return (
    <Chip
      label={severity}
      color={getSeverityColor(severity)}
      icon={showIcon ? getSeverityIcon(severity) : undefined}
      size="small"
      sx={{ borderRadius: '50px', ...chipProps.sx }} // Pill shape
      {...chipProps}
    />
  );
};

export default SeverityBadge;

