/**
 * AI Prompt Generation Utilities
 * 
 * Separates prompt content from logic, making it easier to maintain
 * and modify AI instructions without touching complex code.
 */

import { CANVAS_DEFAULTS } from './aiConstants';
import type { CanvasContext, PromptSection } from '../types/aiTypes';

// === PROMPT CONTENT SECTIONS ===

const getContextSection = (context: CanvasContext): PromptSection => {
  const viewport = context.viewport;
  const bounds = viewport.bounds;
  
  return {
    title: 'CURRENT VIEWPORT CONTEXT',
    priority: 1,
    content: `
- Visible shapes in viewport: ${context.shapeCount} (you can only see/modify shapes currently visible)
- Selected shapes: ${context.selectedIds.length > 0 ? context.selectedIds.join(', ') : 'none'}
- Viewport bounds: left=${Math.round(bounds.left)}, top=${Math.round(bounds.top)}, right=${Math.round(bounds.right)}, bottom=${Math.round(bounds.bottom)}
- Zoom: ${Math.round(viewport.zoom * 100)}%`
  };
};

const getToolsSection = (): PromptSection => ({
  title: 'AVAILABLE TOOLS',
  priority: 2,
  content: `
- createShape: Create new rectangle, ellipse, or text shapes
- selectShapes: Select shapes by description, type, color, or position
- updateSelectedShapes: Modify currently selected shapes (position, size, color, etc.)
- updateShape: Modify specific shape by ID (if you know the exact ID)
- deleteShapes: Remove shapes from canvas (selected shapes or by description)
- getCanvasState: Get current canvas information`
});

const getIdentificationSection = (): PromptSection => ({
  title: 'SHAPE IDENTIFICATION & PRONOUNS',
  priority: 3,
  content: `
- Use selectShapes FIRST to find shapes by description ("the red rectangle", "all blue circles", "it", "the shape")
- "it" = the most recently created or mentioned shape
- "them/they" = currently selected shapes  
- "that shape" = shape mentioned in previous message
- TEXT SEARCH: Supports fuzzy/partial matching - "Nate Shumway" will find "Nate Shumway is the BOSS"
- SEARCH TIPS: Use key words from text, partial phrases, or approximate spelling`
});

const getSafetySection = (): PromptSection => ({
  title: '🚨 CRITICAL SAFETY RULES - PREVENT MASS SELECTION DISASTERS',
  priority: 4,
  content: `
- NEVER select more than 10 shapes at once (system will reject)
- If text search finds no matches, the operation will FAIL (no fallback to "select all")
- Be SPECIFIC in selection criteria - vague searches like "all rectangles" may fail if too many match
- When unsure what shape user means, ASK FOR CLARIFICATION instead of guessing
- Better to select NOTHING than to accidentally select everything`
});

const getWorkflowSection = (): PromptSection => ({
  title: '⚠️⚠️ CRITICAL WORKFLOW - ALWAYS CHAIN COMMANDS FOR MODIFICATIONS ⚠️⚠️',
  priority: 5,
  content: `
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

🚨 CRITICAL: If user says "move it", "change it", "make it bigger", etc. - you MUST call BOTH tools!`
});

const getCoordinateSystemSection = (): PromptSection => ({
  title: 'SHAPE COORDINATE SYSTEM',
  priority: 6,
  content: `
- Origin (0,0) is top-left
- Positive X goes right, positive Y goes down
- Default canvas view is roughly 0-1000 for both X and Y`
});

const getPositioningSection = (context: CanvasContext): PromptSection => {
  const bounds = context.viewport.bounds;
  const centerX = Math.round((bounds.left + bounds.right) / 2);
  const centerY = Math.round((bounds.top + bounds.bottom) / 2);
  const leftOffset = Math.round(bounds.left + CANVAS_DEFAULTS.POSITION_OFFSET);
  const topOffset = Math.round(bounds.top + CANVAS_DEFAULTS.POSITION_OFFSET);
  const rightOffset = Math.round(bounds.right - CANVAS_DEFAULTS.SHAPE_SIZE_OFFSET);
  const bottomOffset = Math.round(bounds.bottom - CANVAS_DEFAULTS.SHAPE_DEFAULT_SIZE);
  
  return {
    title: 'POSITIONING GUIDELINES (Use viewport bounds for relative positions)',
    priority: 7,
    content: `
- "center/middle" = (${centerX}, ${centerY})
- "top left" = (${leftOffset}, ${topOffset})
- "top right" = (${rightOffset}, ${topOffset})
- "bottom right" = (${rightOffset}, ${bottomOffset})`
  };
};

