/**
 * Shape Creation Tests
 * 
 * Tests to ensure proper shape initialization, prevent creation bugs,
 * and maintain consistent business logic across all shape types.
 * These tests prevent user experience issues during shape creation.
 */

import { describe, it, expect } from 'vitest';
import { createShape } from '@/utils/shapeCreation';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

describe('Shape Creation - Business Logic Integrity', () => {
  
  describe('Rectangle Creation', () => {
    it('should create rectangle with minimal parameters', () => {
      const result = createShape({ type: 'rectangle', x: 100, y: 200, userId: 'user-123', maxZIndex: 0 });
      
      expect(result.type).toBe('rectangle');
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
      expect(result.width).toBe(SHAPE_DEFAULTS.RECTANGLE_WIDTH);
      expect(result.height).toBe(SHAPE_DEFAULTS.RECTANGLE_HEIGHT);
      expect(result.fill).toBe(SHAPE_DEFAULTS.FILL);
      expect(result.zIndex).toBe(1); // maxZIndex (0) + 1
      expect(result.updatedBy).toBe('user-123');
      expect(result.clientTimestamp).toBeGreaterThan(0);
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should create rectangle with custom properties', () => {
      const customProps = {
        width: 200,
        height: 150,
        fill: '#custom-red',
        zIndex: 10
      };
      
      const result = createShape({ type: 'rectangle', x: 50, y: 75, userId: 'user-456', maxZIndex: 0, ...customProps });
      
      expect(result.width).toBe(200); // Custom override
      expect(result.height).toBe(150); // Custom override
      expect(result.fill).toBe('#custom-red'); // Custom override
      expect(result.zIndex).toBe(10); // Custom override
      expect(result.x).toBe(50); // Position parameter
      expect(result.y).toBe(75); // Position parameter
    });
  });

  describe('Ellipse Creation', () => {
    it('should create ellipse with correct defaults', () => {
      const result = createShape({ type: 'ellipse', x: 150, y: 250, userId: 'user-789', maxZIndex: 0 });
      
      expect(result.type).toBe('ellipse');
      expect(result.x).toBe(150);
      expect(result.y).toBe(250);
      expect(result.width).toBe(SHAPE_DEFAULTS.ELLIPSE_WIDTH); // Ellipse-specific defaults
      expect(result.height).toBe(SHAPE_DEFAULTS.ELLIPSE_HEIGHT); // Not rectangle defaults
      expect(result.fill).toBe(SHAPE_DEFAULTS.FILL);
    });

    it('should create ellipse with custom dimensions', () => {
      const customProps = {
        width: 300,
        height: 100,
        fill: '#ellipse-blue'
      };
      
      const result = createShape({ type: 'ellipse', x: 0, y: 0, userId: 'user-ellipse', maxZIndex: 0, ...customProps });
      
      expect(result.width).toBe(300);
      expect(result.height).toBe(100);
      expect(result.fill).toBe('#ellipse-blue');
      expect(result.type).toBe('ellipse'); // Verify type
    });
  });

  describe('Text Creation', () => {
    it('should create text with all text defaults', () => {
      const result = createShape({ type: 'text', x: 75, y: 125, userId: 'user-text', maxZIndex: 0 });
      
      expect(result.type).toBe('text');
      expect(result.x).toBe(75);
      expect(result.y).toBe(125);
      expect(result.text).toBe(SHAPE_DEFAULTS.TEXT_CONTENT);
      expect(result.fontSize).toBe(SHAPE_DEFAULTS.TEXT_FONT_SIZE);
      expect(result.fontFamily).toBe(SHAPE_DEFAULTS.TEXT_FONT_FAMILY);
      expect(result.textAlign).toBe(SHAPE_DEFAULTS.TEXT_ALIGN);
      expect(result.width).toBe(SHAPE_DEFAULTS.TEXT_WIDTH);
      expect(result.height).toBe(SHAPE_DEFAULTS.TEXT_HEIGHT);
    });

    it('should create text with custom text properties', () => {
      const customProps = {
        text: 'Custom Message',
        fontSize: 24,
        fontFamily: 'Arial',
        textAlign: 'center',
        width: 200,
        height: 50,
        fill: '#text-green'
      };
      
      const result = createShape({ type: 'text', x: 10, y: 20, userId: 'user-custom', maxZIndex: 0, ...customProps });
      
      expect(result.text).toBe('Custom Message');
      expect(result.fontSize).toBe(24);
      expect(result.fontFamily).toBe('Arial');
      expect(result.textAlign).toBe('center');
      expect(result.width).toBe(200);
      expect(result.height).toBe(50);
      expect(result.fill).toBe('#text-green');
    });
  });

  describe('Shape Creation Edge Cases', () => {
    it('should handle invalid shape type gracefully', () => {
      // This should throw or return null, preventing runtime errors
      expect(() => {
        createShape({ type: 'invalid-type', x: 0, y: 0, userId: 'user-123', maxZIndex: 0 });
      }).toThrow();
    });

    it('should handle missing user ID', () => {
      const result = createShape({ type: 'rectangle', x: 0, y: 0, userId: '', maxZIndex: 0 });
      
      expect(result.updatedBy).toBe('unknown'); // Falls back to 'unknown' for empty userId
      expect(result.type).toBe('rectangle'); // Should still create shape
    });

    it('should handle negative coordinates', () => {
      const result = createShape({ type: 'ellipse', x: -100, y: -200, userId: 'user-negative', maxZIndex: 0 });
      
      expect(result.x).toBe(-100); // Should allow negative coordinates
      expect(result.y).toBe(-200); // Should allow negative coordinates
      expect(result.type).toBe('ellipse');
    });

    it('should handle zero dimensions in custom props', () => {
      const customProps = {
        width: 0,
        height: 0
      };
      
      const result = createShape({ type: 'rectangle', x: 0, y: 0, userId: 'user-zero', maxZIndex: 0, ...customProps });
      
      expect(result.width).toBe(0); // Should respect custom values even if zero
      expect(result.height).toBe(0); // Should respect custom values even if zero
    });
  });

  describe('Shape ID Generation', () => {
    it('should generate unique IDs for multiple shapes', () => {
      const shape1 = createShape({ type: 'rectangle', x: 0, y: 0, userId: 'user-1', maxZIndex: 0 });
      const shape2 = createShape({ type: 'rectangle', x: 0, y: 0, userId: 'user-1', maxZIndex: 0 });
      const shape3 = createShape({ type: 'ellipse', x: 0, y: 0, userId: 'user-1', maxZIndex: 0 });
      
      expect(shape1.id).not.toBe(shape2.id);
      expect(shape2.id).not.toBe(shape3.id);
      expect(shape1.id).not.toBe(shape3.id);
      
      // Should be valid UUID format (basic check)
      expect(shape1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(shape2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(shape3.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('Timestamp Generation', () => {
    it('should generate current timestamps', () => {
      const beforeTime = Date.now();
      const result = createShape({ type: 'rectangle', x: 0, y: 0, userId: 'user-time', maxZIndex: 0 });
      const afterTime = Date.now();
      
      expect(result.clientTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.clientTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should generate different timestamps for shapes created at different times', async () => {
      const shape1 = createShape({ type: 'rectangle', x: 0, y: 0, userId: 'user-1', maxZIndex: 0 });
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const shape2 = createShape({ type: 'rectangle', x: 0, y: 0, userId: 'user-1', maxZIndex: 0 });
      
      expect(shape2.clientTimestamp).toBeGreaterThan(shape1.clientTimestamp);
    });
  });
});
