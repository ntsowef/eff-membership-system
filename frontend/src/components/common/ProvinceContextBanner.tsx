import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LocationOn,
  Security,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useProvinceContext } from '../../hooks/useProvinceContext';

interface ProvinceContextBannerProps {
  variant?: 'banner' | 'chip' | 'header';
  showIcon?: boolean;
  showDescription?: boolean;
  sx?: any;
}

/**
 * Component to display province context information for Provincial Admin users
 * Shows which province's data is being displayed and provides visual context
 */
const ProvinceContextBanner: React.FC<ProvinceContextBannerProps> = ({
  variant = 'banner',
  showIcon = true,
  showDescription = true,
  sx = {},
}) => {
  const theme = useTheme();
  const provinceContext = useProvinceContext();

  // Don't show banner for national admins
  if (!provinceContext.isProvincialAdmin || !provinceContext.assignedProvince) {
    return null;
  }

  const { assignedProvince } = provinceContext;

  if (variant === 'chip') {
    return (
      <Chip
        icon={showIcon ? <LocationOn /> : undefined}
        label={`${assignedProvince.name} Province`}
        color="primary"
        variant="outlined"
        size="small"
        sx={{
          fontWeight: 600,
          ...sx,
        }}
      />
    );
  }

  if (variant === 'header') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          ...sx,
        }}
      >
        {showIcon && (
          <AdminPanelSettings 
            color="primary" 
            sx={{ fontSize: '1.2rem' }} 
          />
        )}
        <Typography
          variant="h6"
          color="primary"
          sx={{
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {assignedProvince.name} Province Dashboard
        </Typography>
      </Box>
    );
  }

  // Default banner variant
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        borderRadius: 2,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {showIcon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <LocationOn color="primary" />
          </Box>
        )}
        
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            color="primary"
            sx={{
              fontWeight: 600,
              mb: showDescription ? 0.5 : 0,
            }}
          >
            {assignedProvince.name} Province
          </Typography>
          
          {showDescription && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.4 }}
            >
              You are viewing data and managing operations for {assignedProvince.name} Province only. 
              All statistics, members, and leadership information are filtered to this province.
            </Typography>
          )}
        </Box>

        <Chip
          icon={<Security />}
          label="Provincial Admin"
          color="primary"
          variant="outlined"
          size="small"
          sx={{
            fontWeight: 500,
            borderColor: alpha(theme.palette.primary.main, 0.3),
          }}
        />
      </Box>
    </Paper>
  );
};

export default ProvinceContextBanner;
