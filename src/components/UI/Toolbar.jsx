import useCanvasStore from '@/store/canvasStore';

const Toolbar = () => {
  const { createMode, setCreateMode, clearCreateMode } = useCanvasStore();
  
  const handleRectangleMode = () => {
    if (createMode === 'rectangle') {
      clearCreateMode();
    } else {
      setCreateMode('rectangle');
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
        onClick={handleRectangleMode}
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
      
      {/* Divider */}
      <div className="w-px h-6 bg-gray-600 mx-2" />
      
      {/* Status Text */}
      <div className="text-gray-400 text-sm">
        {createMode === null && '🖱️ Select and move objects'}
        {createMode === 'rectangle' && '📦 Click to place rectangles'}
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
    </div>
  );
};

export default Toolbar;
