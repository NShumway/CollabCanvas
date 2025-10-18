/**
 * Development Settings
 * 
 * Central place to control dev-only features like performance monitoring,
 * debug logging, etc. Set to false for production builds.
 */

const DEV_SETTINGS = {
  // Performance monitoring
  showPerformanceMonitor: false,
  
  // Debug logging categories
  enableLogging: {
    sync: false,           // Firestore sync operations
    performance: false,    // Performance-related logs
    userInteractions: false, // Mouse/keyboard interactions
    errors: true,          // Always log errors
    warnings: true,        // Always log warnings
  }
};

export const isDev = () => import.meta.env.DEV;

export const devSettings = DEV_SETTINGS;

// Conditional logging helpers
export const devLog = {
  sync: (...args) => {
    if (devSettings.enableLogging.sync && isDev()) {
      console.log('[SYNC]', ...args);
    }
  },
  
  performance: (...args) => {
    if (devSettings.enableLogging.performance && isDev()) {
      console.log('[PERF]', ...args);
    }
  },
  
  interaction: (...args) => {
    if (devSettings.enableLogging.userInteractions && isDev()) {
      console.log('[INTERACTION]', ...args);
    }
  },
  
  error: (...args) => {
    if (devSettings.enableLogging.errors) {
      console.error('[ERROR]', ...args);
    }
  },
  
  warn: (...args) => {
    if (devSettings.enableLogging.warnings) {
      console.warn('[WARN]', ...args);
    }
  }
};
