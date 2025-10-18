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

import { writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getShapeRef } from './firestore';
import { devLog } from '../utils/devSettings';

// Debounce timing for different operations  
const SHAPE_DRAG_DEBOUNCE = 100; // 100ms for shape dragging (as specified)
const IMMEDIATE_FLUSH = 0;       // 0ms for create/delete operations

/**
 * SyncEngine class manages the write path to Firestore
 * Separates local state updates from Firestore writes to prevent echo loops
 */
export class SyncEngine {
  constructor() {
    // Write queue and timing management
    this.writeQueue = new Map(); // shapeId -> shape data
    this.writeTimeouts = new Map(); // shapeId -> timeoutId
    this.batchTimeoutId = null;
    
    // Track current user for metadata
    this.currentUser = null;
    
    // Store reference - will be set by caller
    this.store = null;
  }
  
  /**
   * Initialize with store and user (called by component)
   */
  initialize(store, currentUser) {
    this.store = store;
    this.currentUser = currentUser;
  }
  
  /**
   * Apply local change immediately to Zustand store
   * This provides instant 60fps feedback to the user
   * 
   * @param {string} shapeId - ID of shape to update
   * @param {object} updates - Shape property updates
   */
  applyLocalChange(shapeId, updates) {
    if (!this.store) {
      console.error('SyncEngine not initialized with store');
      return;
    }
    
    // Update local state immediately
    const timestamp = Date.now();
    const enrichedUpdates = {
      ...updates,
      clientTimestamp: timestamp,
      updatedBy: this.currentUser?.uid || 'unknown'
    };
    
    // Check if shape exists or if this is a new shape
    const state = this.store.getState();
    const existingShape = state.shapes[shapeId];
    
    if (existingShape) {
      // Update existing shape
      this.store.getState().updateShape(shapeId, enrichedUpdates);
    } else {
      // Add new shape (for creation)
      const newShape = {
        id: shapeId,
        ...enrichedUpdates
      };
      this.store.getState().addShape(newShape);
    }
    
    // Mark this shape as having a pending write (prevents echo loops)
    this.store.getState().addPendingWrite(shapeId, timestamp);
  }

  /**
   * Apply batch changes for performance (used during drag operations with many shapes)
   * 
   * @param {Array} batchUpdates - Array of {shapeId, updates} objects
   */
  applyBatchChanges(batchUpdates) {
    if (!this.store || !batchUpdates.length) return;
    
    const store = this.store.getState();
    
    // Apply all local changes and queue writes in one operation
    for (const { shapeId, updates } of batchUpdates) {
      store.updateShape(shapeId, updates);
      
      // Queue write for Firestore (debounced) - DON'T mark as pending until actually writing
      const shape = store.shapes[shapeId];
      if (shape) {
        const updatedShape = { ...shape, ...updates };
        this.queueWrite(shapeId, updatedShape, false);
      }
    }
  }
  
  /**
   * Queue a shape for writing to Firestore
   * Can be immediate (create/delete) or debounced (drag operations)
   * 
   * @param {string} shapeId - ID of shape to write
   * @param {object} shape - Complete shape data
   * @param {boolean} immediate - Whether to flush immediately or debounce
   */
  queueWrite(shapeId, shape, immediate = false) {
    // Clear any existing timeout for this shape
    if (this.writeTimeouts.has(shapeId)) {
      clearTimeout(this.writeTimeouts.get(shapeId));
      this.writeTimeouts.delete(shapeId);
    }
    
    // Add shape to write queue
    this.writeQueue.set(shapeId, {
      ...shape,
      updatedBy: this.currentUser?.uid || 'unknown'
    });
    
    // Set up flush timing
    const delay = immediate ? IMMEDIATE_FLUSH : SHAPE_DRAG_DEBOUNCE;
    
    if (immediate) {
      // Flush immediately for create/delete operations
      this.flushWrites();
    } else {
      // Debounce for drag operations
      const timeoutId = setTimeout(() => {
        this.flushWrites();
        this.writeTimeouts.delete(shapeId);
      }, delay);
      
      this.writeTimeouts.set(shapeId, timeoutId);
    }
  }
  
  /**
   * Flush all queued writes to Firestore using batch writes
   * Clears pending writes from Zustand after successful commit
   */
  async flushWrites() {
    if (this.writeQueue.size === 0) return;
    if (!this.store) {
      devLog.error('SyncEngine not initialized with store');
      return;
    }
    
    try {
      // Create batch write
      const batch = writeBatch(db);
      const shapesToWrite = Array.from(this.writeQueue.entries());
      
      // Mark shapes as pending writes RIGHT BEFORE actual Firestore write
      shapesToWrite.forEach(([shapeId]) => {
        this.store.getState().addPendingWrite(shapeId);
      });
      
      // Add all queued shapes to batch
      shapesToWrite.forEach(([shapeId, shape]) => {
        const shapeRef = getShapeRef(shapeId);
        const shapeData = {
          ...shape,
          updatedAt: serverTimestamp(),
          // Only set createdAt for new shapes
          ...(shape.createdAt ? {} : {
            createdAt: serverTimestamp(),
            createdBy: this.currentUser?.uid || 'unknown'
          })
        };
        
        batch.set(shapeRef, shapeData, { merge: true });
      });
      
      // Commit batch to Firestore
      await batch.commit();
      
      // Clear pending writes from Zustand after successful commit
      shapesToWrite.forEach(([shapeId]) => {
        this.store.getState().removePendingWrite(shapeId);
      });
      
      // Clear write queue
      this.writeQueue.clear();
      
      // Update last sync timestamp
      this.store.getState().setLastSyncTimestamp();
      
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
   * 
   * @param {string} shapeId - ID of shape to delete
   */
  deleteShape(shapeId) {
    if (!this.store) {
      console.error('SyncEngine not initialized with store');
      return;
    }
    
    // Remove from local state immediately
    this.store.getState().removeShape(shapeId);
    
    // Cancel any pending writes for this shape
    if (this.writeTimeouts.has(shapeId)) {
      clearTimeout(this.writeTimeouts.get(shapeId));
      this.writeTimeouts.delete(shapeId);
    }
    this.writeQueue.delete(shapeId);
    
    // Queue deletion to Firestore
    this.queueDeleteToFirestore(shapeId);
  }
  
  /**
   * Queue shape deletion to Firestore
   * Private method used by deleteShape
   */
  async queueDeleteToFirestore(shapeId) {
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
  cleanup() {
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
let syncEngineInstance = null;

export const createSyncEngine = () => {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine();
  }
  return syncEngineInstance;
};

export const getSyncEngine = () => {
  if (!syncEngineInstance) {
    throw new Error('SyncEngine not created. Call createSyncEngine first.');
  }
  return syncEngineInstance;
};
