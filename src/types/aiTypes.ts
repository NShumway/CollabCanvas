/**
 * AI-Specific Type Definitions
 * 
 * Strong typing for AI function arguments, selection criteria, and internal operations.
 * Replaces loose `any` types with proper interfaces.
 */

import type { ShapeType } from './shapes';

// === SELECTION CRITERIA ===
export interface SelectionCriteria {
  type?: ShapeType;
  color?: string;
  text?: string;
  position?: PositionCriteria;
}

export type PositionCriteria = 'recent' | 'last' | 'newest' | 'latest' | 'all';

export interface SelectShapesArgs {
  criteria: SelectionCriteria;
  addToSelection?: boolean;
}

// === SHAPE UPDATES ===
export interface ShapeUpdateArgs {
  // Position
  x?: number;
  y?: number;
  deltaX?: number;
  deltaY?: number;
  
  // Size
  width?: number;
  height?: number;
  scaleWidth?: number;
  scaleHeight?: number;
  
  // Appearance
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  
  // Other
  rotation?: number;
  opacity?: number;
}

export interface UpdateSelectedShapesArgs extends ShapeUpdateArgs {}

export interface UpdateShapeArgs extends ShapeUpdateArgs {
  id: string;
}

// === SHAPE CREATION ===
export interface CreateShapeArgs {
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

// === OTHER TOOL ARGS ===
export interface DeleteShapesArgs {
  shapeIds: string[];
}

export interface GetCanvasStateArgs {
  // No arguments needed
}

// === TOOL EXECUTION RESULT ===
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  error?: string;
  updatedShapeIds?: string[];
  createdShapeId?: string;
}

// === AI TOOL CALL ===
export interface AIToolCall {
  name: string;
  arguments: 
    | SelectShapesArgs 
    | UpdateSelectedShapesArgs 
    | UpdateShapeArgs 
    | CreateShapeArgs 
    | DeleteShapesArgs 
    | GetCanvasStateArgs;
}

// === SHAPE MATCHING ===
export interface ShapeMatchResult {
  shapeId: string;
  matchScore: number;
  matchReason: string;
}

export interface TextMatchOptions {
  threshold?: number;
  strictMode?: boolean;
  allowFuzzy?: boolean;
}

// === CANVAS CONTEXT EXTENSIONS ===
export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CanvasContext {
  shapes: Record<string, any>; // TODO: Replace with proper Shape type
  selectedIds: string[];
  shapeCount: number;
  viewport: {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
    bounds: ViewportBounds;
  };
}

// === SAFETY CHECK RESULTS ===
export interface SafetyCheckResult {
  passed: boolean;
  reason?: string;
  errorMessage?: string;
}

// === RATE LIMITING ===
export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  isExceeded: boolean;
}

// === ERROR TYPES ===
export type AIErrorType = 
  | 'SELECTION_TOO_BROAD'
  | 'NO_TEXT_MATCHES' 
  | 'VAGUE_CRITERIA'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AI_NOT_CONFIGURED'
  | 'TOOL_SYSTEM_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'EXECUTION_ERROR';

export interface AIError {
  type: AIErrorType;
  message: string;
  context?: Record<string, any>;
}

// === PROMPT GENERATION ===
export interface PromptContext {
  canvasContext: CanvasContext;
  userMessage?: string;
  chatHistory?: Array<{ role: string; content: string }>;
}

export interface PromptSection {
  title: string;
  content: string;
  priority: number;
}

// === TEXT PROCESSING ===
export interface TextProcessingResult {
  normalizedText: string;
  keyTerms: string[];
  wordCount: number;
  isShortText: boolean;
}

export interface SimilarityResult {
  score: number;
  matchType: 'exact' | 'contains' | 'fuzzy' | 'word-based';
  confidence: 'high' | 'medium' | 'low';
}
