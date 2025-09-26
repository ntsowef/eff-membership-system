import React from 'react';
import { Alert, AlertTitle, Box, Chip, Typography } from '@mui/material';
import { Code as CodeIcon, Security as SecurityIcon } from '@mui/icons-material';

const DevelopmentBanner: React.FC = () => {
  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert 
        severity="info" 
        icon={<CodeIcon />}
        sx={{ 
          borderRadius: 0,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Box>
            <AlertTitle sx={{ mb: 0 }}>Development Mode</AlertTitle>
            <Typography variant="body2">
              Authentication is disabled for development. All features are accessible.
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Chip 
              icon={<SecurityIcon />} 
              label="Auth: Disabled" 
              color="warning" 
              size="small" 
            />
            <Chip 
              label="Dev Mode" 
              color="info" 
              size="small" 
            />
          </Box>
        </Box>
      </Alert>
    </Box>
  );
};

export default DevelopmentBanner;
