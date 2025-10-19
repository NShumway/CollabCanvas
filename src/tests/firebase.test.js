/**
 * Firebase Conversion Tests
 * 
 * Critical tests to prevent runtime crashes from undefined values,
 * Firestore write failures, and data conversion edge cases.
 * These tests protect against the most common production issues.
 */

import { describe, it, expect } from 'vitest';
import { 
  convertToFirestoreShape, 
  convertFromFirestoreShape,
  convertFirestoreTimestamp 
} from '@/types/firebase';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

describe('Firebase Conversion - Critical Safety Tests', () => {
  
  describe('convertToFirestoreShape - Undefined Value Protection', () => {
    it('should handle shape with all undefined optional properties', () => {
      const shape = { 
        id: 'test-1', 
        type: 'rectangle' 
        // Missing x, y, fill, zIndex, width, height, etc.
      };
      
      const result = convertToFirestoreShape(shape);
      
      expect(result.x).toBe(0); // Fallback to origin
      expect(result.y).toBe(0); // Fallback to origin  
      expect(result.fill).toBe(SHAPE_DEFAULTS.FILL); // Fallback color
      expect(result.zIndex).toBe(SHAPE_DEFAULTS.Z_INDEX); // Fallback z-index
      expect(result.width).toBe(SHAPE_DEFAULTS.RECTANGLE_WIDTH);
      expect(result.height).toBe(SHAPE_DEFAULTS.RECTANGLE_HEIGHT);
    });

    it('should handle ellipse with missing dimensions', () => {
      const shape = { 
        id: 'test-2', 
        type: 'ellipse',
        x: 100,
        y: 200
        // Missing width, height
      };
      
      const result = convertToFirestoreShape(shape);
      
      expect(result.width).toBe(SHAPE_DEFAULTS.ELLIPSE_WIDTH);
      expect(result.height).toBe(SHAPE_DEFAULTS.ELLIPSE_HEIGHT);
      expect(result.x).toBe(100); // Preserve existing values
      expect(result.y).toBe(200);
    });

    it('should handle text with missing text properties', () => {
      const shape = { 
        id: 'test-3', 
        type: 'text'
        // Missing text, fontSize, fontFamily, etc.
      };
      
      const result = convertToFirestoreShape(shape);
      
      expect(result.text).toBe(SHAPE_DEFAULTS.TEXT_CONTENT);
      expect(result.fontSize).toBe(SHAPE_DEFAULTS.TEXT_FONT_SIZE);
      expect(result.fontFamily).toBe(SHAPE_DEFAULTS.TEXT_FONT_FAMILY);
      expect(result.textAlign).toBe(SHAPE_DEFAULTS.TEXT_ALIGN);
    });

    it('should preserve existing values over defaults', () => {
      const shape = { 
        id: 'test-4', 
        type: 'rectangle',
        x: 150,
        fill: '#custom-color',
        width: 200,
        height: 100
      };
      
      const result = convertToFirestoreShape(shape);
      
      expect(result.x).toBe(150); // Custom value preserved
      expect(result.fill).toBe('#custom-color'); // Custom value preserved
      expect(result.width).toBe(200); // Custom value preserved
      expect(result.height).toBe(100); // Custom value preserved
    });
  });

  describe('convertFromFirestoreShape - Document Parsing Safety', () => {
    it('should handle Firestore doc with missing optional fields', () => {
      const firestoreDoc = {
        id: 'test-5',
        type: 'rectangle'
        // Missing most properties
      };
      
      const result = convertFromFirestoreShape(firestoreDoc);
      
      expect(result.type).toBe('rectangle');
      expect(result.x).toBe(0); // Fallback
      expect(result.y).toBe(0); // Fallback
      expect(result.fill).toBe(SHAPE_DEFAULTS.FILL); // Fallback
      expect(result.createdBy).toBe('unknown'); // Fallback
      expect(result.updatedBy).toBe('unknown'); // Fallback
    });

    it('should handle ellipse doc with correct defaults', () => {
      const firestoreDoc = {
        id: 'test-6',
        type: 'ellipse',
        x: 50,
        y: 75
        // Missing width, height
      };
      
      const result = convertFromFirestoreShape(firestoreDoc);
      
      expect(result.type).toBe('ellipse');
      expect(result.width).toBe(SHAPE_DEFAULTS.ELLIPSE_WIDTH); // Correct ellipse defaults
      expect(result.height).toBe(SHAPE_DEFAULTS.ELLIPSE_HEIGHT); // Not rectangle defaults
      expect(result.x).toBe(50);
      expect(result.y).toBe(75);
    });

    it('should handle text doc with all text defaults', () => {
      const firestoreDoc = {
        id: 'test-7',
        type: 'text',
        x: 10,
        y: 20
        // Missing all text-specific properties
      };
      
      const result = convertFromFirestoreShape(firestoreDoc);
      
      expect(result.type).toBe('text');
      expect(result.text).toBe(SHAPE_DEFAULTS.TEXT_CONTENT);
      expect(result.fontSize).toBe(SHAPE_DEFAULTS.TEXT_FONT_SIZE);
      expect(result.fontFamily).toBe(SHAPE_DEFAULTS.TEXT_FONT_FAMILY);
      expect(result.textAlign).toBe(SHAPE_DEFAULTS.TEXT_ALIGN);
      expect(result.width).toBe(SHAPE_DEFAULTS.TEXT_WIDTH);
      expect(result.height).toBe(SHAPE_DEFAULTS.TEXT_HEIGHT);
    });
  });

  describe('convertFirestoreTimestamp - Edge Cases', () => {
    it('should handle undefined timestamp', () => {
      const result = convertFirestoreTimestamp(undefined);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0); // Should be a valid timestamp
    });

    it('should handle null timestamp', () => {
      const result = convertFirestoreTimestamp(null);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0); // Should be a valid timestamp
    });

    it('should convert valid Firestore timestamp', () => {
      const mockTimestamp = {
        seconds: 1640995200, // Jan 1, 2022
        nanoseconds: 500000000 // 0.5 seconds
      };
      
      const result = convertFirestoreTimestamp(mockTimestamp);
      
      expect(result).toBe(1640995200500); // seconds * 1000 + nanoseconds / 1000000
    });
  });

  describe('Round-trip Conversion Integrity', () => {
    it('should maintain data integrity through round-trip conversion', () => {
      const originalShape = {
        id: 'round-trip-test',
        type: 'ellipse',
        x: 100,
        y: 200,
        width: 150,
        height: 75,
        fill: '#FF5733',
        zIndex: 5,
        updatedBy: 'user-123',
        clientTimestamp: Date.now()
      };

      // Convert to Firestore format
      const firestoreFormat = convertToFirestoreShape(originalShape);
      
      // Add mock Firestore timestamp (server would add this)
      const mockFirestoreDoc = {
        ...firestoreFormat,
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        createdBy: 'user-123'
      };

      // Convert back to shape format  
      const convertedBack = convertFromFirestoreShape(mockFirestoreDoc);

      // Verify critical properties maintained
      expect(convertedBack.type).toBe(originalShape.type);
      expect(convertedBack.x).toBe(originalShape.x);
      expect(convertedBack.y).toBe(originalShape.y); 
      expect(convertedBack.width).toBe(originalShape.width);
      expect(convertedBack.height).toBe(originalShape.height);
      expect(convertedBack.fill).toBe(originalShape.fill);
      expect(convertedBack.zIndex).toBe(originalShape.zIndex);
    });
  });
});
