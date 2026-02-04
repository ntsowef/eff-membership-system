import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Container,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Home,
  Login,
  Assignment,
  Search,
  Menu as MenuIcon,
} from '@mui/icons-material';
import effLogo from '../../assets/images/EFF_Reglogo.png';

interface PublicHeaderProps {
  transparent?: boolean;
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ transparent = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const isActive = (path: string) => location.pathname === path;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const navItems = [
    { label: 'Home', path: '/', icon: <Home /> },
    { label: 'Apply', path: '/apply', icon: <Assignment /> },
    { label: 'Status', path: '/application-status', icon: <Search /> },
    { label: 'Login', path: '/login', icon: <Login /> },
  ];

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

          {/* Desktop Navigation Links */}
          {!isMobile && (
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, md: 2 },
                alignItems: 'center',
              }}
            >
              <Button
                startIcon={<Home />}
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
                Home
              </Button>

              <Button
                startIcon={<Assignment />}
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
                Apply
              </Button>

              <Button
                startIcon={<Search />}
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
                Status
              </Button>

              <Button
                startIcon={<Login />}
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
                Login
              </Button>
            </Box>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                color: '#FFFFFF',
                bgcolor: 'rgba(220, 20, 60, 0.3)',
                border: '2px solid #DC143C',
                borderRadius: 2,
                p: 1,
                '&:hover': {
                  bgcolor: 'rgba(220, 20, 60, 0.5)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Mobile Menu Dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                bgcolor: '#1a1a1a',
                border: '2px solid #DC143C',
                borderRadius: 2,
                minWidth: 200,
                boxShadow: '0 4px 20px rgba(220, 20, 60, 0.3)',
              },
            }}
          >
            {navItems.map((item) => (
              <MenuItem
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  py: 1.5,
                  color: isActive(item.path) ? '#DC143C' : '#FFFFFF',
                  bgcolor: isActive(item.path) ? 'rgba(220, 20, 60, 0.15)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(220, 20, 60, 0.2)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive(item.path) ? '#DC143C' : '#FFFFFF', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 700 : 500,
                  }}
                />
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicHeader;
