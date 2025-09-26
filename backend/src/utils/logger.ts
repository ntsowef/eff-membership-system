// Simple logger utility for the EFF Membership System
// This provides a consistent logging interface across the application

export interface LogMeta {
  [key: string]: any;
}

export interface Logger {
  info(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
}

class SimpleLogger implements Logger {
  private formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  info(message: string, meta?: LogMeta): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  error(message: string, meta?: LogMeta): void {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  debug(message: string, meta?: LogMeta): void {
    // Only log debug messages in development
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}

// Export a singleton logger instance
export const logger = new SimpleLogger();

// Export default for convenience
export default logger;
