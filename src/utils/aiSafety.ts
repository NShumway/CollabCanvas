/**
 * AI Safety Validation Utilities
 * 
 * Centralized safety checks to prevent dangerous AI operations like mass selection,
 * vague criteria matching, and other potential disasters.
 */

import { AI_SAFETY, AI_ERROR_MESSAGES } from './aiConstants';
import type { SelectionCriteria, SafetyCheckResult, AIError } from '../types/aiTypes';

// === SELECTION SAFETY CHECKS ===

/**
 * Check if selection count is safe (not too many shapes)
 */
export const validateSelectionCount = (
  matchingIds: string[]
): SafetyCheckResult => {
  if (matchingIds.length <= AI_SAFETY.MAX_SELECTION_COUNT) {
    return { passed: true };
  }
  
  return {
    passed: false,
    reason: 'SELECTION_TOO_BROAD',
    errorMessage: AI_ERROR_MESSAGES.SELECTION_TOO_BROAD(
      matchingIds.length, 
      AI_SAFETY.MAX_SELECTION_COUNT
    )
  };
};

/**
 * Check if text search criteria produced any matches
 */
export const validateTextSearchResults = (
  matchingIds: string[],
  searchText: string
): SafetyCheckResult => {
  if (!searchText) {
    return { passed: true }; // Not a text search
  }
  
  if (matchingIds.length > 0) {
    return { passed: true }; // Found matches
  }
  
  return {
    passed: false,
    reason: 'NO_TEXT_MATCHES',
    errorMessage: AI_ERROR_MESSAGES.NO_TEXT_MATCHES(searchText)
  };
};

/**
 * Check if criteria is too vague (only one simple criteria with many matches)
 */
export const validateCriteriaSpecificity = (
  matchingIds: string[],
  criteria: SelectionCriteria
): SafetyCheckResult => {
  // Only check if we have more than the warning threshold
  if (matchingIds.length <= AI_SAFETY.MASS_SELECTION_WARNING_THRESHOLD) {
    return { passed: true };
  }
  
  // Count meaningful criteria (excluding position)
  const meaningfulCriteria = Object.entries(criteria)
    .filter(([key, value]) => value && key !== 'position');
  
  // If only one simple criteria and no text/position specificity
  if (meaningfulCriteria.length <= 1 && !criteria.text && !criteria.position) {
    const [criteriaType, criteriaValue] = meaningfulCriteria[0] || ['unknown', 'unknown'];
    
    return {
      passed: false,
      reason: 'VAGUE_CRITERIA',
      errorMessage: AI_ERROR_MESSAGES.VAGUE_CRITERIA(
        matchingIds.length,
        criteriaType,
        String(criteriaValue)
      )
    };
  }
  
  return { passed: true };
};

/**
 * Run all selection safety checks
 */
export const validateSelection = (
  matchingIds: string[],
  criteria: SelectionCriteria
): SafetyCheckResult => {
  // Check selection count first (most critical)
  const countCheck = validateSelectionCount(matchingIds);
  if (!countCheck.passed) return countCheck;
  
  // Check text search results
  const textCheck = validateTextSearchResults(matchingIds, criteria.text || '');
  if (!textCheck.passed) return textCheck;
  
  // Check criteria specificity
  const specificityCheck = validateCriteriaSpecificity(matchingIds, criteria);
  if (!specificityCheck.passed) return specificityCheck;
  
  return { passed: true };
};

// === INPUT VALIDATION ===

/**
 * Validate selection criteria structure
 */
export const validateSelectionCriteria = (criteria: any): SafetyCheckResult => {
  if (!criteria || typeof criteria !== 'object') {
    return {
      passed: false,
      reason: 'VALIDATION_ERROR',
      errorMessage: 'Selection criteria is required and must be an object'
    };
  }
  
  // Check for at least one valid criteria
  const validKeys = ['type', 'color', 'text', 'position'];
  const hasValidCriteria = validKeys.some(key => criteria[key] !== undefined);
  
  if (!hasValidCriteria) {
    return {
      passed: false,
      reason: 'VALIDATION_ERROR', 
      errorMessage: 'At least one selection criteria must be provided (type, color, text, or position)'
    };
  }
  
  return { passed: true };
};

