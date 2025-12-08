/**
 * Frontend Logging Utility
 * 
 * Provides conditional logging that respects the environment.
 * In production (import.meta.env.PROD), only errors are logged.
 * In development (import.meta.env.DEV), all logs are shown.
 */

const isDev = import.meta.env.DEV;

/**
 * Log debug/info messages - only in development
 */
export const devLog = (...args: any[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Log warning messages - only in development
 */
export const devWarn = (...args: any[]): void => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Log error messages - always (production and development)
 */
export const logError = (...args: any[]): void => {
  console.error(...args);
};

/**
 * Check if we're in development mode
 */
export const isDevMode = (): boolean => isDev;

/**
 * Conditional console.log wrapper
 * Use this to wrap existing console.log statements
 */
export const conditionalLog = (condition: boolean, ...args: any[]): void => {
  if (condition && isDev) {
    console.log(...args);
  }
};

export default {
  devLog,
  devWarn,
  logError,
  isDevMode,
  conditionalLog,
};

