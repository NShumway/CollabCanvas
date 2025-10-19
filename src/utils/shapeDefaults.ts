/**
 * Shape Default Values and Constants
 * 
 * Centralized constants to prevent inconsistencies and magic numbers
 * 
 * COORDINATE SYSTEM: All shape coordinates (x, y) represent the CENTER of the shape.
 * This aligns with Konva's rotation/scaling behavior and provides intuitive UX.
 */

export const SHAPE_DEFAULTS = {
  // Universal defaults
  FILL: '#E2E8F0',
  Z_INDEX: 0,
  ROTATION: 0, // Default rotation in radians
  
  // Rectangle defaults
  RECTANGLE_WIDTH: 100,
  RECTANGLE_HEIGHT: 100,
  
  // Ellipse defaults  
  ELLIPSE_WIDTH: 100,
  ELLIPSE_HEIGHT: 100,
  
  // Removed: line defaults (line shapes eliminated)
  
  // Text defaults
  TEXT_CONTENT: 'Text',
  TEXT_FONT_SIZE: 18, // ✅ Single source of truth
  TEXT_FONT_FAMILY: 'Arial',
  TEXT_ALIGN: 'left' as const,
  TEXT_WIDTH: 100,
  TEXT_HEIGHT: 22,
  
  // Selection and interaction
  SELECTION_STROKE_WIDTH: 2,
  SELECTION_COLOR: '#3B82F6',
  HIT_TOLERANCE: 5,
} as const;

export const SHAPE_CREATION_DEFAULTS = {
  rectangle: {
    width: SHAPE_DEFAULTS.RECTANGLE_WIDTH,
    height: SHAPE_DEFAULTS.RECTANGLE_HEIGHT,
    rotation: SHAPE_DEFAULTS.ROTATION,
  },
  ellipse: {
    width: SHAPE_DEFAULTS.ELLIPSE_WIDTH,
    height: SHAPE_DEFAULTS.ELLIPSE_HEIGHT,
    rotation: SHAPE_DEFAULTS.ROTATION,
  },
  // Removed: line defaults (line shapes eliminated)
  text: {
    text: SHAPE_DEFAULTS.TEXT_CONTENT,
    fontSize: SHAPE_DEFAULTS.TEXT_FONT_SIZE,
    fontFamily: SHAPE_DEFAULTS.TEXT_FONT_FAMILY,
    textAlign: SHAPE_DEFAULTS.TEXT_ALIGN,
    width: SHAPE_DEFAULTS.TEXT_WIDTH,
    height: SHAPE_DEFAULTS.TEXT_HEIGHT,
    rotation: SHAPE_DEFAULTS.ROTATION,
  },
} as const;

/**
 * Coordinate System Conversion Utilities
 * 
 * Helper functions for converting between center-based and top-left coordinate systems.
 * Useful for legacy compatibility, boundary calculations, and debugging.
 */

/**
 * Convert center coordinates to top-left coordinates
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param width - Shape width
 * @param height - Shape height
 * @returns Object with top-left coordinates
 */
export const centerToTopLeft = (centerX: number, centerY: number, width: number, height: number) => ({
  x: centerX - width / 2,
  y: centerY - height / 2
});

/**
 * Convert top-left coordinates to center coordinates
 * @param x - Top-left X coordinate
 * @param y - Top-left Y coordinate
 * @param width - Shape width
 * @param height - Shape height
 * @returns Object with center coordinates
 */
export const topLeftToCenter = (x: number, y: number, width: number, height: number) => ({
  x: x + width / 2,
  y: y + height / 2
});

/**
 * Get bounding box from center coordinates (for selection, collision detection)
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param width - Shape width
 * @param height - Shape height
 * @returns Object with left, right, top, bottom bounds
 */
export const getCenterBounds = (centerX: number, centerY: number, width: number, height: number) => ({
  left: centerX - width / 2,
  right: centerX + width / 2,
  top: centerY - height / 2,
  bottom: centerY + height / 2
});
