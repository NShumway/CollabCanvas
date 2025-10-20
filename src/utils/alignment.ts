/**
 * Alignment and Distribution Utilities
 * 
 * Implements alignment and distribution operations using Konva's built-in methods
 * for precise bounds calculation and positioning. Follows the existing sync patterns
 * and supports both manual and AI-driven operations.
 * 
 * LEVERAGE KONVA BUILT-INS:
 * - Uses node.getClientRect() for accurate bounding box calculations
 * - Uses node.absolutePosition() for precise positioning
 * - Works with center-based coordinate system
 */

import type { Shape, ShapeCollection } from '@/types/shapes';
import type { SyncEngine } from '@/services/syncEngine';
import { devLog } from '@/utils/devSettings';

// Alignment options
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

// Distribution options  
export type DistributionType = 'horizontal' | 'vertical';

// Result of alignment/distribution operations
export interface AlignmentResult {
  success: boolean;
  message: string;
  updatedShapeIds: string[];
  error?: string;
}

// Shape reference interface for Konva node operations
export interface ShapeNodeRef {
  getClientRect(): { x: number; y: number; width: number; height: number };
  absolutePosition(): { x: number; y: number };
  absolutePosition(pos: { x: number; y: number }): void;
}

/**
 * Get accurate bounds for a shape using Konva's built-in methods
 * Falls back to manual calculation if no node reference is available
 */
export const getShapeBounds = (
  shape: Shape, 
  nodeRef?: ShapeNodeRef
): { left: number; top: number; right: number; bottom: number; width: number; height: number; centerX: number; centerY: number } => {
  
  if (nodeRef) {
    // LEVERAGE KONVA BUILT-INS: Use getClientRect for precise bounds
    const rect = nodeRef.getClientRect();
    return {
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      width: rect.width,
      height: rect.height,
      centerX: rect.x + rect.width / 2,
      centerY: rect.y + rect.height / 2,
    };
  }

  // Fallback to manual calculation using stored shape properties
  const centerX = shape.x;
  const centerY = shape.y;
  
  let width: number, height: number;
  
  switch (shape.type) {
    case 'rectangle':
    case 'ellipse':
      width = shape.width;
      height = shape.height;
      break;
    case 'text':
      width = shape.width || 100;
      height = shape.height || 20;
      break;
    default:
      width = 100;
      height = 100;
  }
  
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
    width,
    height,
    centerX,
    centerY,
  };
};

/**
 * Align shapes based on the specified alignment type
 * Uses Konva's built-in methods when node references are available
 */
export const alignShapes = async (
  shapeIds: string[],
  alignment: AlignmentType,
  shapes: ShapeCollection,
  syncEngine: SyncEngine,
  nodeRefs?: Record<string, ShapeNodeRef>,
  currentUser?: { uid: string }
): Promise<AlignmentResult> => {
  
  if (shapeIds.length < 2) {
    return {
      success: false,
      message: 'At least 2 shapes must be selected for alignment',
      updatedShapeIds: [],
      error: 'Insufficient shapes for alignment'
    };
  }

  try {
    // Calculate bounds for all selected shapes
    const shapeBounds = shapeIds.map(id => {
      const shape = shapes[id];
      if (!shape) return null;
      
      const nodeRef = nodeRefs?.[id];
      return {
        id,
        shape,
        bounds: getShapeBounds(shape, nodeRef)
      };
    }).filter(Boolean) as Array<{
      id: string;
      shape: Shape;
      bounds: ReturnType<typeof getShapeBounds>;
    }>;

    if (shapeBounds.length === 0) {
      return {
        success: false,
        message: 'No valid shapes found for alignment',
        updatedShapeIds: [],
        error: 'No shapes available'
      };
    }

    // Determine reference position for alignment
    let referenceValue: number;
    
    switch (alignment) {
      case 'left':
        referenceValue = Math.min(...shapeBounds.map(sb => sb.bounds.left));
        break;
      case 'center':
        referenceValue = (Math.min(...shapeBounds.map(sb => sb.bounds.left)) + 
                         Math.max(...shapeBounds.map(sb => sb.bounds.right))) / 2;
        break;
      case 'right':
        referenceValue = Math.max(...shapeBounds.map(sb => sb.bounds.right));
        break;
      case 'top':
        referenceValue = Math.min(...shapeBounds.map(sb => sb.bounds.top));
        break;
      case 'middle':
        referenceValue = (Math.min(...shapeBounds.map(sb => sb.bounds.top)) + 
                         Math.max(...shapeBounds.map(sb => sb.bounds.bottom))) / 2;
        break;
      case 'bottom':
        referenceValue = Math.max(...shapeBounds.map(sb => sb.bounds.bottom));
        break;
      default:
        return {
          success: false,
          message: `Unknown alignment type: ${alignment}`,
          updatedShapeIds: [],
          error: 'Invalid alignment type'
        };
    }

    // Apply alignment to each shape
    const updatedShapeIds: string[] = [];
    const timestamp = Date.now();

    for (const { id, shape, bounds } of shapeBounds) {
      let newX = shape.x;
      let newY = shape.y;

      // Calculate new position based on alignment type
      switch (alignment) {
        case 'left':
          newX = referenceValue + bounds.width / 2;
          break;
        case 'center':
          newX = referenceValue;
          break;
        case 'right':
          newX = referenceValue - bounds.width / 2;
          break;
        case 'top':
          newY = referenceValue + bounds.height / 2;
          break;
        case 'middle':
          newY = referenceValue;
          break;
        case 'bottom':
          newY = referenceValue - bounds.height / 2;
          break;
      }

      // Only update if position actually changed (avoid unnecessary sync)
      if (Math.abs(newX - shape.x) > 0.1 || Math.abs(newY - shape.y) > 0.1) {
        const updates = {
          x: Math.round(newX * 10) / 10, // Round to prevent floating point issues
          y: Math.round(newY * 10) / 10,
          updatedBy: currentUser?.uid || 'alignment-tool',
          clientTimestamp: timestamp,
        };

        // Use existing sync infrastructure
        syncEngine.applyLocalChange(id, updates);
        syncEngine.queueWrite(id, { ...shape, ...updates }, true); // immediate = true for alignment

        updatedShapeIds.push(id);
      }
    }

    devLog.sync(`Aligned ${updatedShapeIds.length} shapes (${alignment})`, updatedShapeIds);

    return {
      success: true,
      message: `Aligned ${updatedShapeIds.length} shape${updatedShapeIds.length !== 1 ? 's' : ''} to ${alignment}`,
      updatedShapeIds
    };

  } catch (error: any) {
    console.warn('Error in alignShapes:', error);
    return {
      success: false,
      message: 'Failed to align shapes',
      updatedShapeIds: [],
      error: error.message
    };
  }
};

