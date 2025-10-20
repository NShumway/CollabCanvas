/**
 * Alignment and Distribution Tests
 * 
 * Comprehensive test suite for alignment and distribution algorithms.
 * Tests both the utility functions and integration with sync infrastructure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  alignShapes, 
  distributeShapes, 
  getShapeBounds,
  getAlignmentAvailability 
} from '../utils/alignment.js';

// Mock the devLog utility
vi.mock('../utils/devSettings.js', () => ({
  devLog: {
    sync: vi.fn(),
    ai: vi.fn(),
  }
}));

describe('Alignment and Distribution Utilities', () => {
  let mockSyncEngine;
  let mockShapes;
  let mockCurrentUser;

  beforeEach(() => {
    // Mock SyncEngine
    mockSyncEngine = {
      applyLocalChange: vi.fn(),
      queueWrite: vi.fn(),
    };

    // Mock current user
    mockCurrentUser = { uid: 'test-user' };

    // Sample shapes for testing
    mockShapes = {
      'shape1': {
        id: 'shape1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: '#ff0000',
        zIndex: 1,
      },
      'shape2': {
        id: 'shape2',
        type: 'rectangle',
        x: 200,
        y: 150,
        width: 50,
        height: 50,
        fill: '#00ff00',
        zIndex: 2,
      },
      'shape3': {
        id: 'shape3',
        type: 'ellipse',
        x: 300,
        y: 200,
        width: 60,
        height: 40,
        fill: '#0000ff',
        zIndex: 3,
      },
      'shape4': {
        id: 'shape4',
        type: 'text',
        x: 150,
        y: 50,
        width: 100,
        height: 20,
        text: 'Test text',
        fontSize: 16,
        fill: '#000000',
        zIndex: 4,
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getShapeBounds', () => {
    it('should calculate correct bounds for rectangle', () => {
      const shape = mockShapes.shape1;
      const bounds = getShapeBounds(shape);
      
      expect(bounds).toEqual({
        left: 75,    // 100 - 50/2
        top: 75,     // 100 - 50/2
        right: 125,  // 100 + 50/2
        bottom: 125, // 100 + 50/2
        width: 50,
        height: 50,
        centerX: 100,
        centerY: 100,
      });
    });

    it('should calculate correct bounds for ellipse', () => {
      const shape = mockShapes.shape3;
      const bounds = getShapeBounds(shape);
      
      expect(bounds).toEqual({
        left: 270,   // 300 - 60/2
        top: 180,    // 200 - 40/2
        right: 330,  // 300 + 60/2
        bottom: 220, // 200 + 40/2
        width: 60,
        height: 40,
        centerX: 300,
        centerY: 200,
      });
    });

    it('should calculate correct bounds for text', () => {
      const shape = mockShapes.shape4;
      const bounds = getShapeBounds(shape);
      
      expect(bounds).toEqual({
        left: 100,   // 150 - 100/2
        top: 40,     // 50 - 20/2
        right: 200,  // 150 + 100/2
        bottom: 60,  // 50 + 20/2
        width: 100,
        height: 20,
        centerX: 150,
        centerY: 50,
      });
    });

    it('should use Konva node bounds when available', () => {
      const shape = mockShapes.shape1;
      const mockNodeRef = {
        getClientRect: vi.fn().mockReturnValue({
          x: 70,
          y: 70,
          width: 60,
          height: 60,
        }),
      };

      const bounds = getShapeBounds(shape, mockNodeRef);
      
      expect(mockNodeRef.getClientRect).toHaveBeenCalled();
      expect(bounds).toEqual({
        left: 70,
        top: 70,
        right: 130,
        bottom: 130,
        width: 60,
        height: 60,
        centerX: 100,
        centerY: 100,
      });
    });
  });

  describe('getAlignmentAvailability', () => {
    it('should require at least 2 shapes for alignment', () => {
      expect(getAlignmentAvailability(0)).toEqual({
        alignmentEnabled: false,
        distributionEnabled: false,
        alignmentMessage: 'Select 2+ shapes to align',
        distributionMessage: 'Select 3+ shapes to distribute',
      });

      expect(getAlignmentAvailability(1)).toEqual({
        alignmentEnabled: false,
        distributionEnabled: false,
        alignmentMessage: 'Select 2+ shapes to align',
        distributionMessage: 'Select 3+ shapes to distribute',
      });

      expect(getAlignmentAvailability(2)).toEqual({
        alignmentEnabled: true,
        distributionEnabled: false,
        alignmentMessage: '',
        distributionMessage: 'Select 3+ shapes to distribute',
      });
    });

    it('should require at least 3 shapes for distribution', () => {
      expect(getAlignmentAvailability(3)).toEqual({
        alignmentEnabled: true,
        distributionEnabled: true,
        alignmentMessage: '',
        distributionMessage: '',
      });
    });
  });

  describe('alignShapes', () => {
    it('should fail with less than 2 shapes', async () => {
      const result = await alignShapes(
        ['shape1'],
        'left',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('At least 2 shapes');
      expect(result.updatedShapeIds).toEqual([]);
    });

    it('should align shapes to the left', async () => {
      const shapeIds = ['shape1', 'shape2'];
      const result = await alignShapes(
        shapeIds,
        'left',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      expect(result.updatedShapeIds).toContain('shape2');
      
      // Shape2 should be moved to align with shape1's left edge
      // Shape1 left edge: 75, Shape2 should move to x = 75 + width/2 = 100
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape2',
        expect.objectContaining({
          x: 100, // 75 (left edge) + 50/2 (width/2)
          y: 150, // y unchanged
        })
      );
    });

    it('should align shapes to the right', async () => {
      const shapeIds = ['shape1', 'shape2'];
      const result = await alignShapes(
        shapeIds,
        'right',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      expect(result.updatedShapeIds).toContain('shape1');
      
      // Shape1 should move to align with shape2's right edge
      // Shape2 right edge: 225, Shape1 should move to x = 225 - 50/2 = 200
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape1',
        expect.objectContaining({
          x: 200, // 225 (right edge) - 50/2 (width/2)
          y: 100, // y unchanged
        })
      );
    });

    it('should align shapes to center horizontally', async () => {
      const shapeIds = ['shape1', 'shape2'];
      const result = await alignShapes(
        shapeIds,
        'center',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      
      // Center should be at (75 + 225) / 2 = 150
      const expectedCenter = 150;
      
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape1',
        expect.objectContaining({
          x: expectedCenter,
          y: 100,
        })
      );
      
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape2',
        expect.objectContaining({
          x: expectedCenter,
          y: 150,
        })
      );
    });

    it('should align shapes to the top', async () => {
      const shapeIds = ['shape1', 'shape2'];
      const result = await alignShapes(
        shapeIds,
        'top',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      expect(result.updatedShapeIds).toContain('shape2');
      
      // Shape2 should move to align with shape1's top edge
      // Shape1 top edge: 75, Shape2 should move to y = 75 + 50/2 = 100
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape2',
        expect.objectContaining({
          x: 200, // x unchanged
          y: 100, // 75 (top edge) + 50/2 (height/2)
        })
      );
    });

    it('should align shapes to the bottom', async () => {
      const shapeIds = ['shape1', 'shape2'];
      const result = await alignShapes(
        shapeIds,
        'bottom',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      expect(result.updatedShapeIds).toContain('shape1');
      
      // Shape1 should move to align with shape2's bottom edge
      // Shape2 bottom edge: 175, Shape1 should move to y = 175 - 50/2 = 150
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape1',
        expect.objectContaining({
          x: 100, // x unchanged
          y: 150, // 175 (bottom edge) - 50/2 (height/2)
        })
      );
    });

    it('should align shapes to middle vertically', async () => {
      const shapeIds = ['shape1', 'shape2'];
      const result = await alignShapes(
        shapeIds,
        'middle',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      
      // Middle should be at (75 + 175) / 2 = 125
      const expectedMiddle = 125;
      
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape1',
        expect.objectContaining({
          x: 100,
          y: expectedMiddle,
        })
      );
      
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape2',
        expect.objectContaining({
          x: 200,
          y: expectedMiddle,
        })
      );
    });

    it('should handle mixed shape types correctly', async () => {
      const shapeIds = ['shape1', 'shape3', 'shape4']; // rectangle, ellipse, text
      const result = await alignShapes(
        shapeIds,
        'left',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      expect(result.updatedShapeIds.length).toBeGreaterThan(0);
      
      // All shapes should be aligned to the leftmost edge (shape1: 75)
      const calls = mockSyncEngine.applyLocalChange.mock.calls;
      calls.forEach(call => {
        const [shapeId, updates] = call;
        if (shapeId === 'shape3') {
          expect(updates.x).toBe(105); // 75 + 60/2
        } else if (shapeId === 'shape4') {
          expect(updates.x).toBe(125); // 75 + 100/2
        }
      });
    });

    it('should not update shapes that are already aligned', async () => {
      // Create shapes that are already left-aligned
      const alignedShapes = {
        shape1: { ...mockShapes.shape1, x: 100 },
        shape2: { ...mockShapes.shape2, x: 100 }, // Same x position
      };

      const result = await alignShapes(
        ['shape1', 'shape2'],
        'center', // Try to center-align
        alignedShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      // Should not call sync methods if no actual changes needed
      expect(mockSyncEngine.applyLocalChange).not.toHaveBeenCalled();
    });

    it('should handle invalid alignment type', async () => {
      const result = await alignShapes(
        ['shape1', 'shape2'],
        'invalid',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown alignment type');
    });
  });

  describe('distributeShapes', () => {
    it('should fail with less than 3 shapes', async () => {
      const result = await distributeShapes(
        ['shape1', 'shape2'],
        'horizontal',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('At least 3 shapes');
      expect(result.updatedShapeIds).toEqual([]);
    });

    it('should distribute shapes horizontally', async () => {
      // Create shapes that need distribution (middle shape is not centered)
      const distributionShapes = {
        shape1: { ...mockShapes.shape1, x: 100 }, // x = 100
        shape2: { ...mockShapes.shape2, x: 150 }, // x = 150 (needs to move to 200)  
        shape3: { ...mockShapes.shape3, x: 300 }, // x = 300
      };

      const shapeIds = ['shape1', 'shape2', 'shape3'];
      const result = await distributeShapes(
        shapeIds,
        'horizontal',
        distributionShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      expect(result.updatedShapeIds).toContain('shape2');
      
      // Should distribute between shape1 (x=100) and shape3 (x=300)
      // Middle shape (shape2) should be at (100 + 300) / 2 = 200
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape2',
        expect.objectContaining({
          x: 200,
          y: 150, // y unchanged
        })
      );
    });

    it('should distribute shapes vertically', async () => {
      // Arrange shapes vertically for testing (middle shape needs repositioning)
      const verticalShapes = {
        shape1: { ...mockShapes.shape1, y: 100 },
        shape2: { ...mockShapes.shape2, y: 150 }, // Needs to move to 200
        shape3: { ...mockShapes.shape3, y: 300 },
      };

      const result = await distributeShapes(
        ['shape1', 'shape2', 'shape3'],
        'vertical',
        verticalShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      expect(result.updatedShapeIds).toContain('shape2');
      
      // Should distribute between shape1 (y=100) and shape3 (y=300)
      // Middle shape (shape2) should be at (100 + 300) / 2 = 200
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape2',
        expect.objectContaining({
          x: 200, // x unchanged
          y: 200,
        })
      );
    });

    it('should distribute 4 shapes evenly', async () => {
      const fourShapes = {
        shape1: { ...mockShapes.shape1, x: 100 }, // First shape
        shape2: { ...mockShapes.shape2, x: 150 }, // Needs to move to 200
        shape3: { ...mockShapes.shape3, x: 250 }, // Needs to move to 300
        shape5: {
          id: 'shape5',
          type: 'rectangle',
          x: 400, // Last shape
          y: 100,
          width: 50,
          height: 50,
          fill: '#ff00ff',
          zIndex: 5,
        },
      };

      const result = await distributeShapes(
        ['shape1', 'shape2', 'shape3', 'shape5'],
        'horizontal',
        fourShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      
      // Should distribute between shape1 (x=100) and shape5 (x=400)
      // Total distance: 300, 3 gaps, each gap: 100
      // Expected positions: 100, 200, 300, 400
      const calls = mockSyncEngine.applyLocalChange.mock.calls;
      const shape2Call = calls.find(call => call[0] === 'shape2');
      const shape3Call = calls.find(call => call[0] === 'shape3');
      
      if (shape2Call) {
        expect(shape2Call[1].x).toBe(200);
      }
      if (shape3Call) {
        expect(shape3Call[1].x).toBe(300);
      }
    });

    it('should not update first and last shapes in distribution', async () => {
      // Create shapes that need distribution (middle shape is not centered)
      const distributionShapes = {
        shape1: { ...mockShapes.shape1, x: 100 }, // x = 100
        shape2: { ...mockShapes.shape2, x: 150 }, // x = 150 (needs to move to 200)  
        shape3: { ...mockShapes.shape3, x: 300 }, // x = 300
      };

      const result = await distributeShapes(
        ['shape1', 'shape2', 'shape3'],
        'horizontal',
        distributionShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      
      // First (shape1) and last (shape3) should not be updated
      const calls = mockSyncEngine.applyLocalChange.mock.calls;
      const updatedIds = calls.map(call => call[0]);
      
      expect(updatedIds).not.toContain('shape1');
      expect(updatedIds).not.toContain('shape3');
      expect(updatedIds).toContain('shape2');
    });

    it('should handle invalid direction', async () => {
      const result = await distributeShapes(
        ['shape1', 'shape2', 'shape3'],
        'diagonal',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid distribution direction');
    });

    it('should sort shapes by position before distributing', async () => {
      // Create shapes that need distribution (middle shape is not centered)
      const distributionShapes = {
        shape1: { ...mockShapes.shape1, x: 100 }, // x = 100
        shape2: { ...mockShapes.shape2, x: 150 }, // x = 150 (needs to move to 200)  
        shape3: { ...mockShapes.shape3, x: 300 }, // x = 300
      };

      // Pass shapes in random order
      const result = await distributeShapes(
        ['shape3', 'shape1', 'shape2'], // Intentionally out of order
        'horizontal',
        distributionShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      
      // Should still distribute correctly based on position, not order passed
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape2',
        expect.objectContaining({
          x: 200, // Still should be in the middle
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle SyncEngine errors gracefully', async () => {
      mockSyncEngine.applyLocalChange.mockImplementation(() => {
        throw new Error('Sync error');
      });

      const result = await alignShapes(
        ['shape1', 'shape2'],
        'left',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to align shapes');
      expect(result.error).toContain('Sync error');
    });

    it('should handle missing shapes gracefully', async () => {
      const result = await alignShapes(
        ['nonexistent1', 'nonexistent2'],
        'left',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No valid shapes found');
    });

    it('should handle empty shape collection', async () => {
      const result = await alignShapes(
        ['shape1', 'shape2'],
        'left',
        {}, // Empty shapes collection
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No valid shapes found');
    });
  });

  describe('Performance considerations', () => {
    it('should only update shapes that actually need repositioning', async () => {
      // Create shapes where some are already aligned
      const partiallyAlignedShapes = {
        shape1: { ...mockShapes.shape1, x: 100 },
        shape2: { ...mockShapes.shape2, x: 100 }, // Already aligned
        shape3: { ...mockShapes.shape3, x: 200 },  // Needs alignment
      };

      const result = await alignShapes(
        ['shape1', 'shape2', 'shape3'],
        'left',
        partiallyAlignedShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      
      // Only shape3 should be updated
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledTimes(1);
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledWith(
        'shape3',
        expect.any(Object)
      );
    });

    it('should round coordinates to prevent floating point precision issues', async () => {
      const result = await alignShapes(
        ['shape1', 'shape2'],
        'center',
        mockShapes,
        mockSyncEngine,
        undefined,
        mockCurrentUser
      );

      expect(result.success).toBe(true);
      
      const calls = mockSyncEngine.applyLocalChange.mock.calls;
      calls.forEach(call => {
        const [, updates] = call;
        // Coordinates should be rounded to 1 decimal place 
        // Check that they're close to a rounded value
        expect(Math.abs(updates.x - Math.round(updates.x * 10) / 10)).toBeLessThan(0.001);
        expect(Math.abs(updates.y - Math.round(updates.y * 10) / 10)).toBeLessThan(0.001);
      });
    });
  });
});
