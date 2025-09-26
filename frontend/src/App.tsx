
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { queryClient } from './lib/queryClient';
import { getTheme } from './theme';
import { useUI, useAuth } from './store';
import AppRoutes from './routes/AppRoutes';
import NotificationProvider from './components/common/NotificationProvider';
import LoadingProvider from './components/common/LoadingProvider';
import { useAuthInit } from './hooks/useAuthInit';
import { useSessionManagement } from './hooks/useSessionManagement';
import { useActivityTracker } from './hooks/useActivityTracker';
import SessionWarningDialog from './components/common/SessionWarningDialog';
import { MaintenanceProvider } from './contexts/MaintenanceContext';
import { setupMaintenanceInterceptor } from './utils/maintenanceInterceptor';
// import WebSocketProvider from './components/providers/WebSocketProvider'; // Removed WebSocket

// Setup maintenance interceptor
setupMaintenanceInterceptor();

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

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Router>
          <MaintenanceProvider>
            <LoadingProvider>
              <NotificationProvider>
                <AppRoutes />
                {/* Session Warning Dialog - only show for authenticated users */}
                {isAuthenticated && (
                  <SessionWarningDialog
                    open={showWarning}
                  />
                )}
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
