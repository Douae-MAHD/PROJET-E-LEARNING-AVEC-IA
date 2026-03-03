/**
 * Logger Service
 * Centralized logging with structured output
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Format log message with timestamp and level
   */
  format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...meta
    };
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    console.log('ℹ️  [INFO]', this.format('INFO', message, meta));
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    console.warn('⚠️  [WARN]', this.format('WARN', message, meta));
  }

  /**
   * Log error message
   */
  error(message, error = null, meta = {}) {
    const errorInfo = error ? {
      errorMessage: error.message,
      errorStack: this.isDevelopment ? error.stack : undefined
    } : {};
    console.error('❌ [ERROR]', this.format('ERROR', message, { ...errorInfo, ...meta }));
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, meta = {}) {
    if (this.isDevelopment) {
      console.log('🔍 [DEBUG]', this.format('DEBUG', message, meta));
    }
  }

  /**
   * Log success message
   */
  success(message, meta = {}) {
    console.log('✅ [SUCCESS]', this.format('SUCCESS', message, meta));
  }

  /**
   * Log API request
   */
  logRequest(method, path, userId = null) {
    this.info(`${method} ${path}`, { userId });
  }

  /**
   * Log API response
   */
  logResponse(method, path, statusCode, duration = 0) {
    const level = statusCode >= 400 ? 'WARN' : 'INFO';
    const symbol = statusCode >= 400 ? '⚠️ ' : '✅ ';
    this.info(`${symbol}${method} ${path} → ${statusCode} (${duration}ms)`, { statusCode, duration });
  }
}

export default new Logger();
