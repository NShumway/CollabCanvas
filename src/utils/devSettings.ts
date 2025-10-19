/**
 * Development Settings
 * 
 * Central place to control dev-only features like performance monitoring,
 * debug logging, etc. Set to false for production builds.
 */

import type { DevSettings } from '@/types';

interface LoggingConfig {
  readonly sync: boolean;           // Firestore sync operations
  readonly performance: boolean;    // Performance-related logs
  readonly userInteractions: boolean; // Mouse/keyboard interactions
  readonly ai: boolean;            // AI operations and tool execution
  readonly errors: boolean;         // Always log errors
  readonly warnings: boolean;       // Always log warnings
}

const DEV_SETTINGS: DevSettings = {
  // Performance monitoring
  enablePerformanceMonitor: false,
  enableSyncLogging: false,
  enableVerboseLogging: false,
  showFpsCounter: false,
  showShapeIds: false,
};

const LOGGING_CONFIG: LoggingConfig = {
  sync: false,
  performance: false,
  userInteractions: false,
  ai: true,            // Enable AI logging for development
  errors: true,
  warnings: true,
};

export const isDev = (): boolean => import.meta.env.DEV;

export const devSettings = DEV_SETTINGS;

// Conditional logging helpers with proper typing
export const devLog = {
  sync: (...args: unknown[]): void => {
    if (LOGGING_CONFIG.sync && isDev()) {
      console.log('[SYNC]', ...args);
    }
  },
  
  performance: (...args: unknown[]): void => {
    if (LOGGING_CONFIG.performance && isDev()) {
      console.log('[PERF]', ...args);
    }
  },
  
  interaction: (...args: unknown[]): void => {
    if (LOGGING_CONFIG.userInteractions && isDev()) {
      console.log('[INTERACTION]', ...args);
    }
  },
  
  ai: (...args: unknown[]): void => {
    if (LOGGING_CONFIG.ai && isDev()) {
      console.log('[AI]', ...args);
    }
  },
  
  error: (...args: unknown[]): void => {
    if (LOGGING_CONFIG.errors) {
      console.error('[ERROR]', ...args);
    }
  },
  
  warn: (...args: unknown[]): void => {
    if (LOGGING_CONFIG.warnings) {
      console.warn('[WARN]', ...args);
    }
  }
} as const;
