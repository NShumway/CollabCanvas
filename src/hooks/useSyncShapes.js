import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import useCanvasStore from '../store/canvasStore';
import { writeShape, deleteShape as deleteShapeFromFirestore, listenToShapes } from '../services/firestore';

// Aggressive debouncing to stay within Firebase limits
const DEBOUNCE_DELAY = 250; // 250ms debounce for drag operations

export const useSyncShapes = () => {
  const { currentUser } = useAuth();
  const { 
    shapes, 
    setShapes, 
    updateShape, 
    addShape, 
    removeShape,
    setLoading 
  } = useCanvasStore();
  
  // Debounced write queue
  const writeQueue = useRef(new Map());
  const writeTimeouts = useRef(new Map());
  
  /**
   * Debounced write to Firestore
   * Batches rapid updates (like dragging) into single write operations
   */
  const debouncedWrite = useCallback((shape) => {
    if (!currentUser?.email) return;
    
    // Clear existing timeout for this shape
    if (writeTimeouts.current.has(shape.id)) {
      clearTimeout(writeTimeouts.current.get(shape.id));
    }
    
    // Queue the shape for writing
    writeQueue.current.set(shape.id, shape);
    
    // Set new timeout
    const timeoutId = setTimeout(async () => {
      const shapeToWrite = writeQueue.current.get(shape.id);
      if (shapeToWrite) {
        await writeShape(shapeToWrite, currentUser.email);
        writeQueue.current.delete(shape.id);
        writeTimeouts.current.delete(shape.id);
      }
    }, DEBOUNCE_DELAY);
    
    writeTimeouts.current.set(shape.id, timeoutId);
  }, [currentUser?.email]);
  
  /**
   * Immediate write to Firestore (for shape creation, deletion)
   */
  const immediateWrite = useCallback(async (shape) => {
    if (!currentUser?.email) return;
    
    // Cancel any pending debounced write for this shape
    if (writeTimeouts.current.has(shape.id)) {
      clearTimeout(writeTimeouts.current.get(shape.id));
      writeTimeouts.current.delete(shape.id);
      writeQueue.current.delete(shape.id);
    }
    
    await writeShape(shape, currentUser.email);
  }, [currentUser?.email]);
  
  /**
   * Delete shape from Firestore
   */
  const deleteShape = useCallback(async (shapeId) => {
    // Cancel any pending writes for this shape
    if (writeTimeouts.current.has(shapeId)) {
      clearTimeout(writeTimeouts.current.get(shapeId));
      writeTimeouts.current.delete(shapeId);
      writeQueue.current.delete(shapeId);
    }
    
    await deleteShapeFromFirestore(shapeId);
  }, []);
  
  /**
   * Handle remote shape changes from Firestore
   */
  const handleRemoteChanges = useCallback((changes, error) => {
    if (error) {
      console.error('Shape sync error:', error);
      return;
    }
    
    if (!changes) return;
    
    changes.forEach(change => {
      // Skip local echoes (changes we made ourselves that are pending)
      if (change.hasPendingWrites) {
        return;
      }
      
      const { type, data, id } = change;
      
      switch (type) {
        case 'added':
        case 'modified':
          // Simple last-write-wins: always accept remote changes
          // TODO: Add more sophisticated conflict resolution post-MVP
          const existingShape = shapes[id];
          
          // Only update if remote timestamp is newer (or shape doesn't exist locally)
          if (!existingShape || 
              !existingShape.updatedAt || 
              (data.updatedAt?.seconds * 1000) > existingShape.updatedAt) {
            
            // Convert Firestore timestamp to JS timestamp
            const shape = {
              ...data,
              updatedAt: data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now(),
              createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now()
            };
            
            if (existingShape) {
              updateShape(id, shape);
            } else {
              addShape(shape);
            }
          }
          break;
          
        case 'removed':
          removeShape(id);
          break;
      }
    });
  }, [shapes, updateShape, addShape, removeShape]);
  
  /**
   * Set up real-time listener
   */
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = listenToShapes((changes, error) => {
      handleRemoteChanges(changes, error);
      setLoading(false); // Turn off loading after first batch
    });
    
    return () => {
      unsubscribe();
      
      // Clean up pending timeouts
      writeTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
      writeTimeouts.current.clear();
      writeQueue.current.clear();
    };
  }, [handleRemoteChanges, setLoading]);
  
  return {
    syncShape: debouncedWrite,      // For drag operations (debounced)
    createShape: immediateWrite,    // For shape creation (immediate)
    deleteShape,                    // For shape deletion
  };
};
