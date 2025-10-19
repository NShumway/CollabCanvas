import { useState, useMemo } from 'react';
import useCanvasStore from '@/store/canvasStore';
import { getSyncEngine } from '@/services/syncEngine';

const LayerPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Selective store subscriptions for performance
  const shapes = useCanvasStore(state => state.shapes);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedIdsSet = useCanvasStore(state => state.selectedIdsSet);
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds);
  const addToSelection = useCanvasStore(state => state.addToSelection);
  const removeFromSelection = useCanvasStore(state => state.removeFromSelection);
  const bringToFront = useCanvasStore(state => state.bringToFront);
  const sendToBack = useCanvasStore(state => state.sendToBack);
  const bringForward = useCanvasStore(state => state.bringForward);
  const sendBackward = useCanvasStore(state => state.sendBackward);

  // Sort shapes by zIndex (highest to lowest for display) - memoized for performance
  const sortedShapes = useMemo(() => 
    Object.values(shapes).sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)), 
    [shapes]
  );

  const handleLayerClick = (shapeId, e) => {
    if (e.shiftKey) {
      // Add to selection - use O(1) operations
      if (selectedIdsSet.has(shapeId)) {
        removeFromSelection(shapeId);
      } else {
        addToSelection(shapeId);
      }
    } else {
      // Replace selection
      setSelectedIds([shapeId]);
    }
  };

  const handleZIndexChange = (shapeId, action) => {
    const syncEngine = getSyncEngine();
    const shape = shapes[shapeId];
    
    if (!shape || !syncEngine) return;

    // Apply action locally first (store handles collision detection)
    switch (action) {
      case 'front':
        bringToFront(shapeId);
        break;
      case 'back':
        sendToBack(shapeId);
        break;
      case 'forward':
        bringForward(shapeId);
        break;
      case 'backward':
        sendBackward(shapeId);
        break;
      default:
        return;
    }
    
    // Get updated shape with collision-free z-index from store
    const updatedShape = useCanvasStore.getState().shapes[shapeId];
    if (!updatedShape) return;
    
    // Sync via SyncEngine
    try {
      const updateData = { 
        zIndex: updatedShape.zIndex, // Use collision-free z-index from store
        updatedBy: shape.updatedBy,
        clientTimestamp: Date.now()
      };
      syncEngine.applyLocalChange(shapeId, updateData);
      syncEngine.queueWrite(shapeId, { ...updatedShape, ...updateData }, true);
    } catch (error) {
      console.warn('Failed to sync z-index change:', error);
    }
  };

  const getShapeDisplayName = (shape) => {
    const name = `${shape.type.charAt(0).toUpperCase()}${shape.type.slice(1)}`;
    return `${name} (${Math.round(shape.x)}, ${Math.round(shape.y)})`;
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        title="Toggle Layer Panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Layer Panel */}
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Layers</h3>
            <div className="text-xs text-gray-500 mt-1">
              {sortedShapes.length} shapes
            </div>
          </div>
          
          <div className="p-2">
            {sortedShapes.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                No shapes on canvas
              </div>
            ) : (
              sortedShapes.map((shape) => (
                <div
                  key={shape.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 ${
                    selectedIdsSet.has(shape.id) ? 'bg-blue-100 border border-blue-300' : ''
                  }`}
                  onClick={(e) => handleLayerClick(shape.id, e)}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div
                      className="w-4 h-4 rounded mr-2 border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: shape.fill || '#E2E8F0' }}
                    />
                    <span className="text-sm text-gray-800 truncate">
                      {getShapeDisplayName(shape)}
                    </span>
                  </div>
                  
                  {selectedIdsSet.has(shape.id) && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZIndexChange(shape.id, 'front');
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                        title="Bring to Front"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZIndexChange(shape.id, 'forward');
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                        title="Bring Forward"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZIndexChange(shape.id, 'backward');
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                        title="Send Backward"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZIndexChange(shape.id, 'back');
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                        title="Send to Back"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17 3a1 1 0 01-1 1H4a1 1 0 110-2h12a1 1 0 011 1zm-7.707.293a1 1 0 010 1.414L6 8H14a1 1 0 010 2H6l3.293 3.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerPanel;
