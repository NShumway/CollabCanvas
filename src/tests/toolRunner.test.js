/**
 * ToolRunner Tests
 * Tests for AI tool execution and sync engine integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToolRunner } from '../services/toolRunner';

// Mock SyncEngine
const mockSyncEngine = {
  applyLocalChange: vi.fn(),
  queueWrite: vi.fn(),
  deleteShape: vi.fn()
};

// Mock store
const mockStore = {
  shapes: {},
  selectedIds: [],
  setSelectedIds: vi.fn()
};

const mockGetStore = () => mockStore;

// Mock current user
const mockUser = { uid: 'test-user-123' };

describe('ToolRunner', () => {
  let toolRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock store
    mockStore.shapes = {};
    mockStore.selectedIds = [];
    
    // Create fresh ToolRunner instance
    toolRunner = createToolRunner(mockSyncEngine, mockGetStore, mockUser);
  });

  describe('Tool Registration', () => {
    it('should create a ToolRunner instance', () => {
      expect(toolRunner).toBeDefined();
      expect(typeof toolRunner.execute).toBe('function');
      expect(typeof toolRunner.setCurrentUser).toBe('function');
    });
  });

  describe('createShape Tool', () => {
    it('should create a rectangle successfully', async () => {
      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'rectangle',
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          fill: '#ff0000'
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Created rectangle');
      expect(result.createdShapeIds).toHaveLength(1);
      
      // Should call sync engine
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledTimes(1);
      expect(mockSyncEngine.queueWrite).toHaveBeenCalledTimes(1);
      
      // Check sync engine was called with correct data
      const applyCall = mockSyncEngine.applyLocalChange.mock.calls[0];
      const shapeData = applyCall[1];
      expect(shapeData.type).toBe('rectangle');
      expect(shapeData.x).toBe(100);
      expect(shapeData.y).toBe(200);
      expect(shapeData.fill).toBe('#ff0000');
      expect(shapeData.createdBy).toBe('test-user-123');
    });

    it('should create a text shape with proper text properties', async () => {
      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'text',
          x: 300,
          y: 400,
          text: 'Hello World',
          fontSize: 24,
          fill: '#0000ff'
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('text "Hello World"');
      
      const applyCall = mockSyncEngine.applyLocalChange.mock.calls[0];
      const shapeData = applyCall[1];
      expect(shapeData.type).toBe('text');
      expect(shapeData.text).toBe('Hello World');
      expect(shapeData.fontSize).toBe(24);
      expect(shapeData.fontFamily).toBe('Arial');
    });

    it('should validate required parameters', async () => {
      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'rectangle'
          // Missing x, y coordinates
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be numbers');
    });

    it('should validate color format', async () => {
      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'rectangle',
          x: 100,
          y: 200,
          fill: 'invalid-color'
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('valid hex color');
    });
  });

  describe('selectShapes Tool', () => {
    beforeEach(() => {
      // Setup mock shapes in store
      mockStore.shapes = {
        'shape1': { id: 'shape1', type: 'rectangle', x: 100, y: 200, fill: '#ff0000' },
        'shape2': { id: 'shape2', type: 'ellipse', x: 300, y: 400, fill: '#00ff00' },
        'shape3': { id: 'shape3', type: 'text', x: 500, y: 600, text: 'Hello' }
      };
      // Set viewport context shapes in ToolRunner (simulates AI viewport filtering)
      toolRunner.setContextShapes(mockStore.shapes);
    });

    it('should select shapes by type', async () => {
      const toolCall = {
        name: 'selectShapes',
        arguments: {
          criteria: { type: 'rectangle' }
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Selected 1 shape');
      expect(mockStore.setSelectedIds).toHaveBeenCalledWith(['shape1']);
    });

    it('should select shapes by color', async () => {
      const toolCall = {
        name: 'selectShapes',
        arguments: {
          criteria: { color: 'red' }
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(mockStore.setSelectedIds).toHaveBeenCalledWith(['shape1']);
    });

    it('should select most recent shape', async () => {
      // Add timestamps to mock shapes
      mockStore.shapes.shape1.clientTimestamp = 1000;
      mockStore.shapes.shape2.clientTimestamp = 2000; // Most recent
      mockStore.shapes.shape3.clientTimestamp = 1500;

      const toolCall = {
        name: 'selectShapes',
        arguments: {
          criteria: { position: 'recent' }
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(mockStore.setSelectedIds).toHaveBeenCalledWith(['shape2']);
    });

    it('should handle no matches', async () => {
      const toolCall = {
        name: 'selectShapes',
        arguments: {
          criteria: { type: 'nonexistent' }
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No shapes found');
      expect(mockStore.setSelectedIds).toHaveBeenCalledWith([]);
    });

    it('should prevent mass selection (safety check)', async () => {
      // Create a mock store with 15 shapes (more than MAX_SAFE_SELECTION = 10)
      const manyShapes = {};
      for (let i = 1; i <= 15; i++) {
        manyShapes[`shape${i}`] = {
          id: `shape${i}`,
          type: 'rectangle',
          x: i * 10,
          y: i * 10,
          width: 100,
          height: 100,
          fill: '#ff0000'
        };
      }

      mockStore.shapes = manyShapes;
      toolRunner.setContextShapes(manyShapes);

      const toolCall = {
        name: 'selectShapes',
        arguments: { criteria: { type: 'rectangle' } }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Found 15 shapes matching your criteria');
      expect(result.message).toContain('please be more specific');
      expect(result.error).toContain('Selection too broad');
      // Should NOT call setSelectedIds when safety check fails
      expect(mockStore.setSelectedIds).not.toHaveBeenCalled();
    });

    it('should fail on text search with no matches (safety check)', async () => {
      mockStore.shapes = {
        'shape1': { id: 'shape1', type: 'text', x: 100, y: 200, text: 'Existing text', fill: '#000000' }
      };
      toolRunner.setContextShapes(mockStore.shapes);

      const toolCall = {
        name: 'selectShapes',
        arguments: { criteria: { text: 'NonexistentText' } }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No text shapes found containing "NonexistentText"');
      expect(result.error).toContain('No text matches found');
      expect(mockStore.setSelectedIds).not.toHaveBeenCalled();
    });

    it('should prevent vague criteria with too many matches (safety check)', async () => {
      // Create 8 red shapes (more than 5, should trigger vague criteria check)
      const manyRedShapes = {};
      for (let i = 1; i <= 8; i++) {
        manyRedShapes[`shape${i}`] = {
          id: `shape${i}`,
          type: 'rectangle',
          x: i * 10,
          y: i * 10,
          width: 100,
          height: 100,
          fill: '#ff0000'
        };
      }

      mockStore.shapes = manyRedShapes;
      toolRunner.setContextShapes(manyRedShapes);

      const toolCall = {
        name: 'selectShapes',
        arguments: { criteria: { color: 'red' } } // Only one criteria = vague
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Found 8 shapes matching "color: red"');
      expect(result.message).toContain('Please be more specific');
      expect(result.error).toContain('Selection criteria too vague');
      expect(mockStore.setSelectedIds).not.toHaveBeenCalled();
    });

    it('should allow intentional mass selection with explicit "all" position', async () => {
      // Setup many shapes
      const manyShapes = {};
      for (let i = 1; i <= 20; i++) {
        manyShapes[`shape${i}`] = {
          id: `shape${i}`,
          type: 'rectangle',
          x: i * 10,
          y: i * 10,
          width: 100,
          height: 100,
          fill: '#ff0000'
        };
      }

      mockStore.shapes = manyShapes;
      toolRunner.setContextShapes(manyShapes);

      const toolCall = {
        name: 'selectShapes',
        arguments: { criteria: { position: 'all' } } // Explicit "all" should be allowed
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Selected 20 shapes');
      expect(mockStore.setSelectedIds).toHaveBeenCalledWith(Object.keys(manyShapes));
    });

    it('should allow intentional mass selection when selecting ALL visible shapes (zoomed out scenario)', async () => {
      // Setup 22 shapes, user selects all of them (suggests they zoomed out first)
      const allShapes = {};
      for (let i = 1; i <= 22; i++) {
        allShapes[`shape${i}`] = {
          id: `shape${i}`,
          type: 'rectangle',
          x: i * 10,
          y: i * 10,
          width: 100,
          height: 100,
          fill: '#ff0000'
        };
      }

      mockStore.shapes = allShapes;
      toolRunner.setContextShapes(allShapes);

      const toolCall = {
        name: 'selectShapes',
        arguments: { criteria: { type: 'rectangle' } } // Selects all 22 rectangles
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Selected 22 shapes');
      expect(mockStore.setSelectedIds).toHaveBeenCalledWith(Object.keys(allShapes));
    });
  });

  describe('updateSelectedShapes Tool', () => {
    beforeEach(() => {
      // Setup selected shape
      mockStore.shapes = {
        'shape1': { id: 'shape1', type: 'rectangle', x: 100, y: 200, width: 150, height: 100, fill: '#ff0000' }
      };
      mockStore.selectedIds = ['shape1'];
      // Set viewport context shapes in ToolRunner (simulates AI viewport filtering)
      toolRunner.setContextShapes(mockStore.shapes);
    });

    it('should move shape with relative positioning', async () => {
      const toolCall = {
        name: 'updateSelectedShapes',
        arguments: {
          deltaX: 200, // Move right 200px
          deltaY: -50  // Move up 50px
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('moved right 200px and up 50px');
      
      // Should call sync engine with correct position
      const applyCall = mockSyncEngine.applyLocalChange.mock.calls[0];
      const updates = applyCall[1];
      expect(updates.x).toBe(300); // 100 + 200
      expect(updates.y).toBe(150); // 200 - 50
    });

    it('should change color', async () => {
      const toolCall = {
        name: 'updateSelectedShapes',
        arguments: {
          fill: '#800080' // Purple
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('recolored');
      
      const applyCall = mockSyncEngine.applyLocalChange.mock.calls[0];
      const updates = applyCall[1];
      expect(updates.fill).toBe('#800080');
    });

    it('should scale shape', async () => {
      const toolCall = {
        name: 'updateSelectedShapes',
        arguments: {
          scaleWidth: 1.5,  // 50% bigger
          scaleHeight: 1.5
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('made bigger');
      
      const applyCall = mockSyncEngine.applyLocalChange.mock.calls[0];
      const updates = applyCall[1];
      expect(updates.width).toBe(225); // 150 * 1.5
      expect(updates.height).toBe(150); // 100 * 1.5
    });

    it('should handle no selected shapes', async () => {
      mockStore.selectedIds = []; // No selection

      const toolCall = {
        name: 'updateSelectedShapes',
        arguments: {
          fill: '#ff0000'
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No shapes currently selected');
    });
  });

  describe('getCanvasState Tool', () => {
    beforeEach(() => {
      mockStore.shapes = {
        'shape1': { id: 'shape1', type: 'rectangle', x: 100, y: 200 },
        'shape2': { id: 'shape2', type: 'ellipse', x: 300, y: 400 }
      };
      mockStore.selectedIds = ['shape1'];
      // Set viewport context shapes in ToolRunner (simulates AI viewport filtering)
      toolRunner.setContextShapes(mockStore.shapes);
    });

    it('should return canvas state', async () => {
      const toolCall = {
        name: 'getCanvasState',
        arguments: {}
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 shapes');
      expect(result.message).toContain('Selected:');
    });
  });

  describe('deleteShapes Tool', () => {
    beforeEach(() => {
      mockStore.shapes = {
        'shape1': { id: 'shape1', type: 'rectangle' },
        'shape2': { id: 'shape2', type: 'ellipse' }
      };
      // Set viewport context shapes in ToolRunner (simulates AI viewport filtering)
      toolRunner.setContextShapes(mockStore.shapes);
    });

    it('should delete specified shapes', async () => {
      const toolCall = {
        name: 'deleteShapes',
        arguments: {
          shapeIds: ['shape1', 'shape2']
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Deleted 2 shapes');
      
      // Should call deleteShape for each deletion
      expect(mockSyncEngine.deleteShape).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid shape IDs', async () => {
      const toolCall = {
        name: 'deleteShapes',
        arguments: {
          shapeIds: ['nonexistent']
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No shapes found');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool', async () => {
      const toolCall = {
        name: 'unknownTool',
        arguments: {}
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unknown function');
    });

    it('should handle sync engine errors', async () => {
      mockSyncEngine.applyLocalChange.mockImplementation(() => {
        throw new Error('Sync error');
      });

      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'rectangle',
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          fill: '#ff0000'
        }
      };

      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sync error');
    });
  });
});
