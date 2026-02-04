import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  PersonAdd,
  Search,
  AdminPanelSettings,
} from '@mui/icons-material';

const PublicLayout: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

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
    { label: 'Apply', path: '/apply', icon: <PersonAdd /> },
    { label: 'Status', path: '/application-status', icon: <Search /> },
    { label: 'Admin', path: '/admin', icon: <AdminPanelSettings /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderBottom: '2px solid #DC143C',
        }}
      >
        <Toolbar sx={{ py: 1, justifyContent: 'space-between' }}>
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #DC143C 0%, #B01030 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
                fontWeight: 700,
                color: '#FFFFFF',
                fontSize: '0.9rem',
                border: '2px solid #FFAB00',
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
                  fontSize: { xs: '1rem', sm: '1.2rem' },
                  lineHeight: 1.2,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Economic Freedom
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#DC143C',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Fighters
              </Typography>
            </Box>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    fontWeight: 500,
                    textTransform: 'none',
                    px: 2,
                    color: '#FFFFFF',
                    '&:hover': {
                      backgroundColor: 'rgba(220, 20, 60, 0.2)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
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
                  color: '#FFFFFF',
                  '&:hover': {
                    bgcolor: 'rgba(220, 20, 60, 0.2)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: '#DC143C', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: 500,
                  }}
                />
              </MenuItem>
            ))}
          </Menu>
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
