import React, { useRef, useEffect } from 'react';
import { Rect, Ellipse, Text, Group } from 'react-konva';
import useCanvasStore from '@/store/canvasStore';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

const Shape = React.memo(({ shape, onShapeRef, onDragEnd }) => {
  const shapeRef = useRef();
  const selectedIdsSet = useCanvasStore(state => state.selectedIdsSet); // Only subscribe to selection
  const selectionColor = useCanvasStore(state => state.selectionColor); // Dynamic selection color
  const editingTextId = useCanvasStore(state => state.editingTextId); // Subscribe to text editing state
  
  const isSelected = selectedIdsSet.has(shape.id); // O(1) instead of O(n)
  
  // Prevent event bubbling to stage - shape handles its own drag
  const handleDragStart = (e) => {
    e.cancelBubble = true; // Prevent stage from receiving this drag event
  };

  // Update React state during drag to keep Konva and React in sync
  const handleDragMove = (e) => {
    e.cancelBubble = true; // Prevent stage from receiving this drag event
    const node = e.target;
    if (onDragEnd) {
      // Update React state immediately during drag
      onDragEnd(shape.id, node.x(), node.y());
    }
  };

  // Prevent event bubbling to stage - shape handles its own drag
  const handleDragEndCallback = (e) => {
    e.cancelBubble = true; // Prevent stage from receiving this drag event
  };
  
  // Pass ref back to parent for transformer attachment
  useEffect(() => {
    if (shapeRef.current && onShapeRef) {
      onShapeRef(shape.id, shapeRef.current);
    }
  }, [shape.id, onShapeRef]);
  
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
      // Store has center coordinates, Konva needs center for proper rotation
      const centerX = shape.x ?? 0;
      const centerY = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.RECTANGLE_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.RECTANGLE_HEIGHT;
      
      return (
        <Rect
          ref={shapeRef}
          id={shape.id}
          x={centerX}
          y={centerY}
          offsetX={width / 2}
          offsetY={height / 2}
          width={width}
          height={height}
          rotation={(shape.rotation || 0) * 180 / Math.PI}
          {...baseStyle}
          draggable={true}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEndCallback}
        />
      );
    }
      
    case 'ellipse': {
      // Shape coordinates are center-based (ellipses are naturally center-based)
      const centerX = shape.x ?? 0;
      const centerY = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.ELLIPSE_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.ELLIPSE_HEIGHT;
      
      return (
        <Ellipse
          ref={shapeRef}
          id={shape.id}
          x={centerX}  // Use center directly
          y={centerY}
          radiusX={width / 2}
          radiusY={height / 2}
          rotation={(shape.rotation || 0) * 180 / Math.PI}
          {...baseStyle}
          draggable={true}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEndCallback}
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

      // Store has center coordinates, Konva needs center for proper rotation
      const centerX = shape.x ?? 0;
      const centerY = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.TEXT_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.TEXT_HEIGHT;
      const textFill = shape.fill ?? SHAPE_DEFAULTS.FILL;
      
      return (
        <Group 
          ref={shapeRef}
          id={shape.id}
          x={centerX}
          y={centerY}
          offsetX={width / 2}
          offsetY={height / 2}
          width={width}
          height={height}
          rotation={(shape.rotation || 0) * 180 / Math.PI}
          draggable={true}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEndCallback}
        >
          {/* Selection background for text (when selected) */}
          {isSelected && (
            <Rect
              x={0}
              y={0}
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
            x={0}
            y={0}
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
          />
        </Group>
      );
    }
      
    default:
      return null;
  }
});

Shape.displayName = 'Shape';

export default Shape;
