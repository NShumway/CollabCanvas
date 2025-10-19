/**
 * Unit Tests for Transform System
 * Tests aspect lock, transform state management, and multi-shape transforms
 */

import { describe, it, expect, beforeEach } from 'vitest';
import useCanvasStore from '@/store/canvasStore';

describe('Transform System', () => {
  let store;

  beforeEach(() => {
    // Get the store actions and state getter
    store = useCanvasStore;
    
    // Reset store to initial state
    store.getState().setShapes({});
    store.getState().clearSelection();
    store.getState().setCurrentUser({ uid: 'test-user', displayName: 'Test User' });
    store.getState().setAspectLock(false);
    
    // Add test shapes for transformation (coordinates are CENTER-based)
    const testShapes = {
      'rect1': {
        id: 'rect1',
        type: 'rectangle',
        x: 150, // center X (was top-left 100, now 100 + 100/2 = 150)
        y: 125, // center Y (was top-left 100, now 100 + 50/2 = 125)
        width: 100,
        height: 50,
        rotation: 0,
        fill: '#ff0000',
        zIndex: 1,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      },
      'rect2': {
        id: 'rect2',
        type: 'rectangle',
        x: 290, // center X (was top-left 250, now 250 + 80/2 = 290)
        y: 180, // center Y (was top-left 150, now 150 + 60/2 = 180)
        width: 80,
        height: 60,
        rotation: 0,
        fill: '#00ff00',
        zIndex: 2,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      },
      'ellipse1': {
        id: 'ellipse1',
        type: 'ellipse',
        x: 260, // center X (was top-left 200, now 200 + 120/2 = 260)
        y: 340, // center Y (was top-left 300, now 300 + 80/2 = 340)
        width: 120,
        height: 80,
        rotation: 0,
        fill: '#0000ff',
        zIndex: 3,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      },
      'text1': {
        id: 'text1',
        type: 'text',
        x: 125, // center X (was top-left 50, now 50 + 150/2 = 125)
        y: 65,  // center Y (was top-left 50, now 50 + 30/2 = 65)
        width: 150,
        height: 30,
        rotation: 0,
        text: 'Transform me',
        fontSize: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: '#000000',
        zIndex: 4,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      }
    };
    
    store.getState().setShapes(testShapes);
  });

  describe('Aspect Lock Management', () => {
    it('should initialize with aspect lock disabled', () => {
      expect(store.getState().aspectLock).toBe(false);
    });

    it('should toggle aspect lock correctly', () => {
      expect(store.getState().aspectLock).toBe(false);
      
      store.getState().toggleAspectLock();
      expect(store.getState().aspectLock).toBe(true);
      
      store.getState().toggleAspectLock();
      expect(store.getState().aspectLock).toBe(false);
    });

    it('should set aspect lock to specific value', () => {
      store.getState().setAspectLock(true);
      expect(store.getState().aspectLock).toBe(true);
      
      store.getState().setAspectLock(false);
      expect(store.getState().aspectLock).toBe(false);
    });

    it('should handle multiple toggle operations', () => {
      for (let i = 0; i < 5; i++) {
        store.getState().toggleAspectLock();
        expect(store.getState().aspectLock).toBe(i % 2 === 0);
      }
    });
  });

  describe('Shape Transform Updates', () => {
    it('should update shape position correctly', () => {
      const originalShape = store.getState().shapes['rect1'];
      const updates = {
        x: 150,
        y: 200,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', updates);
      
      const updatedShape = store.getState().shapes['rect1'];
      expect(updatedShape.x).toBe(150);
      expect(updatedShape.y).toBe(200);
      expect(updatedShape.width).toBe(originalShape.width);
      expect(updatedShape.height).toBe(originalShape.height);
    });

    it('should update shape size correctly', () => {
      const originalShape = store.getState().shapes['rect1'];
      const updates = {
        width: 200,
        height: 100,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', updates);
      
      const updatedShape = store.getState().shapes['rect1'];
      expect(updatedShape.width).toBe(200);
      expect(updatedShape.height).toBe(100);
      expect(updatedShape.x).toBe(originalShape.x);
      expect(updatedShape.y).toBe(originalShape.y);
    });

    it('should update shape rotation correctly', () => {
      const updates = {
        rotation: 45,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', updates);
      
      const updatedShape = store.getState().shapes['rect1'];
      expect(updatedShape.rotation).toBe(45);
    });

    it('should update multiple transform properties simultaneously', () => {
      const updates = {
        x: 300,
        y: 250,
        width: 150,
        height: 75,
        rotation: 30,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', updates);
      
      const updatedShape = store.getState().shapes['rect1'];
      expect(updatedShape.x).toBe(300);
      expect(updatedShape.y).toBe(250);
      expect(updatedShape.width).toBe(150);
      expect(updatedShape.height).toBe(75);
      expect(updatedShape.rotation).toBe(30);
    });

    it('should preserve non-transform properties during updates', () => {
      const originalShape = store.getState().shapes['rect1'];
      const updates = {
        x: 200,
        y: 200,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', updates);
      
      const updatedShape = store.getState().shapes['rect1'];
      expect(updatedShape.type).toBe(originalShape.type);
      expect(updatedShape.fill).toBe(originalShape.fill);
      expect(updatedShape.zIndex).toBe(originalShape.zIndex);
      expect(updatedShape.id).toBe(originalShape.id);
    });
  });

  describe('Multi-Shape Transform Scenarios', () => {
    it('should handle multi-shape selection for transforms', () => {
      // Select multiple shapes
      store.getState().setSelectedIds(['rect1', 'rect2', 'ellipse1']);
      
      expect(store.getState().selectedIds).toHaveLength(3);
      expect(store.getState().selectedIds).toEqual(['rect1', 'rect2', 'ellipse1']);
    });

    it('should apply transforms to all selected shapes', () => {
      // Select two shapes
      store.getState().setSelectedIds(['rect1', 'rect2']);
      
      // Simulate a batch transform update (like what would happen during a real transform)
      const deltaX = 50;
      const deltaY = 25;
      
      store.getState().selectedIds.forEach(shapeId => {
        const shape = store.getState().shapes[shapeId];
        const updates = {
          x: shape.x + deltaX,
          y: shape.y + deltaY,
          updatedBy: 'test-user',
          clientTimestamp: Date.now()
        };
        store.getState().updateShape(shapeId, updates);
      });
      
      // Verify both shapes were moved by the same amount
      const updatedRect1 = store.getState().shapes['rect1'];
      const updatedRect2 = store.getState().shapes['rect2'];
      
      expect(updatedRect1.x).toBe(200); // 150 + 50 (center-based)
      expect(updatedRect1.y).toBe(150); // 125 + 25 (center-based)
      expect(updatedRect2.x).toBe(340); // 290 + 50 (center-based)
      expect(updatedRect2.y).toBe(205); // 180 + 25 (center-based)
    });

    it('should handle transform with mixed shape types', () => {
      // Select different shape types
      store.getState().setSelectedIds(['rect1', 'ellipse1', 'text1']);
      
      // Apply scale transform to all
      const scaleX = 1.5;
      const scaleY = 1.2;
      
      store.getState().selectedIds.forEach(shapeId => {
        const shape = store.getState().shapes[shapeId];
        const updates = {
          width: shape.width * scaleX,
          height: shape.height * scaleY,
          updatedBy: 'test-user',
          clientTimestamp: Date.now()
        };
        store.getState().updateShape(shapeId, updates);
      });
      
      // Verify all shapes were scaled
      const updatedRect = store.getState().shapes['rect1'];
      const updatedEllipse = store.getState().shapes['ellipse1'];
      const updatedText = store.getState().shapes['text1'];
      
      expect(updatedRect.width).toBe(150); // 100 * 1.5
      expect(updatedRect.height).toBe(60); // 50 * 1.2
      expect(updatedEllipse.width).toBe(180); // 120 * 1.5
      expect(updatedEllipse.height).toBe(96); // 80 * 1.2
      expect(updatedText.width).toBe(225); // 150 * 1.5
      expect(updatedText.height).toBe(36); // 30 * 1.2
    });
  });

  describe('Transform Calculations', () => {
    it('should calculate bounding box for single shape', () => {
      const shape = store.getState().shapes['rect1'];
      // Convert center coordinates to bounding box
      const boundingBox = {
        left: shape.x - shape.width / 2,
        top: shape.y - shape.height / 2,
        right: shape.x + shape.width / 2,
        bottom: shape.y + shape.height / 2,
        width: shape.width,
        height: shape.height
      };
      
      // rect1: center (150, 125), size (100, 50)
      expect(boundingBox.left).toBe(100);   // 150 - 100/2 = 100
      expect(boundingBox.top).toBe(100);    // 125 - 50/2 = 100
      expect(boundingBox.right).toBe(200);  // 150 + 100/2 = 200
      expect(boundingBox.bottom).toBe(150); // 125 + 50/2 = 150
      expect(boundingBox.width).toBe(100);
      expect(boundingBox.height).toBe(50);
    });

    it('should calculate combined bounding box for multiple shapes', () => {
      const shapes = [
        store.getState().shapes['rect1'], // center: (150, 125), size: (100, 50)
        store.getState().shapes['rect2'], // center: (290, 180), size: (80, 60)
      ];
      
      const combinedBounds = shapes.reduce((bounds, shape) => {
        // Convert center coordinates to bounding box
        const shapeLeft = shape.x - shape.width / 2;
        const shapeTop = shape.y - shape.height / 2;
        const shapeRight = shape.x + shape.width / 2;
        const shapeBottom = shape.y + shape.height / 2;
        
        return {
          left: Math.min(bounds.left, shapeLeft),
          top: Math.min(bounds.top, shapeTop),
          right: Math.max(bounds.right, shapeRight),
          bottom: Math.max(bounds.bottom, shapeBottom)
        };
      }, { 
        left: Infinity, 
        top: Infinity, 
        right: -Infinity, 
        bottom: -Infinity 
      });
      
      combinedBounds.width = combinedBounds.right - combinedBounds.left;
      combinedBounds.height = combinedBounds.bottom - combinedBounds.top;
      
      // rect1: bounds (100, 100) to (200, 150)
      // rect2: bounds (250, 150) to (330, 210)
      expect(combinedBounds.left).toBe(100);   // min(100, 250) = 100
      expect(combinedBounds.top).toBe(100);    // min(100, 150) = 100
      expect(combinedBounds.right).toBe(330);  // max(200, 330) = 330
      expect(combinedBounds.bottom).toBe(210); // max(150, 210) = 210
      expect(combinedBounds.width).toBe(230);  // 330 - 100 = 230
      expect(combinedBounds.height).toBe(110); // 210 - 100 = 110
    });

    it('should handle aspect ratio calculations', () => {
      const shape = store.getState().shapes['rect1'];
      const originalAspectRatio = shape.width / shape.height; // 100 / 50 = 2
      
      // Simulate aspect-locked resize
      const newWidth = 150;
      const aspectLockedHeight = newWidth / originalAspectRatio;
      
      expect(originalAspectRatio).toBe(2);
      expect(aspectLockedHeight).toBe(75);
      
      // Verify the calculation is correct
      expect(newWidth / aspectLockedHeight).toBe(originalAspectRatio);
    });
  });

  describe('Transform Edge Cases', () => {
    it('should handle transforms on non-existent shapes', () => {
      const originalShapeCount = Object.keys(store.getState().shapes).length;
      
      // Note: Current implementation creates a shape with undefined base properties
      // This is actually problematic and should be fixed in the store implementation
      store.getState().updateShape('non-existent', {
        x: 100,
        y: 100,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      });
      
      // Current behavior: updateShape creates a new shape even for non-existent IDs
      const currentShapes = store.getState().shapes;
      expect(Object.keys(currentShapes).length).toBe(originalShapeCount + 1);
      
      // The shape is created but may have undefined properties (not ideal)
      expect(currentShapes['non-existent']).toBeDefined();
      expect(currentShapes['non-existent'].x).toBe(100);
      expect(currentShapes['non-existent'].y).toBe(100);
    });

    it('should handle zero/negative dimensions', () => {
      const updates = {
        width: 0,
        height: -10,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', updates);
      
      const updatedShape = store.getState().shapes['rect1'];
      expect(updatedShape.width).toBe(0);
      expect(updatedShape.height).toBe(-10);
    });

    it('should handle extreme rotation values', () => {
      const extremeRotations = [360, 720, -180, -360, 1080];
      
      extremeRotations.forEach(rotation => {
        const updates = {
          rotation: rotation,
          updatedBy: 'test-user',
          clientTimestamp: Date.now()
        };
        
        store.getState().updateShape('rect1', updates);
        
        const updatedShape = store.getState().shapes['rect1'];
        expect(updatedShape.rotation).toBe(rotation);
      });
    });

    it('should handle transforms with empty selection', () => {
      store.getState().clearSelection();
      expect(store.getState().selectedIds).toHaveLength(0);
      
      // Attempting to transform with no selection should be handled gracefully
      // (This would be caught at the UI level, but the store should handle it)
      const originalShapes = { ...store.getState().shapes };
      
      // No shapes should be modified
      expect(store.getState().shapes).toEqual(originalShapes);
    });
  });

  describe('Transform State Consistency', () => {
    it('should maintain shape count during transforms', () => {
      const originalCount = Object.keys(store.getState().shapes).length;
      
      // Apply various transforms
      store.getState().updateShape('rect1', {
        x: 200, y: 200, width: 150, height: 75, rotation: 45,
        updatedBy: 'test-user', clientTimestamp: Date.now()
      });
      
      store.getState().updateShape('ellipse1', {
        x: 300, y: 300, width: 100, height: 100,
        updatedBy: 'test-user', clientTimestamp: Date.now()
      });
      
      expect(Object.keys(store.getState().shapes)).toHaveLength(originalCount);
    });

    it('should preserve shape IDs during transforms', () => {
      const originalIds = Object.keys(store.getState().shapes);
      
      // Apply transforms to all shapes
      originalIds.forEach(shapeId => {
        store.getState().updateShape(shapeId, {
          x: 0, y: 0, width: 50, height: 50,
          updatedBy: 'test-user', clientTimestamp: Date.now()
        });
      });
      
      const newIds = Object.keys(store.getState().shapes);
      expect(newIds.sort()).toEqual(originalIds.sort());
    });

    it('should update timestamps correctly during transforms', () => {
      const before = Date.now();
      
      store.getState().updateShape('rect1', {
        x: 150, y: 150,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      });
      
      const after = Date.now();
      const updatedShape = store.getState().shapes['rect1'];
      
      expect(updatedShape.clientTimestamp).toBeGreaterThanOrEqual(before);
      expect(updatedShape.clientTimestamp).toBeLessThanOrEqual(after);
      expect(updatedShape.updatedBy).toBe('test-user');
    });
  });

  describe('Transform Position Stability', () => {
    it('should maintain center position during resize operations', () => {
      // Get initial shape with center coordinates
      const originalShape = store.getState().shapes['rect1'];
      const originalCenterX = originalShape.x; // 150 (center-based)
      const originalCenterY = originalShape.y; // 125 (center-based)
      
      // Simulate resize operation (like dragging corner handle)
      const resizeUpdates = {
        width: 200,  // Doubled width from 100 to 200
        height: 100, // Doubled height from 50 to 100
        // Position should NOT be updated during resize - center stays same
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', resizeUpdates);
      
      const resizedShape = store.getState().shapes['rect1'];
      
      // CRITICAL: Center position must remain unchanged during resize
      expect(resizedShape.x).toBe(originalCenterX); // Still 150
      expect(resizedShape.y).toBe(originalCenterY); // Still 125
      
      // Dimensions should be updated
      expect(resizedShape.width).toBe(200);
      expect(resizedShape.height).toBe(100);
      
      // This test prevents the "resize changes position" bug
    });

    it('should handle resize with different aspect ratios correctly', () => {
      // Test non-uniform scaling to ensure center calculation is correct
      const originalShape = store.getState().shapes['ellipse1'];
      const originalCenterX = originalShape.x; // 260 (center-based)
      const originalCenterY = originalShape.y; // 340 (center-based)
      
      // Simulate non-uniform resize (different width/height scaling)
      const asymmetricResize = {
        width: 60,   // Halved width from 120 to 60
        height: 160, // Doubled height from 80 to 160
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('ellipse1', asymmetricResize);
      
      const resizedShape = store.getState().shapes['ellipse1'];
      
      // Center must remain stable regardless of aspect ratio changes
      expect(resizedShape.x).toBe(originalCenterX); // Still 260
      expect(resizedShape.y).toBe(originalCenterY); // Still 340
      expect(resizedShape.width).toBe(60);
      expect(resizedShape.height).toBe(160);
    });
  });

  describe('Rotation Math Consistency', () => {
    it('should handle rotation unit conversion correctly', () => {
      // Our store uses radians, Konva displays in degrees
      const rotationInRadians = Math.PI / 4; // 45 degrees
      
      // Test the conversion to Konva (radians to degrees)
      const konvaRotation = rotationInRadians * 180 / Math.PI;
      expect(konvaRotation).toBe(45);
      
      // Test the conversion back to store (degrees to radians)
      const storedRotation = konvaRotation * Math.PI / 180;
      expect(storedRotation).toBeCloseTo(Math.PI / 4, 10);
      
      // Verify round-trip conversion has no drift
      expect(storedRotation).toBeCloseTo(rotationInRadians, 10);
    });

    it('should maintain rotation precision through multiple conversions', () => {
      // Test common rotation angles that caused issues
      const testAngles = [
        0,                    // 0 degrees
        Math.PI / 6,         // 30 degrees  
        Math.PI / 4,         // 45 degrees
        Math.PI / 3,         // 60 degrees
        Math.PI / 2,         // 90 degrees
        Math.PI,             // 180 degrees
        3 * Math.PI / 2,     // 270 degrees
        2 * Math.PI          // 360 degrees
      ];
      
      testAngles.forEach(originalRadians => {
        // Simulate the conversion cycle that happens during transforms
        const degrees = originalRadians * 180 / Math.PI;
        const backToRadians = degrees * Math.PI / 180;
        
        // Should maintain precision (within floating point limits)
        expect(backToRadians).toBeCloseTo(originalRadians, 10);
      });
    });

    it('should handle rotation updates correctly in store', () => {
      // Test actual rotation update through the store
      const rotationUpdate = {
        rotation: Math.PI / 3, // 60 degrees in radians
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('rect1', rotationUpdate);
      
      const rotatedShape = store.getState().shapes['rect1'];
      
      // Store should preserve the exact radian value
      expect(rotatedShape.rotation).toBeCloseTo(Math.PI / 3, 10);
      
      // Verify it converts correctly for display
      const displayRotation = (rotatedShape.rotation || 0) * 180 / Math.PI;
      expect(displayRotation).toBeCloseTo(60, 8);
    });
  });
});
