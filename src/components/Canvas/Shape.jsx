import React, { useRef, useEffect } from 'react';
import { Rect, Ellipse, Text, Group } from 'react-konva';
import useCanvasStore from '@/store/canvasStore';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

// Custom comparison for React.memo - only re-render if props actually changed
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.shape === nextProps.shape &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionColor === nextProps.selectionColor &&
    prevProps.onShapeRef === nextProps.onShapeRef &&
    prevProps.onShapeClick === nextProps.onShapeClick &&
    prevProps.onShapeDragEnd === nextProps.onShapeDragEnd
  );
};

const Shape = React.memo(({ shape, onShapeRef, onShapeClick, onShapeDragEnd, isSelected, selectionColor }) => {
  const shapeRef = useRef();
  const editingTextId = useCanvasStore(state => state.editingTextId);
  
  // Pass ref back to parent for transformer attachment
  useEffect(() => {
    if (shapeRef.current && onShapeRef) {
      onShapeRef(shape.id, shapeRef.current);
    }
  }, [shape.id, onShapeRef]);
  
  // Handle clicks (fires only if NOT dragging)
  const handleClick = (e) => {
    if (onShapeClick) {
      onShapeClick(shape.id, e.evt.shiftKey);
    }
  };
  
  // Handle drag end (persist position after drag)
  const handleDragEnd = (e) => {
    if (onShapeDragEnd && shapeRef.current) {
      onShapeDragEnd(shape.id, shapeRef.current);
    }
  };
  
  // ARCHITECTURE: Shapes handle their own clicks, Transformer handles drags
  // onClick only fires if no drag occurred - Konva handles this automatically
  const baseStyle = {
    fill: shape.fill ?? SHAPE_DEFAULTS.FILL,
    stroke: isSelected ? selectionColor : 'transparent',
    strokeWidth: isSelected ? SHAPE_DEFAULTS.SELECTION_STROKE_WIDTH : 0,
    listening: true,
    draggable: true, // Must be draggable for Transformer to work
    onClick: handleClick, // Only fires if no drag
    onDragEnd: handleDragEnd, // Persist position after drag
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
        />
      );
    }
      
    case 'text': {
      // Don't render text shapes that are currently being edited
      // The DOM input overlay handles the editing experience
      if (editingTextId === shape.id) {
        return null; // Let DOM overlay handle the editing
      }
      
      const centerX = shape.x ?? 0;
      const centerY = shape.y ?? 0;
      const width = shape.width ?? SHAPE_DEFAULTS.TEXT_WIDTH;
      const height = shape.height ?? SHAPE_DEFAULTS.TEXT_HEIGHT;
      
      // Text styles with proper defaults
      const textStyle = {
        ...baseStyle,
        fontSize: shape.fontSize ?? SHAPE_DEFAULTS.FONT_SIZE,
        fontFamily: shape.fontFamily ?? SHAPE_DEFAULTS.FONT_FAMILY,
        align: shape.align ?? SHAPE_DEFAULTS.TEXT_ALIGN,
        verticalAlign: 'middle',
        width: width,
        height: height,
        wrap: 'word',
        // Text formatting
        fontStyle: [
          shape.bold ? 'bold' : '',
          shape.italic ? 'italic' : ''
        ].filter(Boolean).join(' ') || 'normal',
        textDecoration: [
          shape.underline ? 'underline' : '',
          shape.strikethrough ? 'line-through' : ''
        ].filter(Boolean).join(' ') || '',
      };
      
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
          listening={true}
          draggable={false}
        >
          {/* Container rectangle for visual boundaries */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            stroke={isSelected ? selectionColor : 'transparent'}
            strokeWidth={isSelected ? 1 : 0}
            dash={isSelected ? [5, 5] : []}
          />
          {/* Text content */}
          <Text
            x={0}
            y={0}
            text={shape.text ?? 'Text'}
            {...textStyle}
          />
        </Group>
      );
    }
      
    default: {
      console.warn(`Unknown shape type: ${shape.type}`);
      return null;
    }
  }
}, arePropsEqual); // Custom comparison to prevent unnecessary re-renders

Shape.displayName = 'Shape';

export default Shape;