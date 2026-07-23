import { format } from 'date-fns';

// Log levels
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// Reverse map for string representation
const LogLevelName: Record<LogLevel, keyof typeof LogLevel> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// Configuration
const LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
const ENABLE_REMOTE_LOGGING = process.env.NEXT_PUBLIC_LOGGING_ENDPOINT ? true : false;
const REMOTE_LOGGING_ENDPOINT = process.env.NEXT_PUBLIC_LOGGING_ENDPOINT || '';

/**
 * Send log to remote endpoint (if configured)
 */
async function sendToRemote(log: {
  level: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}) {
  if (!ENABLE_REMOTE_LOGGING) return;

  try {
    await fetch(REMOTE_LOGGING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
      // Don't wait for response
      keepalive: true,
    });
  } catch (e) {
    // Fail silently to not disrupt app
    console.warn('Failed to send log to remote endpoint:', e);
  }
}

/**
 * Log a message with a given level
 */
export function log(
  level: LogLevel,
  message: string,
  meta: Record<string, unknown> = {}
) {
  if (level < LOG_LEVEL) return;

  const timestamp = new Date().toISOString();
  const logMessage = `[${format(new Date(), 'HH:mm:ss.SSS')}] ${message}`;

  // Log to console
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(logMessage, meta);
      break;
    case LogLevel.INFO:
      console.info(logMessage, meta);
      break;
    case LogLevel.WARN:
      console.warn(logMessage, meta);
      break;
    case LogLevel.ERROR:
      console.error(logMessage, meta);
      break;
  }

  // Send to remote endpoint if configured
  sendToRemote({
    level: LogLevelName[level],
    message,
    timestamp,
    meta: Object.keys(meta).length ? meta : undefined,
  });
}

/**
 * Convenience methods
 */
export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log(LogLevel.DEBUG, message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log(LogLevel.INFO, message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log(LogLevel.WARN, message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log(LogLevel.ERROR, message, meta),
};

/**
 * Log an error object (e.g., from try/catch)
 */
export function logError(error: unknown, context: string = '') {
  const message = context ? `${context}: ${error}` : `${error}`;
  logger.error(message, {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
  });
}

export default logger;