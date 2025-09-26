import { useCallback } from 'react';
import { useUI } from '../store';

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const useNotification = () => {
  const { addNotification } = useUI();

  const showNotification = useCallback((message: string, type: NotificationOptions['type'] = 'info') => {
    addNotification({
      type,
      message
    });
  }, [addNotification]);

  const showSuccess = useCallback((message: string) => {
    showNotification(message, 'success');
  }, [showNotification]);

  const showError = useCallback((message: string) => {
    showNotification(message, 'error');
  }, [showNotification]);

  const showWarning = useCallback((message: string) => {
    showNotification(message, 'warning');
  }, [showNotification]);

  const showInfo = useCallback((message: string) => {
    showNotification(message, 'info');
  }, [showNotification]);

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};
