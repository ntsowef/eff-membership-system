import React from 'react';
import {
  Button,
  useTheme,
  alpha,
  CircularProgress,
  Box,
} from '@mui/material';
import type { ButtonProps } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface ActionButtonProps extends Omit<ButtonProps, 'startIcon' | 'endIcon'> {
  icon?: SvgIconComponent;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  gradient?: boolean;
  vibrant?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  icon: Icon,
  iconPosition = 'start',
  loading = false,
  gradient = false,
  vibrant = false,
  variant = 'contained',
  color = 'primary',
  disabled,
  sx,
  ...props
}) => {
  const theme = useTheme();

  // Safety check for theme
  if (!theme || !theme.palette) {
    console.warn('Theme or theme.palette is undefined');
    return (
      <Button
        variant={variant}
        disabled={disabled || loading}
        {...props}
      >
        {children}
      </Button>
    );
  }

  const getColorValue = (colorName: string) => {
    try {
      switch (colorName) {
        case 'primary': return theme.palette.primary?.main || '#1976d2';
        case 'secondary': return theme.palette.secondary?.main || '#dc004e';
        case 'success': return theme.palette.success?.main || '#2e7d32';
        case 'warning': return theme.palette.warning?.main || '#ed6c02';
        case 'error': return theme.palette.error?.main || '#d32f2f';
        case 'info': return theme.palette.info?.main || '#0288d1';
        case 'default': return theme.palette.text?.primary || '#000000';
        case 'inherit': return theme.palette.text?.primary || '#000000';
        default: return theme.palette.primary?.main || '#1976d2';
      }
    } catch (error) {
      console.warn('Theme color access error:', error);
      return '#1976d2'; // Fallback to default blue
    }
  };
  
  const colorValue = getColorValue(color as string);
  
  const getButtonStyles = () => {
    try {
      if (variant === 'contained') {
        if (gradient) {
          return {
            background: `linear-gradient(135deg, ${colorValue} 0%, ${alpha(colorValue, 0.8)} 100%)`,
            boxShadow: `0px 4px 16px ${alpha(colorValue, 0.3)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${alpha(colorValue, 0.9)} 0%, ${alpha(colorValue, 0.7)} 100%)`,
              boxShadow: `0px 6px 24px ${alpha(colorValue, 0.4)}`,
              transform: 'translateY(-2px)',
            },
          };
        }

        if (vibrant) {
          return {
            backgroundColor: colorValue,
            boxShadow: `0px 4px 16px ${alpha(colorValue, 0.3)}`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: `linear-gradient(90deg, transparent, ${alpha('#ffffff', 0.2)}, transparent)`,
              transition: 'left 0.6s',
            },
            '&:hover': {
              backgroundColor: alpha(colorValue, 0.9),
              boxShadow: `0px 6px 24px ${alpha(colorValue, 0.4)}`,
              transform: 'translateY(-2px)',
              '&::before': {
                left: '100%',
              },
            },
          };
        }
      }

      if (variant === 'outlined') {
        return {
          borderWidth: '2px',
          borderColor: colorValue,
          color: colorValue,
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: alpha(colorValue, 0.08),
            borderColor: alpha(colorValue, 0.8),
          },
        };
      }

      return {};
    } catch (error) {
      console.warn('Button styles error:', error);
      return {};
    }
  };
  
  const renderIcon = () => {
    if (loading) {
      return (
        <CircularProgress
          size={18}
          sx={{
            color: variant === 'contained' ? 'inherit' : colorValue,
          }}
        />
      );
    }
    
    if (Icon) {
      return (
        <Icon
          sx={{
            fontSize: 20,
            ...(iconPosition === 'end' && { ml: 1 }),
            ...(iconPosition === 'start' && { mr: 1 }),
          }}
        />
      );
    }
    
    return null;
  };
  
  const buttonStyles = getButtonStyles();

  return (
    <Button
      variant={variant}
      color={color}
      disabled={disabled || loading}
      startIcon={iconPosition === 'start' ? renderIcon() : undefined}
      endIcon={iconPosition === 'end' ? renderIcon() : undefined}
      sx={[
        {
          borderRadius: 3,
          textTransform: 'none',
          fontWeight: 500,
          ...buttonStyles,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ActionButton;