/**
 * Distribute shapes evenly in the specified direction
 * Uses Konva's built-in methods for accurate spacing calculations
 */
export const distributeShapes = async (
  shapeIds: string[],
  direction: DistributionType,
  shapes: ShapeCollection,
  syncEngine: SyncEngine,
  nodeRefs?: Record<string, ShapeNodeRef>,
  currentUser?: { uid: string }
): Promise<AlignmentResult> => {
  
  if (shapeIds.length < 3) {
    return {
      success: false,
      message: 'At least 3 shapes must be selected for distribution',
      updatedShapeIds: [],
      error: 'Insufficient shapes for distribution'
    };
  }

  // Validate direction parameter
  if (direction !== 'horizontal' && direction !== 'vertical') {
    return {
      success: false,
      message: `Invalid distribution direction. Must be 'horizontal' or 'vertical'`,
      updatedShapeIds: [],
      error: `Invalid direction: ${direction}`
    };
  }

  try {
    // Calculate bounds for all selected shapes
    const shapeBounds = shapeIds.map(id => {
      const shape = shapes[id];
      if (!shape) return null;
      
      const nodeRef = nodeRefs?.[id];
      return {
        id,
        shape,
        bounds: getShapeBounds(shape, nodeRef)
      };
    }).filter(Boolean) as Array<{
      id: string;
      shape: Shape;
      bounds: ReturnType<typeof getShapeBounds>;
    }>;

    if (shapeBounds.length < 3) {
      return {
        success: false,
        message: 'At least 3 valid shapes required for distribution',
        updatedShapeIds: [],
        error: 'Insufficient valid shapes'
      };
    }

    // Sort shapes by position in the distribution direction
    const sortedShapes = [...shapeBounds].sort((a, b) => {
      if (direction === 'horizontal') {
        return a.bounds.centerX - b.bounds.centerX;
      } else {
        return a.bounds.centerY - b.bounds.centerY;
      }
    });

    // Calculate distribution parameters
    const firstShape = sortedShapes[0];
    const lastShape = sortedShapes[sortedShapes.length - 1];
    
    if (!firstShape || !lastShape) {
      return {
        success: false,
        message: 'Unable to determine shape bounds for distribution',
        updatedShapeIds: [],
        error: 'Missing shape data'
      };
    }
    
    const startPos = direction === 'horizontal' ? firstShape.bounds.centerX : firstShape.bounds.centerY;
    const endPos = direction === 'horizontal' ? lastShape.bounds.centerX : lastShape.bounds.centerY;
    const totalDistance = endPos - startPos;
    const gap = totalDistance / (sortedShapes.length - 1);

    // Apply distribution (skip first and last shapes as they define the bounds)
    const updatedShapeIds: string[] = [];
    const timestamp = Date.now();

    for (let i = 1; i < sortedShapes.length - 1; i++) {
      const shapeData = sortedShapes[i];
      if (!shapeData) continue;
      
      const { id, shape } = shapeData;
      const targetPos = startPos + (gap * i);
      
      let newX = shape.x;
      let newY = shape.y;

      if (direction === 'horizontal') {
        newX = targetPos;
      } else {
        newY = targetPos;
      }

      // Only update if position actually changed
      if (Math.abs(newX - shape.x) > 0.1 || Math.abs(newY - shape.y) > 0.1) {
        const updates = {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          updatedBy: currentUser?.uid || 'distribution-tool',
          clientTimestamp: timestamp,
        };

        // Use existing sync infrastructure
        syncEngine.applyLocalChange(id, updates);
        syncEngine.queueWrite(id, { ...shape, ...updates }, true); // immediate = true for distribution

        updatedShapeIds.push(id);
      }
    }

    devLog.sync(`Distributed ${updatedShapeIds.length} shapes (${direction})`, updatedShapeIds);

    return {
      success: true,
      message: `Distributed ${updatedShapeIds.length} shape${updatedShapeIds.length !== 1 ? 's' : ''} ${direction}ly`,
      updatedShapeIds
    };

  } catch (error: any) {
    console.warn('Error in distributeShapes:', error);
    return {
      success: false,
      message: 'Failed to distribute shapes',
      updatedShapeIds: [],
      error: error.message
    };
  }
};

/**
 * Check if alignment/distribution operations are available based on selection
 */
export const getAlignmentAvailability = (selectedCount: number) => ({
  alignmentEnabled: selectedCount >= 2,
  distributionEnabled: selectedCount >= 3,
  alignmentMessage: selectedCount < 2 ? 'Select 2+ shapes to align' : '',
  distributionMessage: selectedCount < 3 ? 'Select 3+ shapes to distribute' : '',
});
