import React from 'react';
import { Box, Container, useTheme, alpha } from '@mui/material';
import { Outlet } from 'react-router-dom';

/**
 * SuperAdminLayout Component
 * Layout wrapper for all Super Admin pages
 */
const SuperAdminLayout: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '300px',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
          zIndex: 0,
        },
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default SuperAdminLayout;

