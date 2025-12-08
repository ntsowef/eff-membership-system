import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: SvgIconComponent;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  trend,
  onClick,
}) => {
  const theme = useTheme();
  
  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };
  
  const selectedColor = colorMap[color];
  
  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(selectedColor, 0.05)} 0%, ${alpha(selectedColor, 0.02)} 100%)`,
        border: `1px solid ${alpha(selectedColor, 0.1)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: `0px 12px 40px ${alpha(selectedColor, 0.2)}`,
          border: `1px solid ${alpha(selectedColor, 0.2)}`,
        } : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${selectedColor} 0%, ${alpha(selectedColor, 0.7)} 100%)`,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3, pb: '24px !important' }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontWeight: 500,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 600,
                fontSize: '2.25rem',
                lineHeight: 1.2,
                color: selectedColor,
                mb: 0.5,
              }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.8125rem' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50px', // Oval/pill shape
              background: `linear-gradient(135deg, ${alpha(selectedColor, 0.15)} 0%, ${alpha(selectedColor, 0.08)} 100%)`, // Lighter background
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0px 4px 12px ${alpha(selectedColor, 0.15)}`, // Softer shadow
            }}
          >
            <Icon
              sx={{
                fontSize: 28,
                color: selectedColor, // Use the main color instead of white for better contrast
              }}
            />
          </Box>
        </Box>
        
        {trend && (
          <Box display="flex" alignItems="center" mt={2}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                borderRadius: '50px', // Pill shape for trend badge
                backgroundColor: trend.isPositive
                  ? alpha(theme.palette.success.main, 0.08) // Lighter background
                  : alpha(theme.palette.error.main, 0.08), // Lighter background
                border: `1px solid ${trend.isPositive
                  ? alpha(theme.palette.success.main, 0.15) // Lighter border
                  : alpha(theme.palette.error.main, 0.15)}`, // Lighter border
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: trend.isPositive
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                }}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1, fontSize: '0.75rem' }}
            >
              vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
