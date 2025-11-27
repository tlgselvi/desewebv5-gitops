/**
 * Frontend Logger Service
 * 
 * Provides structured logging with environment-aware log levels.
 * In production, only warnings and errors are logged.
 * Debug and info logs are only shown in development.
 * 
 * @example
 * import { logger } from '@/lib/logger';
 * 
 * logger.debug('Fetching data...', { userId: 123 });
 * logger.info('User logged in', { email: user.email });
 * logger.warn('Rate limit approaching');
 * logger.error('Failed to fetch data', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error | unknown, context?: LogContext) => void;
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Send error to monitoring service (placeholder)
 * In production, integrate with Sentry, LogRocket, etc.
 */
function sendToMonitoring(error: Error | unknown, context?: LogContext): void {
  // TODO: Integrate with error monitoring service
  // Example: Sentry.captureException(error, { extra: context });
  
  // For now, we'll just log to console in production
  if (!isDevelopment && typeof window !== 'undefined') {
    // Could send to a backend logging endpoint
    // fetch('/api/v1/logs', { method: 'POST', body: JSON.stringify({ error, context }) });
  }
}

export const logger: Logger = {
  /**
   * Debug level - only shown in development
   * Use for detailed debugging information
   */
  debug: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.debug(
        formatMessage('debug', message),
        context ? context : ''
      );
    }
  },

  /**
   * Info level - only shown in development
   * Use for general information about app flow
   */
  info: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.info(
        formatMessage('info', message),
        context ? context : ''
      );
    }
  },

  /**
   * Warn level - always shown
   * Use for warnings that don't break functionality
   */
  warn: (message: string, context?: LogContext) => {
    console.warn(
      formatMessage('warn', message),
      context ? context : ''
    );
  },

  /**
   * Error level - always shown + sent to monitoring
   * Use for errors that affect functionality
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : { raw: error };

    console.error(
      formatMessage('error', message),
      errorDetails,
      context ? context : ''
    );

    // Send to monitoring in production
    if (!isDevelopment && error) {
      sendToMonitoring(error, { ...context, message });
    }
  },
};

export default logger;

