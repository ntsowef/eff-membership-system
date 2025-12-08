import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { queryClient } from './lib/queryClient';
import { getTheme } from './theme';
import { useUI, useAuth, useUIStore } from './store';
import AppRoutes from './routes/AppRoutes';
import NotificationProvider from './components/common/NotificationProvider';
import LoadingProvider from './components/common/LoadingProvider';
import ConnectionStatusBanner from './components/common/ConnectionStatusBanner';
import { useAuthInit } from './hooks/useAuthInit';
import { useSessionManagement } from './hooks/useSessionManagement';
import { useActivityTracker } from './hooks/useActivityTracker';
import SessionWarningDialog from './components/common/SessionWarningDialog';
import { MaintenanceProvider } from './contexts/MaintenanceContext';
import { setupMaintenanceInterceptor } from './utils/maintenanceInterceptor';
import { ErrorBoundary } from './pages/errors';
import { setupGlobalErrorHandlers } from './hooks/useErrorHandler';
import { setupErrorInterceptor } from './utils/errorInterceptor';
import { setupEnhancedInterceptors } from './services/apiInterceptors';
import { healthMonitorService } from './services/healthMonitorService';
import { devLog } from './utils/logger';
// import WebSocketProvider from './components/providers/WebSocketProvider'; // Removed WebSocket

// Setup maintenance interceptor
setupMaintenanceInterceptor();

// Setup global error handlers
setupGlobalErrorHandlers();

// Setup error interceptor for API calls
setupErrorInterceptor({
  enableAutoRedirect: true,
  enableLogging: process.env.NODE_ENV === 'development',
  excludedStatusCodes: [401], // Don't auto-redirect on auth failures
});

// Setup enhanced API interceptors with retry logic
setupEnhancedInterceptors();

// Inner App component that uses hooks
const AppContent: React.FC = () => {
  const { theme } = useUI();
  const { isAuthenticated } = useAuth();
  const muiTheme = getTheme(theme);

  // Initialize authentication state
  useAuthInit();

  // Initialize session management for authenticated users
  const { showWarning } = useSessionManagement();

  // Initialize activity tracking to reset session timeout on user activity
  useActivityTracker();

  // Initialize health monitoring
  useEffect(() => {
    devLog('🏥 Initializing health monitoring service');

    // Subscribe to health status changes
    const unsubscribe = healthMonitorService.subscribe((status) => {
      const store = useUIStore.getState();

      // Update UI store with health status
      store.setConnectionStatus(status.connectionStatus);
      store.setServiceStatus(status.serviceStatus);
      store.setLastHealthCheck(status.lastCheck);
      store.setHealthError(status.error);

      // Show banner for critical issues
      if (status.connectionStatus === 'disconnected' || status.serviceStatus === 'unhealthy') {
        store.setShowConnectionBanner(true);
      } else if (status.connectionStatus === 'connected' && status.serviceStatus === 'healthy') {
        // Auto-hide banner when connection is restored
        store.setShowConnectionBanner(false);
      }
    });

    // Start monitoring
    healthMonitorService.start();

    // Cleanup on unmount
    return () => {
      unsubscribe();
      healthMonitorService.stop();
    };
  }, []);

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Router>
          <MaintenanceProvider>
            <LoadingProvider>
              <NotificationProvider>
                <ErrorBoundary>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    {/* Connection Status Banner */}
                    <ConnectionStatusBanner />

                    {/* Main App Content */}
                    <Box sx={{ flex: 1 }}>
                      <AppRoutes />
                    </Box>
                  </Box>

                  {/* Session Warning Dialog - only show for authenticated users */}
                  {isAuthenticated && (
                    <SessionWarningDialog
                      open={showWarning}
                    />
                  )}
                </ErrorBoundary>
              </NotificationProvider>
            </LoadingProvider>
          </MaintenanceProvider>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {/* ReactQueryDevtools disabled for testing */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

export default App;
