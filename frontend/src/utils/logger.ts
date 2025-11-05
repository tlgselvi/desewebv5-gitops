/**
 * Frontend logger utility
 * Provides structured logging for the frontend application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isDevelopment() && level === 'debug') {
      return; // Skip debug logs in production
    }

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(formattedMessage);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(formattedMessage);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formattedMessage);
        break;
      case 'error':
        // For errors, use console.error but format to reduce stack trace noise
        // Pass context as second parameter to avoid showing logger's stack trace
        if (context && Object.keys(context).length > 0) {
          // eslint-disable-next-line no-console
          console.error(`%c${formattedMessage}`, 'color: red; font-weight: bold;', context);
        } else {
          // eslint-disable-next-line no-console
          console.error(`%c${formattedMessage}`, 'color: red; font-weight: bold;');
        }
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Grouped logging for development (e.g., error details)
   */
  group(title: string, logs: () => void): void {
    if (this.isDevelopment()) {
      // eslint-disable-next-line no-console
      console.group(title);
      logs();
      // eslint-disable-next-line no-console
      console.groupEnd();
    } else {
      // In production, just execute the logs without grouping
      logs();
    }
  }
}

export const logger = new Logger();

