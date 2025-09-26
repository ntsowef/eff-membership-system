import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  ExitToApp as ExitIcon
} from '@mui/icons-material';
import { useAuth, useUI } from '../../store';
import { UserManagementAPI } from '../../lib/userManagementApi';

interface LogoutButtonProps {
  variant?: 'button' | 'menu' | 'icon';
  showUserMenu?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  variant = 'button',
  showUserMenu = false 
}) => {
  const { user, logout } = useAuth();
  const { addNotification } = useUI();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    setConfirmOpen(true);
    handleMenuClose();
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    
    try {
      // Call logout API to invalidate server-side session
      await UserManagementAPI.logout();
    } catch (error) {
      console.error('Server logout failed:', error);
      // Continue with client-side logout even if server call fails
    }
    
    // Always perform client-side logout
    logout();
    
    addNotification({
      type: 'success',
      message: 'You have been successfully logged out.'
    });
    
    setConfirmOpen(false);
    setIsLoggingOut(false);
  };

  const handleLogoutCancel = () => {
    setConfirmOpen(false);
  };

  if (variant === 'menu' && showUserMenu) {
    return (
      <>
        <IconButton
          onClick={handleMenuOpen}
          size="small"
          sx={{ ml: 2 }}
          aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
        >
          <AccountIcon />
        </IconButton>
        
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <ListItemIcon>
              <AccountIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" fontWeight="bold">
                {user?.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {user?.email}
              </Typography>
            </ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Profile Settings
          </MenuItem>
          
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <SecurityIcon fontSize="small" />
            </ListItemIcon>
            Security Settings
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogoutClick}>
            <ListItemIcon>
              <ExitIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        {/* Logout Confirmation Dialog */}
        <Dialog
          open={confirmOpen}
          onClose={handleLogoutCancel}
          aria-labelledby="logout-dialog-title"
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle id="logout-dialog-title">
            Confirm Logout
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to log out? You will need to sign in again to access the system.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleLogoutCancel} 
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLogoutConfirm} 
              variant="contained" 
              color="primary"
              disabled={isLoggingOut}
              startIcon={isLoggingOut ? <CircularProgress size={16} /> : <LogoutIcon />}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <IconButton
          onClick={handleLogoutClick}
          color="inherit"
          title="Logout"
        >
          <LogoutIcon />
        </IconButton>

        {/* Logout Confirmation Dialog */}
        <Dialog
          open={confirmOpen}
          onClose={handleLogoutCancel}
          aria-labelledby="logout-dialog-title"
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle id="logout-dialog-title">
            Confirm Logout
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to log out?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleLogoutCancel} disabled={isLoggingOut}>
              Cancel
            </Button>
            <Button 
              onClick={handleLogoutConfirm} 
              variant="contained" 
              color="primary"
              disabled={isLoggingOut}
              startIcon={isLoggingOut ? <CircularProgress size={16} /> : <LogoutIcon />}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Default button variant
  return (
    <>
      <Button
        onClick={handleLogoutClick}
        variant="outlined"
        startIcon={<LogoutIcon />}
        color="inherit"
      >
        Logout
      </Button>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="logout-dialog-title">
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to log out? You will need to sign in again to access the system.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel} disabled={isLoggingOut}>
            Cancel
          </Button>
          <Button 
            onClick={handleLogoutConfirm} 
            variant="contained" 
            color="primary"
            disabled={isLoggingOut}
            startIcon={isLoggingOut ? <CircularProgress size={16} /> : <LogoutIcon />}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LogoutButton;
