/**
 * Shape Creation Utilities
 * 
 * DRY solution for shape creation to eliminate code duplication
 */

import type { Shape, ShapeType } from '@/types';
import { SHAPE_DEFAULTS, SHAPE_CREATION_DEFAULTS } from './shapeDefaults';

interface CreateShapeOptions {
  type: ShapeType;
  x: number;
  y: number;
  userId: string;
  maxZIndex: number;
}

/**
 * Create a new shape with consistent defaults and metadata
 * Eliminates the massive code duplication in Canvas.jsx
 */
export const createShape = ({ type, x, y, userId, maxZIndex }: CreateShapeOptions): Shape => {
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
  };

  switch (type) {
    case 'rectangle':
      return {
        ...baseShape,
        type: 'rectangle',
        ...SHAPE_CREATION_DEFAULTS.rectangle,
      } as Shape;

    case 'ellipse':
      return {
        ...baseShape,
        type: 'ellipse',
        width: SHAPE_DEFAULTS.ELLIPSE_WIDTH,
        height: SHAPE_DEFAULTS.ELLIPSE_HEIGHT,
      };

    // Removed: line case (line shapes eliminated)

    case 'text':
      return {
        ...baseShape,
        type: 'text',
        ...SHAPE_CREATION_DEFAULTS.text,
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
