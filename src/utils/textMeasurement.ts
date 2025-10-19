/**
 * Text Measurement Utilities
 * 
 * Shared logic for calculating text dimensions to avoid duplication
 * between TextEditor and Toolbar components.
 */

let measurementDiv: HTMLDivElement | null = null;

/**
 * Get or create the hidden measurement div for text calculations
 */
const getMeasurementDiv = (): HTMLDivElement => {
  if (!measurementDiv) {
    measurementDiv = document.createElement('div');
    measurementDiv.style.position = 'fixed';
    measurementDiv.style.top = '-9999px';
    measurementDiv.style.left = '-9999px';
    measurementDiv.style.visibility = 'hidden';
    measurementDiv.style.whiteSpace = 'pre-wrap';
    measurementDiv.style.wordBreak = 'break-word';
    document.body.appendChild(measurementDiv);
  }
  return measurementDiv;
};

export interface TextMeasurementOptions {
  text: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

/**
 * Calculate the required height for text content with given styling
 */
export const calculateTextHeight = (
  text: string, 
  fontSize: number, 
  fontFamily: string, 
  width: number,
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  }
): number => {
  const measureDiv = getMeasurementDiv();
  
  if (!text.trim()) {
    return Math.max(fontSize * 1.2, 24); // Minimum height
  }
  
  // Set up the measurement div with exact same styling including formatting
  measureDiv.style.fontSize = `${fontSize}px`;
  measureDiv.style.fontFamily = fontFamily;
  measureDiv.style.width = `${width}px`;
  measureDiv.style.fontWeight = formatting?.bold ? 'bold' : 'normal';
  measureDiv.style.fontStyle = formatting?.italic ? 'italic' : 'normal';
  measureDiv.style.textDecoration = (() => {
    const decorations = [];
    if (formatting?.underline) decorations.push('underline');
    if (formatting?.strikethrough) decorations.push('line-through');
    return decorations.join(' ');
  })();
  measureDiv.textContent = text || 'A'; // Ensure there's content to measure
  
  const height = measureDiv.scrollHeight;
  return Math.max(height, fontSize * 1.2); // Ensure minimum height
};

/**
 * Cleanup measurement div (call on app unmount if needed)
 */
export const cleanupMeasurement = (): void => {
  if (measurementDiv && document.body.contains(measurementDiv)) {
    document.body.removeChild(measurementDiv);
    measurementDiv = null;
  }
};
