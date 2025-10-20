/**
 * ToolRunner - Executes AI Function Calls via SyncEngine
 * 
 * Maps AI function calls to canvas operations through the existing
 * sync pipeline. All AI changes use the same path as human interactions.
 * 
 * Architecture:
 * AI Function Call → ToolRunner → SyncEngine → Firestore → All Clients
 */

import type { SyncEngine } from './syncEngine';
import type { Shape, ShapeType, CurrentUser, AIToolCall, ToolExecutionResult } from '@/types';
import { devLog } from '@/utils/devSettings';
import { createShape, calculateMaxZIndex } from '@/utils/shapeCreation';
import { applyShapeUpdate, applyShapeScaling, applyRelativeMovement, describeShapeUpdates } from '@/utils/shapeUpdates';
import { matchesText } from '@/utils/textMatching';
import { alignShapes, distributeShapes, type AlignmentType, type DistributionType } from '@/utils/alignment';

// AI Tool argument interfaces for better type safety
interface AlignShapesArgs {
  shapeIds: string[];
  alignment: AlignmentType;
}

interface DistributeShapesArgs {
  shapeIds: string[];
  direction: DistributionType;
}

// Constants for validation
const MIN_SHAPES_FOR_ALIGNMENT = 2;
const MIN_SHAPES_FOR_DISTRIBUTION = 3;

export class ToolRunner {
  private contextShapes: Record<string, any> = {};
  
  constructor(
    private syncEngine: SyncEngine,
    private getStore: () => any,
    private currentUser: CurrentUser | null = null
  ) {}
  
  /**
   * Set the context shapes (viewport-filtered) for AI operations
   */
  setContextShapes(shapes: Record<string, any>): void {
    this.contextShapes = shapes;
  }

  /**
   * Update current user context
   */
  setCurrentUser(user: CurrentUser | null): void {
    this.currentUser = user;
  }

  /**
   * Detect if mass selection is intentional based on criteria patterns
   */
  private detectIntentionalMassSelection(
    criteria: any, 
    matchingIds: string[], 
    shapes: Record<string, any>
  ): boolean {
    // 1. Explicit "all" position keyword
    if (criteria.position === 'all') {
      return true;
    }

    // 2. User is selecting ALL visible shapes (zoomed out for global operations)
    const totalVisibleShapes = Object.keys(shapes).length;
    if (matchingIds.length === totalVisibleShapes && totalVisibleShapes > 20) {
      // If selecting ALL shapes and there are MANY, it's likely intentional (user zoomed out)
      return true;
    }

    // 3. Common "select all X" patterns that indicate intent
    const criteriaKeys = Object.keys(criteria).filter(key => criteria[key]);
    if (criteriaKeys.length === 1 && matchingIds.length > 25) {
      // Very large number suggests user zoomed out specifically for global operations
      // e.g., "select all rectangles" when zoomed out to see all 50 rectangles
      return true;
    }

    // 4. If matching most visible shapes AND there are many shapes, probably intentional
    const matchPercentage = matchingIds.length / totalVisibleShapes;
    if (matchPercentage > 0.8 && totalVisibleShapes > 20) {
      // Only consider intentional if there are MANY shapes (>20) and selecting most of them
      return true;
    }

    // Otherwise, treat as potentially accidental
    return false;
  }

