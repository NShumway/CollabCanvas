import React, { useState, useRef, useEffect } from 'react';
import useCanvasStore from '@/store/canvasStore';
import { createSyncEngine } from '@/services/syncEngine';
import { calculateTextHeight } from '@/utils/textMeasurement';

const TextEditor = () => {
  const {
    editingTextId,
    shapes,
    stopTextEdit,
    updateShape,
    currentUser,
    viewport
  } = useCanvasStore();

  const [tempText, setTempText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const inputRef = useRef(null);
  const syncEngineRef = useRef(null);

  // Initialize sync engine
  useEffect(() => {
    if (currentUser && !syncEngineRef.current) {
      syncEngineRef.current = createSyncEngine();
      syncEngineRef.current.initialize(useCanvasStore.getState, currentUser);
    }
  }, [currentUser]);

  // Initialize text content when editing starts
  useEffect(() => {
    if (editingTextId && shapes[editingTextId] && !isInitialized) {
      const currentShape = shapes[editingTextId];
      setTempText(currentShape.text || '');
      setIsInitialized(true);
      
      // Focus input after a short delay to ensure DOM is ready
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
    
    // Reset when editing stops
    if (!editingTextId) {
      setIsInitialized(false);
      setTempText('');
    }
  }, [editingTextId, shapes, isInitialized]);

  // Handle text changes with auto-height
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setTempText(newText);
    
    // Real-time sync of text content with auto-height
    if (editingTextId && shapes[editingTextId]) {
      const shape = shapes[editingTextId];
      const fontSize = shape.fontSize || 16;
      const fontFamily = shape.fontFamily || 'Inter, system-ui, sans-serif';
      const width = shape.width || 200;
      
        // Calculate new height based on content with formatting
        const newHeight = calculateTextHeight(newText, fontSize, fontFamily, width, {
          bold: shape.bold,
          italic: shape.italic,
          underline: shape.underline,
          strikethrough: shape.strikethrough,
        });
      
      const updates = {
        text: newText,
        height: newHeight, // Auto-height expansion
        updatedBy: currentUser?.uid || 'unknown',
        clientTimestamp: Date.now(),
      };
      
      // Update local store immediately
      updateShape(editingTextId, updates);
      
      // Sync to Firestore
      if (syncEngineRef.current) {
        const updatedShape = { ...shape, ...updates };
        syncEngineRef.current.applyLocalChange(editingTextId, updatedShape);
        syncEngineRef.current.queueWrite(editingTextId, updatedShape, false);
      }
    }
  };

  // Handle key events (Figma-like behavior)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      stopTextEdit();
    }
    // Note: Enter creates new lines (default textarea behavior)
    // This matches Figma where Enter adds line breaks
  };

  // Handle blur (clicking outside)
  const handleBlur = () => {
    stopTextEdit();
  };

  // Don't render if not editing
  if (!editingTextId || !shapes[editingTextId]) {
    return null;
  }

  const shape = shapes[editingTextId];
  
  // Calculate exact screen position using actual canvas container position
  // This is more accurate than hardcoded offsets and adapts to layout changes
  const canvasContainer = document.querySelector('.canvas-container');
  const canvasRect = canvasContainer?.getBoundingClientRect() || { left: 0, top: 0 };
  
  // Calculate world coordinates transformed to screen coordinates
  const worldX = shape.x * viewport.zoom + viewport.x;
  const worldY = shape.y * viewport.zoom + viewport.y;
  
  // Add canvas container offset and account for textarea styling (border + padding)
  const textareaBoxOffset = 6; // border (2px) + padding (4px)
  const screenX = worldX + canvasRect.left - textareaBoxOffset;
  const screenY = worldY + canvasRect.top - textareaBoxOffset;
  
  // Calculate dimensions based on shape and zoom
  const width = (shape.width || 200) * viewport.zoom;
  const fontSize = (shape.fontSize || 16) * viewport.zoom;

  return (
    <>
      {/* Text editor textarea (not input) for multi-line support */}
      <textarea
        ref={inputRef}
        value={tempText}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          // Positioning
          position: 'fixed',
          left: `${screenX}px`,
          top: `${screenY}px`,
          width: `${width}px`,
          height: `${(shape.height || fontSize * 1.2) * viewport.zoom}px`,
          
          // Typography (match Konva Text exactly)
          fontSize: `${fontSize}px`,
          fontFamily: shape.fontFamily || 'Inter, system-ui, sans-serif',
          textAlign: shape.textAlign || 'left',
          color: shape.fill || '#000000',
          lineHeight: '1.2', // Match Konva default
          
          // Box model reset and styling
          margin: '0', // Reset browser defaults
          padding: '4px',
          border: '2px solid #3B82F6',
          borderRadius: '4px',
          boxSizing: 'border-box', // Ensure consistent box model
          
          // Behavior
          backgroundColor: 'transparent',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          zIndex: 1000,
          pointerEvents: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          
          // Font rendering consistency
          fontSmooth: 'auto',
          textRendering: 'auto',
        }}
        className="font-inter"
      />
    </>
  );
};

export default TextEditor;
