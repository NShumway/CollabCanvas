/**
 * useConnectionState - Network Monitoring & State Reconciliation
 * 
 * Monitors network connectivity and Firestore connection state.
 * Handles state reconciliation on reconnect to ensure consistency.
 * 
 * Architecture:
 * - Monitor network connectivity via Network API
 * - Track Firestore operation success/failure patterns
 * - Update Zustand connectionState
 * - On reconnect: fetch current Firestore state and reconcile with local
 * - Clear stale pending writes (older than 60s)
 * - One-time reconciliation separate from real-time sync
 */

import { useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getShapesRef } from '../services/firestore';
import useCanvasStore from '../store/canvasStore';
import { useAuth } from './useAuth';

export const useConnectionState = () => {
  const { currentUser } = useAuth();
  const { 
    shapes,
    setShapes,
    addShape,
    updateShape,
    removeShape,
    connectionState,
    setConnectionState,
    lastSyncTimestamp,
    setLastSyncTimestamp,
    pendingWrites,
    removePendingWrite
  } = useCanvasStore();

  /**
   * Reconcile local state with Firestore on reconnect
   * Handles "what did I miss while offline?" scenario
   */
  const reconcileState = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      devLog.sync('Starting state reconciliation after reconnect...');
      setConnectionState('reconnecting');
      
      // Fetch current Firestore state
      const shapesRef = getShapesRef();
      const shapesQuery = query(shapesRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(shapesQuery);
      
      const firestoreShapes = {};
      snapshot.docs.forEach(doc => {
        const shapeData = doc.data();
        firestoreShapes[doc.id] = {
          ...shapeData,
          id: doc.id,
          updatedAt: shapeData.updatedAt?.seconds 
            ? shapeData.updatedAt.seconds * 1000 
            : Date.now(),
          createdAt: shapeData.createdAt?.seconds 
            ? shapeData.createdAt.seconds * 1000 
            : Date.now()
        };
      });
      
      devLog.sync(`Reconciliation: Found ${Object.keys(firestoreShapes).length} shapes in Firestore`);
      
      // Compare with local state and apply updates
      const currentTime = Date.now();
      let updatesCount = 0;
      
      // Add missing shapes from Firestore
      Object.entries(firestoreShapes).forEach(([shapeId, firestoreShape]) => {
        const localShape = shapes[shapeId];
        
        if (!localShape) {
          // Shape exists in Firestore but not locally - add it
          addShape(firestoreShape);
          updatesCount++;
          devLog.sync('Added missing shape:', shapeId);
        } else if (firestoreShape.updatedAt > localShape.updatedAt) {
          // Firestore version is newer - update local
          updateShape(shapeId, firestoreShape);
          updatesCount++;
          devLog.sync('Updated stale shape:', shapeId);
        }
      });
      
      // Remove shapes that exist locally but not in Firestore
      Object.keys(shapes).forEach(shapeId => {
        if (!firestoreShapes[shapeId]) {
          removeShape(shapeId);
          updatesCount++;
          devLog.sync('Removed deleted shape:', shapeId);
        }
      });
      
      // Clear stale pending writes (older than 60 seconds)
      const staleThreshold = currentTime - 60000; // 60 seconds
      Object.entries(pendingWrites).forEach(([shapeId, timestamp]) => {
        if (timestamp < staleThreshold) {
          removePendingWrite(shapeId);
          devLog.sync('Cleared stale pending write:', shapeId);
        }
      });
      
      setConnectionState('connected');
      setLastSyncTimestamp(currentTime);
      
      devLog.sync(`State reconciliation complete: ${updatesCount} updates applied`);
      
    } catch (error) {
      devLog.error('State reconciliation failed:', error);
      setConnectionState('disconnected');
    }
  }, [currentUser, shapes, addShape, updateShape, removeShape, setConnectionState, 
      setLastSyncTimestamp, pendingWrites, removePendingWrite]);

  /**
   * Monitor network connectivity
   */
  useEffect(() => {
    // Initial connection state
    setConnectionState(navigator.onLine ? 'connected' : 'disconnected');
    
    const handleOnline = () => {
      devLog.sync('Network reconnected - triggering state reconciliation');
      reconcileState();
    };
    
    const handleOffline = () => {
      devLog.sync('Network disconnected');
      setConnectionState('disconnected');
    };
    
    // Listen for network events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconcileState, setConnectionState]);

  /**
   * Monitor Firestore operation patterns to detect connection issues
   * This supplements network monitoring with Firestore-specific detection
   */
  useEffect(() => {
    // We could add Firestore operation monitoring here if needed
    // For MVP, network events + manual reconciliation should be sufficient
  }, []);
  
  return {
    connectionState,
    reconcileState
  };
};
