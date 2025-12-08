/**
 * SweetAlert2 Utility Service
 * 
 * Provides a centralized way to show beautiful alerts, confirmations, and notifications
 * using SweetAlert2 instead of native browser dialogs.
 */

import Swal from 'sweetalert2';

// Custom theme configuration matching EFF brand colors
const customTheme = {
  confirmButtonColor: '#00843D', // EFF Green
  cancelButtonColor: '#d33',
  denyButtonColor: '#E30613', // EFF Red
};

/**
 * Show a success alert
 */
export const showSuccess = (message: string, title: string = 'Success') => {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: customTheme.confirmButtonColor,
    timer: 3000,
    timerProgressBar: true,
  });
};

/**
 * Show an error alert
 */
export const showError = (message: string, title: string = 'Error') => {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: customTheme.confirmButtonColor,
  });
};

/**
 * Show a warning alert
 */
export const showWarning = (message: string, title: string = 'Warning') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
    confirmButtonColor: customTheme.confirmButtonColor,
  });
};

/**
 * Show an info alert
 */
export const showInfo = (message: string, title: string = 'Information') => {
  return Swal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonColor: customTheme.confirmButtonColor,
  });
};

/**
 * Show a confirmation dialog
 * @returns Promise that resolves to true if confirmed, false otherwise
 */
export const showConfirm = async (
  message: string,
  title: string = 'Are you sure?',
  options?: {
    confirmButtonText?: string;
    cancelButtonText?: string;
    icon?: 'warning' | 'question' | 'info';
    showDenyButton?: boolean;
    denyButtonText?: string;
  }
): Promise<boolean> => {
  const result = await Swal.fire({
    icon: options?.icon || 'question',
    title,
    text: message,
    showCancelButton: true,
    showDenyButton: options?.showDenyButton || false,
    confirmButtonText: options?.confirmButtonText || 'Yes',
    cancelButtonText: options?.cancelButtonText || 'Cancel',
    denyButtonText: options?.denyButtonText || 'No',
    confirmButtonColor: customTheme.confirmButtonColor,
    cancelButtonColor: customTheme.cancelButtonColor,
    denyButtonColor: customTheme.denyButtonColor,
    reverseButtons: true,
  });

  return result.isConfirmed;
};

/**
 * Show a confirmation dialog with danger styling (for destructive actions)
 */
export const showDangerConfirm = async (
  message: string,
  title: string = 'Are you sure?',
  confirmButtonText: string = 'Yes, delete it!'
): Promise<boolean> => {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    reverseButtons: true,
  });

  return result.isConfirmed;
};

/**
 * Show a toast notification (small, non-blocking)
 */
export const showToast = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  position: 'top' | 'top-start' | 'top-end' | 'center' | 'bottom' | 'bottom-start' | 'bottom-end' = 'top-end'
) => {
  const Toast = Swal.mixin({
    toast: true,
    position,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  return Toast.fire({
    icon: type,
    title: message,
  });
};

/**
 * Show a loading indicator
 */
export const showLoading = (message: string = 'Please wait...') => {
  return Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

/**
 * Close any open SweetAlert dialog
 */
export const closeAlert = () => {
  Swal.close();
};

// Export Swal instance for advanced use cases
export { Swal };

// Default export for convenience
export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  confirm: showConfirm,
  dangerConfirm: showDangerConfirm,
  toast: showToast,
  loading: showLoading,
  close: closeAlert,
  Swal,
};

