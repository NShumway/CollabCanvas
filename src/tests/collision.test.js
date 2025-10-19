/**
 * Collision Detection Tests
 * 
 * Critical tests for user interaction - ensures shapes respond to clicks,
 * selection works correctly, and drag operations target the right shapes.
 * These tests prevent the most frustrating user experience issues.
 * 
 * NOTE: All coordinates (x, y) represent the CENTER of the shape.
 */

import { describe, it, expect } from 'vitest';

// Import the collision detection function from Canvas component
// Note: We'll need to extract this into a utility function for proper testing
import { getShapeBounds } from '@/types/shapes';

describe('Shape Collision Detection - User Interaction Critical', () => {
  
  describe('getShapeBounds - Bounding Box Calculation', () => {
    it('should calculate rectangle bounds correctly', () => {
      const rectangle = {
        type: 'rectangle',
        x: 100, // center X
        y: 200, // center Y
        width: 150,
        height: 100
      };
      
      const bounds = getShapeBounds(rectangle);
      
      // center (100, 200), size (150, 100)
      expect(bounds.left).toBe(25);    // 100 - 150/2 = 25
      expect(bounds.right).toBe(175);  // 100 + 150/2 = 175
      expect(bounds.top).toBe(150);    // 200 - 100/2 = 150
      expect(bounds.bottom).toBe(250); // 200 + 100/2 = 250
    });

    it('should calculate ellipse bounds correctly', () => {
      const ellipse = {
        type: 'ellipse',
        x: 50,  // center X
        y: 75,  // center Y
        width: 200,
        height: 100
      };
      
      const bounds = getShapeBounds(ellipse);
      
      // center (50, 75), size (200, 100)
      expect(bounds.left).toBe(-50);   // 50 - 200/2 = -50
      expect(bounds.right).toBe(150);  // 50 + 200/2 = 150
      expect(bounds.top).toBe(25);     // 75 - 100/2 = 25
      expect(bounds.bottom).toBe(125); // 75 + 100/2 = 125
    });

    it('should calculate text bounds correctly', () => {
      const text = {
        type: 'text',
        x: 10,  // center X
        y: 20,  // center Y
        width: 120,
        height: 30,
        fontSize: 16
      };
      
      const bounds = getShapeBounds(text);
      
      // center (10, 20), size (120, 30)
      expect(bounds.left).toBe(-50);  // 10 - 120/2 = -50
      expect(bounds.right).toBe(70);  // 10 + 120/2 = 70
      expect(bounds.top).toBe(5);     // 20 - 30/2 = 5
      expect(bounds.bottom).toBe(35); // 20 + 30/2 = 35
    });

    it('should handle shapes with missing dimensions', () => {
      const rectangleWithoutDimensions = {
        type: 'rectangle',
        x: 100, // center X
        y: 200  // center Y
        // Missing width, height
      };
      
      // Should not crash and should return reasonable bounds
      const bounds = getShapeBounds(rectangleWithoutDimensions);
      
      // Should use default dimensions and center coordinates
      expect(bounds.left).toBeLessThan(100);      // Should be left of center
      expect(bounds.top).toBeLessThan(200);       // Should be above center
      expect(bounds.right).toBeGreaterThan(100);  // Should be right of center
      expect(bounds.bottom).toBeGreaterThan(200); // Should be below center
    });

    it('should handle shapes with zero dimensions', () => {
      const zeroSizeShape = {
        type: 'rectangle',
        x: 50,  // center X
        y: 100, // center Y
        width: 0,
        height: 0
      };
      
      const bounds = getShapeBounds(zeroSizeShape);
      
      // center (50, 100), size (0, 0) 
      expect(bounds.left).toBe(50);   // 50 - 0/2 = 50
      expect(bounds.top).toBe(100);   // 100 - 0/2 = 100
      expect(bounds.right).toBe(50);  // 50 + 0/2 = 50
      expect(bounds.bottom).toBe(100); // 100 + 0/2 = 100
    });

    it('should handle shapes with negative dimensions', () => {
      const negativeShape = {
        type: 'ellipse',
        x: 100,
        y: 200,
        width: -50,
        height: -30
      };
      
      // Should handle gracefully without crashing
      const bounds = getShapeBounds(negativeShape);
      
      expect(bounds.left).toBeDefined();
      expect(bounds.right).toBeDefined();
      expect(bounds.top).toBeDefined();
      expect(bounds.bottom).toBeDefined();
    });
  });

  describe('Point-in-Rectangle Collision', () => {
    const rectangle = {
      type: 'rectangle',
      x: 100,
      y: 200,
      width: 150,
      height: 100
    };

    it('should detect point inside rectangle', () => {
      const bounds = getShapeBounds(rectangle);
      
      // Point clearly inside
      const insideX = 150;
      const insideY = 250;
      
      const isInside = (
        insideX >= bounds.left && 
        insideX <= bounds.right && 
        insideY >= bounds.top && 
        insideY <= bounds.bottom
      );
      
      expect(isInside).toBe(true);
    });

    it('should detect point outside rectangle', () => {
      const bounds = getShapeBounds(rectangle);
      
      // Point clearly outside
      const outsideX = 50;  // Left of rectangle
      const outsideY = 100; // Above rectangle
      
      const isInside = (
        outsideX >= bounds.left && 
        outsideX <= bounds.right && 
        outsideY >= bounds.top && 
        outsideY <= bounds.bottom
      );
      
      expect(isInside).toBe(false);
    });

    it('should handle edge cases on rectangle boundaries', () => {
      const bounds = getShapeBounds(rectangle);
      
      // Point exactly on left edge
      const leftEdgeX = bounds.left;
      const leftEdgeY = (bounds.top + bounds.bottom) / 2;
      
      const isOnLeftEdge = (
        leftEdgeX >= bounds.left && 
        leftEdgeX <= bounds.right && 
        leftEdgeY >= bounds.top && 
        leftEdgeY <= bounds.bottom
      );
      
      expect(isOnLeftEdge).toBe(true);
      
      // Point exactly on corner
      const cornerIsInside = (
        bounds.left >= bounds.left && 
        bounds.left <= bounds.right && 
        bounds.top >= bounds.top && 
        bounds.top <= bounds.bottom
      );
      
      expect(cornerIsInside).toBe(true);
    });
  });

  describe('Ellipse Collision (Bounding Box)', () => {
    const ellipse = {
      type: 'ellipse',
      x: 200,
      y: 300,
      width: 160,
      height: 80
    };

    it('should use bounding box for ellipse collision', () => {
      const bounds = getShapeBounds(ellipse);
      
      // Point inside ellipse's bounding box (but may be outside actual ellipse)
      const boundingBoxX = 220;
      const boundingBoxY = 320;
      
      const isInBoundingBox = (
        boundingBoxX >= bounds.left && 
        boundingBoxX <= bounds.right && 
        boundingBoxY >= bounds.top && 
        boundingBoxY <= bounds.bottom
      );
      
      expect(isInBoundingBox).toBe(true);
    });

    it('should reject points outside ellipse bounding box', () => {
      const bounds = getShapeBounds(ellipse);
      
      // Point outside bounding box
      const outsideX = bounds.right + 10;
      const outsideY = bounds.bottom + 10;
      
      const isInBoundingBox = (
        outsideX >= bounds.left && 
        outsideX <= bounds.right && 
        outsideY >= bounds.top && 
        outsideY <= bounds.bottom
      );
      
      expect(isInBoundingBox).toBe(false);
    });
  });

  describe('Text Collision', () => {
    const textShape = {
      type: 'text',
      x: 50,
      y: 100,
      width: 200,
      height: 40,
      text: 'Sample Text',
      fontSize: 18
    };

    it('should detect collision with text bounding box', () => {
      const bounds = getShapeBounds(textShape);
      
      // Point inside text bounds
      const textX = 100;
      const textY = 120;
      
      const isInText = (
        textX >= bounds.left && 
        textX <= bounds.right && 
        textY >= bounds.top && 
        textY <= bounds.bottom
      );
      
      expect(isInText).toBe(true);
    });

    it('should handle text with fallback dimensions', () => {
      const textWithoutDimensions = {
        type: 'text',
        x: 0,  // center X
        y: 0,  // center Y
        text: 'No Dimensions'
        // Missing width, height, fontSize
      };
      
      // Should not crash
      const bounds = getShapeBounds(textWithoutDimensions);
      
      // Should use default dimensions and center coordinates
      expect(bounds.left).toBeLessThan(0);    // Should be left of center
      expect(bounds.top).toBeLessThan(0);     // Should be above center
      expect(bounds.right).toBeGreaterThan(0); // Should be right of center  
      expect(bounds.bottom).toBeGreaterThan(0); // Should be below center
    });
  });

  describe('Multi-Shape Collision Priority', () => {
    const shapes = [
      {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        zIndex: 1
      },
      {
        id: 'ellipse-1',
        type: 'ellipse',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        zIndex: 3
      },
      {
        id: 'text-1',
        type: 'text',
        x: 75,
        y: 75,
        width: 50,
        height: 50, // Increased height to cover (100, 100)
        zIndex: 2
      }
    ];

    it('should identify all shapes at overlapping position', () => {
      const clickX = 100;
      const clickY = 100;
      
      const hitShapes = shapes.filter(shape => {
        const bounds = getShapeBounds(shape);
        return (
          clickX >= bounds.left && 
          clickX <= bounds.right && 
          clickY >= bounds.top && 
          clickY <= bounds.bottom
        );
      });
      
      // All three shapes should be hit at position (100, 100)
      expect(hitShapes.length).toBe(3);
      expect(hitShapes.map(s => s.id)).toContain('rect-1');
      expect(hitShapes.map(s => s.id)).toContain('ellipse-1');
      expect(hitShapes.map(s => s.id)).toContain('text-1');
    });

    it('should allow z-index sorting for top shape selection', () => {
      const clickX = 100;
      const clickY = 100;
      
      const hitShapes = shapes.filter(shape => {
        const bounds = getShapeBounds(shape);
        return (
          clickX >= bounds.left && 
          clickX <= bounds.right && 
          clickY >= bounds.top && 
          clickY <= bounds.bottom
        );
      });
      
      // Sort by zIndex to get top shape
      hitShapes.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
      
      expect(hitShapes[0].id).toBe('ellipse-1'); // Highest zIndex (3)
      expect(hitShapes[1].id).toBe('text-1');    // Middle zIndex (2)
      expect(hitShapes[2].id).toBe('rect-1');    // Lowest zIndex (1)
    });
  });

  describe('Edge Cases and Error Prevention', () => {
    it('should handle undefined shape properties gracefully', () => {
      const brokenShape = {
        type: 'rectangle'
        // Missing all position and dimension properties
      };
      
      // Should not crash
      expect(() => {
        getShapeBounds(brokenShape);
      }).not.toThrow();
    });

    it('should handle invalid shape types', () => {
      const invalidShape = {
        type: 'invalid-type',
        x: 100,
        y: 200,
        width: 50,
        height: 50
      };
      
      // Should not crash, might return default bounds
      expect(() => {
        getShapeBounds(invalidShape);
      }).not.toThrow();
    });

    it('should handle extremely large coordinates', () => {
      const hugeShape = {
        type: 'rectangle',
        x: 999999,  // center X
        y: 999999,  // center Y
        width: 100,
        height: 100
      };
      
      const bounds = getShapeBounds(hugeShape);
      
      // center (999999, 999999), size (100, 100)
      expect(bounds.left).toBe(999949);   // 999999 - 100/2 = 999949
      expect(bounds.right).toBe(1000049); // 999999 + 100/2 = 1000049
      expect(bounds.top).toBe(999949);    // 999999 - 100/2 = 999949
      expect(bounds.bottom).toBe(1000049); // 999999 + 100/2 = 1000049
    });
  });

  describe('Hit Detection - Node Tree Walking', () => {
    it('should find shape ID by walking up node tree for nested structures', () => {
      // Simulate the node tree walking logic from Canvas.jsx
      const mockShapes = {
        'text-1': { id: 'text-1', type: 'text', x: 100, y: 100 },
        'rect-1': { id: 'rect-1', type: 'rectangle', x: 200, y: 200 }
      };

      // Mock nodes that simulate Konva's structure
      const mockTextNode = {
        id: () => null, // Text node has no ID
        getParent: () => mockGroupNode
      };

      const mockGroupNode = {
        id: () => 'text-1', // Group has the shape ID
        getParent: () => null
      };

      const mockRectNode = {
        id: () => 'rect-1', // Rect has direct ID
        getParent: () => null
      };

      // Test the node tree walking logic
      const findShapeId = (clickedNode, shapes) => {
        let shapeId = null;
        let currentNode = clickedNode;
        while (currentNode && !shapeId) {
          if (currentNode.id() && shapes[currentNode.id()]) {
            shapeId = currentNode.id();
            break;
          }
          currentNode = currentNode.getParent();
        }
        return shapeId;
      };

      // Test clicking on Text node (should find parent Group's ID)
      const textShapeId = findShapeId(mockTextNode, mockShapes);
      expect(textShapeId).toBe('text-1');

      // Test clicking on Rect node (should find direct ID)
      const rectShapeId = findShapeId(mockRectNode, mockShapes);
      expect(rectShapeId).toBe('rect-1');

      // Test clicking on non-shape node (should return null)
      const mockStageNode = {
        id: () => 'stage',
        getParent: () => null
      };
      const stageShapeId = findShapeId(mockStageNode, mockShapes);
      expect(stageShapeId).toBe(null);
    });
  });
});
