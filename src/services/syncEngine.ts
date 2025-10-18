/**
 * SyncEngine - Write Path Only
 * 
 * CRITICAL: This file handles ONLY writes to Firestore.
 * NEVER add listeners or read operations here.
 * 
 * Architecture:
 * - applyLocalChange(shapeId, updates) - updates Zustand immediately
 * - queueWrite(shapeId, shape) - adds to write queue
 * - flushWrites() - batch writes to Firestore
 * 
 * The read path is handled separately in useFirestoreSync.js
 */

import { writeBatch, serverTimestamp, type WriteBatch } from 'firebase/firestore';
import { db } from './firebase';
import { getShapeRef } from './firestore';
import { convertToFirestoreShape } from '@/types/firebase';
import { devLog } from '@/utils/devSettings';
import type { 
  Shape, 
  ShapeUpdate, 
  BatchShapeUpdates,
  CurrentUser 
} from '@/types';


// Debounce timing for different operations  
const SHAPE_DRAG_DEBOUNCE = 100; // 100ms for shape dragging (as specified)

/**
 * SyncEngine class manages the write path to Firestore
 * Separates local state updates from Firestore writes to prevent echo loops
 */
export class SyncEngine {
  private writeQueue = new Map<string, Shape>(); // shapeId -> shape data
  private writeTimeouts = new Map<string, NodeJS.Timeout>(); // shapeId -> timeoutId
  private batchTimeoutId: NodeJS.Timeout | null = null;
  
  // Track current user for metadata
  private currentUser: CurrentUser | null = null;
  
  // Store reference - will be set by caller  
  private store: any = null;
  
  /**
   * Initialize with store and user (called by component)
   */
  initialize(storeGetter: () => any, currentUser: CurrentUser | null): void {
    this.store = storeGetter;
    this.currentUser = currentUser;
  }
  
  /**
   * Apply local change immediately to Zustand store
   * This provides instant 60fps feedback to the user
   */
  applyLocalChange(shapeId: string, updates: ShapeUpdate): void {
    if (!this.store) {
      console.error('SyncEngine not initialized with store');
      return;
    }
    
    // Update local state immediately
    const timestamp = Date.now();
    const enrichedUpdates: ShapeUpdate & { 
      clientTimestamp: number;
      updatedBy: string; 
    } = {
      ...updates,
      clientTimestamp: timestamp,
      updatedBy: this.currentUser?.uid || 'unknown'
    };
    
    // Check if shape exists or if this is a new shape
    const state = this.store();
    const existingShape = state.shapes[shapeId];
    
    if (existingShape) {
      // Update existing shape
      state.updateShape(shapeId, enrichedUpdates);
    } else {
      // Add new shape (for creation) 
      const newShape: Shape = {
        id: shapeId,
        ...enrichedUpdates
      } as Shape; // Type assertion needed due to discriminated unions
      state.addShape(newShape);
    }
    
    // Mark this shape as having a pending write (prevents echo loops)
    this.store().addPendingWrite(shapeId, timestamp);
  }

  /**
   * Apply batch changes for performance (used during drag operations with many shapes)
   */
  applyBatchChanges(batchUpdates: BatchShapeUpdates): void {
    if (!this.store || !batchUpdates.length) return;
    
    const state = this.store();
    
    // Apply all local changes and queue writes in one operation
    for (const { shapeId, updates } of batchUpdates) {
      state.updateShape(shapeId, updates);
      
      // Queue write for Firestore (debounced) - DON'T mark as pending until actually writing
      const shape = state.shapes[shapeId];
      if (shape) {
        const updatedShape: Shape = { ...shape, ...updates };
        this.queueWrite(shapeId, updatedShape, false);
      }
    }
  }
  
  /**
   * Queue a shape for writing to Firestore
   * Can be immediate (create/delete) or debounced (drag operations)
   */
  queueWrite(shapeId: string, shape: Shape, immediate: boolean = false): void {
    // Clear any existing timeout for this shape
    const existingTimeout = this.writeTimeouts.get(shapeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.writeTimeouts.delete(shapeId);
    }
    
    // Add shape to write queue
    this.writeQueue.set(shapeId, {
      ...shape,
      updatedBy: this.currentUser?.uid || 'unknown'
    });
    
    // Set up flush timing
    if (immediate) {
      // Flush immediately for create/delete operations
      void this.flushWrites();
    } else {
      // Debounce for drag operations
      const timeoutId = setTimeout(() => {
        void this.flushWrites();
        this.writeTimeouts.delete(shapeId);
      }, SHAPE_DRAG_DEBOUNCE);
      
      this.writeTimeouts.set(shapeId, timeoutId);
    }
  }
  
