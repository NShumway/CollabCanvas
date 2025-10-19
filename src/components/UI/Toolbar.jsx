import { useState, useRef, useEffect } from 'react';
import useCanvasStore from '@/store/canvasStore';
import { createSyncEngine } from '@/services/syncEngine';
import { calculateTextHeight } from '@/utils/textMeasurement';
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
  const colorButtonRef = useRef(null);
  const syncEngineRef = useRef(null);

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