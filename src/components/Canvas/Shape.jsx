import { Rect } from 'react-konva';
import useCanvasStore from '../../store/canvasStore';
import { getSyncEngine } from '../../services/syncEngine';

const Shape = ({ shape }) => {
  const { selectedIds, setSelectedIds, currentUser } = useCanvasStore();
  
  const isSelected = selectedIds.includes(shape.id);
  
  const handleClick = (e) => {
    e.cancelBubble = true; // Prevent canvas click
    
    // Figma-style selection: replace selection unless Shift is held
    if (e.evt.shiftKey) {
      if (isSelected) {
        // Remove from selection
        setSelectedIds(selectedIds.filter(id => id !== shape.id));
      } else {
        // Add to selection
        setSelectedIds([...selectedIds, shape.id]);
      }
    } else {
      // Replace selection
      setSelectedIds([shape.id]);
    }
  };
  
  const handleDragStart = (e) => {
    // Prevent canvas panning while dragging shapes
    e.cancelBubble = true;
  };
  
  const handleDragMove = (e) => {
    // Prevent canvas panning while dragging shapes
    e.cancelBubble = true;
    
    const newPos = {
      x: e.target.x(),
      y: e.target.y(),
    };
    
    try {
      const syncEngine = getSyncEngine();
      
      // WRITE PATH: Use SyncEngine for bulletproof sync
      // 1. Apply local change immediately (60fps UX)
      syncEngine.applyLocalChange(shape.id, newPos);
      
      // 2. Queue write to Firestore (debounced for drag operations)
      const updatedShape = { ...shape, ...newPos };
      syncEngine.queueWrite(shape.id, updatedShape, false); // false = debounced
    } catch (error) {
      console.warn('SyncEngine not available during drag, skipping sync:', error);
    }
  };
  
  const handleDragEnd = (e) => {
    // Prevent canvas panning while dragging shapes
    e.cancelBubble = true;
    
    const newPos = {
      x: e.target.x(),
      y: e.target.y(),
    };
    
    try {
      const syncEngine = getSyncEngine();
      
      // WRITE PATH: Use SyncEngine for bulletproof sync
      // 1. Apply final local change
      syncEngine.applyLocalChange(shape.id, newPos);
      
      // 2. Flush any pending writes immediately (end of drag operation)
      const updatedShape = { ...shape, ...newPos };
      syncEngine.queueWrite(shape.id, updatedShape, true); // true = immediate flush
    } catch (error) {
      console.warn('SyncEngine not available during drag end, skipping sync:', error);
    }
  };
  
  // Default shape styles (Figma-like)
  const baseStyle = {
    fill: shape.fill || '#E2E8F0', // Light gray default
    stroke: isSelected ? '#3B82F6' : 'transparent', // Blue selection outline
    strokeWidth: isSelected ? 2 : 0,
  };
  
  // Render based on shape type
  if (shape.type === 'rectangle') {
    return (
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        {...baseStyle}
        draggable={isSelected} // Only selected shapes are draggable
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        // Figma-style hover effect
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.target.stroke('#94A3B8'); // Gray hover outline
            e.target.strokeWidth(1);
            e.target.getLayer().batchDraw();
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.target.stroke('transparent');
            e.target.strokeWidth(0);
            e.target.getLayer().batchDraw();
          }
        }}
      />
    );
  }
  
  // Future: Handle other shape types (circle, text, etc.)
  return null;
};

export default Shape;
