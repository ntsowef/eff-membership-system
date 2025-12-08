import React, { useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import {
  Warning as WarningIcon,
  AccessTime as TimeIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { useSessionManagement } from '../../hooks/useSessionManagement';

interface SessionWarningDialogProps {
  open: boolean;
  onClose?: () => void;
}

export const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  open,
  onClose
}) => {
  const {
    sessionStatus,
    extendSession,
    dismissWarning,
    handleLogout,
    formatTimeRemaining
  } = useSessionManagement();

  // Refs for debouncing and cleanup
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingActivityRef = useRef(false);

  // Handle automatic session extension on user activity
  const handleActivityDetected = useCallback(async () => {
    // Prevent multiple simultaneous activity processing
    if (isProcessingActivityRef.current || !open) return;

    isProcessingActivityRef.current = true;

    try {
      console.log('🎯 User activity detected - auto-extending session');

      // Extend session immediately
      const success = await extendSession();

      if (success) {
        // Dismiss dialog immediately
        dismissWarning();
        if (onClose) {
          onClose();
        }
        console.log('✅ Session auto-extended and dialog dismissed');
      }
    } catch (error) {
      console.error('❌ Failed to auto-extend session:', error);
    } finally {
      isProcessingActivityRef.current = false;
    }
  }, [open, extendSession, dismissWarning, onClose]);

  // Debounced activity handler to prevent excessive API calls
  const debouncedActivityHandler = useCallback(() => {
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Set new timeout with 100ms debounce
    activityTimeoutRef.current = setTimeout(() => {
      handleActivityDetected();
    }, 100);
  }, [handleActivityDetected]);

  const handleLogoutClick = () => {
    handleLogout();
    if (onClose) {
      onClose();
    }
  };

  // Set up user activity detection when dialog is open
  useEffect(() => {
    if (!open) return;

    // Activity events to detect
    const activityEvents = [
      'mousemove',
      'keydown',
      'keypress',
      'click',
      'touchstart',
      'touchmove',
      'scroll'
    ];

    // Add event listeners for activity detection
    const addEventListeners = () => {
      activityEvents.forEach(event => {
        document.addEventListener(event, debouncedActivityHandler, {
          passive: true,
          capture: true
        });
      });
    };

    // Remove event listeners
    const removeEventListeners = () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, debouncedActivityHandler, true);
      });
    };

    // Add listeners when dialog opens
    addEventListeners();

    console.log('🔍 Activity detection enabled for session warning dialog');

    // Cleanup function
    return () => {
      removeEventListeners();

      // Clear any pending timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }

      // Reset processing flag
      isProcessingActivityRef.current = false;

      console.log('🔍 Activity detection disabled for session warning dialog');
    };
  }, [open, debouncedActivityHandler]);

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Prevent manual closing - only auto-dismiss on activity
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      BackdropProps={{
        onClick: (e) => e.stopPropagation() // Prevent backdrop click from closing
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6" component="span">
            Session Expiring Soon
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Your session will expire due to inactivity. You will be automatically logged out to protect your account.
          </Typography>
        </Alert>

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <TimeIcon color="action" />
          <Typography variant="body1">
            Time remaining: <strong>{formatTimeRemaining(sessionStatus.timeRemaining)}</strong>
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            ✨ Your session will be automatically extended when you:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>Move your mouse</li>
            <li>Press any key</li>
            <li>Click anywhere on the page</li>
          </Box>
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          No action required - just continue working normally
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
        <Button
          onClick={handleLogoutClick}
          color="error"
          variant="outlined"
          startIcon={<LogoutIcon />}
          size="large"
        >
          Logout Now
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionWarningDialog;
