/**
 * AI Integration Tests
 * End-to-end tests for AI workflows and command chaining
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openaiService } from '../services/openai';
import { createToolRunner } from '../services/toolRunner';

// Mock OpenAI API responses
const mockOpenAIResponse = (toolCalls = []) => ({
  choices: [{
    message: {
      content: 'I\'ll help you with that.',
      tool_calls: toolCalls.map(call => ({
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.stringify(call.arguments)
        }
      }))
    }
  }]
});

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
const mockUser = { uid: 'test-user-123' };

describe('AI Integration', () => {
  let toolRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock store
    mockStore.shapes = {};
    mockStore.selectedIds = [];
    
    // Create fresh ToolRunner instance
    toolRunner = createToolRunner(mockSyncEngine, mockGetStore, mockUser);
    
    // Reset any existing mocks
    vi.clearAllMocks();
  });

  describe('Single Tool Execution', () => {
    it('should create a red ellipse at specified coordinates', async () => {
      // Mock OpenAI to return createShape tool call
      const mockResponse = mockOpenAIResponse([
        {
          name: 'createShape',
          arguments: {
            type: 'ellipse',
            x: 100,
            y: 200,
            width: 150,
            height: 100,
            fill: '#ff0000'
          }
        }
      ]);

      // Skip OpenAI mocking for now - focus on ToolRunner testing

      // Test ToolRunner directly with a tool call
      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'ellipse',
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          fill: '#ff0000'
        }
      };

      // Execute the tool
      const result = await toolRunner.execute(toolCall);

      expect(result.success).toBe(true);
      expect(result.message).toContain('ellipse at (100, 200)');
      
      // Verify sync calls
      expect(mockSyncEngine.applyLocalChange).toHaveBeenCalledTimes(1);
      expect(mockSyncEngine.queueWrite).toHaveBeenCalledTimes(1);
      
      const shapeData = mockSyncEngine.applyLocalChange.mock.calls[0][1];
      expect(shapeData.type).toBe('ellipse');
      expect(shapeData.x).toBe(100);
      expect(shapeData.y).toBe(200);
      expect(shapeData.fill).toBe('#ff0000');
    });
  });

  describe('Command Chaining', () => {
    it('should select and then update a shape (move + color change)', async () => {
      // Setup existing shape
      const testShapes = {
        'existing-shape': { 
          id: 'existing-shape', 
          type: 'rectangle', 
          x: 100, 
          y: 200, 
          width: 150, 
          height: 100, 
          fill: '#0000ff',
          clientTimestamp: Date.now()
        }
      };
      mockStore.shapes = testShapes;
      // Set viewport context shapes in ToolRunner (simulates AI viewport filtering)
      toolRunner.setContextShapes(testShapes);

      // Test command chaining with ToolRunner directly
      const toolCall1 = {
        name: 'selectShapes',
        arguments: {
          criteria: { position: 'recent' }
        }
      };

      const toolCall2 = {
        name: 'updateSelectedShapes',
        arguments: {
          deltaX: 200,
          fill: '#800080'
        }
      };

      // Execute first tool (selectShapes)
      const selectResult = await toolRunner.execute(toolCall1);
      expect(selectResult.success).toBe(true);
      expect(mockStore.setSelectedIds).toHaveBeenCalledWith(['existing-shape']);

      // Simulate selection for second tool
      mockStore.selectedIds = ['existing-shape'];

      // Execute second tool (updateSelectedShapes)
      const updateResult = await toolRunner.execute(toolCall2);
      expect(updateResult.success).toBe(true);
      expect(updateResult.message).toContain('moved right 200px');
      expect(updateResult.message).toContain('recolored');

      // Verify sync calls for update
      const updateCall = mockSyncEngine.applyLocalChange.mock.calls.find(call => 
        call[0] === 'existing-shape' && call[1].x !== undefined
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1].x).toBe(300); // 100 + 200
      expect(updateCall[1].fill).toBe('#800080');
    });

    it('should handle make it bigger command', async () => {
      // Setup existing shape
      const testShapes = {
        'existing-shape': { 
          id: 'existing-shape', 
          type: 'ellipse', 
          x: 300, 
          y: 400, 
          width: 100, 
          height: 80, 
          fill: '#00ff00',
          clientTimestamp: Date.now()
        }
      };
      mockStore.shapes = testShapes;
      toolRunner.setContextShapes(testShapes);

      // Test scaling with ToolRunner directly
      const selectTool = {
        name: 'selectShapes',
        arguments: {
          criteria: { position: 'recent' }
        }
      };

      const scaleTool = {
        name: 'updateSelectedShapes',
        arguments: {
          scaleWidth: 1.5,
          scaleHeight: 1.5
        }
      };

      // Execute tools
      await toolRunner.execute(selectTool);
      mockStore.selectedIds = ['existing-shape'];
      
      const updateResult = await toolRunner.execute(scaleTool);
      expect(updateResult.success).toBe(true);
      expect(updateResult.message).toContain('made bigger');

      // Verify scaling
      const updateCall = mockSyncEngine.applyLocalChange.mock.calls.find(call => 
        call[0] === 'existing-shape' && call[1].width !== undefined
      );
      expect(updateCall[1].width).toBe(150); // 100 * 1.5
      expect(updateCall[1].height).toBe(120); // 80 * 1.5
    });
  });

  describe('Text Shape Workflows', () => {
    it('should create text with proper text properties', async () => {
      // Test text creation with ToolRunner directly
      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'text',
          x: 400,
          y: 300,
          text: 'Hello World',
          fontSize: 24,
          fill: '#000000'
        }
      };

      const result = await toolRunner.execute(toolCall);
      expect(result.success).toBe(true);

      // Verify text properties
      const shapeData = mockSyncEngine.applyLocalChange.mock.calls[0][1];
      expect(shapeData.type).toBe('text');
      expect(shapeData.text).toBe('Hello World');
      expect(shapeData.fontSize).toBe(24);
      expect(shapeData.fontFamily).toBe('Arial');
      expect(shapeData.textAlign).toBe('left');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle ToolRunner execution errors', async () => {
      // Test ToolRunner error handling directly
      const invalidTool = {
        name: 'unknownTool',
        arguments: {}
      };

      const result = await toolRunner.execute(invalidTool);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid tool arguments', async () => {
      const invalidToolCall = {
        name: 'createShape',
        arguments: {
          type: 'rectangle'
          // Missing required x, y
        }
      };

      const result = await toolRunner.execute(invalidToolCall);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle tool execution failures gracefully', async () => {
      // Mock sync engine to throw error
      mockSyncEngine.applyLocalChange.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const toolCall = {
        name: 'createShape',
        arguments: {
          type: 'rectangle',
          x: 100,
          y: 200
        }
      };

      const result = await toolRunner.execute(toolCall);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Canvas State Awareness', () => {
    it('should include canvas context in system prompt', () => {
      const mockContext = {
        shapes: {
          'shape1': { id: 'shape1', type: 'rectangle', x: 100, y: 200 },
          'shape2': { id: 'shape2', type: 'ellipse', x: 300, y: 400 }
        },
        selectedIds: ['shape1'],
        shapeCount: 2,
        viewport: { 
          x: 0, y: 0, zoom: 1, width: 1000, height: 1000,
          bounds: { left: 0, top: 0, right: 1000, bottom: 1000 }
        }
      };

      const prompt = openaiService.generateSystemPrompt(mockContext);
      
      expect(prompt).toContain('CRITICAL WORKFLOW');
      expect(prompt).toContain('selectShapes');
      expect(prompt).toContain('updateSelectedShapes');
      expect(prompt).toContain('POSITIONING GUIDELINES');
      expect(typeof prompt).toBe('string');
    });
  });
});
