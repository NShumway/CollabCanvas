/**
 * Shape Type Definitions
 * 
 * Comprehensive type system for all shape types supported in CollabCanvas.
 * Ensures type safety across creation, manipulation, and synchronization.
 */

import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

// Base properties common to all shapes
export interface BaseShapeProperties {
  readonly id: string;
  x: number; // Center X coordinate
  y: number; // Center Y coordinate
  fill: string;
  zIndex: number;
  rotation?: number; // Rotation angle in radians (optional, defaults to 0)
  
  // Metadata for collaboration and sync
  readonly createdBy: string;
  updatedAt: number;
  updatedBy: string;
  
  // Client-side timestamp for conflict resolution
  clientTimestamp?: number;
}

// Shape type discriminator
export type ShapeType = 'rectangle' | 'ellipse' | 'text';

// Rectangle-specific properties
export interface RectangleProperties extends BaseShapeProperties {
  readonly type: 'rectangle';
  width: number;
  height: number;
}

// Ellipse-specific properties (uses unified bounding box)
export interface EllipseProperties extends BaseShapeProperties {
  readonly type: 'ellipse';
  width: number;
  height: number;
}

// Removed: Line shapes eliminated for architectural simplicity

// Text-specific properties
export interface TextProperties extends BaseShapeProperties {
  readonly type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  width?: number; // For text wrapping
  height?: number; // For text containers
  
  // Text formatting
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

// Union type for all possible shapes
export type Shape = RectangleProperties | EllipseProperties | TextProperties;

// Shape collection type (used in store)
export type ShapeCollection = Record<string, Shape>;

// Partial shape updates (for modifications)
export type ShapeUpdate = Partial<Omit<Shape, 'id' | 'type' | 'createdBy'>>;

// Shape creation data (before ID assignment) - now includes clientTimestamp
export type ShapeCreationData = Omit<Shape, 'id' | 'updatedAt' | 'createdBy' | 'updatedBy'> & {
  clientTimestamp: number; // Required for new shapes
};

// Viewport state
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Selection state
export interface SelectionState {
  selectedIds: readonly string[];
  selectedIdsSet: ReadonlySet<string>;
}

// Create mode types
export type CreateMode = ShapeType | null;

// Drag state for multi-shape operations
export interface DragState {
  startPos: { x: number; y: number } | null;
  draggedShapes: readonly string[];
  initialPositions: Record<string, { x: number; y: number }>;
}

// Selection rectangle for drag-to-select
export interface SelectionRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Z-index operations
export type ZIndexOperation = 'toFront' | 'toBack' | 'forward' | 'backward';

// Shape validation helpers
export const isValidShapeType = (type: unknown): type is ShapeType => {
  return typeof type === 'string' && ['rectangle', 'ellipse', 'text'].includes(type);
};

export const isShape = (obj: unknown): obj is Shape => {
  if (!obj || typeof obj !== 'object') return false;
  const shape = obj as Record<string, unknown>;
  
  return (
    typeof shape['id'] === 'string' &&
    typeof shape['x'] === 'number' &&
    typeof shape['y'] === 'number' &&
    typeof shape['fill'] === 'string' &&
    typeof shape['zIndex'] === 'number' &&
    isValidShapeType(shape['type'])
  );
};

// Type guards for specific shapes
export const isRectangle = (shape: Shape): shape is RectangleProperties => {
  return shape.type === 'rectangle';
};

export const isEllipse = (shape: Shape): shape is EllipseProperties => {
  return shape.type === 'ellipse';
};

// Removed: isLine type guard (line shapes eliminated)

export const isText = (shape: Shape): shape is TextProperties => {
  return shape.type === 'text';
};

// Shape bounds calculation (used for selection and collision detection)
export interface ShapeBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export const getShapeBounds = (shape: Shape): ShapeBounds => {
  switch (shape.type) {
    case 'rectangle': {
      // Shape coordinates are center-based
      const centerX = shape.x ?? 0;
      const centerY = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.RECTANGLE_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.RECTANGLE_HEIGHT;
      return {
        left: centerX - width / 2,
        top: centerY - height / 2,
        right: centerX + width / 2,
        bottom: centerY + height / 2,
        width,
        height,
      };
    }
    case 'ellipse': {
      // Shape coordinates are center-based
      const centerX = shape.x ?? 0;
      const centerY = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.ELLIPSE_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.ELLIPSE_HEIGHT;
      return {
        left: centerX - width / 2,
        top: centerY - height / 2,
        right: centerX + width / 2,
        bottom: centerY + height / 2,
        width,
        height,
      };
    }
    case 'text': {
      // Shape coordinates are center-based
      const centerX = shape.x ?? 0;
      const centerY = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.TEXT_WIDTH;
      const fontSize = shape.fontSize ?? SHAPE_DEFAULTS.TEXT_FONT_SIZE;
      const height = shape.height ?? fontSize * 1.2; // Approximate height based on font size
      return {
        left: centerX - width / 2,
        top: centerY - height / 2,
        right: centerX + width / 2,
        bottom: centerY + height / 2,
        width,
        height,
      };
    }
    // Removed: line case (line shapes eliminated)
  }
};