  /**
   * Flush all queued writes to Firestore using batch writes
   * Clears pending writes from Zustand after successful commit
   */
  async flushWrites(): Promise<void> {
    if (this.writeQueue.size === 0) return;
    if (!this.store) {
      devLog.error('SyncEngine not initialized with store');
      return;
    }
    
    try {
      // Create batch write
      const batch: WriteBatch = writeBatch(db);
      const shapesToWrite = Array.from(this.writeQueue.entries());
      
      // Mark shapes as pending writes RIGHT BEFORE actual Firestore write
      shapesToWrite.forEach(([shapeId]) => {
        this.store!().addPendingWrite(shapeId);
      });
      
      // Add all queued shapes to batch
      shapesToWrite.forEach(([shapeId, shape]) => {
        const shapeRef = getShapeRef(shapeId);
        
        // Use convertToFirestoreShape to properly handle undefined values
        const firestoreShape = convertToFirestoreShape(shape);
        const shapeData = {
          ...firestoreShape,
          updatedAt: serverTimestamp(),
          // Set createdBy for new shapes
          ...(shape.createdBy ? {} : {
            createdBy: this.currentUser?.uid || 'unknown'
          })
        };
        
        batch.set(shapeRef, shapeData, { merge: true });
      });
      
      // Commit batch to Firestore
      await batch.commit();
      
      // Clear pending writes from Zustand after successful commit
      shapesToWrite.forEach(([shapeId]) => {
        this.store!().removePendingWrite(shapeId);
      });
      
      // Clear write queue
      this.writeQueue.clear();
      
      // Update last sync timestamp
      this.store().setLastSyncTimestamp();
      
      // Synced shapes to Firestore successfully
      
    } catch (error) {
      devLog.error('Error flushing writes to Firestore:', error);
      
      // Don't clear pending writes on error - they'll be retried
      // Could implement exponential backoff retry here in post-MVP
    }
  }
  
  /**
   * Delete a shape from Firestore
   * Removes from local state and queues deletion
   */
  deleteShape(shapeId: string): void {
    if (!this.store) {
      console.error('SyncEngine not initialized with store');
      return;
    }
    
    // Remove from local state immediately
    this.store().removeShape(shapeId);
    
    // Cancel any pending writes for this shape
    const existingTimeout = this.writeTimeouts.get(shapeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.writeTimeouts.delete(shapeId);
    }
    this.writeQueue.delete(shapeId);
    
    // Queue deletion to Firestore
    void this.queueDeleteToFirestore(shapeId);
  }
  
  /**
   * Queue shape deletion to Firestore
   * Private method used by deleteShape
   */
  private async queueDeleteToFirestore(shapeId: string): Promise<void> {
    try {
      const shapeRef = getShapeRef(shapeId);
      const batch = writeBatch(db);
      batch.delete(shapeRef);
      
      await batch.commit();
      devLog.sync('Deleted shape', shapeId, 'from Firestore');
      
    } catch (error) {
      devLog.error('Error deleting shape from Firestore:', error);
    }
  }
  
  /**
   * Clean up timeouts and queues on component unmount
   */
  cleanup(): void {
    // Clear all pending timeouts
    this.writeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.writeTimeouts.clear();
    
    if (this.batchTimeoutId) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }
    
    // Clear write queue
    this.writeQueue.clear();
    
    // SyncEngine cleaned up
  }
}

/**
 * Create a singleton SyncEngine instance
 * Will be initialized with the store and user in the Canvas component
 */
let syncEngineInstance: SyncEngine | null = null;

export const createSyncEngine = (): SyncEngine => {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine();
  }
  return syncEngineInstance;
};

export const getSyncEngine = (): SyncEngine => {
  if (!syncEngineInstance) {
    throw new Error('SyncEngine not created. Call createSyncEngine first.');
  }
  return syncEngineInstance;
};
