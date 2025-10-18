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
  
  // Circle defaults  
  CIRCLE_RADIUS: 50,
  
  // Line defaults
  LINE_LENGTH: 100,
  LINE_STROKE_WIDTH: 2,
  LINE_CAP: 'round' as const,
  
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
  circle: {
    radius: SHAPE_DEFAULTS.CIRCLE_RADIUS,
  },
  line: {
    points: [0, 0, SHAPE_DEFAULTS.LINE_LENGTH, 0], // Horizontal line
    strokeWidth: SHAPE_DEFAULTS.LINE_STROKE_WIDTH,
    lineCap: SHAPE_DEFAULTS.LINE_CAP,
  },
  text: {
    text: SHAPE_DEFAULTS.TEXT_CONTENT,
    fontSize: SHAPE_DEFAULTS.TEXT_FONT_SIZE,
    fontFamily: SHAPE_DEFAULTS.TEXT_FONT_FAMILY,
    textAlign: SHAPE_DEFAULTS.TEXT_ALIGN,
    width: SHAPE_DEFAULTS.TEXT_WIDTH,
    height: SHAPE_DEFAULTS.TEXT_HEIGHT,
  },
} as const;
