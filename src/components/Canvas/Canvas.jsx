import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Circle } from 'react-konva';
import useCanvasStore from '@/store/canvasStore';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';
import { useCursorSync } from '@/hooks/useCursorSync';
import { createSyncEngine } from '@/services/syncEngine';
import Shape from './Shape';
import Cursor from './Cursor';
// PerformanceMonitor moved to App.jsx behind dev flag

const CANVAS_SIZE = 5000; // 5K x 5K canvas
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const Canvas = () => {
  const stageRef = useRef(null);
  const syncEngineRef = useRef(null);
  const cursorThrottleRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingShapes, setIsDraggingShapes] = useState(false);
  const [dragState, setDragState] = useState({
    startPos: null,
    draggedShapes: [],
    initialPositions: {}
  });
  
  // Selective store subscriptions for performance
  const viewport = useCanvasStore(state => state.viewport);
  const updateViewport = useCanvasStore(state => state.updateViewport);
  const shapes = useCanvasStore(state => state.shapes);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedIdsSet = useCanvasStore(state => state.selectedIdsSet);
  const createMode = useCanvasStore(state => state.createMode);
  const setCreateMode = useCanvasStore(state => state.setCreateMode);
  const clearCreateMode = useCanvasStore(state => state.clearCreateMode);
  const clearSelection = useCanvasStore(state => state.clearSelection);
  const selectAll = useCanvasStore(state => state.selectAll);
  const deleteSelectedShapes = useCanvasStore(state => state.deleteSelectedShapes);
  const duplicateSelectedShapes = useCanvasStore(state => state.duplicateSelectedShapes);
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds);
  const addToSelection = useCanvasStore(state => state.addToSelection);
  const removeFromSelection = useCanvasStore(state => state.removeFromSelection);
  const bringToFront = useCanvasStore(state => state.bringToFront);
  const sendToBack = useCanvasStore(state => state.sendToBack);
  const bringForward = useCanvasStore(state => state.bringForward);
  const sendBackward = useCanvasStore(state => state.sendBackward);
  const isLoading = useCanvasStore(state => state.isLoading);
  const currentUser = useCanvasStore(state => state.currentUser);
  const users = useCanvasStore(state => state.users);

  // Debug selection tracking removed for performance
  // Debug selection changes removed for performance
  
  // READ PATH: Real-time shape synchronization from Firestore
  useFirestoreSync();
  
  // CURSOR SYNC: Real-time cursor positions (separate from shape sync)
  const { writeCursorPosition } = useCursorSync();
  
  // WRITE PATH: Initialize SyncEngine for writing to Firestore
  useEffect(() => {
    if (currentUser && !syncEngineRef.current) {
      syncEngineRef.current = createSyncEngine();
      syncEngineRef.current.initialize(useCanvasStore.getState, currentUser);
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
  
  // Utility: Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX, screenY) => ({
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  }), [viewport.x, viewport.y, viewport.zoom]);

  // Handle cursor position updates (50ms debounced to server)
  const handleCursorUpdate = useCallback((pointer) => {
    if (!currentUser) return;
    
    // Clear existing throttle timeout
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }
    
    // Throttle server updates to 50ms, but show cursor immediately
    cursorThrottleRef.current = setTimeout(() => {
      updateCursorPosition(pointer);
    }, 50);
  }, [currentUser, updateCursorPosition]);

  // Handle shape dragging (immediate local display, 100ms debounced server sync)
  const handleShapeDragging = useCallback((pointer) => {
    if (!isDraggingShapes || !dragState.startPos) return;
    
    const worldPos = screenToWorld(pointer.x, pointer.y);
    const deltaX = worldPos.x - dragState.startPos.x;
    const deltaY = worldPos.y - dragState.startPos.y;
    
    // IMMEDIATE local display update
    if (dragState.draggedShapes.length > 0) {
      const batchUpdates = [];
      
      for (const shapeId of dragState.draggedShapes) {
        const initialPos = dragState.initialPositions[shapeId];
        if (initialPos) {
          const newPos = {
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY
          };
          batchUpdates.push({ shapeId, updates: newPos });
        }
      }
      
      if (batchUpdates.length > 0 && syncEngineRef.current) {
        // Apply local changes immediately for smooth UX
        syncEngineRef.current.applyBatchChanges(batchUpdates);
      }
    }
    
    // Update cursor position immediately during drag (no throttling)
    if (writeCursorPosition) {
      writeCursorPosition(worldPos.x, worldPos.y);
    }
  }, [isDraggingShapes, dragState, screenToWorld, writeCursorPosition]);

  // Handle selection rectangle updates
  const handleSelectionRectangle = useCallback((pointer) => {
    if (!isSelecting || !selectionRect) return;
    
    const worldPos = screenToWorld(pointer.x, pointer.y);
    setSelectionRect(prev => ({
      ...prev,
      width: worldPos.x - prev.x,
      height: worldPos.y - prev.y,
    }));
  }, [isSelecting, selectionRect, screenToWorld]);

  // ORGANIZED MOUSE MOVE: Calls sub-handlers for each responsibility
  const handleMouseMove = useCallback((e) => {
    if (!currentUser) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    // Get mouse position from DOM event
    const rect = stage.container().getBoundingClientRect();
    const pointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    // Handle each responsibility separately
    handleCursorUpdate(pointer);
    handleShapeDragging(pointer);
    handleSelectionRectangle(pointer);
  }, [currentUser, handleCursorUpdate, handleShapeDragging, handleSelectionRectangle]);
  
  // Cleanup cursor throttle on unmount
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);
  
  // Add native DOM mouse handler for organized event coordination
  useEffect(() => {
    const canvasContainer = stageRef.current?.container();
    if (!canvasContainer) return;
    
    canvasContainer.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      if (canvasContainer) {
        canvasContainer.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [handleMouseMove]);
  
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
      // Check if user is typing in an input field
      const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true';
      if (isTyping) return;
      
      // Space key for panning (like Figma)
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        // Cancel any ongoing selection when space is pressed
        if (isSelecting) {
          setIsSelecting(false);
          setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
        }
      }
      
      // Escape - Clear selection and create mode
      if (e.key === 'Escape') {
        clearCreateMode();
        clearSelection();
      }
      
      // Delete - Remove selected shapes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          // Use SyncEngine for proper sync
          selectedIds.forEach(shapeId => {
            if (syncEngineRef.current) {
              syncEngineRef.current.deleteShape(shapeId);
            }
          });
          // Local update - remove from store immediately  
          deleteSelectedShapes();
        }
      }
      
      // Ctrl+D - Duplicate selected shapes
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const duplicatedShapes = [];
          
          // Get current selected shapes and create duplicates
          selectedIds.forEach(shapeId => {
            const originalShape = shapes[shapeId];
            if (originalShape) {
              const DUPLICATE_OFFSET = 20;
              const newId = crypto.randomUUID();
              const duplicatedShape = {
                ...originalShape,
                id: newId,
                x: originalShape.x + DUPLICATE_OFFSET,
                y: originalShape.y + DUPLICATE_OFFSET,
                zIndex: (originalShape.zIndex || 0) + 1,
                updatedBy: currentUser?.uid || 'unknown',
              };
              duplicatedShapes.push(duplicatedShape);
            }
          });
          
          // Apply via SyncEngine for proper sync (handles both local state and server sync)
          duplicatedShapes.forEach(shape => {
            if (syncEngineRef.current) {
              syncEngineRef.current.applyLocalChange(shape.id, shape);
              syncEngineRef.current.queueWrite(shape.id, shape, true);
            }
          });
          
          // Update selection to the duplicated shapes
          const duplicatedIds = duplicatedShapes.map(shape => shape.id);
          setSelectedIds(duplicatedIds);
        }
      }
      
      // Ctrl+A - Select all shapes
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }
      
      // R - Rectangle tool
      if (e.key === 'r' || e.key === 'R') {
        if (!createMode || createMode !== 'rectangle') {
          e.preventDefault();
          setCreateMode('rectangle');
        }
      }
      
      // V - Select tool (clear create mode)
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        clearCreateMode();
      }
      
      // Ctrl+] - Bring forward
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach(shapeId => {
            // Apply locally first
            bringForward(shapeId);
            // Sync via SyncEngine
            const updatedShape = shapes[shapeId];
            if (updatedShape && syncEngineRef.current) {
              syncEngineRef.current.applyLocalChange(shapeId, { zIndex: (updatedShape.zIndex || 0) + 1 });
              syncEngineRef.current.queueWrite(shapeId, { ...updatedShape, zIndex: (updatedShape.zIndex || 0) + 1 }, true);
            }
          });
        }
      }
      
      // Ctrl+[ - Send backward  
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach(shapeId => {
            // Apply locally first
            sendBackward(shapeId);
            // Sync via SyncEngine
            const updatedShape = shapes[shapeId];
            if (updatedShape && syncEngineRef.current) {
              syncEngineRef.current.applyLocalChange(shapeId, { zIndex: (updatedShape.zIndex || 0) - 1 });
              syncEngineRef.current.queueWrite(shapeId, { ...updatedShape, zIndex: (updatedShape.zIndex || 0) - 1 }, true);
            }
          });
        }
      }
    };
    
    const handleKeyUp = (e) => {
      // Release space key
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [createMode, clearCreateMode, clearSelection, setCreateMode, selectedIds, shapes, deleteSelectedShapes, duplicateSelectedShapes, selectAll, currentUser, isSpacePressed]);
  
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
  
  // Helper function to get the topmost shape at a given world position
  const getShapeAtPosition = (worldX, worldY) => {
    // Get shapes sorted by z-index (highest first) to find topmost shape
    const sortedShapes = Object.values(shapes).sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    
    for (const shape of sortedShapes) {
      // Check if point is within shape bounds
      if (worldX >= shape.x && 
          worldX <= shape.x + (shape.width || 0) &&
          worldY >= shape.y && 
          worldY <= shape.y + (shape.height || 0)) {
        return shape;
      }
    }
    
    return null;
  };

  // Helper function to check if shapes intersect with selection rectangle  
  const getShapesInSelection = (selectionRect) => {
    const selectedShapeIds = [];
    
    Object.values(shapes).forEach(shape => {
      // Convert selection rect to world coordinates if needed
      const shapeLeft = shape.x;
      const shapeRight = shape.x + (shape.width || 0);
      const shapeTop = shape.y;
      const shapeBottom = shape.y + (shape.height || 0);
      
      const selectionLeft = Math.min(selectionRect.x, selectionRect.x + selectionRect.width);
      const selectionRight = Math.max(selectionRect.x, selectionRect.x + selectionRect.width);
      const selectionTop = Math.min(selectionRect.y, selectionRect.y + selectionRect.height);
      const selectionBottom = Math.max(selectionRect.y, selectionRect.y + selectionRect.height);
      
      // Check if shape overlaps with selection rectangle
      if (shapeRight >= selectionLeft && 
          shapeLeft <= selectionRight && 
          shapeBottom >= selectionTop && 
          shapeTop <= selectionBottom) {
        selectedShapeIds.push(shape.id);
      }
    });
    
    return selectedShapeIds;
  };

  // SINGLE RESPONSIBILITY: Handle ALL mouse interactions (selection, dragging, creation)
  const handleStageMouseDown = (e) => {
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    
    // Convert screen coordinates to world coordinates
    const worldPos = {
      x: (pointer.x - viewport.x) / viewport.zoom,
      y: (pointer.y - viewport.y) / viewport.zoom,
    };
        
    // Space key or middle mouse button = panning (let Konva handle it)
    if (isSpacePressed || e.evt.button === 1) {
      return; // Let Konva's built-in drag handle panning
    }
    
    // Check if we clicked on a shape (not just the stage background)
    const clickedShape = getShapeAtPosition(worldPos.x, worldPos.y);
    
    if (clickedShape) {
      // === SHAPE CLICK: Handle selection and optionally start dragging ===
      
      if (e.evt.shiftKey) {
        // Shift+click: Toggle shape in/out of selection (NO DRAGGING)
        if (selectedIdsSet.has(clickedShape.id)) {
          removeFromSelection(clickedShape.id);
        } else {
          addToSelection(clickedShape.id);
        }
        return; // No dragging during multi-select operations
      } else {
        // Regular click: Handle selection ONLY
        if (!selectedIdsSet.has(clickedShape.id)) {
          // Select single shape (deselect others)
          setSelectedIds([clickedShape.id]);
        }
        // If shape was already selected, keep current selection
        
        // Setup dragging for currently selected shapes (separate concern)
        const currentlySelectedIds = selectedIdsSet.has(clickedShape.id) 
          ? selectedIds 
          : [clickedShape.id];
        
        if (currentlySelectedIds.length > 0) {
          const initialPositions = {};
          currentlySelectedIds.forEach(shapeId => {
            const shape = shapes[shapeId];
            if (shape) {
              initialPositions[shapeId] = { x: shape.x, y: shape.y };
            }
          });
          
          setIsDraggingShapes(true);
          setDragState({
            startPos: worldPos,
            draggedShapes: currentlySelectedIds,
            initialPositions
          });
        }
      }
      
      return; // Handled shape click
    }
    
    // === BACKGROUND CLICK: Handle shape creation, drag-to-select, or clear selection ===
    if (e.target === e.target.getStage()) {
      
      if (createMode === 'rectangle') {
        // Create new rectangle
        const maxZIndex = Math.max(0, ...Object.values(shapes).map(s => s.zIndex || 0));
        const newShape = {
          id: crypto.randomUUID(),
          type: 'rectangle',
          x: worldPos.x,
          y: worldPos.y,
          width: 100,
          height: 100,
          fill: '#E2E8F0',
          zIndex: maxZIndex + 1,
          createdBy: currentUser?.uid || 'unknown',
          updatedBy: currentUser?.uid || 'unknown',
        };
        
        if (syncEngineRef.current) {
          syncEngineRef.current.applyLocalChange(newShape.id, newShape);
          syncEngineRef.current.queueWrite(newShape.id, newShape, true);
        }
        
        // Clear selection after placing shape (consistent with background click behavior)
        clearSelection();
        
      } else {
        // No create mode - either start drag-to-select or clear selection
        
        if (e.evt.shiftKey) {
          // Shift+background click: Start additive drag-to-select
          setIsSelecting(true);
          setSelectionRect({
            x: worldPos.x,
            y: worldPos.y,
            width: 0,
            height: 0,
          });
        } else {
          // Regular background click: Clear selection and start drag-to-select
          clearSelection();
          setIsSelecting(true);
          setSelectionRect({
            x: worldPos.x,
            y: worldPos.y,
            width: 0,
            height: 0,
          });
        }
      }
    }
  };

  // Note: Mouse move handling now unified in handleUnifiedMouseMove for performance

  // Handle mouse up to complete shape dragging or selection
  const handleStageMouseUp = (e) => {
        // Mouse up event
    
    if (isSpacePressed) return; // Don't interfere with panning
    
    // Finalize shape dragging
    if (isDraggingShapes && dragState.startPos) {
      // Mouse move already handled all local updates + debounced server sync
      // Just reset drag state - no additional server writes needed
      
      setIsDraggingShapes(false);
      setDragState({
        startPos: null,
        draggedShapes: [],
        initialPositions: {}
      });
      
      return; // Don't handle selection completion during shape drag
    }
    
    // Complete drag-to-select
    if (isSelecting) {
      // Select all shapes in the selection rectangle
      const shapesInSelection = getShapesInSelection(selectionRect);
      
      // Debug logs removed for performance
      
      if (e.evt.shiftKey) {
        // Add to existing selection
        shapesInSelection.forEach(shapeId => {
          if (!selectedIdsSet.has(shapeId)) {
            addToSelection(shapeId);
          }
        });
      } else {
        // Replace selection
        // Debug log removed for performance
        setSelectedIds(shapesInSelection);
      }
      
      // Reset selection state
      setIsSelecting(false);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  // handleStageClick REMOVED - all selection logic consolidated in handleStageMouseDown
  
  // Generate dot grid pattern for background (Figma-style) - memoized for performance
  const generateGridDots = useCallback(() => {
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
  }, [viewport.x, viewport.y, viewport.zoom, dimensions.width, dimensions.height]);
  
  return (
    <div className="relative w-full bg-gray-900" style={{ height: dimensions.height }}>
      {/* Canvas Info Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
        <div>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
        <div>Position: ({Math.round(viewport.x)}, {Math.round(viewport.y)})</div>
        <div>Shapes: {Object.keys(shapes).length} | Selected: {selectedIds.length}</div>
        {isSpacePressed && <div className="text-blue-400">🖐️ Pan Mode (Space)</div>}
        {createMode && <div className="text-green-400">✏️ Create Mode ({createMode})</div>}
        {isDraggingShapes && <div className="text-purple-400">🎯 Dragging {dragState.draggedShapes.length} shape(s)</div>}
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
        draggable={(createMode === null && !isDraggingShapes && !isSelecting) || isSpacePressed} // Allow panning when in select mode OR when space is pressed
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        style={{ 
          cursor: isSpacePressed ? 'grab' : 
                  isDraggingShapes ? 'grabbing' :
                  createMode === 'rectangle' ? 'crosshair' : 
                  isSelecting ? 'crosshair' : 'default'
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
          {useMemo(() => 
            Object.values(shapes)
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
              .map((shape) => (
                <Shape 
                  key={shape.id} 
                  shape={shape} 
                />
              )), [shapes]
          )}
        </Layer>
        
        {/* Cursors Layer - Above shapes layer */}
        <Layer>
          {useMemo(() => 
            Object.values(users).map((user) => (
              <Cursor key={user.uid} user={user} />
            )), [users]
          )}
        </Layer>
        
        {/* UI Layer - Selection rectangle */}
        <Layer>
          {isSelecting && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(59, 130, 246, 0.1)" // Light blue fill
              stroke="#3B82F6" // Blue border
              strokeWidth={1 / viewport.zoom} // Keep stroke width constant regardless of zoom
              dash={[5 / viewport.zoom, 5 / viewport.zoom]} // Dashed border
              listening={false} // Don't capture mouse events
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
