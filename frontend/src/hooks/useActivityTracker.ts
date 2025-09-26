import { useEffect, useCallback } from 'react';
import { useAuth } from '../store';

/**
 * Hook to track user activity and reset session timeout on activity
 */
export const useActivityTracker = () => {
  const { isAuthenticated } = useAuth();

  // Reset session timeout on user activity
  const resetSessionTimeout = useCallback(() => {
    if (!isAuthenticated) return;

    const rememberMe = localStorage.getItem('rememberMe');
    
    // Only reset timeout for non-remember-me users
    if (rememberMe !== 'true') {
      const newExpiration = Date.now() + (10 * 60 * 1000); // 10 minutes from now
      localStorage.setItem('sessionExpiration', newExpiration.toString());
    }
  }, [isAuthenticated]);

  // Activity events to track
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  useEffect(() => {
    if (!isAuthenticated) return;

    // Throttle activity tracking to avoid excessive updates
    let lastActivity = 0;
    const throttleDelay = 30000; // 30 seconds

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > throttleDelay) {
        lastActivity = now;
        resetSessionTimeout();
      }
    };

    // Add event listeners for activity tracking
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup event listeners
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, resetSessionTimeout]);

  return {
    resetSessionTimeout
  };
};

export default useActivityTracker;
