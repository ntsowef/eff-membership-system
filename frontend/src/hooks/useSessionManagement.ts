import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../store';
import { api } from '../lib/api';

interface SessionStatus {
  isValid: boolean;
  timeRemaining: number;
  needsWarning: boolean;
  canExtend: boolean;
}

interface SessionWarning {
  needsWarning: boolean;
  timeRemaining: number;
}

export const useSessionManagement = () => {
  const { logout, token } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isValid: true,
    timeRemaining: 10,
    needsWarning: false,
    canExtend: false
  });
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  
  // Use refs to avoid stale closures in intervals
  const sessionStatusRef = useRef(sessionStatus);
  const showWarningRef = useRef(showWarning);
  
  // Update refs when state changes
  useEffect(() => {
    sessionStatusRef.current = sessionStatus;
  }, [sessionStatus]);
  
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  // Get session ID from token or headers
  const getSessionId = useCallback(() => {
    // In a real implementation, you might extract this from JWT or store it separately
    return token ? 'current-session' : null;
  }, [token]);

  // Check session status using localStorage
  const checkSessionStatus = useCallback(() => {
    if (!token) return;

    const sessionExpiration = localStorage.getItem('sessionExpiration');
    const rememberMe = localStorage.getItem('rememberMe');

    // Skip session timeout for "remember me" users
    if (rememberMe === 'true') {
      setSessionStatus({
        isValid: true,
        timeRemaining: 999, // Large number to indicate no timeout
        needsWarning: false,
        canExtend: false
      });
      return;
    }

    if (!sessionExpiration) {
      // No session expiration set, create one (10 minutes from now)
      const newExpiration = Date.now() + (10 * 60 * 1000);
      localStorage.setItem('sessionExpiration', newExpiration.toString());
      setSessionStatus({
        isValid: true,
        timeRemaining: 10,
        needsWarning: false,
        canExtend: true
      });
      return;
    }

    const expirationTime = parseInt(sessionExpiration);
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;
    const minutesRemaining = Math.ceil(timeUntilExpiry / (60 * 1000));

    const status: SessionStatus = {
      isValid: timeUntilExpiry > 0,
      timeRemaining: Math.max(0, minutesRemaining),
      needsWarning: timeUntilExpiry <= (2 * 60 * 1000) && timeUntilExpiry > 0, // Warn 2 minutes before expiry
      canExtend: timeUntilExpiry > 0
    };

    setSessionStatus(status);

    // Show warning if needed and not already showing
    if (status.needsWarning && !showWarningRef.current) {
      setShowWarning(true);
    }

    // Auto logout if session is invalid
    if (!status.isValid) {
      console.log('🔒 Session expired due to inactivity, logging out...');
      localStorage.removeItem('sessionExpiration');
      logout();
      return;
    }
  }, [token, logout]);

  // Extend session by 10 minutes
  const extendSession = useCallback(async () => {
    if (!token || isExtending) return false;

    setIsExtending(true);
    try {
      // Extend session by 10 minutes from now
      const newExpiration = Date.now() + (10 * 60 * 1000);
      localStorage.setItem('sessionExpiration', newExpiration.toString());

      setShowWarning(false);

      // Update session status
      setSessionStatus({
        isValid: true,
        timeRemaining: 10,
        needsWarning: false,
        canExtend: true
      });

      console.log('🔄 Session extended by 10 minutes');
      return true;
    } catch (error) {
      console.error('Failed to extend session:', error);
      return false;
    } finally {
      setIsExtending(false);
    }
  }, [token, isExtending]);

  // Dismiss warning (user chooses not to extend)
  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  // Manual logout
  const handleLogout = useCallback(() => {
    setShowWarning(false);
    localStorage.removeItem('sessionExpiration');
    logout();
  }, [logout]);

  // Set up session monitoring
  useEffect(() => {
    if (!token) {
      setSessionStatus({
        isValid: false,
        timeRemaining: 0,
        needsWarning: false,
        canExtend: false
      });
      setShowWarning(false);
      return;
    }

    // Initial check
    checkSessionStatus();

    // Set up interval to check session status every 15 seconds for more responsive timeout
    const interval = setInterval(() => {
      checkSessionStatus();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [token, checkSessionStatus]);

  // Format time remaining for display
  const formatTimeRemaining = useCallback((minutes: number): string => {
    if (minutes <= 0) return '0 minutes';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  }, []);

  return {
    sessionStatus,
    showWarning,
    isExtending,
    extendSession,
    dismissWarning,
    handleLogout,
    formatTimeRemaining
  };
};

export default useSessionManagement;
