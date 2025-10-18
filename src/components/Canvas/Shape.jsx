import React from 'react';
import { Rect } from 'react-konva';
import useCanvasStore from '../../store/canvasStore';

const Shape = React.memo(({ shape }) => {
  const selectedIdsSet = useCanvasStore(state => state.selectedIdsSet); // Only subscribe to selection
  
  const isSelected = selectedIdsSet.has(shape.id); // O(1) instead of O(n)
  
  // Default shape styles (Figma-like)
  const baseStyle = {
    fill: shape.fill || '#E2E8F0', // Light gray default
    stroke: isSelected ? '#3B82F6' : 'transparent', // Blue selection outline
    strokeWidth: isSelected ? 2 : 0,
  };
  
  // Render based on shape type
  if (shape.type === 'rectangle') {
    return (
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        {...baseStyle}
        listening={false} // Canvas handles all mouse interactions now
        // Figma-style hover effect (Canvas will handle hover via shape detection if needed)
      />
    );
  }
  
  // Future: Handle other shape types (circle, text, etc.)
  return null;
});

Shape.displayName = 'Shape';

export default Shape;
