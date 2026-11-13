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
  PersonAdd,
  Autorenew,
  Search,
  CreditCard,
  Login,
  Menu as MenuIcon,
} from '@mui/icons-material';
import effLogo from '../../assets/images/EFF_Reglogo.png';

interface PublicHeaderProps {
  transparent?: boolean;
}

const portalNavItems = [
  { label: 'Home', path: '/', icon: <Home fontSize="small" /> },
  { label: 'Apply', path: '/apply', icon: <PersonAdd fontSize="small" /> },
  { label: 'Renew', path: '/renew', icon: <Autorenew fontSize="small" /> },
  { label: 'Status', path: '/application-status', icon: <Search fontSize="small" /> },
  { label: 'My Card', path: '/my-card', icon: <CreditCard fontSize="small" /> },
];

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

  return (
    <AppBar
      position="sticky"
      elevation={0}
      data-testid="eff-top-navbar"
      sx={{
        bgcolor: transparent ? 'rgba(10, 10, 10, 0.96)' : '#0A0A0A',
        borderTop: '3px solid #E60000',
        borderBottom: '3px solid #FFCE00',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 66, md: 74 },
            py: 1,
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* Brand Medallion & Identity */}
          <Box
            component="button"
            type="button"
            aria-label="Economic Freedom Fighters Portal Home"
            onClick={() => handleNavigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 0,
              bgcolor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
              '&:focus-visible': {
                outline: '2px solid #FFCE00',
                outlineOffset: '4px',
              },
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
                '&:hover': { transform: 'none' },
              },
            }}
          >
            <Box
              sx={{
                width: { xs: 44, md: 48 },
                height: { xs: 44, md: 48 },
                borderRadius: '50%',
                bgcolor: '#000000',
                border: '2px solid #FFCE00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={effLogo}
                alt="EFF Logo"
                sx={{ width: '85%', height: 'auto', display: 'block' }}
              />
            </Box>

            <Box>
              <Typography
                variant="subtitle1"
                component="span"
                sx={{
                  display: 'block',
                  color: '#FFFFFF',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '0.92rem', sm: '1.05rem' },
                  letterSpacing: '0.03em',
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                }}
              >
                Economic Freedom Fighters
              </Typography>
              <Typography
                variant="caption"
                component="span"
                sx={{
                  display: 'block',
                  color: '#FFCE00',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  mt: 0.25,
                }}
              >
                Membership Portal
              </Typography>
            </Box>
          </Box>

          {/* Desktop Navigation — Full Portal Set */}
          {!isMobile && (
            <Box
              component="nav"
              aria-label="Primary portal navigation"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              {portalNavItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    startIcon={item.icon}
                    onClick={() => handleNavigate(item.path)}
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      color: active ? '#FFCE00' : '#FFFFFF',
                      fontWeight: active ? 700 : 600,
                      fontSize: '0.88rem',
                      textTransform: 'none',
                      px: 1.6,
                      py: 0.9,
                      borderRadius: '2px',
                      borderBottom: active ? '2px solid #FFCE00' : '2px solid transparent',
                      bgcolor: active ? 'rgba(255, 206, 0, 0.1)' : 'transparent',
                      transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(230, 0, 0, 0.22)',
                        color: '#FFCE00',
                      },
                      '@media (prefers-reduced-motion: reduce)': {
                        transition: 'none',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}

              <Button
                startIcon={<Login fontSize="small" />}
                onClick={() => handleNavigate('/login')}
                variant="contained"
                aria-current={isActive('/login') ? 'page' : undefined}
                sx={{
                  ml: 1,
                  bgcolor: isActive('/login') ? '#FFCE00' : '#E60000',
                  color: isActive('/login') ? '#0A0A0A' : '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textTransform: 'none',
                  px: 2.2,
                  py: 0.9,
                  borderRadius: '2px',
                  border: '2px solid #FFCE00',
                  boxShadow: 'none',
                  transition: 'transform 0.2s ease, background-color 0.2s ease, color 0.2s ease',
                  '&:hover': {
                    bgcolor: '#FFCE00',
                    color: '#0A0A0A',
                    transform: 'translateY(-1px)',
                    boxShadow: 'none',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': { transform: 'none' },
                  },
                }}
              >
                Staff Login
              </Button>
            </Box>
          )}

          {/* Mobile Menu Trigger */}
          {isMobile && (
            <IconButton
              aria-label="Open navigation menu"
              aria-controls={open ? 'eff-mobile-portal-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleMenuOpen}
              sx={{
                color: '#FFCE00',
                bgcolor: '#1A1A1A',
                border: '2px solid #FFCE00',
                borderRadius: '2px',
                p: 1,
                '&:hover': {
                  bgcolor: '#E60000',
                  color: '#FFFFFF',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Mobile Menu Dropdown */}
          <Menu
            id="eff-mobile-portal-menu"
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
                bgcolor: '#0A0A0A',
                border: '2px solid #FFCE00',
                borderRadius: '2px',
                minWidth: 230,
                boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.5)',
              },
            }}
          >
            {[...portalNavItems, { label: 'Staff Login', path: '/login', icon: <Login fontSize="small" /> }].map(
              (item) => {
                const active = isActive(item.path);
                return (
                  <MenuItem
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    sx={{
                      py: 1.4,
                      color: active ? '#FFCE00' : '#FFFFFF',
                      bgcolor: active ? 'rgba(255, 206, 0, 0.12)' : 'transparent',
                      borderLeft: active ? '3px solid #FFCE00' : '3px solid transparent',
                      '&:hover': {
                        bgcolor: 'rgba(230, 0, 0, 0.25)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? '#FFCE00' : '#E60000', minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: active ? 700 : 600,
                        fontFamily: '"Poppins", sans-serif',
                        fontSize: '0.92rem',
                      }}
                    />
                  </MenuItem>
                );
              }
            )}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicHeader;
