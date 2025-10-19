/**
 * Shape Update Utilities
 * 
 * Centralized utilities for updating shapes to eliminate code duplication
 * between manual interactions (Canvas.jsx) and AI operations (ToolRunner).
 */

import type { Shape, ShapeType } from '@/types';
import type { SyncEngine } from '@/services/syncEngine';

/**
 * Validation and sanitization for shape properties
 */
export const validateShapeUpdate = (updates: any, shapeType?: ShapeType) => {
  const validUpdates: any = {};
  const errors: string[] = [];

  // Position validation
  if ('x' in updates) {
    if (typeof updates.x === 'number') {
      validUpdates.x = Math.round(updates.x);
    } else {
      errors.push('x must be a number');
    }
  }
  if ('y' in updates) {
    if (typeof updates.y === 'number') {
      validUpdates.y = Math.round(updates.y);
    } else {
      errors.push('y must be a number');
    }
  }

  // Size validation
  if ('width' in updates) {
    if (typeof updates.width === 'number') {
      validUpdates.width = Math.max(10, Math.round(updates.width));
    } else {
      errors.push('width must be a number');
    }
  }
  if ('height' in updates) {
    if (typeof updates.height === 'number') {
      validUpdates.height = Math.max(10, Math.round(updates.height));
    } else {
      errors.push('height must be a number');
    }
  }

  // Rotation validation
  if ('rotation' in updates) {
    if (typeof updates.rotation === 'number') {
      validUpdates.rotation = updates.rotation;
    } else {
      errors.push('rotation must be a number');
    }
  }

  // Color validation
  if ('fill' in updates) {
    if (typeof updates.fill === 'string' && /^#[0-9a-fA-F]{6}$/.test(updates.fill)) {
      validUpdates.fill = updates.fill;
    } else {
      errors.push('fill must be a valid hex color (e.g., #ff0000)');
    }
  }

  // Text-specific validation
  if (shapeType === 'text') {
    if ('text' in updates) {
      if (typeof updates.text === 'string') {
        validUpdates.text = updates.text;
      } else {
        errors.push('text must be a string');
      }
    }
    if ('fontSize' in updates) {
      if (typeof updates.fontSize === 'number') {
        validUpdates.fontSize = Math.max(8, Math.min(200, updates.fontSize));
      } else {
        errors.push('fontSize must be a number');
      }
    }
  }

  return { validUpdates, errors };
};

/**
 * Apply shape update using the same pattern as Canvas.jsx
 * This is the SINGLE SOURCE OF TRUTH for shape updates
 */
export const applyShapeUpdate = (
  shapeId: string,
  updates: any,
  existingShape: Shape,
  syncEngine: SyncEngine,
  immediate: boolean = true,
  updatedBy: string = 'unknown'
) => {
  // Validate updates
  const { validUpdates, errors } = validateShapeUpdate(updates, existingShape.type);
  
  if (errors.length > 0) {
    throw new Error(`Invalid updates: ${errors.join(', ')}`);
  }

  if (Object.keys(validUpdates).length === 0) {
    throw new Error('No valid updates provided');
  }

  // Add metadata
  const finalAttrs = {
    ...validUpdates,
    updatedBy,
    clientTimestamp: Date.now()
  };

  // 🎯 SAME PATTERN AS CANVAS.JSX - single source of truth
  syncEngine.applyLocalChange(shapeId, finalAttrs);
  
  const updatedShape = { ...existingShape, ...finalAttrs };
  syncEngine.queueWrite(shapeId, updatedShape, immediate);

  return { updatedShape, appliedUpdates: finalAttrs };
};

/**
 * Apply scaling to shape dimensions (used by AI and transform operations)
 */
export const applyShapeScaling = (
  shape: Shape,
  scaleWidth: number = 1,
  scaleHeight: number = 1
): { width: number; height: number } => {
  const currentWidth = shape.width || 100;
  const currentHeight = shape.height || 100;
  
  return {
    width: Math.max(10, Math.round(currentWidth * scaleWidth)),
    height: Math.max(10, Math.round(currentHeight * scaleHeight))
  };
};

/**
 * Apply relative movement to shape position
 */
export const applyRelativeMovement = (
  shape: Shape,
  deltaX: number = 0,
  deltaY: number = 0
): { x: number; y: number } => {
  const currentX = shape.x || 0;
  const currentY = shape.y || 0;
  
  return {
    x: Math.round(currentX + deltaX),
    y: Math.round(currentY + deltaY)
  };
};

/**
 * Build user-friendly description of updates (used by AI responses)
 */
export const describeShapeUpdates = (updates: any): string => {
  const parts: string[] = [];
  
  if ('scaleWidth' in updates || 'scaleHeight' in updates) {
    const scaleW = updates.scaleWidth || 1;
    const scaleH = updates.scaleHeight || 1;
    if (scaleW > 1 || scaleH > 1) {
      parts.push('made bigger');
    } else if (scaleW < 1 || scaleH < 1) {
      parts.push('made smaller');
    }
  }
  
  if ('width' in updates || 'height' in updates) {
    parts.push('resized');
  }
  
  if ('deltaX' in updates || 'deltaY' in updates) {
    const directions = [];
    if ('deltaX' in updates) {
      directions.push(updates.deltaX > 0 ? `right ${updates.deltaX}px` : `left ${Math.abs(updates.deltaX)}px`);
    }
    if ('deltaY' in updates) {
      directions.push(updates.deltaY > 0 ? `down ${updates.deltaY}px` : `up ${Math.abs(updates.deltaY)}px`);
    }
    parts.push(`moved ${directions.join(' and ')}`);
  } else if ('x' in updates || 'y' in updates) {
    parts.push('moved');
  }
  
  if ('fill' in updates) {
    parts.push('recolored');
  }
  
  if ('text' in updates) {
    parts.push('text changed');
  }
  
  if ('fontSize' in updates) {
    parts.push('font size changed');
  }
  
  if ('rotation' in updates) {
    parts.push('rotated');
  }
  
  return parts.length > 0 ? parts.join(', ') : 'updated';
};
