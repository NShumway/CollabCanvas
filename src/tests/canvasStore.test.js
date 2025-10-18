/**
 * Unit Tests for Canvas Store Multi-Select Functionality
 * Tests the new selection, delete, duplicate, and z-index actions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import useCanvasStore from '@/store/canvasStore';

describe('Canvas Store - Multi-Select & Operations', () => {
  let store;

  beforeEach(() => {
    // Get the store actions and state getter
    store = useCanvasStore;
    
    // Reset store to initial state
    store.getState().setShapes({});
    store.getState().clearSelection();
    store.getState().setCurrentUser({ uid: 'test-user', displayName: 'Test User' });
    
    // Add some test shapes
    const testShapes = {
      'shape1': {
        id: 'shape1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: '#red',
        zIndex: 1
      },
      'shape2': {
        id: 'shape2',
        type: 'rectangle',
        x: 200,
        y: 200,
        width: 50,  
        height: 50,
        fill: '#blue',
        zIndex: 2
      },
      'shape3': {
        id: 'shape3',
        type: 'rectangle',
        x: 300,
        y: 300,
        width: 50,
        height: 50,
        fill: '#green',
        zIndex: 3
      }
    };
    
    store.getState().setShapes(testShapes);
  });

  describe('Selection Actions', () => {
    it('should add shapes to selection', () => {
      store.getState().addToSelection('shape1');
      expect(store.getState().selectedIds).toContain('shape1');
      
      store.getState().addToSelection('shape2');
      expect(store.getState().selectedIds).toEqual(expect.arrayContaining(['shape1', 'shape2']));
    });

    it('should not add duplicate shapes to selection', () => {
      store.getState().addToSelection('shape1');
      store.getState().addToSelection('shape1');
      
      expect(store.getState().selectedIds.filter(id => id === 'shape1')).toHaveLength(1);
    });

    it('should remove shapes from selection', () => {
      store.getState().setSelectedIds(['shape1', 'shape2', 'shape3']);
      store.getState().removeFromSelection('shape2');
      
      expect(store.getState().selectedIds).toEqual(['shape1', 'shape3']);
    });

    it('should select all shapes', () => {
      store.getState().selectAll();
      
      expect(store.getState().selectedIds).toHaveLength(3);
      expect(store.getState().selectedIds).toEqual(expect.arrayContaining(['shape1', 'shape2', 'shape3']));
    });

    it('should clear selection', () => {
      store.getState().setSelectedIds(['shape1', 'shape2']);
      store.getState().clearSelection();
      
      expect(store.getState().selectedIds).toHaveLength(0);
    });
  });

  describe('Delete Operations', () => {
    it('should delete selected shapes', () => {
      store.getState().setSelectedIds(['shape1', 'shape3']);
      store.getState().deleteSelectedShapes();
      
      expect(store.getState().shapes).not.toHaveProperty('shape1');
      expect(store.getState().shapes).not.toHaveProperty('shape3');
      expect(store.getState().shapes).toHaveProperty('shape2');
      expect(store.getState().selectedIds).toHaveLength(0);
    });

    it('should handle delete with no selection', () => {
      const originalShapes = { ...store.getState().shapes };
      store.getState().deleteSelectedShapes();
      
      expect(store.getState().shapes).toEqual(originalShapes);
    });
  });

  describe('Duplicate Operations', () => {
    it('should duplicate selected shapes with offset', () => {
      store.getState().setSelectedIds(['shape1']);
      const originalCount = Object.keys(store.getState().shapes).length;
      
      store.getState().duplicateSelectedShapes();
      
      expect(Object.keys(store.getState().shapes)).toHaveLength(originalCount + 1);
      
      // Find the duplicated shape
      const duplicatedShape = Object.values(store.getState().shapes).find(shape => 
        shape.x === 120 && shape.y === 120 // Original (100, 100) + offset (20, 20)
      );
      
      expect(duplicatedShape).toBeDefined();
      expect(duplicatedShape.fill).toBe('#red');
      expect(duplicatedShape.zIndex).toBe(2); // Original zIndex (1) + 1
    });

    it('should duplicate multiple selected shapes', () => {
      store.getState().setSelectedIds(['shape1', 'shape2']);
      const originalCount = Object.keys(store.getState().shapes).length;
      
      store.getState().duplicateSelectedShapes();
      
      expect(Object.keys(store.getState().shapes)).toHaveLength(originalCount + 2);
      expect(store.getState().selectedIds).toHaveLength(2); // Should select the duplicated shapes
    });

    it('should handle duplicate with no selection', () => {
      const originalShapes = { ...store.getState().shapes };
      store.getState().duplicateSelectedShapes();
      
      expect(store.getState().shapes).toEqual(originalShapes);
    });
  });

  describe('Z-Index Operations', () => {
    it('should bring shape to front', () => {
      store.getState().bringToFront('shape1');
      
      expect(store.getState().shapes.shape1.zIndex).toBe(4); // Max zIndex (3) + 1
    });

    it('should send shape to back', () => {
      store.getState().sendToBack('shape3');
      
      expect(store.getState().shapes.shape3.zIndex).toBe(-1); // Min zIndex (0) - 1
    });

    it('should bring shape forward', () => {
      const originalZIndex = store.getState().shapes.shape2.zIndex;
      store.getState().bringForward('shape2');
      
      expect(store.getState().shapes.shape2.zIndex).toBe(originalZIndex + 1);
    });

    it('should send shape backward', () => {
      const originalZIndex = store.getState().shapes.shape2.zIndex;
      store.getState().sendBackward('shape2');
      
      expect(store.getState().shapes.shape2.zIndex).toBe(originalZIndex - 1);
    });

    it('should handle z-index operations on non-existent shapes', () => {
      const originalShapes = { ...store.getState().shapes };
      store.getState().bringToFront('non-existent');
      
      expect(store.getState().shapes).toEqual(originalShapes);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations with empty shapes', () => {
      store.getState().setShapes({});
      
      store.getState().selectAll();
      expect(store.getState().selectedIds).toHaveLength(0);
      
      store.getState().deleteSelectedShapes();
      store.getState().duplicateSelectedShapes();
      // Should not throw errors
    });

    it('should handle removal of selected shapes', () => {
      store.getState().setSelectedIds(['shape1', 'shape2']);
      store.getState().removeShape('shape1');
      
      expect(store.getState().selectedIds).toEqual(['shape2']);
    });
  });
});
