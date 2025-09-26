import React from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  };
  gradient?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  gradient = false,
}) => {
  const theme = useTheme();
  
  const backgroundStyle = gradient
    ? {
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }
    : {
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
      };
  
  return (
    <Box
      sx={{
        ...backgroundStyle,
        px: 3,
        py: 3,
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': gradient ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        } : {},
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{
            mb: 2,
            '& .MuiBreadcrumbs-separator': {
              color: theme.palette.text.secondary,
            },
          }}
        >
          {breadcrumbs.map((item, index) => (
            <Link
              key={index}
              color={index === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}
              href={item.href}
              onClick={item.onClick}
              sx={{
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                cursor: item.href || item.onClick ? 'pointer' : 'default',
                '&:hover': (item.href || item.onClick) ? {
                  color: theme.palette.primary.main,
                  textDecoration: 'underline',
                } : {},
              }}
            >
              {item.label}
            </Link>
          ))}
        </Breadcrumbs>
      )}
      
      <Box
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={2} mb={subtitle ? 1 : 0}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                lineHeight: 1.2,
                color: theme.palette.text.primary,
                background: gradient 
                  ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                  : 'inherit',
                backgroundClip: gradient ? 'text' : 'inherit',
                WebkitBackgroundClip: gradient ? 'text' : 'inherit',
                WebkitTextFillColor: gradient ? 'transparent' : 'inherit',
              }}
            >
              {title}
            </Typography>
            
            {badge && (
              <Chip
                label={badge.label}
                color={badge.color || 'primary'}
                size="small"
                sx={{
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24,
                }}
              />
            )}
          </Box>
          
          {subtitle && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                fontSize: '1rem',
                lineHeight: 1.5,
                maxWidth: '600px',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {actions && (
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            flexShrink={0}
            sx={{
              mt: { xs: 2, sm: 0 },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;
