import React from 'react';
import { Rect, Circle, Line, Text } from 'react-konva';
import useCanvasStore from '@/store/canvasStore';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

const Shape = React.memo(({ shape }) => {
  const selectedIdsSet = useCanvasStore(state => state.selectedIdsSet); // Only subscribe to selection
  
  const isSelected = selectedIdsSet.has(shape.id); // O(1) instead of O(n)
  
  // Default shape styles (Figma-like) - consistent across all shapes
  const baseStyle = {
    fill: shape.fill || SHAPE_DEFAULTS.FILL,
    stroke: isSelected ? SHAPE_DEFAULTS.SELECTION_COLOR : 'transparent',
    strokeWidth: isSelected ? SHAPE_DEFAULTS.SELECTION_STROKE_WIDTH : 0,
  };
  
  // Render based on shape type
  switch (shape.type) {
    case 'rectangle':
      return (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...baseStyle}
          listening={false} // Canvas handles all mouse interactions
        />
      );
      
    case 'circle':
      return (
        <Circle
          x={shape.x}
          y={shape.y}
          radius={shape.radius}
          {...baseStyle}
          listening={false}
        />
      );
      
    case 'line':
      return (
        <Line
          x={shape.x} // ✅ Line anchor point
          y={shape.y} // ✅ Line anchor point
          points={shape.points} // Now relative to x,y: [0, 0, 100, 0]
          stroke={isSelected ? SHAPE_DEFAULTS.SELECTION_COLOR : shape.fill} // ✅ Consistent selection styling
          strokeWidth={isSelected 
            ? (shape.strokeWidth || SHAPE_DEFAULTS.LINE_STROKE_WIDTH) + SHAPE_DEFAULTS.SELECTION_STROKE_WIDTH 
            : (shape.strokeWidth || SHAPE_DEFAULTS.LINE_STROKE_WIDTH)
          }
          lineCap={shape.lineCap || SHAPE_DEFAULTS.LINE_CAP}
          fill={undefined} // Lines don't have fill
          listening={false}
        />
      );
      
    case 'text':
      return (
        <Text
          x={shape.x}
          y={shape.y}
          text={shape.text}
          fontSize={shape.fontSize}
          fontFamily={shape.fontFamily}
          align={shape.textAlign}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          stroke={isSelected ? SHAPE_DEFAULTS.SELECTION_COLOR : 'transparent'}
          strokeWidth={isSelected ? SHAPE_DEFAULTS.SELECTION_STROKE_WIDTH : 0}
          listening={false}
        />
      );
      
    default:
      return null;
  }
});

Shape.displayName = 'Shape';

export default Shape;
