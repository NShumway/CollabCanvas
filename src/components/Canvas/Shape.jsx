import React from 'react';
import { Rect, Ellipse, Text } from 'react-konva';
import useCanvasStore from '@/store/canvasStore';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

const Shape = React.memo(({ shape }) => {
  const selectedIdsSet = useCanvasStore(state => state.selectedIdsSet); // Only subscribe to selection
  const selectionColor = useCanvasStore(state => state.selectionColor); // Dynamic selection color
  const editingTextId = useCanvasStore(state => state.editingTextId); // Subscribe to text editing state
  
  const isSelected = selectedIdsSet.has(shape.id); // O(1) instead of O(n)
  
  // Default shape styles (Figma-like) - consistent across all shapes
  // Uses dynamic selection color that adapts to avoid conflicts with shape colors
  const baseStyle = {
    fill: shape.fill ?? SHAPE_DEFAULTS.FILL,
    stroke: isSelected ? selectionColor : 'transparent',
    strokeWidth: isSelected ? SHAPE_DEFAULTS.SELECTION_STROKE_WIDTH : 0,
  };
  
  // Render based on shape type
  switch (shape.type) {
    case 'rectangle': {
      // Ensure all properties are defined with fallbacks  
      const x = shape.x ?? 0;
      const y = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.RECTANGLE_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.RECTANGLE_HEIGHT;
      
      return (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          {...baseStyle}
          listening={false} // Canvas handles all mouse interactions
        />
      );
    }
      
    case 'ellipse': {
      // Ensure all properties are defined with fallbacks
      const x = shape.x ?? 0;
      const y = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.ELLIPSE_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.ELLIPSE_HEIGHT;
      
      return (
        <Ellipse
          x={x + width / 2}
          y={y + height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          {...baseStyle}
          listening={false}
        />
      );
    }
      
    // Removed: line case (line shapes eliminated)
      
    case 'text': {
      // Don't render text shapes that are currently being edited
      // This prevents double text (overlay + original) during editing
      if (editingTextId === shape.id) {
        return null;
      }

      // Ensure all text properties are defined with fallbacks
      const x = shape.x ?? 0;
      const y = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.TEXT_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.TEXT_HEIGHT;
      const textFill = shape.fill ?? SHAPE_DEFAULTS.FILL;
      
      return (
        <>
          {/* Selection background for text (when selected) */}
          {isSelected && (
            <Rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill="transparent"
              stroke={selectionColor}
              strokeWidth={SHAPE_DEFAULTS.SELECTION_STROKE_WIDTH}
              listening={false}
            />
          )}
          
          {/* Text with preserved color */}
          <Text
            x={x}
            y={y}
            text={shape.text ?? SHAPE_DEFAULTS.TEXT_CONTENT}
            fontSize={shape.fontSize ?? SHAPE_DEFAULTS.TEXT_FONT_SIZE}
            fontFamily={shape.fontFamily ?? SHAPE_DEFAULTS.TEXT_FONT_FAMILY}
            fontStyle={(() => {
              const bold = shape.bold ? 'bold' : 'normal';
              const italic = shape.italic ? 'italic' : '';
              return italic ? `${bold} ${italic}` : bold;
            })()}
            textDecoration={(() => {
              const decorations = [];
              if (shape.underline) decorations.push('underline');
              if (shape.strikethrough) decorations.push('line-through');
              return decorations.join(' ');
            })()}
            align={shape.textAlign ?? SHAPE_DEFAULTS.TEXT_ALIGN}
            width={width}
            height={height}
            fill={textFill} // 🎯 Always preserve the actual text color
            listening={false}
          />
        </>
      );
    }
      
    default:
      return null;
  }
});

Shape.displayName = 'Shape';

export default Shape;
