/**
 * OpenAI Service - AI Integration for Canvas Operations
 * 
 * Provides structured function calling interface to OpenAI GPT-4o
 * with rate limiting, error handling, and canvas context awareness.
 */

import OpenAI from 'openai';
import type { ChatMessage, CanvasContext, OpenAIResponse } from '@/types';
import { devLog } from '@/utils/devSettings';

// Rate limiting state (in-memory, resets on page reload)
interface RateLimit {
  requests: number[];
  windowStart: number;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private rateLimit: RateLimit = {
    requests: [],
    windowStart: Date.now()
  };
  private readonly maxRequestsPerHour: number;

  constructor() {
    const apiKey = import.meta.env['VITE_OPENAI_API_KEY'];
    this.maxRequestsPerHour = parseInt(import.meta.env['VITE_AI_RATE_LIMIT'] || '50');

    if (!apiKey) {
      console.warn('OpenAI API key not found in environment variables');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
      });
    } catch (error) {
      console.warn('Failed to initialize OpenAI client:', error);
      this.client = null;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Check rate limiting (rolling window of 1 hour)
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Clean old requests outside the rolling window
    this.rateLimit.requests = this.rateLimit.requests.filter(
      timestamp => now - timestamp < oneHour
    );

    // Check if under rate limit
    if (this.rateLimit.requests.length >= this.maxRequestsPerHour) {
      return false;
    }

    // Add current request
    this.rateLimit.requests.push(now);
    return true;
  }

  /**
   * Generate system prompt with current canvas context
   */
  private generateSystemPrompt(context: CanvasContext): string {
    return `You are an AI assistant for CollabCanvas, a collaborative design tool. You can create and manipulate shapes on a shared canvas.

CURRENT VIEWPORT CONTEXT:
- Visible shapes in viewport: ${context.shapeCount} (you can only see/modify shapes currently visible)
- Selected shapes: ${context.selectedIds.length > 0 ? context.selectedIds.join(', ') : 'none'}
- Viewport bounds: left=${Math.round(context.viewport.bounds?.left || 0)}, top=${Math.round(context.viewport.bounds?.top || 0)}, right=${Math.round(context.viewport.bounds?.right || 1000)}, bottom=${Math.round(context.viewport.bounds?.bottom || 1000)}
- Zoom: ${Math.round((context.viewport.zoom || 1) * 100)}%

🔍 VIEWPORT LIMITATION:
- You can ONLY see and work with shapes currently visible in the user's viewport
- If user asks about shapes that aren't visible, explain they need to pan/zoom to include them
- For operations affecting many shapes (like alignment), user should zoom out first to include all target shapes

AVAILABLE TOOLS:
- createShape: Create new rectangle, ellipse, or text shapes
- selectShapes: Select shapes by description, type, color, or position
- updateSelectedShapes: Modify currently selected shapes (position, size, color, etc.)
- updateShape: Modify specific shape by ID (if you know the exact ID)
- deleteShapes: Remove shapes from canvas (selected shapes or by description)
- getCanvasState: Get current canvas information

SHAPE IDENTIFICATION & PRONOUNS:
- Use selectShapes FIRST to find shapes by description ("the red rectangle", "all blue circles", "it", "the shape")
- "it" = the most recently created or mentioned shape
- "them/they" = currently selected shapes  
- "that shape" = shape mentioned in previous message
- TEXT SEARCH: Supports fuzzy/partial matching - "Nate Shumway" will find "Nate Shumway is the BOSS"
- SEARCH TIPS: Use key words from text, partial phrases, or approximate spelling

🚨 SMART MASS SELECTION SAFETY:
- Accidentally selecting many shapes due to vague criteria will be rejected (max 10)
- ✅ INTENTIONAL mass selection is OK when patterns suggest user intent:
  * Explicit "all" requests: "select all shapes", "select all rectangles"
  * User zoomed out to see many shapes (suggests global operations like alignment)
  * Selecting most/all visible shapes (>80% of viewport)
  * Large numbers (>15) with simple criteria (user likely zoomed out purposefully)
- 🚨 ACCIDENTAL mass selection will be blocked:
  * Vague criteria matching many shapes unexpectedly
  * Text searches that fail (no fallback to select everything)
- When unsure what shape user means, ASK FOR CLARIFICATION instead of guessing
- For global operations (align, distribute), remind user to zoom out first if needed

⚠️⚠️ CRITICAL WORKFLOW - ALWAYS CHAIN COMMANDS FOR MODIFICATIONS ⚠️⚠️

When user requests ANY modification, you MUST call BOTH tools in sequence:

🔗 COMMAND CHAINING REQUIRED:
1. FIRST: Call selectShapes to identify the target shape(s)
2. IMMEDIATELY AFTER: Call updateSelectedShapes to make the actual changes

✅ CORRECT Examples:
- "move it right 200px" → selectShapes({criteria: {position: "recent"}}) + updateSelectedShapes({deltaX: 200})
- "move it left 50px" → selectShapes({criteria: {position: "recent"}}) + updateSelectedShapes({deltaX: -50})
- "move it up 100px" → selectShapes({criteria: {position: "recent"}}) + updateSelectedShapes({deltaY: -100})
- "change color to purple" → selectShapes({criteria: {position: "recent"}}) + updateSelectedShapes({fill: "#800080"})  
- "make it bigger" → selectShapes({criteria: {position: "recent"}}) + updateSelectedShapes({scaleWidth: 1.5, scaleHeight: 1.5})

❌ WRONG (DO NOT DO THIS):
- Just calling selectShapes without updateSelectedShapes
- Only selecting when user asks for modifications

🚨 CRITICAL: If user says "move it", "change it", "make it bigger", etc. - you MUST call BOTH tools!

SHAPE COORDINATE SYSTEM:
- Origin (0,0) is top-left
- Positive X goes right, positive Y goes down
- Default canvas view is roughly 0-1000 for both X and Y

POSITIONING GUIDELINES (Use viewport bounds for relative positions):
- "center/middle" = (${Math.round(((context.viewport.bounds?.left || 0) + (context.viewport.bounds?.right || 1000)) / 2)}, ${Math.round(((context.viewport.bounds?.top || 0) + (context.viewport.bounds?.bottom || 1000)) / 2)})
- "top left" = (${Math.round((context.viewport.bounds?.left || 0) + 50)}, ${Math.round((context.viewport.bounds?.top || 0) + 50)})
- "top right" = (${Math.round((context.viewport.bounds?.right || 1000) - 150)}, ${Math.round((context.viewport.bounds?.top || 0) + 50)})
- "bottom right" = (${Math.round((context.viewport.bounds?.right || 1000) - 150)}, ${Math.round((context.viewport.bounds?.bottom || 1000) - 100)})

MOVEMENT GUIDELINES:
- "move right" = add to x coordinate (positive X direction)
- "move left" = subtract from x coordinate (negative X direction)  
- "move up" = subtract from y coordinate (negative Y direction)
- "move down" = add to y coordinate (positive Y direction)

OTHER GUIDELINES:
- Always specify exact coordinates when creating shapes
- Use descriptive text for text shapes
- Choose appropriate colors (use hex format like #ff0000)
- Default shape size: 100x100 unless specified otherwise

Respond naturally and execute the appropriate tool calls to fulfill the user's request.`;
  }

  /**
   * Define available function schemas for OpenAI
   */
  private getFunctionSchemas() {
    return [
      {
        name: 'createShape',
        description: 'Create a new shape on the canvas',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['rectangle', 'ellipse', 'text'],
              description: 'Type of shape to create'
            },
            x: {
              type: 'number',
              description: 'X coordinate (horizontal position)'
            },
            y: {
              type: 'number', 
              description: 'Y coordinate (vertical position)'
            },
            width: {
              type: 'number',
              description: 'Width of the shape',
              minimum: 10
            },
            height: {
              type: 'number',
              description: 'Height of the shape',
              minimum: 10
            },
            fill: {
              type: 'string',
              description: 'Fill color in hex format (e.g., #ff0000)',
              pattern: '^#[0-9a-fA-F]{6}$'
            },
            text: {
              type: 'string',
              description: 'Text content (required for text shapes)'
            },
            fontSize: {
              type: 'number',
              description: 'Font size for text shapes',
              minimum: 8,
              maximum: 200
            }
          },
          required: ['type', 'x', 'y', 'width', 'height', 'fill']
        }
      },
      {
        name: 'updateShape',
        description: 'Update properties of an existing shape',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID of the shape to update'
            },
            x: { type: 'number', description: 'New X coordinate' },
            y: { type: 'number', description: 'New Y coordinate' },
            width: { type: 'number', description: 'New width', minimum: 10 },
            height: { type: 'number', description: 'New height', minimum: 10 },
            fill: {
              type: 'string',
              description: 'New fill color in hex format',
              pattern: '^#[0-9a-fA-F]{6}$'
            },
            text: { type: 'string', description: 'New text content' },
            fontSize: {
              type: 'number',
              description: 'New font size',
              minimum: 8,
              maximum: 200
            }
          },
          required: ['id']
        }
      },
      {
        name: 'selectShapes',
        description: 'Select shapes by description, type, color, position, or context (for pronouns like "it", "the red one")',
        parameters: {
          type: 'object',
          properties: {
            criteria: {
              type: 'object',
              description: 'Selection criteria - specify one or more',
              properties: {
                type: {
                  type: 'string',
                  enum: ['rectangle', 'ellipse', 'text'],
                  description: 'Shape type to select'
                },
                color: {
                  type: 'string',
                  description: 'Color to match (hex format like #ff0000 or color name like "red")'
                },
                text: {
                  type: 'string',
                  description: 'Text content to match (for text shapes)'
                },
                position: {
                  type: 'string',
                  enum: ['recent', 'last', 'newest', 'all'],
                  description: 'Position/context: "recent"=last created, "all"=select all matching'
                },
                description: {
                  type: 'string',
                  description: 'Natural description like "the big blue rectangle" or "all red shapes"'
                }
              }
            },
            addToSelection: {
              type: 'boolean',
              description: 'If true, add to current selection. If false, replace selection.',
              default: false
            }
          },
          required: ['criteria']
        }
      },
      {
        name: 'updateSelectedShapes',
        description: 'Modify all currently selected shapes (use after selectShapes)',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Set absolute X coordinate (applies to all selected)' },
            y: { type: 'number', description: 'Set absolute Y coordinate (applies to all selected)' },
            deltaX: { type: 'number', description: 'Move right (+) or left (-) by this amount in pixels' },
            deltaY: { type: 'number', description: 'Move down (+) or up (-) by this amount in pixels' },
            width: { type: 'number', description: 'New width', minimum: 10 },
            height: { type: 'number', description: 'New height', minimum: 10 },
            fill: {
              type: 'string',
              description: 'New fill color in hex format',
              pattern: '^#[0-9a-fA-F]{6}$'
            },
            text: { type: 'string', description: 'New text content (for text shapes)' },
            fontSize: {
              type: 'number',
              description: 'New font size (for text shapes)',
              minimum: 8,
              maximum: 200
            },
            scaleWidth: {
              type: 'number',
              description: 'Scale width by factor (1.5 = 50% bigger, 0.8 = 20% smaller)',
              minimum: 0.1,
              maximum: 5
            },
            scaleHeight: {
              type: 'number',
              description: 'Scale height by factor (1.5 = 50% bigger, 0.8 = 20% smaller)', 
              minimum: 0.1,
              maximum: 5
            }
          }
        }
      },
      {
        name: 'deleteShapes',
        description: 'Delete one or more shapes from the canvas',
        parameters: {
          type: 'object',
          properties: {
            shapeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of shape IDs to delete',
              minItems: 1
            }
          },
          required: ['shapeIds']
        }
      },
      {
        name: 'getCanvasState',
        description: 'Get current canvas state and shape information',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  /**
   * Send chat completion request to OpenAI with function calling
   */
  async sendChatCompletion(
    messages: ChatMessage[],
    canvasContext: CanvasContext
  ): Promise<OpenAIResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'AI service is not available. Please check your API key configuration.'
      };
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      return {
        success: false,
        error: `Rate limit exceeded. Please try again later. (${this.maxRequestsPerHour} requests per hour)`
      };
    }

    try {
      // Convert ChatMessage[] to OpenAI format
      const openaiMessages = [
        { role: 'system' as const, content: this.generateSystemPrompt(canvasContext) },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      devLog.ai('Sending OpenAI request:', {
        messageCount: openaiMessages.length,
        contextShapes: canvasContext.shapeCount,
        selectedShapes: canvasContext.selectedIds.length
      });

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: openaiMessages,
        tools: this.getFunctionSchemas().map(schema => ({
          type: 'function',
          function: schema
        })),
        tool_choice: 'auto',
        max_tokens: 1000,
        temperature: 0.7
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      const response: OpenAIResponse = {
        success: true,
        ...(choice.message.content && { message: choice.message.content })
      };

      // Handle multiple tool calls (modern tools API)
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        response.toolCalls = [];
        
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type === 'function') {
            try {
              const functionArgs = JSON.parse(toolCall.function.arguments);
              response.toolCalls.push({
                name: toolCall.function.name,
                arguments: functionArgs
              });
              
              devLog.ai('Received tool call:', {
                function: toolCall.function.name,
                arguments: functionArgs
              });
            } catch (parseError) {
              console.warn('Failed to parse tool arguments:', parseError);
              response.error = 'Invalid tool call format from AI';
              response.success = false;
              break;
            }
          }
        }
        
        devLog.ai(`Processing ${response.toolCalls?.length || 0} tool calls`);
      }

      return response;

    } catch (error: any) {
      console.warn('OpenAI API Error:', error);
      
      // Provide specific error messages for common issues
      let userMessage = 'AI is currently unavailable. Please try again later.';
      
      if (error.code === 'insufficient_quota') {
        userMessage = 'AI quota exceeded. Please check your OpenAI account.';
      } else if (error.code === 'model_not_found') {
        userMessage = 'AI model unavailable. Please try again later.';
      } else if (error.message?.includes('rate limit')) {
        userMessage = 'AI is temporarily rate limited. Please try again in a moment.';
      }

      return {
        success: false,
        error: userMessage
      };
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetTime: number } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Clean old requests
    this.rateLimit.requests = this.rateLimit.requests.filter(
      timestamp => now - timestamp < oneHour
    );

    const remaining = Math.max(0, this.maxRequestsPerHour - this.rateLimit.requests.length);
    const oldestRequest = this.rateLimit.requests[0];
    const resetTime = oldestRequest ? oldestRequest + oneHour : now;

    return { remaining, resetTime };
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