  /**
   * Execute an AI tool call
   */
  async execute(toolCall: AIToolCall): Promise<ToolExecutionResult> {
    const { name, arguments: args } = toolCall;
    
    try {
      devLog.ai(`Executing AI tool: ${name}`, args);

      switch (name) {
        case 'createShape':
          return await this.handleCreateShape(args);
        
        case 'selectShapes':
          return await this.handleSelectShapes(args);
        
        case 'updateSelectedShapes':
          return await this.handleUpdateSelectedShapes(args);
        
        case 'updateShape':
          return await this.handleUpdateShape(args);
        
        case 'deleteShapes':
          return await this.handleDeleteShapes(args);
        
        case 'getCanvasState':
          return await this.handleGetCanvasState(args);
        
        case 'alignShapes':
          return await this.handleAlignShapes(args as AlignShapesArgs);
        
        case 'distributeShapes':
          return await this.handleDistributeShapes(args as DistributeShapesArgs);
        
        default:
          return {
            success: false,
            message: `Unknown tool: ${name}`,
            error: `AI requested unknown function: ${name}`
          };
      }
    } catch (error: any) {
      console.warn(`Error executing AI tool ${name}:`, error);
      return {
        success: false,
        message: 'Failed to execute AI command',
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Create a new shape using existing shape creation infrastructure
   */
  private async handleCreateShape(args: any): Promise<ToolExecutionResult> {
    const { type, x, y, width, height, fill, text, fontSize } = args;

    // Basic validation - let createShape handle the rest
    if (!type || !['rectangle', 'ellipse', 'text'].includes(type)) {
      return {
        success: false,
        message: 'Invalid shape type specified',
        error: `Invalid type: ${type}. Must be rectangle, ellipse, or text.`
      };
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return {
        success: false,
        message: 'Invalid shape position specified',
        error: 'x and y must be numbers'
      };
    }

    if (!fill || typeof fill !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(fill)) {
      return {
        success: false,
        message: 'Invalid color specified',
        error: 'fill must be a valid hex color (e.g., #ff0000)'
      };
    }

    // Text shapes require text content
    if (type === 'text' && (!text || typeof text !== 'string')) {
      return {
        success: false,
        message: 'Text shapes require text content',
        error: 'text field is required for text shapes'
      };
    }

    try {
      // Calculate max z-index from all shapes (for proper global layering)
      const store = this.getStore();
      const maxZIndex = calculateMaxZIndex(store.shapes || {});

      // Use existing createShape infrastructure - same as manual creation!
      const customProps: any = { fill };
      
      // Add dimensions for non-text shapes
      if (type !== 'text') {
        if (typeof width !== 'number' || typeof height !== 'number') {
          return {
            success: false,
            message: 'Invalid shape dimensions specified',
            error: 'width and height must be numbers for rectangle and ellipse shapes'
          };
        }
        customProps.width = Math.max(10, Math.round(width));
        customProps.height = Math.max(10, Math.round(height));
      } else {
        // For text shapes, include text properties (createShape will handle defaults)
        customProps.text = text;
        if (fontSize && typeof fontSize === 'number') {
          customProps.fontSize = Math.max(8, Math.min(200, fontSize));
        }
        // Add optional dimensions if provided
        if (width && typeof width === 'number') customProps.width = Math.round(width);
        if (height && typeof height === 'number') customProps.height = Math.round(height);
      }

      // 🎯 LEVERAGE EXISTING INFRASTRUCTURE - same as Canvas.jsx manual creation
      const newShape = createShape({
        type: type as ShapeType,
        x: Math.round(x),
        y: Math.round(y),
        userId: this.currentUser?.uid || 'ai-user',
        maxZIndex,
        ...customProps
      });

      // Use EXACT same sync pattern as Canvas.jsx
      this.syncEngine.applyLocalChange(newShape.id, newShape);
      this.syncEngine.queueWrite(newShape.id, newShape, true); // immediate = true for AI

      devLog.ai(`Created ${type} shape:`, { 
        id: newShape.id, 
        x: newShape.x, 
        y: newShape.y, 
        width: newShape.width, 
        height: newShape.height, 
        fill: newShape.fill 
      });

      // Return success message
      const shapeDescription = type === 'text' ? 
        `text "${text}" at (${x}, ${y})` : 
        `${type} at (${x}, ${y}) with size ${newShape.width}×${newShape.height}`;

      return {
        success: true,
        message: `Created ${shapeDescription}`,
        createdShapeIds: [newShape.id]
      };

    } catch (error: any) {
      console.warn('Error in handleCreateShape:', error);
      return {
        success: false,
        message: 'Failed to create shape',
        error: error.message
      };
    }
  }

  /**
   * Select shapes by criteria (supports pronouns and descriptions)
   */
  private async handleSelectShapes(args: any): Promise<ToolExecutionResult> {
    const { criteria, addToSelection = false } = args;
    
    if (!criteria || typeof criteria !== 'object') {
      return {
        success: false,
        message: 'Selection criteria is required',
        error: 'criteria field must be an object'
      };
    }

    try {
      const store = this.getStore();
      // 🎯 CRITICAL FIX: Use viewport-filtered shapes, not all shapes from store
      const shapes = this.contextShapes || {};
      const currentSelectedIds = store.selectedIds || [];
      const matchingIds: string[] = [];

      // Find shapes matching criteria
      for (const [id, shape] of Object.entries(shapes)) {
        const typedShape = shape as Shape;
        let matches = true;
        
        // Check type match
        if (criteria.type && typedShape.type !== criteria.type) {
          matches = false;
        }
        
        // Check color match (flexible - hex or color name)
        if (criteria.color && matches) {
          const shapeColor = typedShape.fill?.toLowerCase() || '';
          const searchColor = criteria.color.toLowerCase();
          
          // Handle color name to hex conversion
          const colorMap: Record<string, string> = {
            'red': '#ff0000', 'blue': '#0000ff', 'green': '#00ff00',
            'yellow': '#ffff00', 'purple': '#800080', 'orange': '#ffa500',
            'pink': '#ffc0cb', 'black': '#000000', 'white': '#ffffff',
            'gray': '#808080', 'grey': '#808080'
          };
          
          const targetColor = colorMap[searchColor] || searchColor;
          
          if (!shapeColor.includes(targetColor.replace('#', ''))) {
            matches = false;
          }
        }
        
        // Check text content match with STRICT fuzzy/partial matching
        if (criteria.text && matches && typedShape.type === 'text') {
          const shapeText = (typedShape as any).text || '';
          const searchText = criteria.text;
          // 🚨 SAFETY: Use stricter threshold (70%) to prevent accidental mass selection
          if (!matchesText(shapeText, searchText, 0.7)) {
            matches = false;
          }
        }
        
        if (matches) {
          matchingIds.push(id);
        }
      }

      // Handle position/context criteria
      if (criteria.position && matchingIds.length > 0) {
        if (criteria.position === 'recent' || criteria.position === 'last' || criteria.position === 'newest') {
          // Find most recently created/updated shape
          const sortedByTime = matchingIds.sort((a, b) => {
            const shapeA = shapes[a] as Shape;
            const shapeB = shapes[b] as Shape;
            const timeA = (shapeA as any).clientTimestamp || (shapeA as any).updatedAt || 0;
            const timeB = (shapeB as any).clientTimestamp || (shapeB as any).updatedAt || 0;
            return timeB - timeA; // Most recent first
          });
          matchingIds.splice(1); // Keep only the most recent
          if (sortedByTime[0]) {
            matchingIds[0] = sortedByTime[0];
          }
        }
        // 'all' means keep all matches (no filtering)
      }

      // 🚨 CRITICAL SAFETY CHECK: Prevent ACCIDENTAL mass selection, but allow INTENTIONAL mass operations
      const MAX_SAFE_SELECTION = 10;
      const isIntentionalMassSelection = this.detectIntentionalMassSelection(criteria, matchingIds, shapes);
      
      if (matchingIds.length > MAX_SAFE_SELECTION && !isIntentionalMassSelection) {
        return {
          success: false,
          message: `Found ${matchingIds.length} shapes matching your criteria. This seems like a lot - please be more specific to avoid accidental changes. If you want to select many shapes for a global operation (like alignment), try: "select all [type]" or zoom out to include all target shapes first.`,
          error: `Selection too broad: ${matchingIds.length} shapes matched. Maximum safe selection is ${MAX_SAFE_SELECTION} shapes.`
        };
      }

      // 🚨 TEXT SEARCH SAFETY: If searching by text and no matches, fail clearly
      if (criteria.text && matchingIds.length === 0) {
        return {
          success: false,
          message: `No text shapes found containing "${criteria.text}". Try using key words or partial phrases from the text.`,
          error: 'No text matches found - check spelling or try different keywords'
        };
      }

      // 🚨 VAGUE CRITERIA SAFETY: If only searching by common type/color and too many matches (unless intentional)
      if (matchingIds.length > 5 && !criteria.text && !criteria.position && !isIntentionalMassSelection) {
        const criteriaTypes = Object.keys(criteria).filter(key => criteria[key]);
        if (criteriaTypes.length <= 1) { // Only one criteria type (like just "type" or just "color")
          return {
            success: false,
            message: `Found ${matchingIds.length} shapes matching "${criteriaTypes[0]}: ${Object.values(criteria)[0]}". Please be more specific (add text content, position, or other criteria) or if you want all of them, say "select all ${Object.values(criteria)[0]} shapes".`,
            error: 'Selection criteria too vague - add more specific criteria to narrow down the selection'
          };
        }
      }

      // Apply selection
      let finalSelectedIds: string[];
      
      if (addToSelection) {
        // Add to existing selection
        const newIds = matchingIds.filter(id => !currentSelectedIds.includes(id));
        finalSelectedIds = [...currentSelectedIds, ...newIds];
      } else {
        // Replace selection
        finalSelectedIds = matchingIds;
      }

      // Update store selection
      store.setSelectedIds(finalSelectedIds);

      devLog.ai(`Selected shapes:`, { 
        criteria, 
        foundIds: matchingIds, 
        finalSelection: finalSelectedIds 
      });

      // Build result message
      let message = '';
      if (matchingIds.length === 0) {
        message = 'No shapes found matching criteria';
      } else {
        const shapeDescriptions = matchingIds.map(id => {
          const shape = shapes[id] as any;
          return `${shape.type} at (${Math.round(shape.x)}, ${Math.round(shape.y)})`;
        });
        
        message = `Selected ${matchingIds.length} shape${matchingIds.length > 1 ? 's' : ''}: ${shapeDescriptions.join(', ')}`;
        
        if (addToSelection && currentSelectedIds.length > 0) {
          message += ` (added to existing selection)`;
        }
      }

      return {
        success: true,
        message,
        updatedShapeIds: finalSelectedIds
      };

    } catch (error: any) {
      console.warn('Error in handleSelectShapes:', error);
      return {
        success: false,
        message: 'Failed to select shapes',
        error: error.message
      };
    }
  }

  /**
   * Update all currently selected shapes using existing infrastructure
   */
  private async handleUpdateSelectedShapes(args: any): Promise<ToolExecutionResult> {
    const store = this.getStore();
    const selectedIds = store.selectedIds || [];
    
    if (selectedIds.length === 0) {
      return {
        success: false,
        message: 'No shapes selected. Use selectShapes first to choose which shapes to modify.',
        error: 'No shapes currently selected'
      };
    }

    try {
      const updatedIds: string[] = [];
      const shapes = store.shapes || {};
      
      for (const shapeId of selectedIds) {
        const existingShape = shapes[shapeId] as Shape | undefined;
        if (!existingShape) {
          continue; // Skip if shape doesn't exist
        }

        // Prepare updates with scaling and relative movement
        let processedUpdates = { ...args };
        
        // Handle scaling (convert to absolute dimensions)
        if ('scaleWidth' in args || 'scaleHeight' in args) {
          const { width, height } = applyShapeScaling(
            existingShape, 
            processedUpdates.scaleWidth, 
            processedUpdates.scaleHeight
          );
          processedUpdates.width = width;
          processedUpdates.height = height;
          // Remove scale properties as they're now converted
          delete processedUpdates.scaleWidth;
          delete processedUpdates.scaleHeight;
        }

        // Handle relative movement (convert to absolute position)
        if ('deltaX' in args || 'deltaY' in args) {
          const { x, y } = applyRelativeMovement(
            existingShape,
            processedUpdates.deltaX,
            processedUpdates.deltaY
          );
          processedUpdates.x = x;
          processedUpdates.y = y;
          // Keep deltaX/deltaY for description but they won't affect applyShapeUpdate
        }

        try {
          // 🎯 LEVERAGE EXISTING INFRASTRUCTURE - same validation & sync as Canvas.jsx!
          applyShapeUpdate(
            shapeId,
            processedUpdates,
            existingShape,
            this.syncEngine,
            true, // immediate = true for AI
            this.currentUser?.uid || 'ai-user'
          );
          
          updatedIds.push(shapeId);
        } catch (updateError: any) {
          // Handle individual shape update errors gracefully
          console.warn(`Failed to update shape ${shapeId}:`, updateError.message);
          continue;
        }
      }

      if (updatedIds.length === 0) {
        return {
          success: false,
          message: 'No valid updates specified for selected shapes',
          error: 'At least one valid property must be updated'
        };
      }

      // Build description using utility
      const description = describeShapeUpdates(args);

      devLog.ai(`Updated selected shapes:`, {
        selectedCount: selectedIds.length,
        updatedCount: updatedIds.length,
        updatedIds,
        updates: args
      });

      return {
        success: true,
        message: `Updated ${updatedIds.length} selected shape${updatedIds.length > 1 ? 's' : ''}: ${description}`,
        updatedShapeIds: updatedIds
      };

    } catch (error: any) {
      console.warn('Error in handleUpdateSelectedShapes:', error);
      return {
        success: false,
        message: 'Failed to update selected shapes',
        error: error.message
      };
    }
  }

  /**
   * Update an existing shape
   */
  private async handleUpdateShape(args: any): Promise<ToolExecutionResult> {
    const { id, ...updates } = args;
    
    if (!id || typeof id !== 'string') {
      return {
        success: false,
        message: 'Shape ID is required for updates',
        error: 'id field is required'
      };
    }

    try {
      // Check if shape exists in viewport context (AI can only modify visible shapes)
      const existingShape = this.contextShapes[id] as Shape | undefined;
      
      if (!existingShape) {
        return {
          success: false,
          message: 'Shape not found in current viewport',
          error: `No shape found with ID: ${id} in visible area`
        };
      }

      // 🎯 LEVERAGE EXISTING INFRASTRUCTURE - same validation & sync as Canvas.jsx!
      const { appliedUpdates } = applyShapeUpdate(
        id,
        updates,
        existingShape,
        this.syncEngine,
        true, // immediate = true for AI
        this.currentUser?.uid || 'ai-user'
      );

      // Build description using utility
      const description = describeShapeUpdates(updates);

      devLog.ai(`Updated shape ${id}:`, appliedUpdates);

      return {
        success: true,
        message: `Updated shape: ${description}`,
        updatedShapeIds: [id]
      };

    } catch (error: any) {
      console.warn('Error in handleUpdateShape:', error);
      return {
        success: false,
        message: 'Failed to update shape',
        error: error.message
      };
    }
  }

  /**
   * Delete one or more shapes
   */
  private async handleDeleteShapes(args: any): Promise<ToolExecutionResult> {
    const { shapeIds } = args;
    
    if (!Array.isArray(shapeIds) || shapeIds.length === 0) {
      return {
        success: false,
        message: 'Shape IDs array is required',
        error: 'shapeIds must be a non-empty array'
      };
    }

    if (!shapeIds.every(id => typeof id === 'string')) {
      return {
        success: false,
        message: 'All shape IDs must be strings',
        error: 'Invalid shape ID format'
      };
    }

    try {
      const existingIds: string[] = [];
      const missingIds: string[] = [];

      // Check which shapes exist in viewport context (AI can only delete visible shapes)
      for (const id of shapeIds) {
        if (this.contextShapes[id]) {
          existingIds.push(id);
        } else {
          missingIds.push(id);
        }
      }

      if (existingIds.length === 0) {
        return {
          success: false,
          message: 'No shapes found to delete',
          error: `No shapes found with IDs: ${shapeIds.join(', ')}`
        };
      }

      // Delete existing shapes via SyncEngine
      for (const id of existingIds) {
        this.syncEngine.deleteShape(id);
      }

      devLog.ai(`Deleted shapes:`, existingIds);

      // Build result message
      let message = `Deleted ${existingIds.length} shape${existingIds.length > 1 ? 's' : ''}`;
      if (missingIds.length > 0) {
        message += ` (${missingIds.length} not found)`;
      }

      return {
        success: true,
        message,
        deletedShapeIds: existingIds
      };

    } catch (error: any) {
      console.warn('Error in handleDeleteShapes:', error);
      return {
        success: false,
        message: 'Failed to delete shapes',
        error: error.message
      };
    }
  }

  /**
   * Get current canvas state for AI context
   */
  private async handleGetCanvasState(_args: any): Promise<ToolExecutionResult> {
    try {
      const store = this.getStore();
      // Report only viewport-visible shapes (consistent with AI context)
      const shapes = this.contextShapes;
      const shapeCount = Object.keys(shapes).length;
      const selectedIds = store.selectedIds || []; // Selection is global

      // Build readable canvas summary
      const shapesByType: Record<string, number> = {};
      const selectedShapes: string[] = [];
      
      Object.values(shapes).forEach((shape: any) => {
        shapesByType[shape.type] = (shapesByType[shape.type] || 0) + 1;
        if (selectedIds.includes(shape.id)) {
          selectedShapes.push(`${shape.type} at (${shape.x}, ${shape.y})`);
        }
      });

      const typeSummary = Object.entries(shapesByType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');

      let message = `Visible in viewport: ${shapeCount} shape${shapeCount !== 1 ? 's' : ''}`;
      if (typeSummary) {
        message += ` (${typeSummary})`;
      }
      
      if (selectedShapes.length > 0) {
        message += `. Selected: ${selectedShapes.join(', ')}`;
      } else {
        message += '. No shapes selected';
      }

      devLog.ai('Canvas state requested:', {
        shapeCount,
        selectedCount: selectedIds.length,
        types: shapesByType
      });

      return {
        success: true,
        message
      };

    } catch (error: any) {
      console.warn('Error in handleGetCanvasState:', error);
      return {
        success: false,
        message: 'Failed to get canvas state',
        error: error.message
      };
    }
  }

  /**
   * Align shapes using existing alignment infrastructure
   */
  private async handleAlignShapes(args: AlignShapesArgs): Promise<ToolExecutionResult> {
    const { shapeIds, alignment } = args;
    
    if (!Array.isArray(shapeIds) || shapeIds.length < MIN_SHAPES_FOR_ALIGNMENT) {
      return {
        success: false,
        message: `At least ${MIN_SHAPES_FOR_ALIGNMENT} shape IDs are required for alignment`,
        error: `shapeIds must be an array with at least ${MIN_SHAPES_FOR_ALIGNMENT} elements`
      };
    }

    const validAlignments: AlignmentType[] = ['left', 'center', 'right', 'top', 'middle', 'bottom'];
    if (!alignment || !validAlignments.includes(alignment)) {
      return {
        success: false,
        message: `Invalid alignment type. Must be one of: ${validAlignments.join(', ')}`,
        error: `Invalid alignment: ${alignment}`
      };
    }

    try {
      // Filter to only shapes that exist in viewport context (AI can only align visible shapes)
      const existingIds = shapeIds.filter((id: string) => this.contextShapes[id]);
      
      if (existingIds.length < MIN_SHAPES_FOR_ALIGNMENT) {
        return {
          success: false,
          message: `Only ${existingIds.length} of the specified shapes are visible. At least ${MIN_SHAPES_FOR_ALIGNMENT} shapes must be visible for alignment.`,
          error: 'Insufficient visible shapes for alignment'
        };
      }

      // Use existing alignment infrastructure
      const result = await alignShapes(
        existingIds,
        alignment as AlignmentType,
        this.contextShapes,
        this.syncEngine,
        undefined, // No node refs in AI context - using fallback calculation
        this.currentUser || undefined
      );

      devLog.ai(`AI alignment (${alignment}):`, { 
        requestedIds: shapeIds, 
        alignedIds: result.updatedShapeIds,
        success: result.success 
      });

      return result;

    } catch (error: any) {
      console.warn('Error in handleAlignShapes:', error);
      return {
        success: false,
        message: 'Failed to align shapes',
        error: error.message
      };
    }
  }

  /**
   * Distribute shapes using existing distribution infrastructure
   */
  private async handleDistributeShapes(args: DistributeShapesArgs): Promise<ToolExecutionResult> {
    const { shapeIds, direction } = args;
    
    if (!Array.isArray(shapeIds) || shapeIds.length < MIN_SHAPES_FOR_DISTRIBUTION) {
      return {
        success: false,
        message: `At least ${MIN_SHAPES_FOR_DISTRIBUTION} shape IDs are required for distribution`,
        error: `shapeIds must be an array with at least ${MIN_SHAPES_FOR_DISTRIBUTION} elements`
      };
    }

    const validDirections: DistributionType[] = ['horizontal', 'vertical'];
    if (!direction || !validDirections.includes(direction)) {
      return {
        success: false,
        message: `Invalid distribution direction. Must be 'horizontal' or 'vertical'`,
        error: `Invalid direction: ${direction}`
      };
    }

    try {
      // Filter to only shapes that exist in viewport context (AI can only distribute visible shapes)
      const existingIds = shapeIds.filter((id: string) => this.contextShapes[id]);
      
      if (existingIds.length < MIN_SHAPES_FOR_DISTRIBUTION) {
        return {
          success: false,
          message: `Only ${existingIds.length} of the specified shapes are visible. At least ${MIN_SHAPES_FOR_DISTRIBUTION} shapes must be visible for distribution.`,
          error: 'Insufficient visible shapes for distribution'
        };
      }

      // Use existing distribution infrastructure
      const result = await distributeShapes(
        existingIds,
        direction as DistributionType,
        this.contextShapes,
        this.syncEngine,
        undefined, // No node refs in AI context - using fallback calculation
        this.currentUser || undefined
      );

      devLog.ai(`AI distribution (${direction}):`, { 
        requestedIds: shapeIds, 
        distributedIds: result.updatedShapeIds,
        success: result.success 
      });

      return result;

    } catch (error: any) {
      console.warn('Error in handleDistributeShapes:', error);
      return {
        success: false,
        message: 'Failed to distribute shapes',
        error: error.message
      };
    }
  }
}

/**
 * Create a ToolRunner instance
 * Must be initialized with SyncEngine and store getter
 */
export const createToolRunner = (
  syncEngine: SyncEngine,
  getStore: () => any,
  currentUser: CurrentUser | null = null
): ToolRunner => {
  return new ToolRunner(syncEngine, getStore, currentUser);
};
