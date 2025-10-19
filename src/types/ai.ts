/**
 * AI Integration Type Definitions
 * 
 * Types specific to AI functionality including canvas context,
 * tool execution results, and AI service interfaces.
 */

import type { Shape } from './shapes';

// Canvas context passed to AI for decision making (viewport-aware)
export interface CanvasContext {
  shapes: Record<string, Shape>;
  selectedIds: string[];
  shapeCount: number;
  viewport: {
    x: number;
    y: number;
    zoom: number;
    width?: number;
    height?: number;
    bounds?: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
  };
}

// AI tool call structure
export interface AIToolCall {
  name: string;
  arguments: Record<string, any>;
}

// OpenAI service response
export interface OpenAIResponse {
  success: boolean;
  message?: string;
  toolCalls?: AIToolCall[];
  error?: string;
}

// Tool execution result
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  error?: string;
  createdShapeIds?: string[];
  updatedShapeIds?: string[];
  deletedShapeIds?: string[];
}

// Rate limiting information
export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
}
