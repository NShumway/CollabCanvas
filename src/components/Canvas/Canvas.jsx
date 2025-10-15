import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle } from 'react-konva';
import useCanvasStore from '../../store/canvasStore';

const CANVAS_SIZE = 5000; // 5K x 5K canvas
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const Canvas = () => {
  const stageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const { viewport, updateViewport } = useCanvasStore();
  
  // Update canvas dimensions (leave space for toolbar - 64px header + 60px toolbar)
  useEffect(() => {
    const updateSize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 128, // Leave space for header (64px) + toolbar (64px)
      });
    };
    
    updateSize();
    // Note: Window resize handling will be added after MVP
  }, []);
  
  // Handle pan functionality
  const handleDragEnd = (e) => {
    const stage = e.target;
    updateViewport({
      x: stage.x(),
      y: stage.y(),
    });
  };
  
  // Handle zoom functionality - zoom toward cursor
  const handleWheel = (e) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    // Calculate zoom direction and amount
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Clamp zoom level
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    
    // Calculate new position to zoom toward cursor
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    
    // Update stage immediately for smooth UX
    stage.scale({ x: clampedScale, y: clampedScale });
    stage.position(newPos);
    stage.batchDraw();
    
    // Update Zustand store
    updateViewport({
      x: newPos.x,
      y: newPos.y,
      zoom: clampedScale,
    });
  };
  
  // Generate dot grid pattern for background (Figma-style)
  const generateGridDots = () => {
    const dots = [];
    const dotSpacing = 25; // Fixed spacing - will scale with zoom naturally
    const dotSize = 1; 
    
    // Only render dots in visible area for performance - calculate based on viewport
    const visibleBounds = {
      left: Math.max(0, Math.floor(-viewport.x / viewport.zoom / dotSpacing) * dotSpacing),
      top: Math.max(0, Math.floor(-viewport.y / viewport.zoom / dotSpacing) * dotSpacing),
      right: Math.min(CANVAS_SIZE, Math.ceil((-viewport.x + dimensions.width) / viewport.zoom / dotSpacing) * dotSpacing),
      bottom: Math.min(CANVAS_SIZE, Math.ceil((-viewport.y + dimensions.height) / viewport.zoom / dotSpacing) * dotSpacing),
    };
    
    for (let x = visibleBounds.left; x <= visibleBounds.right; x += dotSpacing) {
      for (let y = visibleBounds.top; y <= visibleBounds.bottom; y += dotSpacing) {
        dots.push(
          <Circle
            key={`${x}-${y}`}
            x={x}
            y={y}
            radius={dotSize}
            fill="#4A5568"
            opacity={0.4}
          />
        );
      }
    }
    return dots;
  };
  
  return (
    <div className="relative w-full bg-gray-900" style={{ height: dimensions.height }}>
      {/* Canvas Info Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
        <div>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
        <div>Position: ({Math.round(viewport.x)}, {Math.round(viewport.y)})</div>
      </div>
      
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        draggable={true}
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            e.target.getStage().container().style.cursor = 'grabbing';
          }
        }}
        onMouseUp={(e) => {
          e.target.getStage().container().style.cursor = 'grab';
        }}
      >
        {/* Background Layer */}
        <Layer>
          {/* Canvas bounds rectangle */}
          <Rect
            x={0}
            y={0}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            fill="#2D3748"
            stroke="#4A5568"
            strokeWidth={2}
          />
          
          {/* Grid dots */}
          {generateGridDots()}
        </Layer>
        
        {/* Shapes Layer - will be added in PR #4 */}
        <Layer>
          {/* Shapes will be rendered here */}
        </Layer>
        
        {/* Cursors Layer - will be added in PR #6 */}
        <Layer>
          {/* Multiplayer cursors will be rendered here */}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
