import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import PublicHeader from './PublicHeader';

const PublicLayout: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: '#006030',
        overflowX: 'hidden',
      }}
    >
      {/* Unified Top Navbar */}
      <PublicHeader />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#FFFFFF',
        }}
      >
        <Outlet />
      </Box>

      {/* Bottom Green Footer aligned with /apply and /renew */}
      <Box
        component="footer"
        data-testid="public-green-footer"
        sx={{
          bgcolor: '#006030',
          py: 3.5,
          px: 2,
          textAlign: 'center',
          borderTop: '3px solid #FFCE00',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: '#FFFFFF',
            fontWeight: 700,
            fontFamily: '"Poppins", sans-serif',
            fontSize: { xs: '1.15rem', md: '1.35rem' },
            mb: 0.5,
          }}
        >
          Economic Freedom in our Lifetime
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.78)',
            fontFamily: '"Poppins", sans-serif',
          }}
        >
          @2026 Economic Freedom Fighters. All rights reserved
        </Typography>
      </Box>
    </Box>
  );
};

export default PublicLayout;
