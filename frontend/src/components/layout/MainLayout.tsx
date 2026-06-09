import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  ViewStream,
  ViewSidebar,
} from '@mui/icons-material';

import { useUI } from '../../store';
import Sidebar from './Sidebar';
import HorizontalNav from './HorizontalNav';
import LogoutButton from '../auth/LogoutButton';
import MaintenanceIndicator from '../common/MaintenanceIndicator';
import ConnectionStatusIndicator from '../common/ConnectionStatusIndicator';

const DRAWER_WIDTH = 280;

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    sidebarOpen,
    setSidebarOpen,
    navMode,
    setNavMode,
    theme: currentTheme,
    setTheme,
  } = useUI();

  const isHorizontal = navMode === 'horizontal';

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleThemeToggle = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleNavModeToggle = () => {
    setNavMode(isHorizontal ? 'sidebar' : 'horizontal');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: isHorizontal ? 'column' : 'row' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: {
            md: !isHorizontal && sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          },
          ml: {
            md: !isHorizontal && sidebarOpen ? `${DRAWER_WIDTH}px` : 0,
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {/* Sidebar toggle – only visible in sidebar mode */}
          {!isHorizontal && (
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* In horizontal + mobile mode the HorizontalNav renders its own hamburger here */}
          {isHorizontal && isMobile && (
            <Box sx={{ mr: 1 }}>
              <HorizontalNav />
            </Box>
          )}

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            EFF Membership Management System
          </Typography>

          {/* Connection Status */}
          <Box sx={{ mr: 1 }}>
            <ConnectionStatusIndicator />
          </Box>

          {/* Nav mode toggle */}
          <Tooltip title={isHorizontal ? 'Switch to sidebar' : 'Switch to horizontal menu'}>
            <IconButton color="inherit" onClick={handleNavModeToggle} sx={{ mr: 0.5 }}>
              {isHorizontal ? <ViewSidebar /> : <ViewStream />}
            </IconButton>
          </Tooltip>

          {/* Theme toggle */}
          <IconButton color="inherit" onClick={handleThemeToggle}>
            {currentTheme === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>

          {/* User Menu with Logout */}
          <LogoutButton variant="menu" showUserMenu={true} />
        </Toolbar>
      </AppBar>

      {/* ─── Horizontal nav bar (desktop only, below AppBar) ─── */}
      {isHorizontal && !isMobile && (
        <Box
          sx={{
            position: 'fixed',
            top: 64, // AppBar height
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar - 1,
          }}
        >
          <HorizontalNav />
        </Box>
      )}

      {/* ─── Sidebar mode: Drawer ─── */}
      {!isHorizontal && (
        <Box
          component="nav"
          sx={{ width: { md: sidebarOpen ? DRAWER_WIDTH : 0 }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant={isMobile ? 'temporary' : 'persistent'}
            open={sidebarOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
              },
            }}
          >
            <Sidebar onClose={isMobile ? handleDrawerToggle : undefined} />
          </Drawer>
        </Box>
      )}

      {/* ─── Main Content ─── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            md: !isHorizontal && sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          // Push content below the AppBar (and horizontal nav when applicable)
          mt: isHorizontal && !isMobile ? '110px' : undefined,
        }}
      >
        {/* Spacer for AppBar when NOT using the extra mt offset */}
        {(!isHorizontal || isMobile) && <Toolbar />}
        <MaintenanceIndicator showForAdmins={true} dismissible={true} />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
