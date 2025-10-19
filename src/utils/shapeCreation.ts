/**
 * Shape Creation Utilities
 * 
 * DRY solution for shape creation to eliminate code duplication.
 * All created shapes use center-based coordinates (x, y = center point).
 */

import type { Shape, ShapeType } from '@/types';
import { SHAPE_DEFAULTS, SHAPE_CREATION_DEFAULTS } from './shapeDefaults';

interface CreateShapeOptions {
  type: ShapeType;
  x: number;
  y: number;
  userId: string;
  maxZIndex: number;
  [key: string]: any; // Allow custom properties
}

/**
 * Create a new shape with consistent defaults and metadata
 * Eliminates the massive code duplication in Canvas.jsx
 */
export const createShape = ({ type, x, y, userId, maxZIndex, ...customProps }: CreateShapeOptions): Shape => {
  const now = Date.now();
  const baseShape = {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    fill: SHAPE_DEFAULTS.FILL,
    zIndex: maxZIndex + 1,
    updatedAt: now,
    createdBy: userId || 'unknown',
    updatedBy: userId || 'unknown',
    clientTimestamp: now,
    ...customProps, // Apply custom properties
  };

  switch (type) {
    case 'rectangle':
      return {
        ...SHAPE_CREATION_DEFAULTS.rectangle, // Defaults first
        ...baseShape,                        // Custom props override defaults  
        type: 'rectangle',
      } as Shape;

    case 'ellipse':
      return {
        width: SHAPE_DEFAULTS.ELLIPSE_WIDTH,    // Defaults first
        height: SHAPE_DEFAULTS.ELLIPSE_HEIGHT,
        ...baseShape,                           // Custom props override defaults
        type: 'ellipse',
      };

    // Removed: line case (line shapes eliminated)

    case 'text':
      return {
        ...SHAPE_CREATION_DEFAULTS.text,   // Defaults first
        ...baseShape,                      // Custom props override defaults
        type: 'text',
      } as Shape;

    default:
      throw new Error(`Unknown shape type: ${type}`);
  }
};

/**
 * Calculate max z-index from existing shapes
 * Extracted to eliminate duplication
 */
export const calculateMaxZIndex = (shapes: Record<string, Shape>): number => {
  return Math.max(0, ...Object.values(shapes).map(s => s.zIndex || 0));
};
