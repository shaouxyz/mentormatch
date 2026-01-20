// Centralized Logging Utility
// Provides structured logging with environment-based filtering and sensitive data sanitization

import { isDevelopment } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Sensitive fields that should never be logged
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
];

/**
 * Sanitize context to remove sensitive data
 */
function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive field
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = isDevelopment();
  }

  /**
   * Internal logging method with sanitization
   */
  private log(level: LogLevel, message: string, error?: Error, context?: Record<string, unknown>): void {
    // Sanitize context to remove sensitive data
    const sanitizedContext = sanitizeContext(context);
    
    const entry: LogEntry = {
      level,
      message,
      error,
      context: sanitizedContext,
      timestamp: new Date().toISOString(),
    };

    // In development, log to console
    if (this.isDevelopment) {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logMethod(`[${level.toUpperCase()}] ${message}`, {
        ...(error && { error: error.message, stack: error.stack }),
        ...sanitizedContext,
        timestamp: entry.timestamp,
      });
    }

    // In production, you would send to error reporting service (Sentry, Bugsnag, etc.)
    // Example:
    // if (level === 'error' && error) {
    //   Sentry.captureException(error, { extra: sanitizedContext });
    // }
  }

  /**
   * Log debug message (only in development)
   * @param message - Debug message
   * @param context - Optional context object (will be sanitized)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.log('debug', message, undefined, context);
    }
  }

  /**
   * Log info message
   * @param message - Info message
   * @param context - Optional context object (will be sanitized)
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Log warning message
   * @param message - Warning message
   * @param context - Optional context object (will be sanitized)
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, undefined, context);
  }

  /**
   * Log error message
   * @param message - Error message
   * @param error - Optional Error object
   * @param context - Optional context object (will be sanitized)
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, error, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper function for async error handling
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, error instanceof Error ? error : new Error(String(error)), context);
    return null;
  }
}
