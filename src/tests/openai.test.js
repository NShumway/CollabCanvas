/**
 * OpenAI Service Tests
 * Tests for API integration, rate limiting, and response parsing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openaiService } from '../services/openai';

// Mock OpenAI API
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

describe('OpenAI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limit state
    openaiService.requests = [];
    openaiService.windowStart = Date.now();
  });

  describe('Configuration', () => {
    it('should check if configured correctly', () => {
      // Test the current configuration state
      const isConfigured = openaiService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('Rate Limiting', () => {
    it('should track rate limit status', () => {
      const status = openaiService.getRateLimitStatus();
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
      expect(typeof status.remaining).toBe('number');
      expect(typeof status.resetTime).toBe('number');
    });

    it('should start with full rate limit', () => {
      const status = openaiService.getRateLimitStatus();
      expect(status.remaining).toBe(50); // Default rate limit
    });

    it('should decrease remaining requests after API calls', async () => {
      // Mock successful API response
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response',
            tool_calls: []
          }
        }]
      };

      // Access the mocked OpenAI instance
      const mockOpenAI = openaiService.client;
      if (mockOpenAI?.chat?.completions?.create) {
        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      }

      const mockContext = {
        shapes: {},
        selectedIds: [],
        shapeCount: 0,
        viewport: { x: 0, y: 0, zoom: 1, width: 1000, height: 1000 }
      };

      await openaiService.sendChatCompletion(
        [{ role: 'user', content: 'test' }],
        mockContext
      );

      const status = openaiService.getRateLimitStatus();
      expect(status.remaining).toBe(49);
    });
  });

  describe('System Prompt Generation', () => {
    it('should generate system prompt with canvas context', () => {
      const mockContext = {
        shapes: { 
          'shape1': { id: 'shape1', type: 'rectangle', x: 100, y: 200 }
        },
        selectedIds: ['shape1'],
        shapeCount: 1,
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
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe('Function Schemas', () => {
    it('should provide function schemas for OpenAI', () => {
      const schemas = openaiService.getFunctionSchemas();
      
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);
      
      // Check for required AI tools
      const functionNames = schemas.map(schema => schema.name);
      expect(functionNames).toContain('createShape');
      expect(functionNames).toContain('selectShapes');
      expect(functionNames).toContain('updateSelectedShapes');
      expect(functionNames).toContain('deleteShapes');
      expect(functionNames).toContain('getCanvasState');
    });

    it('should have valid createShape schema', () => {
      const schemas = openaiService.getFunctionSchemas();
      const createShape = schemas.find(s => s.name === 'createShape');
      
      expect(createShape).toBeDefined();
      expect(createShape.description).toContain('Create a new shape');
      expect(createShape.parameters.properties).toHaveProperty('type');
      expect(createShape.parameters.properties).toHaveProperty('x');
      expect(createShape.parameters.properties).toHaveProperty('y');
      expect(createShape.parameters.required).toContain('type');
      expect(createShape.parameters.required).toContain('x');
      expect(createShape.parameters.required).toContain('y');
    });
  });

  describe('API Response Handling', () => {
    it('should handle successful response without tool calls', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'I understand your request.',
            tool_calls: null
          }
        }]
      };

      const mockOpenAI = openaiService.client;
      if (mockOpenAI?.chat?.completions?.create) {
        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      }

      const mockContext = {
        shapes: {},
        selectedIds: [],
        shapeCount: 0,
        viewport: { x: 0, y: 0, zoom: 1, width: 1000, height: 1000 }
      };

      const result = await openaiService.sendChatCompletion(
        [{ role: 'user', content: 'Hello' }],
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('I understand your request.');
      expect(result.toolCalls).toBeUndefined();
    });

    it('should handle response with tool calls', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Creating a shape for you.',
            tool_calls: [{
              type: 'function',
              function: {
                name: 'createShape',
                arguments: '{"type": "rectangle", "x": 100, "y": 200, "width": 150, "height": 100, "fill": "#ff0000"}'
              }
            }]
          }
        }]
      };

      const mockOpenAI = openaiService.client;
      if (mockOpenAI?.chat?.completions?.create) {
        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      }

      const mockContext = {
        shapes: {},
        selectedIds: [],
        shapeCount: 0,
        viewport: { x: 0, y: 0, zoom: 1, width: 1000, height: 1000 }
      };

      const result = await openaiService.sendChatCompletion(
        [{ role: 'user', content: 'Create a red rectangle' }],
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Creating a shape for you.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('createShape');
      expect(result.toolCalls[0].arguments.type).toBe('rectangle');
    });

    it('should handle API errors gracefully', async () => {
      const mockOpenAI = openaiService.client;
      if (mockOpenAI?.chat?.completions?.create) {
        mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));
      }

      const mockContext = {
        shapes: {},
        selectedIds: [],
        shapeCount: 0,
        viewport: { x: 0, y: 0, zoom: 1, width: 1000, height: 1000 }
      };

      const result = await openaiService.sendChatCompletion(
        [{ role: 'user', content: 'test' }],
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
