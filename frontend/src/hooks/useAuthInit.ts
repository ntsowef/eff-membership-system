import { useEffect } from 'react';
import { useAuth } from '../store';
import { UserManagementAPI } from '../lib/userManagementApi';
import { devLog } from '../utils/logger';

/**
 * Hook to initialize authentication state on app startup
 * Validates stored tokens and handles automatic logout for expired sessions
 */
export const useAuthInit = () => {
  const { token, isAuthenticated, login, logout } = useAuth();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const tokenExpiration = localStorage.getItem('tokenExpiration');
      const rememberMe = localStorage.getItem('rememberMe');

      // No stored token, nothing to validate
      if (!storedToken) {
        return;
      }

      // Check if token is expired
      if (tokenExpiration) {
        const expirationTime = parseInt(tokenExpiration);
        const now = Date.now();
        
        if (now > expirationTime) {
          // Token expired, logout user
          devLog('Token expired, logging out user');
          logout();
          return;
        }
      }

      // If user chose "remember me", extend token validity
      if (rememberMe === 'true' && tokenExpiration) {
        const expirationTime = parseInt(tokenExpiration);
        const now = Date.now();
        const timeUntilExpiry = expirationTime - now;
        
        // If token expires within 1 hour, try to refresh it
        if (timeUntilExpiry < (60 * 60 * 1000)) {
          try {
            await UserManagementAPI.refreshToken();
            // Update expiration time
            const newExpirationTime = Date.now() + (24 * 60 * 60 * 1000);
            localStorage.setItem('tokenExpiration', newExpirationTime.toString());
          } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
            return;
          }
        }
      }

      // Validate token with backend if we have one but aren't authenticated
      if (storedToken && !isAuthenticated) {
        try {
          const response = await UserManagementAPI.validateToken();
          if (response.success && response.data.user) {
            // Token is valid, restore user session
            login(response.data.user, storedToken);
          } else {
            // Token is invalid, logout
            logout();
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
    };

    initializeAuth();
  }, [token, isAuthenticated, login, logout]);

  // Set up automatic token refresh for "remember me" users
  useEffect(() => {
    const rememberMe = localStorage.getItem('rememberMe');
    
    if (rememberMe === 'true' && isAuthenticated) {
      // Set up interval to refresh token every 23 hours
      const refreshInterval = setInterval(async () => {
        try {
          await UserManagementAPI.refreshToken();
          const newExpirationTime = Date.now() + (24 * 60 * 60 * 1000);
          localStorage.setItem('tokenExpiration', newExpirationTime.toString());
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          logout();
        }
      }, 23 * 60 * 60 * 1000); // 23 hours

      return () => clearInterval(refreshInterval);
    }
  }, [isAuthenticated, logout]);

  // Set up 10-minute session timeout for non-remember-me users
  useEffect(() => {
    if (!isAuthenticated) return;

    const rememberMe = localStorage.getItem('rememberMe');

    // Only apply 10-minute timeout for users who didn't choose "remember me"
    if (rememberMe !== 'true') {
      // Set session expiration to 10 minutes from now
      const sessionExpiration = Date.now() + (10 * 60 * 1000); // 10 minutes
      localStorage.setItem('sessionExpiration', sessionExpiration.toString());

      devLog('🕐 10-minute session timeout activated');
    }
  }, [isAuthenticated]);
};
