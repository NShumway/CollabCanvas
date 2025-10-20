import React, { useMemo, useCallback } from 'react';
import { Layer, Rect, Circle } from 'react-konva';

/**
 * GridLayer - Background grid and selection rectangle
 * Only re-renders when viewport or selection rect changes
 */
const GridLayer = React.memo(({ viewport, dimensions, isSelecting, selectionRect }) => {
  console.log('🟢 GridLayer rendering');
  
  // Generate dot grid pattern (memoized for performance)
  const generateGridDots = useCallback(() => {
    const dots = [];
    const dotSpacing = 50; // 50px grid spacing (before zoom)
    const dotSize = 2;
    
    const scaledSpacing = dotSpacing * viewport.zoom;
    if (scaledSpacing < 10) return dots; // Don't render if too zoomed out
    
    const startX = Math.floor(-viewport.x / scaledSpacing) * scaledSpacing;
    const startY = Math.floor(-viewport.y / scaledSpacing) * scaledSpacing;
    const endX = startX + dimensions.width + scaledSpacing;
    const endY = startY + dimensions.height + scaledSpacing;
    
    for (let x = startX; x <= endX; x += scaledSpacing) {
      for (let y = startY; y <= endY; y += scaledSpacing) {
        dots.push(
          <Circle
            key={`dot-${x}-${y}`}
            x={x}
            y={y}
            radius={dotSize}
            fill="#444444"
            listening={false}
          />
        );
      }
    }
    return dots;
  }, [viewport.x, viewport.y, viewport.zoom, dimensions.width, dimensions.height]);
  
  return (
    <Layer listening={false}>
      {/* Infinite canvas background */}
      <Rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="#1a1a1a"
        listening={false}
      />
      
      {/* Grid dots */}
      {generateGridDots()}
      
      {/* Selection rectangle overlay */}
      {isSelecting && (
        <Rect
          x={selectionRect.x}
          y={selectionRect.y}
          width={selectionRect.width}
          height={selectionRect.height}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3B82F6"
          strokeWidth={1 / viewport.zoom}
          dash={[4 / viewport.zoom, 4 / viewport.zoom]}
          listening={false}
        />
      )}
    </Layer>
  );
}, (prev, next) => {
  // Re-render if viewport or selection changes
  return (
    prev.viewport === next.viewport &&
    prev.dimensions === next.dimensions &&
    prev.isSelecting === next.isSelecting &&
    prev.selectionRect === next.selectionRect
  );
});

GridLayer.displayName = 'GridLayer';

export default GridLayer;