/**
 * Validate shape update arguments
 */
export const validateShapeUpdateArgs = (args: any): SafetyCheckResult => {
  if (!args || typeof args !== 'object') {
    return {
      passed: false,
      reason: 'VALIDATION_ERROR',
      errorMessage: 'Update arguments are required and must be an object'
    };
  }
  
  // Check for at least one update property
  const updateKeys = [
    'x', 'y', 'deltaX', 'deltaY', 'width', 'height', 'scaleWidth', 'scaleHeight',
    'fill', 'stroke', 'strokeWidth', 'text', 'fontSize', 'fontFamily', 'rotation', 'opacity'
  ];
  
  const hasValidUpdate = updateKeys.some(key => args[key] !== undefined);
  
  if (!hasValidUpdate) {
    return {
      passed: false,
      reason: 'VALIDATION_ERROR',
      errorMessage: 'At least one update property must be provided'
    };
  }
  
  return { passed: true };
};

/**
 * Validate create shape arguments
 */
export const validateCreateShapeArgs = (args: any): SafetyCheckResult => {
  if (!args || typeof args !== 'object') {
    return {
      passed: false,
      reason: 'VALIDATION_ERROR',
      errorMessage: 'Shape creation arguments are required and must be an object'
    };
  }
  
  // Required fields
  if (!args.type) {
    return {
      passed: false,
      reason: 'VALIDATION_ERROR',
      errorMessage: 'Shape type is required'
    };
  }
  
  if (typeof args.x !== 'number' || typeof args.y !== 'number') {
    return {
      passed: false,
      reason: 'VALIDATION_ERROR',
      errorMessage: 'Shape position (x, y) coordinates are required and must be numbers'
    };
  }
  
  return { passed: true };
};

// === RATE LIMITING ===

/**
 * Check if rate limit is exceeded
 */
export const validateRateLimit = (requestCount: number, windowStart: number): SafetyCheckResult => {
  const now = Date.now();
  const windowAge = now - windowStart;
  
  // Reset window if it's been too long
  if (windowAge > AI_SAFETY.RATE_LIMIT_WINDOW_MS) {
    return { passed: true }; // New window, allow request
  }
  
  if (requestCount >= AI_SAFETY.RATE_LIMIT_DEFAULT) {
    return {
      passed: false,
      reason: 'RATE_LIMIT_EXCEEDED',
      errorMessage: AI_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
    };
  }
  
  return { passed: true };
};

// === ERROR UTILITIES ===

/**
 * Create standardized AI error objects
 */
export const createAIError = (
  type: SafetyCheckResult['reason'],
  message: string,
  context?: Record<string, any>
): AIError => {
  return {
    type: type as any, // TODO: Fix type mapping
    message,
    ...(context && { context })
  };
};

/**
 * Convert safety check result to error response format
 */
export const safetyCheckToErrorResponse = (check: SafetyCheckResult) => {
  if (check.passed) {
    throw new Error('Cannot convert passing safety check to error response');
  }
  
  return {
    success: false,
    message: check.errorMessage || 'Safety check failed',
    error: check.reason || 'Unknown safety violation'
  };
};

// === LOGGING AND MONITORING ===

/**
 * Log safety violations for monitoring
 */
export const logSafetyViolation = (
  violationType: string,
  context: Record<string, any>
): void => {
  console.warn(`[AI Safety] ${violationType}:`, context);
  
  // TODO: Add proper monitoring/telemetry here
  // This could send to analytics, error tracking, etc.
};

/**
 * Log successful operations for monitoring
 */
export const logSafeOperation = (
  operationType: string,
  context: Record<string, any>
): void => {
  console.info(`[AI Safety] Safe operation: ${operationType}`, context);
  
  // TODO: Add success tracking here
};
