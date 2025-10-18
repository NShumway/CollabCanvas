/**
 * useFirestoreSync - Read Path Only
 * 
 * CRITICAL: This hook handles ONLY reading from Firestore.
 * NEVER add write operations here.
 * 
 * Architecture:
 * - Listen to shapes collection with onSnapshot
 * - Apply strict echo prevention checks
 * - Only update Zustand for legitimate remote changes
 * - Use timestamp comparison for conflict resolution
 * 
 * The write path is handled separately in syncEngine.js
 */

import { useEffect, useCallback } from 'react';
import { listenToShapes } from '../services/firestore';
import useCanvasStore from '../store/canvasStore';
import { devLog } from '../utils/devSettings';

/**
 * Hook to sync shapes from Firestore (Read Path Only)
 * Implements bulletproof echo prevention and conflict resolution
 */
export const useFirestoreSync = () => {
  const { 
    shapes,
    updateShape,
    addShape,
    removeShape,
    setLoading,
    hasPendingWrite
  } = useCanvasStore();
  
  /**
   * Handle remote shape changes from Firestore
   * Implements critical echo prevention and timestamp-based conflict resolution
   */
  const handleRemoteChanges = useCallback((changes, error) => {
    if (error) {
      devLog.error('Firestore sync error:', error);
      return;
    }
    
    if (!changes || changes.length === 0) return;
    
    changes.forEach(change => {
      const { type, data, id, hasPendingWrites: docHasPendingWrites } = change;
      
      // CRITICAL ECHO PREVENTION CHECK #1:
      // Skip if document has pending writes (this is our local change being echoed back)
      if (docHasPendingWrites) {
        return;
      }
      
      // CRITICAL ECHO PREVENTION CHECK #2:
      // Skip if we have this shape in our pending writes map
      if (hasPendingWrite(id)) {
        return;
      }
      
      switch (type) {
        case 'added':
        case 'modified':
          handleShapeUpdate(id, data, type === 'added');
          break;
          
        case 'removed':
          removeShape(id);
          break;
          
        default:
          devLog.warn('Unknown change type:', type);
      }
    });
  }, [updateShape, addShape, removeShape, hasPendingWrite]);
  
  /**
   * Handle individual shape updates with timestamp-based conflict resolution
   */
  const handleShapeUpdate = useCallback((shapeId, remoteData, isNewShape) => {
    // Access shapes directly from store to avoid dependency
    const currentShapes = useCanvasStore.getState().shapes;
    const existingShape = currentShapes[shapeId];
    
    // Convert Firestore timestamp to JavaScript timestamp for comparison
    const remoteTimestamp = remoteData.updatedAt?.seconds 
      ? remoteData.updatedAt.seconds * 1000 
      : Date.now();
    
    const localTimestamp = existingShape?.updatedAt || 0;
    
    // CRITICAL TIMESTAMP COMPARISON:
    // Only update if remote timestamp is newer than local timestamp
    // This implements "last write wins" conflict resolution
    if (existingShape && remoteTimestamp <= localTimestamp) {
      return;
    }
    
    // Prepare shape data with converted timestamps
    const shapeData = {
      ...remoteData,
      id: shapeId,
      updatedAt: remoteTimestamp,
      createdAt: remoteData.createdAt?.seconds 
        ? remoteData.createdAt.seconds * 1000 
        : remoteTimestamp
    };
    
    if (isNewShape || !existingShape) {
      addShape(shapeData);
    } else {
      updateShape(shapeId, shapeData);
    }
  }, [addShape, updateShape]);
  
  /**
   * Set up Firestore listener on component mount
   */
  useEffect(() => {
    setLoading(true);
    
    // Start listening to shape changes
    const unsubscribe = listenToShapes((changes, error) => {
      handleRemoteChanges(changes, error);
      
      // Turn off loading after first batch of changes
      setLoading(false);
    });
    
    // Cleanup listener on unmount
    return unsubscribe;
  }, [handleRemoteChanges, setLoading]);
  
  // This hook doesn't return anything - it just manages the Firestore listener
  // All state updates happen through Zustand store actions
};
