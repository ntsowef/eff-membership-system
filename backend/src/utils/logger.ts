// Simple logger utility for the EFF Membership System
// This provides a consistent logging interface across the application
// Respects LOG_LEVEL environment variable: 'error' | 'warn' | 'info' | 'debug'

export interface LogMeta {
  [key: string]: any;
}

export interface Logger {
  info(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
}

// Log levels in order of severity (lower index = more severe)
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;
type LogLevel = typeof LOG_LEVELS[number];

class SimpleLogger implements Logger {
  private logLevel: LogLevel;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    this.logLevel = LOG_LEVELS.includes(envLevel) ? envLevel : 'info';
  }

  /**
   * Check if a message at the given level should be logged
   * based on the configured LOG_LEVEL
   */
  private shouldLog(level: LogLevel): boolean {
    const configuredLevelIndex = LOG_LEVELS.indexOf(this.logLevel);
    const messageLevelIndex = LOG_LEVELS.indexOf(level);
    // Log if message level is at or above (more severe than) configured level
    return messageLevelIndex <= configuredLevelIndex;
  }

  private formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  info(message: string, meta?: LogMeta): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  }

  error(message: string, meta?: LogMeta): void {
    // Errors are always logged
    console.error(this.formatMessage('ERROR', message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  debug(message: string, meta?: LogMeta): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}

// Export a singleton logger instance
export const logger = new SimpleLogger();

// Export default for convenience
export default logger;

// Helper to check if verbose logging is enabled (info level or higher)
export const isVerboseLogging = (): boolean => {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return level === 'info' || level === 'debug';
};

// Conditional console.log - only logs if verbose logging is enabled
export const verboseLog = (...args: any[]): void => {
  if (isVerboseLogging()) {
    console.log(...args);
  }
};

// Conditional console.warn - only logs if warn level or higher is enabled
export const verboseWarn = (...args: any[]): void => {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (level !== 'error') {
    console.warn(...args);
  }
};
