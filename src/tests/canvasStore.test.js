/**
 * Unit Tests for Canvas Store Multi-Select Functionality
 * Tests the new selection, delete, duplicate, and z-index actions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import useCanvasStore from '../store/canvasStore';

describe('Canvas Store - Multi-Select & Operations', () => {
  let store;

  beforeEach(() => {
    // Get a fresh store instance for each test
    store = useCanvasStore.getState();
    
    // Reset store to initial state
    store.setShapes({});
    store.clearSelection();
    store.setCurrentUser({ uid: 'test-user', displayName: 'Test User' });
    
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
    
    store.setShapes(testShapes);
  });

  describe('Selection Actions', () => {
    it('should add shapes to selection', () => {
      store.addToSelection('shape1');
      expect(store.selectedIds).toContain('shape1');
      
      store.addToSelection('shape2');
      expect(store.selectedIds).toEqual(expect.arrayContaining(['shape1', 'shape2']));
    });

    it('should not add duplicate shapes to selection', () => {
      store.addToSelection('shape1');
      store.addToSelection('shape1');
      
      expect(store.selectedIds.filter(id => id === 'shape1')).toHaveLength(1);
    });

    it('should remove shapes from selection', () => {
      store.setSelectedIds(['shape1', 'shape2', 'shape3']);
      store.removeFromSelection('shape2');
      
      expect(store.selectedIds).toEqual(['shape1', 'shape3']);
    });

    it('should select all shapes', () => {
      store.selectAll();
      
      expect(store.selectedIds).toHaveLength(3);
      expect(store.selectedIds).toEqual(expect.arrayContaining(['shape1', 'shape2', 'shape3']));
    });

    it('should clear selection', () => {
      store.setSelectedIds(['shape1', 'shape2']);
      store.clearSelection();
      
      expect(store.selectedIds).toHaveLength(0);
    });
  });

  describe('Delete Operations', () => {
    it('should delete selected shapes', () => {
      store.setSelectedIds(['shape1', 'shape3']);
      store.deleteSelectedShapes();
      
      expect(store.shapes).not.toHaveProperty('shape1');
      expect(store.shapes).not.toHaveProperty('shape3');
      expect(store.shapes).toHaveProperty('shape2');
      expect(store.selectedIds).toHaveLength(0);
    });

    it('should handle delete with no selection', () => {
      const originalShapes = { ...store.shapes };
      store.deleteSelectedShapes();
      
      expect(store.shapes).toEqual(originalShapes);
    });
  });

  describe('Duplicate Operations', () => {
    it('should duplicate selected shapes with offset', () => {
      store.setSelectedIds(['shape1']);
      const originalCount = Object.keys(store.shapes).length;
      
      store.duplicateSelectedShapes();
      
      expect(Object.keys(store.shapes)).toHaveLength(originalCount + 1);
      
      // Find the duplicated shape
      const duplicatedShape = Object.values(store.shapes).find(shape => 
        shape.x === 120 && shape.y === 120 // Original (100, 100) + offset (20, 20)
      );
      
      expect(duplicatedShape).toBeDefined();
      expect(duplicatedShape.fill).toBe('#red');
      expect(duplicatedShape.zIndex).toBe(2); // Original zIndex (1) + 1
    });

    it('should duplicate multiple selected shapes', () => {
      store.setSelectedIds(['shape1', 'shape2']);
      const originalCount = Object.keys(store.shapes).length;
      
      store.duplicateSelectedShapes();
      
      expect(Object.keys(store.shapes)).toHaveLength(originalCount + 2);
      expect(store.selectedIds).toHaveLength(2); // Should select the duplicated shapes
    });

    it('should handle duplicate with no selection', () => {
      const originalShapes = { ...store.shapes };
      store.duplicateSelectedShapes();
      
      expect(store.shapes).toEqual(originalShapes);
    });
  });

  describe('Z-Index Operations', () => {
    it('should bring shape to front', () => {
      store.bringToFront('shape1');
      
      expect(store.shapes.shape1.zIndex).toBe(4); // Max zIndex (3) + 1
    });

    it('should send shape to back', () => {
      store.sendToBack('shape3');
      
      expect(store.shapes.shape3.zIndex).toBe(0); // Min zIndex (1) - 1
    });

    it('should bring shape forward', () => {
      const originalZIndex = store.shapes.shape2.zIndex;
      store.bringForward('shape2');
      
      expect(store.shapes.shape2.zIndex).toBe(originalZIndex + 1);
    });

    it('should send shape backward', () => {
      const originalZIndex = store.shapes.shape2.zIndex;
      store.sendBackward('shape2');
      
      expect(store.shapes.shape2.zIndex).toBe(originalZIndex - 1);
    });

    it('should handle z-index operations on non-existent shapes', () => {
      const originalShapes = { ...store.shapes };
      store.bringToFront('non-existent');
      
      expect(store.shapes).toEqual(originalShapes);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations with empty shapes', () => {
      store.setShapes({});
      
      store.selectAll();
      expect(store.selectedIds).toHaveLength(0);
      
      store.deleteSelectedShapes();
      store.duplicateSelectedShapes();
      // Should not throw errors
    });

    it('should handle removal of selected shapes', () => {
      store.setSelectedIds(['shape1', 'shape2']);
      store.removeShape('shape1');
      
      expect(store.selectedIds).toEqual(['shape2']);
    });
  });
});
