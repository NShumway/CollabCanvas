import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Ellipse } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import useCanvasStore from '@/store/canvasStore';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';
import { useCursorSync } from '@/hooks/useCursorSync';
import { createSyncEngine } from '@/services/syncEngine';
import { createShape, calculateMaxZIndex } from '@/utils/shapeCreation';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';
import ShapesLayer from './ShapesLayer';
import TransformerLayer from './TransformerLayer';
import CursorsLayer from './CursorsLayer';
import GridLayer from './GridLayer';
import TextEditor from './TextEditor';
// PerformanceMonitor moved to App.jsx behind dev flag

const CANVAS_SIZE = 5000; // 5K x 5K canvas
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const Canvas = () => {
  
  const stageRef = useRef(null);
  const syncEngineRef = useRef(null);
  const cursorThrottleRef = useRef(null);
  const transformerRef = useRef(null);
  const shapeRefs = useRef(new Map()); // Map of shapeId -> ref for transformer attachment
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Transform state
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformState, setTransformState] = useState({
    initialShapes: {}, // Store initial shape properties during transform
    aspectLock: false, // Whether aspect ratio should be maintained
  });
  
  // Store state (using useShallow to avoid re-renders when values haven't changed)
  const { viewport, shapes, selectedIds, selectedIdsSet, createMode, isLoading, users, selectionColor } = useCanvasStore(
    useShallow(state => ({
      viewport: state.viewport,
      shapes: state.shapes,
      selectedIds: state.selectedIds,
      selectedIdsSet: state.selectedIdsSet,
      createMode: state.createMode,
      isLoading: state.isLoading,
      users: state.users,
      selectionColor: state.selectionColor,
    }))
  );
  
  // Action functions (stable references, never cause re-renders)
  const updateViewport = useCanvasStore(state => state.updateViewport);
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
  const startTextEdit = useCanvasStore(state => state.startTextEdit);
  const toggleAspectLock = useCanvasStore(state => state.toggleAspectLock);
  
  // Refs for values only used in callbacks (don't need re-renders)
  const currentUserRef = useRef(null);
  const aspectLockRef = useRef(false);
  
  // Keep refs in sync with store
  useEffect(() => {
    currentUserRef.current = useCanvasStore.getState().currentUser;
    aspectLockRef.current = useCanvasStore.getState().aspectLock;
    
    const unsubscribe = useCanvasStore.subscribe((state) => {
      currentUserRef.current = state.currentUser;
      aspectLockRef.current = state.aspectLock;
    });
    
    return unsubscribe;
  }, []);

  // Debug selection tracking removed for performance
  // Debug selection changes removed for performance
  
  // READ PATH: Real-time shape synchronization from Firestore
  useFirestoreSync();
  
  // CURSOR SYNC: Real-time cursor positions (separate from shape sync)
  const { writeCursorPosition } = useCursorSync();
  
  // WRITE PATH: Initialize SyncEngine for writing to Firestore
  useEffect(() => {
    const currentUser = currentUserRef.current;
    if (currentUser && !syncEngineRef.current) {
      syncEngineRef.current = createSyncEngine();
      syncEngineRef.current.initialize(useCanvasStore.getState, currentUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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
  
  // Callback to handle shape refs from Shape components
  const handleShapeRef = useCallback((shapeId, nodeRef) => {
    if (nodeRef) {
      shapeRefs.current.set(shapeId, nodeRef);
    } else {
      shapeRefs.current.delete(shapeId);
    }
  }, []);
  
  // Handle shape clicks (called from Shape components)
  const handleShapeClick = useCallback((shapeId, isShiftKey) => {
    const currentSelectedIdsSet = useCanvasStore.getState().selectedIdsSet;
    
    if (isShiftKey) {
      // Shift-click: Toggle selection
      if (currentSelectedIdsSet.has(shapeId)) {
        removeFromSelection(shapeId);
      } else {
        addToSelection(shapeId);
      }
    } else {
      // Regular click: Select (replace if not already selected)
      if (!currentSelectedIdsSet.has(shapeId)) {
        setSelectedIds([shapeId]);
      }
      // If already selected, don't change selection (allows dragging)
    }
  }, [removeFromSelection, addToSelection, setSelectedIds]);
  
  // Handle individual shape drag end (for unselected shapes or single-shape drags)
  const handleShapeDragEnd = useCallback((shapeId, node) => {
    const shape = shapes[shapeId];
    if (!shape) return;
    
    // Get final position after drag
    const finalAttrs = {
      x: node.x(),
      y: node.y(),
    };
    
    // Update local store and queue write
    if (syncEngineRef.current) {
      syncEngineRef.current.applyLocalChange(shapeId, finalAttrs);
      const updatedShape = { ...shape, ...finalAttrs };
      syncEngineRef.current.queueWrite(shapeId, updatedShape, true);
    }
  }, [shapes]);
  
  // Throttled cursor position update (50ms = 20Hz)
  const updateCursorPosition = useCallback((pointer) => {
    if (!currentUserRef.current) return;
    
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
  }, [writeCursorPosition]);
  
  // Utility: Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX, screenY) => ({
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  }), [viewport.x, viewport.y, viewport.zoom]);

  // Handle cursor position updates (50ms debounced to server)
  const handleCursorUpdate = useCallback((pointer) => {
    if (!currentUserRef.current) return;
    
    // Clear existing throttle timeout
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }
    
    // Throttle server updates to 50ms, but show cursor immediately
    cursorThrottleRef.current = setTimeout(() => {
      updateCursorPosition(pointer);
    }, 50);
  }, [updateCursorPosition]);

  // REMOVED: handleShapeDragging - Konva Transformer now handles ALL shape interactions
  // This eliminates the conflict between dragging systems that caused jerkiness

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
    if (!currentUserRef.current) return;
    
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
    handleSelectionRectangle(pointer);
    // Note: Shape dragging and panning now handled by Konva's built-in systems
  }, [handleCursorUpdate, handleSelectionRectangle]);
  
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
  
  // Update canvas dimensions (account for header + toolbar)
  useEffect(() => {
    const updateSize = () => {
      const headerHeight = 48; // h-12 = 48px
      const toolbarHeight = 64; // Base toolbar height (can expand to 96px with text controls)
      
      setDimensions({
        width: window.innerWidth - 256, // Account for 256px sidebar (w-64)
        height: window.innerHeight - (headerHeight + toolbarHeight),
      });
    };
    
    updateSize();
    // Note: Window resize handling will be added after MVP
  }, []);
  
  // Handle keyboard shortcuts (Figma-style)
  // Z-Index shortcuts:
  // - Ctrl+] = Bring Forward (one step)
  // - Ctrl+} = Bring to Front (all the way) [Shift+]]
  // - Ctrl+[ = Send Backward (one step)
  // - Ctrl+{ = Send to Back (all the way) [Shift+[]
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
        const currentSelectedIds = useCanvasStore.getState().selectedIds;
        if (currentSelectedIds.length > 0) {
          e.preventDefault();
          // Use SyncEngine for proper sync
          currentSelectedIds.forEach(shapeId => {
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
        const currentSelectedIds = useCanvasStore.getState().selectedIds;
        if (currentSelectedIds.length > 0) {
          e.preventDefault();
          // ✅ Use the store action instead of duplicating logic
          duplicateSelectedShapes();
          
          // ✅ Sync duplicated shapes via SyncEngine
          const currentState = useCanvasStore.getState();
          currentState.selectedIds.forEach(shapeId => {
            const shape = currentState.shapes[shapeId];
            if (shape && syncEngineRef.current) {
              syncEngineRef.current.applyLocalChange(shape.id, shape);
              syncEngineRef.current.queueWrite(shape.id, shape, true);
            }
          });
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
      
      // C - Ellipse tool
      if (e.key === 'c' || e.key === 'C') {
        if (!createMode || createMode !== 'ellipse') {
          e.preventDefault();
          setCreateMode('ellipse');
        }
      }
      
      // L - Line tool (removed)
      
      // T - Text tool
      if (e.key === 't' || e.key === 'T') {
        if (!createMode || createMode !== 'text') {
          e.preventDefault();
          setCreateMode('text');
        }
      }
      
      // V - Select tool (clear create mode)
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        clearCreateMode();
      }
      
      // Shift+A - Toggle aspect lock for transforms
      if (e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        toggleAspectLock();
      }
      
      // Text formatting shortcuts (only when text is selected)
      const selectedTextShapes = selectedIds
        .map(id => shapes[id])
        .filter(shape => shape && shape.type === 'text');
      
      if (selectedTextShapes.length > 0) {
        // Ctrl+B - Bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
          e.preventDefault();
          selectedTextShapes.forEach(shape => {
            const newBold = !shape.bold;
            const updates = { 
              bold: newBold,
              updatedBy: currentUserRef.current?.uid || 'unknown',
              clientTimestamp: Date.now()
            };
            
            // Apply locally first
            useCanvasStore.getState().updateShape(shape.id, updates);
            
            // Sync via SyncEngine
            if (syncEngineRef.current) {
              const updatedShape = { ...shape, ...updates };
              syncEngineRef.current.applyLocalChange(shape.id, updates);
              syncEngineRef.current.queueWrite(shape.id, updatedShape, true);
            }
          });
        }
        
        // Ctrl+I - Italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
          e.preventDefault();
          selectedTextShapes.forEach(shape => {
            const newItalic = !shape.italic;
            const updates = { 
              italic: newItalic,
              updatedBy: currentUserRef.current?.uid || 'unknown',
              clientTimestamp: Date.now()
            };
            
            // Apply locally first
            useCanvasStore.getState().updateShape(shape.id, updates);
            
            // Sync via SyncEngine
            if (syncEngineRef.current) {
              const updatedShape = { ...shape, ...updates };
              syncEngineRef.current.applyLocalChange(shape.id, updates);
              syncEngineRef.current.queueWrite(shape.id, updatedShape, true);
            }
          });
        }
        
        // Ctrl+U - Underline
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
          e.preventDefault();
          selectedTextShapes.forEach(shape => {
            const newUnderline = !shape.underline;
            const updates = { 
              underline: newUnderline,
              updatedBy: currentUserRef.current?.uid || 'unknown',
              clientTimestamp: Date.now()
            };
            
            // Apply locally first
            useCanvasStore.getState().updateShape(shape.id, updates);
            
            // Sync via SyncEngine
            if (syncEngineRef.current) {
              const updatedShape = { ...shape, ...updates };
              syncEngineRef.current.applyLocalChange(shape.id, updates);
              syncEngineRef.current.queueWrite(shape.id, updatedShape, true);
            }
          });
        }
      }
      
      // Ctrl+} - Bring to Front (all the way) - Shift+] produces }
      if ((e.ctrlKey || e.metaKey) && e.key === '}') {
        const currentState = useCanvasStore.getState();
        if (currentState.selectedIds.length > 0) {
          e.preventDefault();
          const maxZIndex = Math.max(0, ...Object.values(currentState.shapes).map(s => s.zIndex || 0));
          currentState.selectedIds.forEach(shapeId => {
            // Apply locally first
            bringToFront(shapeId);
            // Sync via SyncEngine
            const updatedShape = currentState.shapes[shapeId];
            if (updatedShape && syncEngineRef.current) {
              const updateData = { 
                zIndex: maxZIndex + 1,
                updatedBy: currentUserRef.current?.uid || 'unknown',
                clientTimestamp: Date.now()
              };
              syncEngineRef.current.applyLocalChange(shapeId, updateData);
              syncEngineRef.current.queueWrite(shapeId, { ...updatedShape, ...updateData }, true);
            }
          });
        }
      }
      // Ctrl+] - Bring forward (one step)
      else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        const currentSelectedIds = useCanvasStore.getState().selectedIds;
        if (currentSelectedIds.length > 0) {
          e.preventDefault();
          currentSelectedIds.forEach(shapeId => {
            // Apply locally first (store handles collision detection)
            bringForward(shapeId);
            // Get updated shape with collision-free z-index
            const updatedShape = useCanvasStore.getState().shapes[shapeId];
            if (updatedShape && syncEngineRef.current) {
              const updateData = { 
                zIndex: updatedShape.zIndex,
                updatedBy: currentUserRef.current?.uid || 'unknown',
                clientTimestamp: Date.now()
              };
              syncEngineRef.current.applyLocalChange(shapeId, updateData);
              syncEngineRef.current.queueWrite(shapeId, { ...updatedShape, ...updateData }, true);
            }
          });
        }
      }
      
      // Ctrl+{ - Send to Back (all the way) - Shift+[ produces {
      if ((e.ctrlKey || e.metaKey) && e.key === '{') {
        const currentState = useCanvasStore.getState();
        if (currentState.selectedIds.length > 0) {
          e.preventDefault();
          const minZIndex = Math.min(0, ...Object.values(currentState.shapes).map(s => s.zIndex || 0));
          currentState.selectedIds.forEach(shapeId => {
            // Apply locally first
            sendToBack(shapeId);
            // Sync via SyncEngine
            const updatedShape = currentState.shapes[shapeId];
            if (updatedShape && syncEngineRef.current) {
              const updateData = { 
                zIndex: minZIndex - 1,
                updatedBy: currentUserRef.current?.uid || 'unknown',
                clientTimestamp: Date.now()
              };
              syncEngineRef.current.applyLocalChange(shapeId, updateData);
              syncEngineRef.current.queueWrite(shapeId, { ...updatedShape, ...updateData }, true);
            }
          });
        }
      }
      // Ctrl+[ - Send backward (one step)  
      else if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        const currentSelectedIds = useCanvasStore.getState().selectedIds;
        if (currentSelectedIds.length > 0) {
          e.preventDefault();
          currentSelectedIds.forEach(shapeId => {
            // Apply locally first (store handles collision detection)
            sendBackward(shapeId);
            // Get updated shape with collision-free z-index
            const updatedShape = useCanvasStore.getState().shapes[shapeId];
            if (updatedShape && syncEngineRef.current) {
              const updateData = { 
                zIndex: updatedShape.zIndex,
                updatedBy: currentUserRef.current?.uid || 'unknown',
                clientTimestamp: Date.now()
              };
              syncEngineRef.current.applyLocalChange(shapeId, updateData);
              syncEngineRef.current.queueWrite(shapeId, { ...updatedShape, ...updateData }, true);
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
  }, [createMode, clearCreateMode, clearSelection, setCreateMode, deleteSelectedShapes, duplicateSelectedShapes, selectAll, bringToFront, sendToBack, bringForward, sendBackward, isSpacePressed, isSelecting]);
  
  // Handle pan functionality
  const handleDragEnd = (e) => {
    const stage = e.target;
    updateViewport({
      x: stage.x(),
      y: stage.y(),
      zoom: viewport.zoom,
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
  // REMOVED: Complex custom hit detection - Konva's stage.getIntersection() handles this!

  // Transform event handlers
  const handleTransformStart = useCallback(() => {
    setIsTransforming(true);
    
    // Store initial shape properties for all selected shapes
    const initialShapes = {};
    selectedIds.forEach(shapeId => {
      const shape = shapes[shapeId];
      if (shape) {
        initialShapes[shapeId] = {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          rotation: shape.rotation || 0,
        };
      }
    });
    
    setTransformState(prev => ({
      ...prev,
      initialShapes
    }));
  }, [selectedIds, shapes]);

  const handleTransform = useCallback(() => {
    // During transform, let Konva handle the visual updates for smooth 60fps performance
    // We'll only sync to store at the end to avoid React re-render jerkiness
    
    if (!isTransforming || !transformerRef.current) return;
    
    const transformer = transformerRef.current;
    const nodes = transformer.nodes();
    
    // Reset node scales after baking into width/height AND update offsets
    nodes.forEach(node => {
      if (node.scaleX() !== 1 || node.scaleY() !== 1) {
        const width = node.width() * node.scaleX();
        const height = node.height() * node.scaleY();
        
        // Update dimensions
        node.width(width);
        node.height(height);
        node.scaleX(1);
        node.scaleY(1);
        
        // CRITICAL: Update offsets for new dimensions to maintain center position
        node.offsetX(width / 2);
        node.offsetY(height / 2);
      }
    });
  }, [isTransforming]);

  // Handle Transformer drag end (for position-only drags, no scaling/rotation)
  const handleTransformerDragEnd = useCallback(() => {
    if (!transformerRef.current) return;
    
    const transformer = transformerRef.current;
    const nodes = transformer.nodes();
    
    // Sync position changes for all selected shapes
    nodes.forEach(node => {
      const shapeId = node.id();
      const shape = shapes[shapeId];
      if (!shape) return;
      
      // Get final position (center coordinates due to offsetX/offsetY)
      const finalAttrs = {
        x: node.x(),
        y: node.y(),
      };
      
      // Update local store and queue write
      if (syncEngineRef.current) {
        syncEngineRef.current.applyLocalChange(shapeId, finalAttrs);
        const updatedShape = { ...shape, ...finalAttrs };
        syncEngineRef.current.queueWrite(shapeId, updatedShape, true);
      }
    });
  }, [shapes]);

  // Handle Transformer transform end (for scale/rotate operations)
  const handleTransformEnd = useCallback(() => {
    if (!isTransforming || !transformerRef.current) return;
    
    const transformer = transformerRef.current;
    const nodes = transformer.nodes();
    
    // Apply final transforms and sync to server
    nodes.forEach(node => {
      const shapeId = node.id();
      const shape = shapes[shapeId];
      if (!shape) return;
      
      // Calculate final dimensions after scaling
      const finalWidth = Math.abs(node.width() * node.scaleX());
      const finalHeight = Math.abs(node.height() * node.scaleY());
      
      // With proper offsetX/offsetY, node.x() and node.y() are center coordinates
      const finalAttrs = {
        x: node.x(),  // Center X coordinate (due to offsetX)
        y: node.y(),  // Center Y coordinate (due to offsetY)
        width: finalWidth,
        height: finalHeight,
        rotation: node.rotation() * Math.PI / 180, // Convert degrees back to radians for store
      };
      
      // Update local store immediately for responsiveness
      if (syncEngineRef.current) {
        syncEngineRef.current.applyLocalChange(shapeId, finalAttrs);
        
        // Queue write to server
        const updatedShape = { ...shape, ...finalAttrs };
        syncEngineRef.current.queueWrite(shapeId, updatedShape, true);
      }
      
      // Update node offsets for new dimensions and reset scales
      node.offsetX(finalWidth / 2);
      node.offsetY(finalHeight / 2);
      node.width(finalWidth);
      node.height(finalHeight);
      node.scaleX(1);
      node.scaleY(1);
    });
    
    setIsTransforming(false);
    setTransformState(prev => ({
      ...prev,
      initialShapes: {}
    }));
  }, [isTransforming, shapes]);

  // REMOVED: handleShapePositionUpdate
  // Shapes are no longer individually draggable - Transformer handles ALL movement
  // Position updates now happen in handleTransformerDragEnd below


  // Handle stage panning drag end (when stage itself is dragged, not shapes)
  const handleStageDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    
    // Update viewport to match stage position after manual panning
    updateViewport({
      x: stage.x(),
      y: stage.y(),
      zoom: viewport.zoom,
    });
  }, [updateViewport, viewport.zoom]);

  // Aspect lock handler - passed to transformer
  const getTransformConfig = useCallback(() => {
    return {
      enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right', 
                      'bottom-right', 'bottom-center', 'bottom-left', 'middle-left'],
      keepRatio: aspectLockRef.current,
      boundBoxFunc: (oldBox, newBox) => {
        // Optional: Add boundary constraints here if needed
        return newBox;
      }
    };
  }, []);

  // Helper function to check if shapes intersect with selection rectangle  
  const getShapesInSelection = (selectionRect) => {
    const selectedShapeIds = [];
    
    const selectionLeft = Math.min(selectionRect.x, selectionRect.x + selectionRect.width);
    const selectionRight = Math.max(selectionRect.x, selectionRect.x + selectionRect.width);
    const selectionTop = Math.min(selectionRect.y, selectionRect.y + selectionRect.height);
    const selectionBottom = Math.max(selectionRect.y, selectionRect.y + selectionRect.height);
    
    Object.values(shapes).forEach(shape => {
      let shapeLeft, shapeRight, shapeTop, shapeBottom;
      
      switch (shape.type) {
        case 'rectangle': {
          // Convert center coordinates to bounding box for selection
          const centerX = shape.x ?? 0;
          const centerY = shape.y ?? 0;
          const width = shape.width ?? SHAPE_DEFAULTS.RECTANGLE_WIDTH;
          const height = shape.height ?? SHAPE_DEFAULTS.RECTANGLE_HEIGHT;
          shapeLeft = centerX - width / 2;
          shapeRight = centerX + width / 2;
          shapeTop = centerY - height / 2;
          shapeBottom = centerY + height / 2;
          break;
        }
          
        case 'ellipse': {
          // Convert center coordinates to bounding box for selection
          const centerX = shape.x ?? 0;
          const centerY = shape.y ?? 0;
          const width = shape.width ?? SHAPE_DEFAULTS.ELLIPSE_WIDTH;
          const height = shape.height ?? SHAPE_DEFAULTS.ELLIPSE_HEIGHT;
          shapeLeft = centerX - width / 2;
          shapeRight = centerX + width / 2;
          shapeTop = centerY - height / 2;
          shapeBottom = centerY + height / 2;
          break;
        }
          
        case 'text': {
          // Convert center coordinates to bounding box for selection
          const centerX = shape.x ?? 0;
          const centerY = shape.y ?? 0;
          const width = shape.width ?? SHAPE_DEFAULTS.TEXT_WIDTH;
          const height = shape.height ?? (shape.fontSize ?? SHAPE_DEFAULTS.TEXT_FONT_SIZE) * 1.2;
          shapeLeft = centerX - width / 2;
          shapeRight = centerX + width / 2;
          shapeTop = centerY - height / 2;
          shapeBottom = centerY + height / 2;
          break;
        }
          
        // Removed: line selection bounds (line shapes eliminated)
          
        default:
          return; // Skip unknown shape types
      }
      
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

  // === BACKGROUND CLICKS: Handle panning, shape creation, drag-to-select, or clear selection ===
  // Shapes handle their own clicks via onClick (which only fires if no drag)
  const handleStageMouseDown = (e) => {
    // Only handle background clicks - shapes handle themselves
    if (e.target !== e.target.getStage()) {
      return;
    }
    
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    
    // Convert screen coordinates to world coordinates
    const worldPos = {
      x: (pointer.x - viewport.x) / viewport.zoom,
      y: (pointer.y - viewport.y) / viewport.zoom,
    };
        
    // Middle mouse button = panning
    if (e.evt.button === 1) {
      return;
    }
    
    // Space key = panning mode
    if (isSpacePressed) {
      return;
    }
    
    if (createMode) {
        // ✅ Unified shape creation - eliminates massive code duplication
        const maxZIndex = calculateMaxZIndex(shapes);
        const newShape = createShape({
          type: createMode,
          x: worldPos.x,
          y: worldPos.y,
          userId: currentUserRef.current?.uid || 'unknown',
          maxZIndex,
        });
        
        if (syncEngineRef.current) {
          syncEngineRef.current.applyLocalChange(newShape.id, newShape);
          syncEngineRef.current.queueWrite(newShape.id, newShape, true);
        }
        
        clearSelection();
        
        // 🎯 Figma-like behavior: Immediately start editing text after placement
        if (createMode === 'text') {
          clearCreateMode(); // Exit create mode
          // Start text editing immediately
          startTextEdit(newShape.id, {
            x: pointer.x,
            y: pointer.y,
          });
        }
        
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
  };

  // Note: Mouse move handling now unified in handleUnifiedMouseMove for performance

  // Handle mouse up to complete shape dragging or selection
  const handleStageMouseUp = (e) => {
    if (isSpacePressed) return; // Don't interfere with space-key panning
    
    // Note: Shape dragging now handled entirely by Konva Transformer
    
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

  // Handle double-click for text editing
  const handleStageDoubleClick = () => {
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    
    // Convert screen coordinates to world coordinates
    const worldPos = {
      x: (pointer.x - viewport.x) / viewport.zoom,
      y: (pointer.y - viewport.y) / viewport.zoom,
    };
    
    // Use Konva's built-in hit detection for double-click too
    const clickedNode = stage.getIntersection(pointer);
    const clickedShape = clickedNode ? shapes[clickedNode.id()] : null;
    
    if (clickedShape && clickedShape.type === 'text') {
      // Start text editing
      startTextEdit(clickedShape.id, {
        x: pointer.x,
        y: pointer.y,
      });
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
          <Ellipse
            key={`${x}-${y}`}
            x={x}
            y={y}
            radiusX={dotSize}
            radiusY={dotSize}
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
    <div className="canvas-container relative w-full bg-gray-900" style={{ height: dimensions.height }}>
      {/* Canvas Info Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
        <div>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
        <div>Position: ({Math.round(viewport.x)}, {Math.round(viewport.y)})</div>
        <div>Shapes: {Object.keys(shapes).length} | Selected: {selectedIds.length}</div>
        {isSpacePressed && <div className="text-blue-400">🖐️ Pan Mode (Space)</div>}
        {createMode && <div className="text-green-400">✏️ Create Mode ({createMode})</div>}
        {/* Dragging status now handled by Konva Transformer */}
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
        draggable={!isTransforming && (isSpacePressed)} // Only draggable when space pressed
        onDragEnd={handleStageDragEnd}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleStageDoubleClick}
        tabIndex={0} // Make Stage focusable for keyboard events
        style={{ 
          cursor: isSpacePressed ? 'grab' : 
                  createMode ? 'crosshair' : 
                  isSelecting ? 'crosshair' : 'default',
          outline: 'none' // Remove focus outline for better UX
        }}
      >
        {/* Background Layer with Grid and Selection Rectangle */}
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
              dash={[5 / viewport.zoom, 5 / viewport.zoom]}
              listening={false}
            />
          )}
        </Layer>
        
        {/* Shapes Layer - Optimized to avoid re-renders on selection change */}
        <ShapesLayer
          shapes={shapes}
          selectedIdsSet={selectedIdsSet}
          selectionColor={selectionColor}
          handleShapeRef={handleShapeRef}
          handleShapeClick={handleShapeClick}
          handleShapeDragEnd={handleShapeDragEnd}
        />
        
        {/* Transformer Layer - Only re-renders when selection changes */}
        <TransformerLayer
          transformerRef={transformerRef}
          shapeRefs={shapeRefs}
          selectedIds={selectedIds}
          transformConfig={getTransformConfig()}
          onTransformStart={handleTransformStart}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
          onDragEnd={handleTransformerDragEnd}
        />
        
        {/* Cursors Layer - Above shapes */}
        <CursorsLayer
          users={users}
          viewport={viewport}
        />
      </Stage>
      
      {/* Text Editor Overlay */}
      <TextEditor />
    </div>
  );
};

export default Canvas;
