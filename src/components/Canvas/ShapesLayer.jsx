import React, { useMemo } from 'react';
import { Layer } from 'react-konva';
import Shape from './Shape';

/**
 * ShapesLayer - Renders all shapes
 * Only re-renders when shapes array changes, not on selection changes
 */
const ShapesLayer = React.memo(({ 
  shapes, 
  selectedIdsSet,
  selectionColor,
  handleShapeRef,
  handleShapeClick,
  handleShapeDragEnd
}) => {
  return (
    <Layer>
      {useMemo(() => 
        Object.values(shapes)
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .map((shape) => (
            <Shape 
              key={shape.id} 
              shape={shape} 
              onShapeRef={handleShapeRef}
              onShapeClick={handleShapeClick}
              onShapeDragEnd={handleShapeDragEnd}
              isSelected={selectedIdsSet.has(shape.id)}
              selectionColor={selectionColor}
            />
          )), [shapes, handleShapeRef, handleShapeClick, handleShapeDragEnd, selectedIdsSet, selectionColor]
        // NOTE: useMemo recreates JSX when selection changes, but Shape's React.memo
        // ensures only shapes whose isSelected/selectionColor actually changed will re-render
      )}
    </Layer>
  );
}, (prev, next) => {
  // Re-render if shapes, selection, or callbacks change
  return (
    prev.shapes === next.shapes &&
    prev.selectedIdsSet === next.selectedIdsSet &&
    prev.selectionColor === next.selectionColor &&
    prev.handleShapeRef === next.handleShapeRef &&
    prev.handleShapeClick === next.handleShapeClick &&
    prev.handleShapeDragEnd === next.handleShapeDragEnd
  );
});

ShapesLayer.displayName = 'ShapesLayer';

export default ShapesLayer;

