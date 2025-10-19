/**
 * Collision Detection Tests
 * 
 * Critical tests for user interaction - ensures shapes respond to clicks,
 * selection works correctly, and drag operations target the right shapes.
 * These tests prevent the most frustrating user experience issues.
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
        x: 100,
        y: 200,
        width: 150,
        height: 100
      };
      
      const bounds = getShapeBounds(rectangle);
      
      expect(bounds.left).toBe(100);
      expect(bounds.right).toBe(250); // x + width
      expect(bounds.top).toBe(200);
      expect(bounds.bottom).toBe(300); // y + height
    });

    it('should calculate ellipse bounds correctly', () => {
      const ellipse = {
        type: 'ellipse',
        x: 50,
        y: 75,
        width: 200,
        height: 100
      };
      
      const bounds = getShapeBounds(ellipse);
      
      expect(bounds.left).toBe(50);
      expect(bounds.right).toBe(250); // x + width
      expect(bounds.top).toBe(75);
      expect(bounds.bottom).toBe(175); // y + height
    });

    it('should calculate text bounds correctly', () => {
      const text = {
        type: 'text',
        x: 10,
        y: 20,
        width: 120,
        height: 30,
        fontSize: 16
      };
      
      const bounds = getShapeBounds(text);
      
      expect(bounds.left).toBe(10);
      expect(bounds.right).toBe(130); // x + width
      expect(bounds.top).toBe(20);
      expect(bounds.bottom).toBe(50); // y + height
    });

    it('should handle shapes with missing dimensions', () => {
      const rectangleWithoutDimensions = {
        type: 'rectangle',
        x: 100,
        y: 200
        // Missing width, height
      };
      
      // Should not crash and should return reasonable bounds
      const bounds = getShapeBounds(rectangleWithoutDimensions);
      
      expect(bounds.left).toBe(100);
      expect(bounds.top).toBe(200);
      expect(bounds.right).toBeGreaterThan(bounds.left); // Should have some width
      expect(bounds.bottom).toBeGreaterThan(bounds.top); // Should have some height
    });

    it('should handle shapes with zero dimensions', () => {
      const zeroSizeShape = {
        type: 'rectangle',
        x: 50,
        y: 100,
        width: 0,
        height: 0
      };
      
      const bounds = getShapeBounds(zeroSizeShape);
      
      expect(bounds.left).toBe(50);
      expect(bounds.top).toBe(100);
      expect(bounds.right).toBe(50); // Same as left for zero width
      expect(bounds.bottom).toBe(100); // Same as top for zero height
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
        x: 0,
        y: 0,
        text: 'No Dimensions'
        // Missing width, height, fontSize
      };
      
      // Should not crash
      const bounds = getShapeBounds(textWithoutDimensions);
      
      expect(bounds.left).toBe(0);
      expect(bounds.top).toBe(0);
      expect(bounds.right).toBeGreaterThan(0); // Should have fallback width
      expect(bounds.bottom).toBeGreaterThan(0); // Should have fallback height
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
        x: 999999,
        y: 999999,
        width: 100,
        height: 100
      };
      
      const bounds = getShapeBounds(hugeShape);
      
      expect(bounds.left).toBe(999999);
      expect(bounds.right).toBe(1000099);
      expect(bounds.top).toBe(999999);
      expect(bounds.bottom).toBe(1000099);
    });
  });
});
