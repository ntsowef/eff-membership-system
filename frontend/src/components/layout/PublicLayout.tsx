import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
} from '@mui/icons-material';

import { useUI } from '../../store';

const PublicLayout: React.FC = () => {
  const navigate = useNavigate();
  const { theme: currentTheme, setTheme } = useUI();

  const handleThemeToggle = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #FE0000 0%, #E20202 100%)',
          borderBottom: '3px solid #FFAB00',
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              flexGrow: 1,
            }}
            onClick={() => navigate('/')}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFAB00 0%, #FF8F00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                fontWeight: 700,
                color: '#000000',
                fontSize: '1.2rem',
              }}
            >
              EFF
            </Box>
            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.3rem',
                  lineHeight: 1.2,
                }}
              >
                Economic Freedom Fighters
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#FFAB00',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                }}
              >
                MEMBERSHIP PORTAL
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              color="inherit"
              onClick={() => navigate('/apply')}
              sx={{
                fontWeight: 500,
                textTransform: 'none',
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 171, 0, 0.1)',
                },
              }}
            >
              Join the Fight
            </Button>

            <Button
              color="inherit"
              onClick={() => navigate('/application-status')}
              sx={{
                fontWeight: 500,
                textTransform: 'none',
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 171, 0, 0.1)',
                },
              }}
            >
              Check Status
            </Button>

            <Button
              variant="outlined"
              onClick={() => navigate('/admin')}
              sx={{
                borderColor: '#FFAB00',
                color: '#FFAB00',
                fontWeight: 500,
                textTransform: 'none',
                px: 2,
                ml: 1,
                '&:hover': {
                  borderColor: '#FFAB00',
                  backgroundColor: 'rgba(255, 171, 0, 0.1)',
                },
              }}
            >
              Admin Portal
            </Button>

            <IconButton
              color="inherit"
              onClick={handleThemeToggle}
              sx={{
                ml: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 171, 0, 0.1)',
                },
              }}
            >
              {currentTheme === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          px: 2,
          mt: 'auto',
          background: 'linear-gradient(135deg, #055305 0%, #033303 100%)',
          color: 'white',
          borderTop: '3px solid #FFAB00',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 1,
              }}
            >
              Economic Freedom Fighters
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                mb: 2,
              }}
            >
              Fighting for radical economic transformation and true democracy
            </Typography>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.7,
                fontSize: '0.75rem',
              }}
            >
              © {new Date().getFullYear()} Economic Freedom Fighters. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicLayout;
