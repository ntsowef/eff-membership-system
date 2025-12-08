import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Container,
  Typography,
} from '@mui/material';
import {
  Home,
  Login,
  Assignment,
  Search,
} from '@mui/icons-material';
import effLogo from '../../assets/images/EFF_Reglogo.png';

interface PublicHeaderProps {
  transparent?: boolean;
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ transparent = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: transparent
          ? 'rgba(0, 0, 0, 0.7)'
          : 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(26, 26, 26, 0.95) 50%, rgba(139, 0, 0, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(220, 20, 60, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 64, md: 72 },
            py: 1,
          }}
        >
          {/* Logo Section */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
            onClick={() => navigate('/')}
          >
            <Box
              component="img"
              src={effLogo}
              alt="EFF Logo"
              sx={{
                width: { xs: 45, md: 55 },
                height: { xs: 45, md: 55 },
                mr: 2,
                filter: 'drop-shadow(0 2px 8px rgba(220, 20, 60, 0.4))',
              }}
            />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: { sm: '1rem', md: '1.2rem' },
                  letterSpacing: '0.05em',
                  lineHeight: 1.2,
                }}
              >
                ECONOMIC FREEDOM
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#DC143C',
                  fontWeight: 600,
                  fontSize: { sm: '0.7rem', md: '0.8rem' },
                  letterSpacing: '0.1em',
                }}
              >
                FIGHTERS
              </Typography>
            </Box>
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Navigation Links */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1, md: 2 },
              alignItems: 'center',
            }}
          >
            <Button
              startIcon={<Home sx={{ display: { xs: 'none', sm: 'block' } }} />}
              onClick={() => navigate('/')}
              sx={{
                color: isActive('/') ? '#DC143C' : 'white',
                fontWeight: isActive('/') ? 700 : 600,
                fontSize: { xs: '0.75rem', md: '0.9rem' },
                textTransform: 'none',
                px: { xs: 1.5, md: 2 },
                py: 1,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                backgroundColor: isActive('/') ? 'rgba(220, 20, 60, 0.15)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(220, 20, 60, 0.2)',
                  color: '#DC143C',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Home
              </Box>
            </Button>

            <Button
              startIcon={<Assignment sx={{ display: { xs: 'none', sm: 'block' } }} />}
              onClick={() => navigate('/apply')}
              sx={{
                color: isActive('/apply') ? '#DC143C' : 'white',
                fontWeight: isActive('/apply') ? 700 : 600,
                fontSize: { xs: '0.75rem', md: '0.9rem' },
                textTransform: 'none',
                px: { xs: 1.5, md: 2 },
                py: 1,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                backgroundColor: isActive('/apply') ? 'rgba(220, 20, 60, 0.15)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(220, 20, 60, 0.2)',
                  color: '#DC143C',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Apply
              </Box>
            </Button>

            <Button
              startIcon={<Search sx={{ display: { xs: 'none', sm: 'block' } }} />}
              onClick={() => navigate('/application-status')}
              sx={{
                color: isActive('/application-status') ? '#DC143C' : 'white',
                fontWeight: isActive('/application-status') ? 700 : 600,
                fontSize: { xs: '0.75rem', md: '0.9rem' },
                textTransform: 'none',
                px: { xs: 1.5, md: 2 },
                py: 1,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                backgroundColor: isActive('/application-status') ? 'rgba(220, 20, 60, 0.15)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(220, 20, 60, 0.2)',
                  color: '#DC143C',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Status
              </Box>
            </Button>

            <Button
              startIcon={<Login sx={{ display: { xs: 'none', sm: 'block' } }} />}
              onClick={() => navigate('/login')}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: { xs: '0.75rem', md: '0.9rem' },
                textTransform: 'none',
                px: { xs: 2, md: 3 },
                py: 1,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(220, 20, 60, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(220, 20, 60, 0.4)',
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Login
              </Box>
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicHeader;

