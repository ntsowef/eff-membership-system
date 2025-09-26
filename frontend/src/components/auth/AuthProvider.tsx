import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserManagementAPI } from '../../lib/userManagementApi';
import { useAuth } from '../../store';
import { CircularProgress, Box, Typography } from '@mui/material';
import SessionWarningDialog from '../common/SessionWarningDialog';
import { useSessionManagement } from '../../hooks/useSessionManagement';

interface AuthContextType {
  loading: boolean;
  initialized: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  loading: false,
  initialized: false,
  refreshAuth: async () => {}
});

export const useAuthContext = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, token, login, logout, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Session management
  const { showWarning } = useSessionManagement();

  const refreshAuth = async () => {
    if (!token) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      // Validate the current token and get updated user info
      const response = await UserManagementAPI.getCurrentUser();
      
      if (response.success && response.data.user) {
        // Update user data in store
        login(response.data.user, token);
      } else {
        // Token is invalid, logout
        logout();
      }
    } catch (error) {
      console.error('Auth validation failed:', error);
      // Token is invalid or expired, logout
      logout();
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    // Initialize authentication on app start
    const initAuth = async () => {
      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('authToken');
      
      if (storedToken && !isAuthenticated) {
        // We have a token but not authenticated, try to validate it
        try {
          const response = await UserManagementAPI.getCurrentUser();
          
          if (response.success && response.data.user) {
            login(response.data.user, storedToken);
          } else {
            // Invalid token, remove it
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('authToken');
        }
      }
      
      setLoading(false);
      setInitialized(true);
    };

    initAuth();
  }, [isAuthenticated, login]);

  // Set up axios interceptor for token management
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add request interceptor to include auth token
      const requestInterceptor = (config: any) => {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
      };

      // Add response interceptor to handle auth errors
      const responseInterceptor = (error: any) => {
        if (error.response?.status === 401) {
          // Unauthorized, logout user
          logout();
          localStorage.removeItem('authToken');
          
          // Redirect to login if not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      };

      // Note: In a real implementation, you'd set up axios interceptors here
      // For now, we'll handle this in the API service
    }
  }, [logout]);

  // Auto-refresh user data periodically
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const response = await UserManagementAPI.getCurrentUser();
        if (response.success && response.data.user) {
          // Update user data if it has changed
          const updatedUser = response.data.user;
          if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
            login(updatedUser, token!);
          }
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, user, token, login]);

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.100"
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Initializing Application...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Validating authentication
        </Typography>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ loading, initialized, refreshAuth }}>
      {children}
      {/* Session warning dialog */}
      {isAuthenticated && (
        <SessionWarningDialog
          open={showWarning}
        />
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
