import { useState, useRef } from 'react';
import useCanvasStore from '@/store/canvasStore';
import ColorPicker from './ColorPicker';

const Toolbar = () => {
  const { createMode, setCreateMode, clearCreateMode, selectedIds } = useCanvasStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const colorButtonRef = useRef(null);
  
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
  
  return (
    <div className="h-16 bg-gray-800 border-b border-gray-600 flex items-center px-4 gap-2">
      {/* Selection Tool */}
      <button
        onClick={clearCreateMode}
        className={`
          flex items-center justify-center w-10 h-10 rounded-md transition-colors
          ${createMode === null 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }
        `}
        title="Select (V)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 2l7.5 18L12 13l7 7 3-3-7-7 7.5-2.5L2 2z"/>
        </svg>
      </button>
      
      {/* Rectangle Tool */}
      <button
        onClick={() => handleToolClick('rectangle')}
        className={`
          flex items-center justify-center w-10 h-10 rounded-md transition-colors
          ${createMode === 'rectangle' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }
        `}
        title="Rectangle (R)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="14" rx="2"/>
        </svg>
      </button>
      
      {/* Circle Tool */}
      <button
        onClick={() => handleToolClick('circle')}
        className={`
          flex items-center justify-center w-10 h-10 rounded-md transition-colors
          ${createMode === 'circle' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }
        `}
        title="Circle (C)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9"/>
        </svg>
      </button>
      
      {/* Line Tool */}
      <button
        onClick={() => handleToolClick('line')}
        className={`
          flex items-center justify-center w-10 h-10 rounded-md transition-colors
          ${createMode === 'line' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }
        `}
        title="Line (L)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="7" y1="17" x2="17" y2="7"/>
        </svg>
      </button>
      
      {/* Text Tool */}
      <button
        onClick={() => handleToolClick('text')}
        className={`
          flex items-center justify-center w-10 h-10 rounded-md transition-colors
          ${createMode === 'text' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }
        `}
        title="Text (T)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 4h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 4v10h8V8H8zm2 2h4v2h-4v-2z"/>
        </svg>
      </button>
      
      {/* Divider */}
      <div className="w-px h-6 bg-gray-600 mx-2" />
      
      {/* Color Picker Button - only show when shapes are selected */}
      {selectedIds.length > 0 && (
        <button
          ref={colorButtonRef}
          onClick={handleColorPickerClick}
          className={`
            flex items-center justify-center w-10 h-10 rounded-md transition-colors
            ${showColorPicker 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }
          `}
          title="Change Color"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9ZM19 9H14V4H5V21H19V9Z"/>
          </svg>
        </button>
      )}
      
      {/* Another divider after color picker */}
      {selectedIds.length > 0 && <div className="w-px h-6 bg-gray-600 mx-2" />}
      
      {/* Status Text */}
      <div className="text-gray-400 text-sm">
        {createMode === null && selectedIds.length === 0 && '🖱️ Select and move objects'}
        {createMode === null && selectedIds.length > 0 && `✨ ${selectedIds.length} shape${selectedIds.length === 1 ? '' : 's'} selected`}
        {createMode === 'rectangle' && '📦 Click and drag to create rectangles'}
        {createMode === 'circle' && '⭕ Click and drag to create circles'}
        {createMode === 'line' && '📏 Click and drag to draw lines'}
        {createMode === 'text' && '📝 Click to place text'}
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Cancel Create Mode (ESC hint) */}
      {createMode && (
        <button
          onClick={clearCreateMode}
          className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          Press ESC to cancel
        </button>
      )}
      
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