const getMovementSection = (): PromptSection => ({
  title: 'MOVEMENT GUIDELINES',
  priority: 8,
  content: `
- "move right" = add to x coordinate (positive X direction)
- "move left" = subtract from x coordinate (negative X direction)  
- "move up" = subtract from y coordinate (negative Y direction)
- "move down" = add to y coordinate (positive Y direction)`
});

const getGeneralGuidelinesSection = (): PromptSection => ({
  title: 'OTHER GUIDELINES',
  priority: 9,
  content: `
- Always specify exact coordinates when creating shapes
- Use descriptive text for text shapes
- Choose appropriate colors (use hex format like #ff0000)
- Default shape size: ${CANVAS_DEFAULTS.SHAPE_DEFAULT_SIZE}x${CANVAS_DEFAULTS.SHAPE_DEFAULT_SIZE} unless specified otherwise

Respond naturally and execute the appropriate tool calls to fulfill the user's request.`
});

// === PROMPT ASSEMBLY ===

/**
 * Generate the complete system prompt for AI
 */
export const generateSystemPrompt = (context: CanvasContext): string => {
  const sections: PromptSection[] = [
    getContextSection(context),
    getToolsSection(),
    getIdentificationSection(),
    getSafetySection(),
    getWorkflowSection(),
    getCoordinateSystemSection(),
    getPositioningSection(context),
    getMovementSection(),
    getGeneralGuidelinesSection()
  ];
  
  // Sort by priority and build the prompt
  const sortedSections = sections.sort((a, b) => a.priority - b.priority);
  
  const promptParts = [
    'You are an AI assistant for CollabCanvas, a collaborative design tool. You can create and manipulate shapes on a shared canvas.',
    '',
    ...sortedSections.map(section => `${section.title}:${section.content}`)
  ];
  
  return promptParts.join('\n');
};

/**
 * Generate context summary for debugging/logging
 */
export const generateContextSummary = (context: CanvasContext): string => {
  return `Shapes: ${context.shapeCount}, Selected: ${context.selectedIds.length}, Viewport: ${Math.round(context.viewport.bounds.left)},${Math.round(context.viewport.bounds.top)} to ${Math.round(context.viewport.bounds.right)},${Math.round(context.viewport.bounds.bottom)}, Zoom: ${Math.round(context.viewport.zoom * 100)}%`;
};

/**
 * Validate that context has required properties for prompt generation
 */
export const validatePromptContext = (context: CanvasContext): boolean => {
  return !!(
    context &&
    typeof context.shapeCount === 'number' &&
    Array.isArray(context.selectedIds) &&
    context.viewport &&
    context.viewport.bounds &&
    typeof context.viewport.zoom === 'number'
  );
};

// === CUSTOMIZATION HELPERS ===

/**
 * Add custom section to prompt (for specialized use cases)
 */
export const createCustomSection = (
  title: string,
  content: string,
  priority: number = 10
): PromptSection => ({
  title,
  content,
  priority
});

/**
 * Generate prompt with custom sections
 */
export const generateCustomPrompt = (
  context: CanvasContext,
  customSections: PromptSection[] = []
): string => {
  const baseSections = [
    getContextSection(context),
    getToolsSection(),
    getIdentificationSection(),
    getSafetySection(),
    getWorkflowSection(),
    getCoordinateSystemSection(),
    getPositioningSection(context),
    getMovementSection(),
    getGeneralGuidelinesSection()
  ];
  
  const allSections = [...baseSections, ...customSections]
    .sort((a, b) => a.priority - b.priority);
  
  const promptParts = [
    'You are an AI assistant for CollabCanvas, a collaborative design tool. You can create and manipulate shapes on a shared canvas.',
    '',
    ...allSections.map(section => `${section.title}:${section.content}`)
  ];
  
  return promptParts.join('\n');
};
