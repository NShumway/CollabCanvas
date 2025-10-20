import React, { useEffect } from 'react';
import { Layer, Transformer } from 'react-konva';

/**
 * TransformerLayer - Just the Konva Transformer
 * Re-renders when selection or transform config changes
 */
const TransformerLayer = React.memo(({ 
  transformerRef,
  shapeRefs,
  selectedIds,
  transformConfig,
  onTransformStart,
  onTransform,
  onTransformEnd,
  onDragEnd
}) => {
  // Attach transformer to selected shapes
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    
    const selectedNodes = selectedIds
      .map(id => shapeRefs.current.get(id))
      .filter(node => node);
    
    if (selectedNodes.length > 0) {
      transformer.nodes(selectedNodes);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedIds, transformerRef, shapeRefs]);
  
  return (
    <Layer>
      <Transformer
        ref={transformerRef}
        {...transformConfig}
        onTransformStart={onTransformStart}
        onTransform={onTransform}
        onTransformEnd={onTransformEnd}
        onDragEnd={onDragEnd}
        shouldOverdrawWholeArea={true}
        anchorSize={8}
        anchorStroke="#3B82F6"
        anchorFill="#FFFFFF"
        anchorStrokeWidth={2}
        borderStroke="#3B82F6"
        borderStrokeWidth={2}
        borderDash={[4, 4]}
      />
    </Layer>
  );
}, (prev, next) => {
  // Re-render if selectedIds or config changes
  return (
    prev.selectedIds === next.selectedIds &&
    prev.transformConfig === next.transformConfig
  );
});

TransformerLayer.displayName = 'TransformerLayer';

export default TransformerLayer;

