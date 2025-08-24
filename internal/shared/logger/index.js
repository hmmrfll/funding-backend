class Logger {
    constructor() {
      this.isDevelopment = process.env.NODE_ENV !== 'production';
    }

    info(message, meta = {}) {
      if (this.isDevelopment) {
        console.log(`[INFO] ${message}`, meta);
      } else {
        console.log(JSON.stringify({
          level: 'info',
          message,
          ...meta,
          timestamp: new Date().toISOString()
        }));
      }
    }

    error(message, error = null) {
      if (this.isDevelopment) {
        console.error(`[ERROR] ${message}`, error);
      } else {
        console.error(JSON.stringify({
          level: 'error',
          message,
          error: error?.message || error,
          stack: error?.stack,
          timestamp: new Date().toISOString()
        }));
      }
    }

    warn(message, meta = {}) {
      if (this.isDevelopment) {
        console.warn(`[WARN] ${message}`, meta);
      } else {
        console.warn(JSON.stringify({
          level: 'warn',
          message,
          ...meta,
          timestamp: new Date().toISOString()
        }));
      }
    }

    debug(message, meta = {}) {
      if (this.isDevelopment) {
        console.log(`[DEBUG] ${message}`, meta);
      }
    }
  }

  module.exports = Logger;
