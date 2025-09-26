import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as MaintenanceServiceModule from '../services/maintenanceService';

const { maintenanceService } = MaintenanceServiceModule;
type MaintenanceStatus = MaintenanceServiceModule.MaintenanceStatus;
import { useAuth } from '../store';

interface MaintenanceContextType {
  status: MaintenanceStatus | null;
  loading: boolean;
  error: string | null;
  canBypass: boolean;
  refreshStatus: () => Promise<void>;
  isMaintenanceActive: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

interface MaintenanceProviderProps {
  children: ReactNode;
}

export const MaintenanceProvider: React.FC<MaintenanceProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canBypass, setCanBypass] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const refreshStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const maintenanceStatus = await maintenanceService.getStatus(true);
      setStatus(maintenanceStatus);
      
      // Check bypass permissions if user is authenticated
      if (isAuthenticated) {
        const bypass = await maintenanceService.canBypass();
        setCanBypass(bypass);
      } else {
        setCanBypass(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch maintenance status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    
    // Start periodic checking
    const stopPeriodicCheck = maintenanceService.startPeriodicCheck(60000, (newStatus) => {
      setStatus(newStatus);
    });
    
    return stopPeriodicCheck;
  }, []);

  useEffect(() => {
    // Refresh bypass permissions when auth state changes
    if (isAuthenticated) {
      maintenanceService.canBypass().then(setCanBypass).catch(() => setCanBypass(false));
    } else {
      setCanBypass(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Handle maintenance mode navigation
    if (!loading && status) {
      const isMaintenancePage = location.pathname === '/maintenance';
      const isMaintenanceActive = status.is_enabled;
      
      if (isMaintenanceActive && !canBypass && !isMaintenancePage) {
        // Redirect to maintenance page if maintenance is active and user can't bypass
        navigate('/maintenance', { replace: true });
      } else if (!isMaintenanceActive && isMaintenancePage) {
        // Redirect away from maintenance page if maintenance is not active
        navigate('/', { replace: true });
      }
    }
  }, [status, canBypass, loading, location.pathname, navigate]);

  const isMaintenanceActive = status?.is_enabled || false;

  const contextValue: MaintenanceContextType = {
    status,
    loading,
    error,
    canBypass,
    refreshStatus,
    isMaintenanceActive
  };

  return (
    <MaintenanceContext.Provider value={contextValue}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = (): MaintenanceContextType => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};
