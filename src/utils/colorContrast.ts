/**
 * Dynamic Selection Color Utility
 * 
 * Automatically adjusts selection highlight color to ensure visibility
 * against shape colors. Follows patterns from Figma, Sketch, and Illustrator.
 * 
 * Default: Blue (#3B82F6)  
 * Alternative: Orange (#EA580C) when blue would be too similar
 */

// Selection color options
const SELECTION_COLORS = {
  DEFAULT: '#3B82F6',    // Blue (current default)
  ALTERNATIVE: '#EA580C', // Orange (high contrast alternative)
} as const;

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string | undefined): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result && result[1] && result[2] && result[3] ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate perceptual color distance using weighted RGB
 * Based on human eye sensitivity (similar to what design tools use)
 */
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1000; // Return high distance for invalid colors
  
  // Weighted RGB distance (accounts for human eye sensitivity)
  // Red = 30%, Green = 59%, Blue = 11% (standard luminance weights)
  const rWeight = 0.3;
  const gWeight = 0.59;
  const bWeight = 0.11;
  
  const deltaR = (rgb1.r - rgb2.r) * rWeight;
  const deltaG = (rgb1.g - rgb2.g) * gWeight;
  const deltaB = (rgb1.b - rgb2.b) * bWeight;
  
  return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
}

/**
 * Determine the best selection color for given shape colors
 * 
 * @param shapeColors Array of hex colors from selected shapes
 * @returns Hex color string for selection highlight
 */
export function getOptimalSelectionColor(shapeColors: string[]): string {
  if (shapeColors.length === 0) {
    return SELECTION_COLORS.DEFAULT;
  }
  
  // Distance threshold - if any shape is closer than this, switch colors
  // Tuned based on testing with common design tool scenarios
  const SIMILARITY_THRESHOLD = 80;
  
  // Check if default blue conflicts with any selected shape
  const hasBlueConflict = shapeColors.some(shapeColor => {
    if (!shapeColor) return false; // Skip undefined colors
    const distance = colorDistance(SELECTION_COLORS.DEFAULT, shapeColor);
    return distance < SIMILARITY_THRESHOLD;
  });
  
  if (hasBlueConflict) {
    // Check if orange alternative would also conflict
    const hasOrangeConflict = shapeColors.some(shapeColor => {
      if (!shapeColor) return false; // Skip undefined colors
      const distance = colorDistance(SELECTION_COLORS.ALTERNATIVE, shapeColor);
      return distance < SIMILARITY_THRESHOLD;
    });
    
    // If orange doesn't conflict, use it. Otherwise, stick with blue
    // (In practice, it's rare for both blue AND orange to conflict)
    return hasOrangeConflict ? SELECTION_COLORS.DEFAULT : SELECTION_COLORS.ALTERNATIVE;
  }
  
  return SELECTION_COLORS.DEFAULT;
}

/**
 * Get selection color for a single shape (convenience function)
 */
export function getSelectionColorForShape(shapeColor: string | undefined): string {
  return getOptimalSelectionColor(shapeColor ? [shapeColor] : []);
}
