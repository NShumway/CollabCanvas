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
      expect(duplicatedShape.zIndex).toBe(1.5); // Fractional insertion between 1 and 2
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
      
      expect(store.getState().shapes.shape2.zIndex).toBe(2.5); // Fractional insertion between 2 and 3
    });

    it('should send shape backward', () => {
      const originalZIndex = store.getState().shapes.shape2.zIndex;
      store.getState().sendBackward('shape2');
      
      expect(store.getState().shapes.shape2.zIndex).toBe(1.5); // Fractional insertion between 1 and 2
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

  describe('Text Editing State Management', () => {
    beforeEach(() => {
      // Add a text shape for testing
      const textShape = {
        id: 'text1',
        type: 'text',
        x: 100,
        y: 100,
        text: 'Hello World',
        fontSize: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        fill: '#000000',
        zIndex: 1,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      };
      
      store.getState().addShape(textShape);
    });

    it('should start text editing with correct state', () => {
      const position = { x: 150, y: 150 };
      
      store.getState().startTextEdit('text1', position);
      
      const state = store.getState();
      expect(state.editingTextId).toBe('text1');
      expect(state.textEditPosition).toEqual(position);
    });

    it('should stop text editing and clear state', () => {
      // Start editing first
      store.getState().startTextEdit('text1', { x: 150, y: 150 });
      
      // Stop editing
      store.getState().stopTextEdit();
      
      const state = store.getState();
      expect(state.editingTextId).toBe(null);
      expect(state.textEditPosition).toEqual({ x: 0, y: 0 });
    });

    it('should handle multiple start/stop editing cycles', () => {
      const position1 = { x: 100, y: 100 };
      const position2 = { x: 200, y: 200 };
      
      // First cycle
      store.getState().startTextEdit('text1', position1);
      expect(store.getState().editingTextId).toBe('text1');
      
      store.getState().stopTextEdit();
      expect(store.getState().editingTextId).toBe(null);
      
      // Second cycle
      store.getState().startTextEdit('text1', position2);
      expect(store.getState().editingTextId).toBe('text1');
      expect(store.getState().textEditPosition).toEqual(position2);
    });
  });

  describe('Font Property Updates', () => {
    let textShape;

    beforeEach(() => {
      // Add a text shape for testing
      textShape = {
        id: 'text1',
        type: 'text',
        x: 100,
        y: 100,
        text: 'Test Text',
        fontSize: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        fill: '#000000',
        zIndex: 1,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      };
      
      store.getState().addShape(textShape);
    });

    it('should update font size correctly', () => {
      store.getState().updateShape('text1', { 
        fontSize: 24,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      });
      
      const updatedShape = store.getState().shapes['text1'];
      expect(updatedShape.fontSize).toBe(24);
      expect(updatedShape.updatedBy).toBe('test-user');
    });

    it('should update font family correctly', () => {
      const newFontFamily = 'Georgia, serif';
      
      store.getState().updateShape('text1', { 
        fontFamily: newFontFamily,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      });
      
      const updatedShape = store.getState().shapes['text1'];
      expect(updatedShape.fontFamily).toBe(newFontFamily);
    });

    it('should update text alignment correctly', () => {
      store.getState().updateShape('text1', { 
        textAlign: 'center',
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      });
      
      const updatedShape = store.getState().shapes['text1'];
      expect(updatedShape.textAlign).toBe('center');
    });

    it('should update text content correctly', () => {
      const newText = 'Updated Text Content';
      
      store.getState().updateShape('text1', { 
        text: newText,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      });
      
      const updatedShape = store.getState().shapes['text1'];
      expect(updatedShape.text).toBe(newText);
    });

    it('should update multiple font properties simultaneously', () => {
      const updates = {
        fontSize: 20,
        fontFamily: 'Arial, sans-serif',
        textAlign: 'right',
        text: 'Multi-update text',
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      };
      
      store.getState().updateShape('text1', updates);
      
      const updatedShape = store.getState().shapes['text1'];
      expect(updatedShape.fontSize).toBe(20);
      expect(updatedShape.fontFamily).toBe('Arial, sans-serif');
      expect(updatedShape.textAlign).toBe('right');
      expect(updatedShape.text).toBe('Multi-update text');
    });

    it('should preserve other properties when updating font properties', () => {
      const originalX = textShape.x;
      const originalY = textShape.y;
      const originalFill = textShape.fill;
      
      store.getState().updateShape('text1', { 
        fontSize: 18,
        updatedBy: 'test-user',
        clientTimestamp: Date.now()
      });
      
      const updatedShape = store.getState().shapes['text1'];
      expect(updatedShape.x).toBe(originalX);
      expect(updatedShape.y).toBe(originalY);
      expect(updatedShape.fill).toBe(originalFill);
      expect(updatedShape.fontSize).toBe(18);
    });
  });

  describe('Text Shape Creation and Management', () => {
    it('should create text shape with default properties', () => {
      const textShape = {
        id: 'new-text',
        type: 'text',
        x: 50,
        y: 50,
        text: 'New Text',
        fontSize: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        fill: '#000000',
        zIndex: 0,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      };
      
      store.getState().addShape(textShape);
      
      const addedShape = store.getState().shapes['new-text'];
      expect(addedShape).toBeDefined();
      expect(addedShape.type).toBe('text');
      expect(addedShape.text).toBe('New Text');
    });

    it('should handle empty text content gracefully', () => {
      const textShape = {
        id: 'empty-text',
        type: 'text',
        x: 100,
        y: 100,
        text: '',
        fontSize: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        fill: '#000000',
        zIndex: 0,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      };
      
      store.getState().addShape(textShape);
      
      const addedShape = store.getState().shapes['empty-text'];
      expect(addedShape.text).toBe('');
      expect(addedShape.type).toBe('text');
    });

    it('should remove text shape and stop editing if it was being edited', () => {
      const textShape = {
        id: 'removable-text',
        type: 'text',
        x: 100,
        y: 100,
        text: 'To be removed',
        fontSize: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        fill: '#000000',
        zIndex: 0,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        updatedAt: Date.now(),
      };
      
      store.getState().addShape(textShape);
      store.getState().startTextEdit('removable-text', { x: 150, y: 150 });
      
      // Verify editing started
      expect(store.getState().editingTextId).toBe('removable-text');
      
      // Remove shape
      store.getState().removeShape('removable-text');
      
      // Verify shape is removed and editing state is cleared
      expect(store.getState().shapes['removable-text']).toBeUndefined();
      expect(store.getState().editingTextId).toBe(null);
      expect(store.getState().textEditPosition).toEqual({ x: 0, y: 0 });
    });
  });
});
