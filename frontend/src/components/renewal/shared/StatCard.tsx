/**
 * StatCard Component
 * Reusable statistics card with icon, value, and label
 */

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface StatCardProps {
  icon: SvgIconComponent;
  label: string;
  value: number | string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  subtitle?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  color = 'primary',
  subtitle,
  onClick,
}) => {
  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
            }}
          >
            <Icon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;

