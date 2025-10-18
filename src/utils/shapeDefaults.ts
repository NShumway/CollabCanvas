/**
 * Shape Default Values and Constants
 * 
 * Centralized constants to prevent inconsistencies and magic numbers
 */

export const SHAPE_DEFAULTS = {
  // Universal defaults
  FILL: '#E2E8F0',
  Z_INDEX: 0,
  
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
  },
  ellipse: {
    width: SHAPE_DEFAULTS.ELLIPSE_WIDTH,
    height: SHAPE_DEFAULTS.ELLIPSE_HEIGHT,
  },
  // Removed: line defaults (line shapes eliminated)
  text: {
    text: SHAPE_DEFAULTS.TEXT_CONTENT,
    fontSize: SHAPE_DEFAULTS.TEXT_FONT_SIZE,
    fontFamily: SHAPE_DEFAULTS.TEXT_FONT_FAMILY,
    textAlign: SHAPE_DEFAULTS.TEXT_ALIGN,
    width: SHAPE_DEFAULTS.TEXT_WIDTH,
    height: SHAPE_DEFAULTS.TEXT_HEIGHT,
  },
} as const;
