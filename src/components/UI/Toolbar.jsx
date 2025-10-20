import { useState, useRef, useEffect } from 'react';
import useCanvasStore from '@/store/canvasStore';
import { createSyncEngine } from '@/services/syncEngine';
import { calculateTextHeight } from '@/utils/textMeasurement';
import { alignShapes, distributeShapes, getAlignmentAvailability } from '@/utils/alignment';
import { exportAsPNG, exportAsSVG, exportAsJSON } from '@/utils/canvasExport';
import ColorPicker from './ColorPicker';

const Toolbar = () => {
  const { 
    createMode, 
    setCreateMode, 
    clearCreateMode, 
    selectedIds, 
    shapes,
    updateShape,
    currentUser,
    aspectLock,
    toggleAspectLock
  } = useCanvasStore();
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const colorButtonRef = useRef(null);
  const exportButtonRef = useRef(null);
  const syncEngineRef = useRef(null);
  const stageRef = useRef(null);

  // Initialize sync engine
  useEffect(() => {
    if (currentUser && !syncEngineRef.current) {
      syncEngineRef.current = createSyncEngine();
      syncEngineRef.current.initialize(useCanvasStore.getState, currentUser);
    }
  }, [currentUser]);

  // Check if any selected shapes are text
  const selectedTextShapes = selectedIds
    .map(id => shapes[id])
    .filter(shape => shape && shape.type === 'text');
  const hasSelectedText = selectedTextShapes.length > 0;
  
  // Check alignment/distribution availability
  const alignmentAvailability = getAlignmentAvailability(selectedIds.length);
  
  const handleToolClick = (tool) => {
    if (createMode === tool) {
      clearCreateMode();
    } else {
      setCreateMode(tool);
    }
  };
  
  const handleColorPickerClick = () => {
    if (selectedIds.length === 0) return;
    
    const button = colorButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      setColorPickerPosition({
        x: rect.left,
        y: rect.bottom + 8
      });
      setShowColorPicker(true);
    }
  };

  // Font control functions with auto-resize
  const updateTextProperty = (property, value) => {
    selectedTextShapes.forEach(shape => {
      let updateData = {
        [property]: value,
        updatedBy: currentUser?.uid || 'unknown',
        clientTimestamp: Date.now(),
      };

      // 🎯 Auto-resize when font properties change (avoid code duplication)
      if (property === 'fontSize' || property === 'fontFamily' || 
          property === 'bold' || property === 'italic' || 
          property === 'underline' || property === 'strikethrough') {
        const currentText = shape.text || 'Text';
        const fontSize = property === 'fontSize' ? value : (shape.fontSize || 16);
        const fontFamily = property === 'fontFamily' ? value : (shape.fontFamily || 'Inter, system-ui, sans-serif');
        const width = shape.width || 200;
        
        // Get current formatting or updated formatting
        const formatting = {
          bold: property === 'bold' ? value : shape.bold,
          italic: property === 'italic' ? value : shape.italic,
          underline: property === 'underline' ? value : shape.underline,
          strikethrough: property === 'strikethrough' ? value : shape.strikethrough,
        };
        
        // Calculate new height based on updated font properties
        const newHeight = calculateTextHeight(currentText, fontSize, fontFamily, width, formatting);
        updateData.height = newHeight;
      }

      // Update local store
      updateShape(shape.id, updateData);

      // Sync to Firestore
      if (syncEngineRef.current) {
        const updatedShape = { ...shape, ...updateData };
        syncEngineRef.current.applyLocalChange(shape.id, updatedShape);
        syncEngineRef.current.queueWrite(shape.id, updatedShape, true);
      }
    });
  };

  const handleFontSizeChange = (e) => {
    const fontSize = parseInt(e.target.value, 10);
    if (fontSize && fontSize > 0) {
      updateTextProperty('fontSize', fontSize);
    }
  };

  const handleFontFamilyChange = (e) => {
    updateTextProperty('fontFamily', e.target.value);
  };

  const handleTextAlignChange = (alignment) => {
    updateTextProperty('textAlign', alignment);
  };

  // Text formatting toggle handlers
  const handleBoldToggle = () => {
    const currentBold = selectedTextShapes[0]?.bold || false;
    updateTextProperty('bold', !currentBold);
  };

  const handleItalicToggle = () => {
    const currentItalic = selectedTextShapes[0]?.italic || false;
    updateTextProperty('italic', !currentItalic);
  };

  const handleUnderlineToggle = () => {
    const currentUnderline = selectedTextShapes[0]?.underline || false;
    updateTextProperty('underline', !currentUnderline);
  };

  const handleStrikethroughToggle = () => {
    const currentStrikethrough = selectedTextShapes[0]?.strikethrough || false;
    updateTextProperty('strikethrough', !currentStrikethrough);
  };

  // Alignment and Distribution handlers
  const handleAlignment = async (alignmentType) => {
    if (selectedIds.length < 2 || !syncEngineRef.current) return;
    
    try {
      const result = await alignShapes(
        selectedIds,
        alignmentType,
        shapes,
        syncEngineRef.current,
        undefined, // No node refs for now - using fallback calculation
        currentUser
      );
      
      if (!result.success) {
        console.warn('Alignment failed:', result.error);
      }
    } catch (error) {
      console.error('Error during alignment:', error);
    }
  };

  const handleDistribution = async (distributionType) => {
    if (selectedIds.length < 3 || !syncEngineRef.current) return;
    
    try {
      const result = await distributeShapes(
        selectedIds,
        distributionType,
        shapes,
        syncEngineRef.current,
        undefined, // No node refs for now - using fallback calculation
        currentUser
      );
      
      if (!result.success) {
        console.warn('Distribution failed:', result.error);
      }
    } catch (error) {
      console.error('Error during distribution:', error);
    }
  };

  // Export handlers
  const handleExport = (format) => {
    const viewport = useCanvasStore.getState().viewport;
    const users = useCanvasStore.getState().users;
    
    const metadata = {
      exportDate: new Date().toISOString(),
      shapeCount: Object.keys(shapes).length,
      userCount: Object.keys(users).length,
      canvasId: 'default-canvas',
      version: '1.0.0',
    };
    
    const options = {
      format,
      fullCanvas: true,
      filename: `canvas-${format}-${Date.now()}.${format}`,
      includeMetadata: true,
    };
    
    if (format === 'png') {
      // Calculate bounds of all shapes
      const shapesArray = Object.values(shapes);
      if (shapesArray.length === 0) {
        alert('No shapes to export!');
        return;
      }
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      shapesArray.forEach(shape => {
        const x1 = shape.x;
        const y1 = shape.y;
        const x2 = shape.x + (shape.width || 0);
        const y2 = shape.y + (shape.height || 0);
        
        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);
      });
      
      // Add padding
      const padding = 40;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
      
      const width = maxX - minX;
      const height = maxY - minY;
      
      // Create export canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');
      
      // Fill with white background
      ctx.fillStyle = '#1F2937'; // Match canvas background color
      ctx.fillRect(0, 0, width, height);
      
      // Sort shapes by z-index
      const sortedShapes = shapesArray.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      
      // Draw all shapes
      sortedShapes.forEach(shape => {
        ctx.save();
        
        const x = shape.x - minX;
        const y = shape.y - minY;
        
        // Handle rotation
        if (shape.rotation) {
          const centerX = x + (shape.width || 0) / 2;
          const centerY = y + (shape.height || 0) / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(shape.rotation);
          ctx.translate(-centerX, -centerY);
        }
        
        ctx.fillStyle = shape.fill || '#000000';
        
        if (shape.type === 'rectangle') {
          ctx.fillRect(x, y, shape.width || 100, shape.height || 100);
        } else if (shape.type === 'ellipse') {
          const centerX = x + (shape.width || 100) / 2;
          const centerY = y + (shape.height || 100) / 2;
          const radiusX = (shape.width || 100) / 2;
          const radiusY = (shape.height || 100) / 2;
          
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape.type === 'text') {
          const fontSize = shape.fontSize || 16;
          const fontFamily = shape.fontFamily || 'Inter, sans-serif';
          const fontWeight = shape.bold ? 'bold' : 'normal';
          const fontStyle = shape.italic ? 'italic' : 'normal';
          
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.textBaseline = 'top';
          ctx.textAlign = shape.textAlign || 'left';
          
          // Handle text alignment
          let textX = x;
          if (shape.textAlign === 'center') {
            textX = x + (shape.width || 200) / 2;
          } else if (shape.textAlign === 'right') {
            textX = x + (shape.width || 200);
          }
          
          // Draw text with decorations
          const text = shape.text || 'Text';
          ctx.fillText(text, textX, y);
          
          // Underline
          if (shape.underline) {
            const metrics = ctx.measureText(text);
            ctx.beginPath();
            ctx.moveTo(textX, y + fontSize);
            ctx.lineTo(textX + metrics.width, y + fontSize);
            ctx.strokeStyle = shape.fill || '#000000';
            ctx.stroke();
          }
          
          // Strikethrough
          if (shape.strikethrough) {
            const metrics = ctx.measureText(text);
            ctx.beginPath();
            ctx.moveTo(textX, y + fontSize / 2);
            ctx.lineTo(textX + metrics.width, y + fontSize / 2);
            ctx.strokeStyle = shape.fill || '#000000';
            ctx.stroke();
          }
        }
        
        ctx.restore();
      });
      
      // Export
      const dataURL = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = options.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'svg') {
      exportAsSVG(shapes, viewport, options);
    } else if (format === 'json') {
      exportAsJSON(shapes, viewport, options, metadata);
    }
    
    setShowExportMenu(false);
  };

  // Get current properties from selected text shapes (use first shape as reference)
  const currentFontSize = selectedTextShapes[0]?.fontSize || 16;
  const currentFontFamily = selectedTextShapes[0]?.fontFamily || 'Inter, system-ui, sans-serif';
  const currentTextAlign = selectedTextShapes[0]?.textAlign || 'left';
  const currentBold = selectedTextShapes[0]?.bold || false;
  const currentItalic = selectedTextShapes[0]?.italic || false;
  const currentUnderline = selectedTextShapes[0]?.underline || false;
  const currentStrikethrough = selectedTextShapes[0]?.strikethrough || false;

  // Standardized button classes
  const toolButtonClass = (isActive) => `
    flex items-center justify-center w-10 h-10 rounded-lg transition-colors font-medium
    ${isActive 
      ? 'bg-blue-600 text-white shadow-md' 
      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
    }
  `;

  const formatButtonClass = (isActive) => `
    flex items-center justify-center w-9 h-9 rounded-md transition-colors
    ${isActive 
      ? 'bg-blue-600 text-white shadow-sm' 
      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
    }
  `;
  
  return (
    <div className="bg-gray-800 border-b border-gray-600 h-16">
      
      {/* === SINGLE TOOLBAR ROW === */}
      <div className="h-16 flex items-center px-4 gap-3">
        
        {/* Primary Creation Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={clearCreateMode}
            className={toolButtonClass(createMode === null)}
            title="Select Tool (V)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 2l7.5 18L12 13l7 7 3-3-7-7 7.5-2.5L2 2z"/>
            </svg>
          </button>
          
          <button
            onClick={() => handleToolClick('rectangle')}
            className={toolButtonClass(createMode === 'rectangle')}
            title="Rectangle (R)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="14" rx="2"/>
            </svg>
          </button>
          
          <button
            onClick={() => handleToolClick('ellipse')}
            className={toolButtonClass(createMode === 'ellipse')}
            title="Ellipse (C)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="12" r="9"/>
            </svg>
          </button>
          
          <button
            onClick={() => handleToolClick('text')}
            className={toolButtonClass(createMode === 'text')}
            title="Text (T)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 4h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 4v10h8V8H8zm2 2h4v2h-4v-2z"/>
            </svg>
          </button>
        </div>
        
        {/* Divider */}
        <div className="w-px h-6 bg-gray-600" />
        
        {/* Object Properties */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              ref={colorButtonRef}
              onClick={handleColorPickerClick}
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg transition-colors
                ${showColorPicker 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }
              `}
              title={hasSelectedText ? "Text Color" : "Fill Color"}
            >
              {hasSelectedText ? (
                // Text color icon (A with color indicator)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5,17H19V19H5V17M12,5L14.09,7.95L16,6L18,8L12,14.5L6,8L8,6L9.91,7.95L12,5Z"/>
                </svg>
              ) : (
                // Fill color icon (solid circle)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="currentColor"/>
                </svg>
              )}
            </button>
            
            {/* Aspect Lock Toggle */}
            <button
              onClick={toggleAspectLock}
              className={toolButtonClass(aspectLock)}
              title="Lock Aspect Ratio (Shift+A)"
            >
              {aspectLock ? (
                // Locked aspect ratio icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6,10V8A6,6 0 0,1 18,8V10H20V8A8,8 0 0,0 4,8V10H6M8,12A2,2 0 0,1 10,10H14A2,2 0 0,1 16,12V16A2,2 0 0,1 14,18H10A2,2 0 0,1 8,16V12Z"/>
                </svg>
              ) : (
                // Unlocked aspect ratio icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6,10V8A6,6 0 0,1 18,8V10H22L21,12H20V16A2,2 0 0,1 18,18H10A2,2 0 0,1 8,16V12H6L7,10H6M18,12H10V16H18V12Z"/>
                </svg>
              )}
            </button>
          </div>
        )}
        
        {/* Alignment Tools */}
        {alignmentAvailability.alignmentEnabled && (
          <>
            {/* Divider */}
            <div className="w-px h-6 bg-gray-600" />
            
            <div className="flex items-center gap-1">
              {/* Alignment buttons */}
              <button
                onClick={() => handleAlignment('left')}
                className={toolButtonClass(false)}
                title="Align Left"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/>
                  <path d="M2 2v20h1V2H2z"/>
                </svg>
              </button>
              
              <button
                onClick={() => handleAlignment('center')}
                className={toolButtonClass(false)}
                title="Align Center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v2H3V3zm4 4h10v2H7V7zm-4 4h18v2H3v-2zm4 4h10v2H7v-2z"/>
                  <path d="M12 2v20h1V2h-1z"/>
                </svg>
              </button>
              
              <button
                onClick={() => handleAlignment('right')}
                className={toolButtonClass(false)}
                title="Align Right"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v2H3V3zm6 4h12v2H9V7zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/>
                  <path d="M21 2v20h1V2h-1z"/>
                </svg>
              </button>
              
              <div className="w-px h-4 bg-gray-600 mx-1" />
              
              <button
                onClick={() => handleAlignment('top')}
                className={toolButtonClass(false)}
                title="Align Top"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3v1h18V3H3zm4 18v-6h2v6H7zm8 0v-6h2v6h-2zm-4 0v-8h2v8h-2z"/>
                  <path d="M2 2h20v1H2V2z"/>
                </svg>
              </button>
              
              <button
                onClick={() => handleAlignment('middle')}
                className={toolButtonClass(false)}
                title="Align Middle"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 5v6h2V5H7zm8 0v6h2V5h-2zm-4 0v8h2V5h-2zm-9 8v1h18v-1H2z"/>
                  <path d="M2 12h20v1H2v-1z"/>
                </svg>
              </button>
              
              <button
                onClick={() => handleAlignment('bottom')}
                className={toolButtonClass(false)}
                title="Align Bottom"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 3v6h2V3H7zm8 0v6h2V3h-2zm-4 0v8h2V3h-2z"/>
                  <path d="M2 21h20v1H2v-1z"/>
                </svg>
              </button>
            </div>
          </>
        )}
        
        {/* Distribution Tools */}
        {alignmentAvailability.distributionEnabled && (
          <>
            {/* Small gap between alignment and distribution */}
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => handleDistribution('horizontal')}
                className={toolButtonClass(false)}
                title="Distribute Horizontally"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 5v14h2V5H4zm14 0v14h2V5h-2zM9 8v8h6V8H9z"/>
                  <path d="M8 10h1v4H8v-4zm7 0h1v4h-1v-4z"/>
                </svg>
              </button>
              
              <button
                onClick={() => handleDistribution('vertical')}
                className={toolButtonClass(false)}
                title="Distribute Vertically"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 4h14v2H5V4zm0 14h14v2H5v-2zM8 9h8v6H8V9z"/>
                  <path d="M10 8v1h4V8h-4zm0 7v1h4v-1h-4z"/>
                </svg>
              </button>
            </div>
          </>
        )}
        
        {/* Export Button */}
        <div className="w-px h-6 bg-gray-600" />
        
        <div className="relative">
          <button
            ref={exportButtonRef}
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={toolButtonClass(showExportMenu)}
            title="Export Canvas"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          
          {/* Export Menu Dropdown */}
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => handleExport('png')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white rounded transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  Export as PNG
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white rounded transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  Export as SVG
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white rounded transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Export as JSON
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Status and Hints / Text Formatting Controls */}
        <div className="flex-1 flex items-center justify-center">
          {hasSelectedText ? (
            /* Text Formatting Controls (when text selected) */
            <div className="flex items-center gap-4">
              {/* Font Family */}
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs">Font:</label>
                <select
                  value={currentFontFamily}
                  onChange={handleFontFamilyChange}
                  className="h-7 bg-gray-700 text-white text-xs rounded-md px-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Times New Roman, serif">Times New Roman</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="Monaco, monospace">Monaco</option>
                  <option value="Courier New, monospace">Courier New</option>
                </select>
              </div>
              
              {/* Text Formatting Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBoldToggle}
                  className={formatButtonClass(currentBold)}
                  title="Bold (Ctrl+B)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1 4 4 4 4 0 0 1-4 4H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 5V7h6a2 2 0 1 1 0 4H8zm0 2h6a2 2 0 1 1 0 4H8v-4z"/>
                  </svg>
                </button>
                
                <button
                  onClick={handleItalicToggle}
                  className={formatButtonClass(currentItalic)}
                  title="Italic (Ctrl+I)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 4H9v2h2.21l-2.42 12H6v2h6v-2h-2.21l2.42-12H15V4z"/>
                  </svg>
                </button>
                
                <button
                  onClick={handleUnderlineToggle}
                  className={formatButtonClass(currentUnderline)}
                  title="Underline (Ctrl+U)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
                  </svg>
                </button>
                
                <button
                  onClick={handleStrikethroughToggle}
                  className={formatButtonClass(currentStrikethrough)}
                  title="Strikethrough"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.24 8.75c-.26-.48-.39-1.03-.39-1.67 0-.61.13-1.16.4-1.67.26-.5.63-.93 1.11-1.29a5.73 5.73 0 0 1 1.7-.83c.66-.19 1.39-.29 2.18-.29.81 0 1.54.11 2.21.34.66.22 1.23.54 1.69.94.47.4.83.88 1.08 1.43.25.55.38 1.15.38 1.81h-3.01c0-.31-.05-.59-.15-.85-.09-.27-.24-.49-.44-.68-.2-.19-.45-.33-.75-.44-.3-.1-.66-.16-1.06-.16-.39 0-.74.04-1.03.13-.29.09-.53.21-.72.36-.19.16-.33.34-.43.55-.1.21-.15.43-.15.66 0 .48.25.88.74 1.21.38.25.77.48 1.41.7H7.39c-.05-.08-.11-.17-.15-.25zM21 12v-2H3v2h9.62c.18.07.4.14.55.2.37.17.66.34.87.51s.35.36.43.57c.07.2.11.43.11.69 0 .23-.05.45-.14.66-.09.2-.23.38-.42.53-.19.15-.42.26-.71.35-.29.08-.63.13-1.01.13-.43 0-.83-.04-1.18-.13s-.66-.23-.91-.42c-.25-.19-.45-.44-.59-.75-.14-.31-.25-.76-.25-1.21H6.4c0 .55.12 1.04.36 1.48.24.44.59.81 1.04 1.12.45.31.98.55 1.6.72.61.17 1.29.25 2.04.25.81 0 1.54-.13 2.21-.4.67-.26 1.23-.62 1.69-1.06.46-.44.82-.95 1.07-1.52.25-.57.38-1.15.38-1.73 0-.54-.13-1.06-.38-1.55-.25-.49-.63-.93-1.12-1.32L21 12z"/>
                  </svg>
                </button>
              </div>
              
              {/* Font Size */}
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs">Size:</label>
                <input
                  type="number"
                  min="8"
                  max="144"
                  value={currentFontSize}
                  onChange={handleFontSizeChange}
                  className="w-14 h-7 bg-gray-700 text-white text-xs text-center rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              {/* Text Alignment */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTextAlignChange('left')}
                  className={formatButtonClass(currentTextAlign === 'left')}
                  title="Align Left"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/>
                  </svg>
                </button>
                
                <button
                  onClick={() => handleTextAlignChange('center')}
                  className={formatButtonClass(currentTextAlign === 'center')}
                  title="Align Center"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h18v2H3V3zm4 4h10v2H7V7zm-4 4h18v2H3v-2zm4 4h10v2H7v-2z"/>
                  </svg>
                </button>
                
                <button
                  onClick={() => handleTextAlignChange('right')}
                  className={formatButtonClass(currentTextAlign === 'right')}
                  title="Align Right"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h18v2H3V3zm6 4h12v2H9V7zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            /* Status Text (when no text selected) */
            <div className="text-gray-400 text-sm">
              {createMode === null && selectedIds.length === 0 && '🖱️ Select and move objects'}
              {createMode === null && selectedIds.length === 1 && 
                `✨ 1 object selected${aspectLock ? ' (Aspect locked)' : ''}`}
              {createMode === null && selectedIds.length > 1 && 
                `✨ ${selectedIds.length} objects selected${aspectLock ? ' (Aspect locked)' : ''}`}
              {createMode === 'rectangle' && '📦 Click and drag to create rectangle'}
              {createMode === 'ellipse' && '⭕ Click and drag to create ellipse'}
              {createMode === 'text' && '📝 Click to place text'}
            </div>
          )}
        </div>
        
        {/* Actions */}
        {createMode && (
          <button
            onClick={clearCreateMode}
            className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Press ESC to cancel
          </button>
        )}
      </div>
      
      
      {/* Color Picker Modal */}
      <ColorPicker
        isOpen={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        position={colorPickerPosition}
      />
    </div>
  );
};

export default Toolbar;