import { Shape } from '../types/shapes';

/**
 * Viewport bounds definition
 */
export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Calculate viewport bounds based on canvas transform
 */
export function calculateViewportBounds(
  viewport: { x: number; y: number; zoom: number },
  canvasWidth: number,
  canvasHeight: number
): ViewportBounds {
  return {
    left: -viewport.x / viewport.zoom,
    top: -viewport.y / viewport.zoom,
    right: (-viewport.x + canvasWidth) / viewport.zoom,
    bottom: (-viewport.y + canvasHeight) / viewport.zoom
  };
}

/**
 * Filter shapes to only those visible in the current viewport
 */
export function getVisibleShapes(
  shapes: Record<string, Shape>,
  bounds: ViewportBounds
): Record<string, Shape> {
  const visibleShapes: Record<string, Shape> = {};
  
  for (const [id, shape] of Object.entries(shapes)) {
    // Check if shape overlaps with viewport bounds
    const shapeLeft = shape.x;
    const shapeTop = shape.y;
    const shapeRight = shape.x + (shape.width || 100); // Default fallback for width
    const shapeBottom = shape.y + (shape.height || 100); // Default fallback for height
    
    // Simple AABB (Axis-Aligned Bounding Box) intersection test
    const isVisible = !(
      shapeRight < bounds.left ||
      shapeLeft > bounds.right ||
      shapeBottom < bounds.top ||
      shapeTop > bounds.bottom
    );
    
    if (isVisible) {
      visibleShapes[id] = shape;
    }
  }
  
  return visibleShapes;
}

/**
 * Get default canvas dimensions accounting for UI elements
 */
export function getDefaultCanvasDimensions(aiPanelVisible: boolean = false): {
  canvasWidth: number;
  canvasHeight: number;
} {
  const leftSidebarWidth = 256; // w-64 = 256px
  const aiPanelWidth = aiPanelVisible ? 320 : 0; // w-80 = 320px
  const headerToolbarHeight = 100; // Approximate header + toolbar height
  
  return {
    canvasWidth: window.innerWidth - leftSidebarWidth - aiPanelWidth,
    canvasHeight: window.innerHeight - headerToolbarHeight
  };
}

/**
 * Get center point of current viewport
 */
export function getViewportCenter(
  viewport: { x: number; y: number; zoom: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const bounds = calculateViewportBounds(viewport, canvasWidth, canvasHeight);
  
  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2
  };
}
