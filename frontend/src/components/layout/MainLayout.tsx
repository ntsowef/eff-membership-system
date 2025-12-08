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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';

import { useUI } from '../../store';
import Sidebar from './Sidebar';
import LogoutButton from '../auth/LogoutButton';
import MaintenanceIndicator from '../common/MaintenanceIndicator';
import ConnectionStatusIndicator from '../common/ConnectionStatusIndicator';

const DRAWER_WIDTH = 280;

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { sidebarOpen, setSidebarOpen, theme: currentTheme, setTheme } = useUI();

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleThemeToggle = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: sidebarOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            EFF Membership Management System
          </Typography>

          {/* Connection Status Indicator */}
          <Box sx={{ mr: 2 }}>
            <ConnectionStatusIndicator />
          </Box>

          <IconButton color="inherit" onClick={handleThemeToggle}>
            {currentTheme === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>

          {/* User Menu with Logout */}
          <LogoutButton variant="menu" showUserMenu={true} />
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: sidebarOpen ? DRAWER_WIDTH : 0 }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={sidebarOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
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

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        <MaintenanceIndicator showForAdmins={true} dismissible={true} />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
