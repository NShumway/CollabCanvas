/**
 * SyncEngine Tests
 * 
 * Tests for the critical write path to Firestore - batching, debouncing,
 * echo prevention, and error handling. These tests prevent data loss
 * and sync inconsistencies that would break collaboration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from '@/services/syncEngine';
import { convertToFirestoreShape } from '@/types/firebase';

// Mock Firebase
const mockWriteBatch = {
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined)
};

const mockFirestore = {
  batch: vi.fn(() => mockWriteBatch),
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }))
};

const mockAuth = {
  currentUser: { uid: 'test-user-123' }
};

describe('SyncEngine - Write Path Critical Tests', () => {
  let syncEngine;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create fresh SyncEngine instance
    syncEngine = new SyncEngine(mockFirestore, mockAuth);
    
    // Mock timers for debouncing tests
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    syncEngine = null;
  });

  describe('Write Batching and Debouncing', () => {
    it('should batch multiple writes into single Firestore commit', async () => {
      const shape1 = { id: 'shape-1', type: 'rectangle', x: 0, y: 0 };
      const shape2 = { id: 'shape-2', type: 'ellipse', x: 100, y: 100 };
      const shape3 = { id: 'shape-3', type: 'text', x: 200, y: 200 };
      
      // Queue multiple writes rapidly
      syncEngine.queueWrite('shape-1', shape1);
      syncEngine.queueWrite('shape-2', shape2);
      syncEngine.queueWrite('shape-3', shape3);
      
      expect(mockWriteBatch.commit).not.toHaveBeenCalled(); // Should be debounced
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      expect(mockWriteBatch.set).toHaveBeenCalledTimes(3); // All three shapes
      expect(mockWriteBatch.commit).toHaveBeenCalledTimes(1); // Single batch commit
    });

    it('should debounce rapid updates to same shape', async () => {
      const baseShape = { id: 'rapid-shape', type: 'rectangle', x: 0, y: 0 };
      
      // Rapid updates to same shape (like dragging)
      syncEngine.queueWrite('rapid-shape', { ...baseShape, x: 10 });
      syncEngine.queueWrite('rapid-shape', { ...baseShape, x: 20 });
      syncEngine.queueWrite('rapid-shape', { ...baseShape, x: 30 });
      syncEngine.queueWrite('rapid-shape', { ...baseShape, x: 40 });
      
      // Fast-forward debounce
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      expect(mockWriteBatch.set).toHaveBeenCalledTimes(1); // Only final update
      expect(mockWriteBatch.commit).toHaveBeenCalledTimes(1);
      
      // Verify final value was used
      const finalCall = mockWriteBatch.set.mock.calls[0];
      const finalShape = finalCall[1];
      expect(finalShape).toMatchObject(
        expect.objectContaining({ x: 40 }) // Final x position
      );
    });

    it('should handle separate debounce windows correctly', async () => {
      const shape = { id: 'windowed-shape', type: 'rectangle', x: 0, y: 0 };
      
      // First update
      syncEngine.queueWrite('windowed-shape', { ...shape, x: 10 });
      
      // Fast-forward past debounce
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      expect(mockWriteBatch.commit).toHaveBeenCalledTimes(1);
      
      // Second update after first batch completed
      syncEngine.queueWrite('windowed-shape', { ...shape, x: 20 });
      
      // Fast-forward again
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      expect(mockWriteBatch.commit).toHaveBeenCalledTimes(2); // Two separate batches
    });
  });

  describe('Echo Prevention', () => {
    it('should not queue writes for shapes with recent clientTimestamp', () => {
      const recentTimestamp = Date.now() - 10; // Very recent
      const shape = { 
        id: 'echo-shape', 
        type: 'rectangle', 
        x: 0, 
        y: 0,
        clientTimestamp: recentTimestamp 
      };
      
      // This should be rejected as potential echo
      syncEngine.queueWrite('echo-shape', shape);
      
      vi.advanceTimersByTime(100);
      
      expect(mockWriteBatch.set).not.toHaveBeenCalled(); // Should be prevented
    });

    it('should allow writes for shapes with old clientTimestamp', () => {
      const oldTimestamp = Date.now() - 10000; // 10 seconds ago
      const shape = { 
        id: 'old-shape', 
        type: 'rectangle', 
        x: 0, 
        y: 0,
        clientTimestamp: oldTimestamp 
      };
      
      syncEngine.queueWrite('old-shape', shape);
      
      vi.advanceTimersByTime(100);
      
      expect(mockWriteBatch.set).toHaveBeenCalled(); // Should be allowed
    });

    it('should allow writes for shapes without clientTimestamp', () => {
      const shape = { 
        id: 'no-timestamp-shape', 
        type: 'rectangle', 
        x: 0, 
        y: 0
        // No clientTimestamp
      };
      
      syncEngine.queueWrite('no-timestamp-shape', shape);
      
      vi.advanceTimersByTime(100);
      
      expect(mockWriteBatch.set).toHaveBeenCalled(); // Should be allowed
    });
  });

  describe('Data Conversion and Validation', () => {
    it('should convert shapes to Firestore format before writing', async () => {
      const shape = { 
        id: 'convert-shape', 
        type: 'ellipse', 
        x: 50, 
        y: 75,
        clientTimestamp: Date.now() - 1000
      };
      
      syncEngine.queueWrite('convert-shape', shape);
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      const setCall = mockWriteBatch.set.mock.calls[0];
      const firestoreData = setCall[1];
      
      // Should have Firestore-compatible structure
      expect(firestoreData).toHaveProperty('type', 'ellipse');
      expect(firestoreData).toHaveProperty('x', 50);
      expect(firestoreData).toHaveProperty('y', 75);
      expect(firestoreData).toHaveProperty('updatedAt'); // Server timestamp
      expect(firestoreData).toHaveProperty('updatedBy', 'test-user-123');
      
      // Should not have client-only properties
      expect(firestoreData).not.toHaveProperty('clientTimestamp');
    });

    it('should handle shapes with undefined properties safely', async () => {
      const shapeWithUndefined = { 
        id: 'undefined-shape', 
        type: 'rectangle',
        // Missing x, y, width, height, etc.
        clientTimestamp: Date.now() - 1000
      };
      
      syncEngine.queueWrite('undefined-shape', shapeWithUndefined);
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      expect(mockWriteBatch.set).toHaveBeenCalled();
      expect(mockWriteBatch.commit).toHaveBeenCalled();
      
      // Should not crash or send undefined values to Firestore
      const setCall = mockWriteBatch.set.mock.calls[0];
      const firestoreData = setCall[1];
      
      // Should have fallback values instead of undefined
      expect(firestoreData.x).toBe(0); // Default fallback
      expect(firestoreData.y).toBe(0); // Default fallback
      expect(typeof firestoreData.width).toBe('number'); // Should have default width
      expect(typeof firestoreData.height).toBe('number'); // Should have default height
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore commit errors gracefully', async () => {
      const commitError = new Error('Firestore commit failed');
      mockWriteBatch.commit.mockRejectedValueOnce(commitError);
      
      const shape = { 
        id: 'error-shape', 
        type: 'rectangle', 
        x: 0, 
        y: 0,
        clientTimestamp: Date.now() - 1000
      };
      
      syncEngine.queueWrite('error-shape', shape);
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      expect(mockWriteBatch.commit).toHaveBeenCalled();
      // Should log error but not crash the application
      // In a real implementation, this might retry or notify the user
    });

    it('should handle malformed shape data without crashing', async () => {
      const malformedShape = null; // Completely invalid
      
      expect(() => {
        syncEngine.queueWrite('malformed-shape', malformedShape);
      }).not.toThrow(); // Should handle gracefully
      
      vi.advanceTimersByTime(100);
      
      // Should not attempt to write malformed data
      expect(mockWriteBatch.set).not.toHaveBeenCalled();
    });
  });

  describe('Write Queue Management', () => {
    it('should maintain write queue size under load', async () => {
      // Simulate heavy write load
      for (let i = 0; i < 100; i++) {
        const shape = { 
          id: `load-shape-${i}`, 
          type: 'rectangle', 
          x: i, 
          y: i,
          clientTimestamp: Date.now() - 1000
        };
        syncEngine.queueWrite(`load-shape-${i}`, shape);
      }
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      // Should batch efficiently, not create 100 separate writes
      expect(mockWriteBatch.set).toHaveBeenCalledTimes(100);
      expect(mockWriteBatch.commit).toHaveBeenCalledTimes(1); // Single batch
    });

    it('should handle mixed operations in same batch', async () => {
      const shape1 = { 
        id: 'mixed-1', 
        type: 'rectangle', 
        x: 0, 
        y: 0,
        clientTimestamp: Date.now() - 1000
      };
      const shape2 = { 
        id: 'mixed-2', 
        type: 'ellipse', 
        x: 100, 
        y: 100,
        clientTimestamp: Date.now() - 1000
      };
      
      // Mix of updates
      syncEngine.queueWrite('mixed-1', shape1);
      syncEngine.queueWrite('mixed-2', shape2);
      syncEngine.queueWrite('mixed-1', { ...shape1, x: 50 }); // Update existing
      
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      expect(mockWriteBatch.set).toHaveBeenCalledTimes(2); // Deduplicated mixed-1
      expect(mockWriteBatch.commit).toHaveBeenCalledTimes(1);
    });
  });
});
