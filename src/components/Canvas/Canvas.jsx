import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle } from 'react-konva';
import useCanvasStore from '../../store/canvasStore';
import { useFirestoreSync } from '../../hooks/useFirestoreSync';
import { useCursorSync } from '../../hooks/useCursorSync';
import { createSyncEngine } from '../../services/syncEngine';
import Shape from './Shape';
import Cursor from './Cursor';

const CANVAS_SIZE = 5000; // 5K x 5K canvas
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const Canvas = () => {
  const stageRef = useRef(null);
  const syncEngineRef = useRef(null);
  const cursorThrottleRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  
  const { 
    viewport, 
    updateViewport, 
    shapes,
    createMode,
    setCreateMode,
    clearCreateMode,
    clearSelection,
    isLoading,
    currentUser,
    users
  } = useCanvasStore();
  
  // READ PATH: Real-time shape synchronization from Firestore
  useFirestoreSync();
  
  // CURSOR SYNC: Real-time cursor positions (separate from shape sync)
  const { writeCursorPosition } = useCursorSync();
  
  // WRITE PATH: Initialize SyncEngine for writing to Firestore
  useEffect(() => {
    if (currentUser && !syncEngineRef.current) {
      syncEngineRef.current = createSyncEngine();
      syncEngineRef.current.initialize(useCanvasStore, currentUser);
      console.log('🔧 SyncEngine initialized for user:', currentUser.displayName);
    }
    
    if (syncEngineRef.current && currentUser) {
      syncEngineRef.current.initialize(useCanvasStore, currentUser);
    }
  }, [currentUser]);
  
  // Cleanup SyncEngine on unmount
  useEffect(() => {
    return () => {
      if (syncEngineRef.current) {
        syncEngineRef.current.cleanup();
      }
    };
  }, []);
  
  // Store latest viewport in ref to avoid callback recreation on viewport changes
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  
  // Throttled cursor position update (50ms = 20Hz)
  const updateCursorPosition = useCallback((pointer) => {
    if (!currentUser) return;
    
    // Convert screen coordinates to world coordinates (account for pan/zoom)
    const currentViewport = viewportRef.current;
    const worldPos = {
      x: (pointer.x - currentViewport.x) / currentViewport.zoom,
      y: (pointer.y - currentViewport.y) / currentViewport.zoom,
    };
    
    // Write cursor position to Firestore (non-blocking)
    if (writeCursorPosition) {
      writeCursorPosition(worldPos.x, worldPos.y);
    }
  }, [currentUser]);
  
  // UNIFIED EVENT COORDINATOR: Handles both cursor tracking and shape drag coordination
  const handleUnifiedMouseMove = useCallback((e) => {
    if (!currentUser) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    // Get mouse position from DOM event, then convert to stage coordinates
    const rect = stage.container().getBoundingClientRect();
    const pointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    // ALWAYS handle cursor tracking (maintains existing throttling)
    // Clear existing throttle timeout
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }
    
    // Throttle to 50ms (20Hz) as specified in plan
    cursorThrottleRef.current = setTimeout(() => {
      updateCursorPosition(pointer);
    }, 50);
    
    // CONDITIONALLY handle shape drag cursor updates (when dragging)
    if (isDraggingShape) {
      // Convert to world coordinates for shape-based cursor positioning
      const worldPos = {
        x: (pointer.x - viewport.x) / viewport.zoom,
        y: (pointer.y - viewport.y) / viewport.zoom,
      };
      
      
      // Update cursor immediately during drag (no additional throttling)
      if (writeCursorPosition) {
        writeCursorPosition(worldPos.x, worldPos.y);
      }
    }
  }, [currentUser, updateCursorPosition, isDraggingShape, viewport, writeCursorPosition]);
  
  // Cleanup cursor throttle on unmount
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);
  
  // Add native DOM mouse handler for unified event coordination
  useEffect(() => {
    const canvasContainer = stageRef.current?.container();
    if (!canvasContainer) return;
    
    canvasContainer.addEventListener('mousemove', handleUnifiedMouseMove);
    
    return () => {
      if (canvasContainer) {
        canvasContainer.removeEventListener('mousemove', handleUnifiedMouseMove);
      }
    };
  }, [handleUnifiedMouseMove]);
  
  // Update canvas dimensions (leave space for toolbar - 64px header + 64px toolbar)
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
  
  // Handle keyboard shortcuts (Figma-style)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearCreateMode();
        clearSelection();
      }
      if (e.key === 'r' || e.key === 'R') {
        if (!createMode || createMode !== 'rectangle') {
          e.preventDefault();
          setCreateMode('rectangle');
        }
      }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        clearCreateMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createMode, clearCreateMode, clearSelection, setCreateMode]);
  
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
  
  // Handle stage click for creating shapes or deselecting
  const handleStageClick = (e) => {
    // Check if we clicked on the stage background (not a shape)
    if (e.target === e.target.getStage()) {
      if (createMode === 'rectangle') {
        // Create new rectangle at click position
        const stage = stageRef.current;
        const pointer = stage.getPointerPosition();
        
        // Convert screen coordinates to world coordinates
        const worldPos = {
          x: (pointer.x - viewport.x) / viewport.zoom,
          y: (pointer.y - viewport.y) / viewport.zoom,
        };
        
        // Create new rectangle (Figma default size ~100x100)
        const newShape = {
          id: crypto.randomUUID(),
          type: 'rectangle',
          x: worldPos.x,
          y: worldPos.y,
          width: 100,
          height: 100,
          fill: '#E2E8F0', // Light gray default
          // Metadata for sync architecture
          createdBy: currentUser?.uid || 'unknown',
          updatedBy: currentUser?.uid || 'unknown',
        };
        
        if (syncEngineRef.current) {
          // WRITE PATH: Use SyncEngine for bulletproof sync
          // 1. Apply local change immediately (60fps UX)
          syncEngineRef.current.applyLocalChange(newShape.id, newShape);
          
          // 2. Queue write to Firestore (immediate for creation)
          syncEngineRef.current.queueWrite(newShape.id, newShape, true);
        } else {
          console.warn('SyncEngine not ready, shape creation will not sync');
        }
        
        // Keep create mode active (Figma behavior)
        // User can press ESC or click selection tool to exit
      } else {
        // Clear selection when clicking background
        clearSelection();
      }
    }
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
            listening={false} // Don't capture clicks on grid dots
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
        <div>Shapes: {Object.keys(shapes).length}</div>
        {isLoading && <div className="text-yellow-400">🔄 Syncing...</div>}
      </div>
      
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        draggable={createMode === null && !isDraggingShape} // Only allow panning when not creating or dragging shapes
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        onClick={handleStageClick}
        style={{ 
          cursor: createMode === 'rectangle' ? 'crosshair' : 'grab'
        }}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage() && createMode === null) {
            e.target.getStage().container().style.cursor = 'grabbing';
          }
        }}
        onMouseUp={(e) => {
          if (createMode === null) {
            e.target.getStage().container().style.cursor = 'grab';
          }
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
            listening={false} // Don't capture clicks - let them go to Stage
          />
          
          {/* Grid dots */}
          {generateGridDots()}
        </Layer>
        
        {/* Shapes Layer */}
        <Layer>
          {Object.values(shapes).map((shape) => (
            <Shape 
              key={shape.id} 
              shape={shape} 
              onShapeDragStart={() => setIsDraggingShape(true)}
              onShapeDragEnd={() => setIsDraggingShape(false)}
            />
          ))}
        </Layer>
        
        {/* Cursors Layer - Above shapes layer */}
        <Layer>
          {Object.values(users).map((user) => (
            <Cursor key={user.uid} user={user} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
