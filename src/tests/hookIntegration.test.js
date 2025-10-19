/**
 * Hook Integration Tests
 * 
 * Tests for React hooks that manage critical application state and behavior.
 * These tests prevent React-specific issues, state synchronization bugs,
 * and integration problems between different parts of the system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionState } from '@/hooks/useConnectionState';
import { useCursorSync } from '@/hooks/useCursorSync';

// Mock Firebase services
const mockSyncEngine = {
  queueWrite: vi.fn(),
  isConnected: true
};

const mockAuth = {
  currentUser: { uid: 'test-user-123', displayName: 'Test User' }
};

const mockStore = {
  getState: vi.fn(() => ({
    viewport: { x: 0, y: 0, zoom: 1 }
  })),
  subscribe: vi.fn()
};

// Mock window and document for cursor tracking
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(window, 'removeEventListener', {
  value: vi.fn(),
  writable: true
});

describe('Hook Integration - React State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useConnectionState - Network State Management', () => {
    it('should initialize with connected state', () => {
      const { result } = renderHook(() => useConnectionState(mockSyncEngine));
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.lastConnected).toBeInstanceOf(Date);
      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('should handle connection state changes', () => {
      const { result, rerender } = renderHook(() => useConnectionState(mockSyncEngine));
      
      // Initial state
      expect(result.current.isConnected).toBe(true);
      
      // Simulate connection loss
      mockSyncEngine.isConnected = false;
      rerender();
      
      expect(result.current.isConnected).toBe(false);
      
      // Simulate reconnection
      mockSyncEngine.isConnected = true;
      rerender();
      
      expect(result.current.isConnected).toBe(true);
    });

    it('should track reconnection attempts', () => {
      const { result } = renderHook(() => useConnectionState(mockSyncEngine));
      
      // Simulate multiple reconnection attempts
      act(() => {
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
      });
      
      expect(result.current.reconnectAttempts).toBe(3);
      
      // Simulate successful reconnection (should reset counter)
      act(() => {
        result.current.resetReconnectAttempts();
      });
      
      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('should update last connected timestamp', () => {
      const { result } = renderHook(() => useConnectionState(mockSyncEngine));
      
      const initialTime = result.current.lastConnected;
      
      // Advance time
      vi.advanceTimersByTime(5000);
      
      act(() => {
        result.current.updateLastConnected();
      });
      
      expect(result.current.lastConnected).not.toEqual(initialTime);
      expect(result.current.lastConnected.getTime()).toBeGreaterThan(initialTime.getTime());
    });
  });

  describe('useCursorSync - Multiplayer Cursor Management', () => {
    it('should initialize cursor tracking', () => {
      const { result } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, mockStore)
      );
      
      expect(result.current.localCursor).toEqual({ x: 0, y: 0 });
      expect(result.current.remoteCursors).toEqual({});
      expect(result.current.isTracking).toBe(false);
    });

    it('should start and stop cursor tracking', () => {
      const { result } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, mockStore)
      );
      
      act(() => {
        result.current.startTracking();
      });
      
      expect(result.current.isTracking).toBe(true);
      expect(window.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      
      act(() => {
        result.current.stopTracking();
      });
      
      expect(result.current.isTracking).toBe(false);
      expect(window.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });

    it('should throttle cursor position updates', () => {
      const { result } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, mockStore)
      );
      
      // Start tracking
      act(() => {
        result.current.startTracking();
      });
      
      // Simulate rapid mouse movements
      act(() => {
        result.current.updateCursor(100, 150);
        result.current.updateCursor(101, 151);
        result.current.updateCursor(102, 152);
        result.current.updateCursor(103, 153);
      });
      
      // Should throttle sync calls
      expect(mockSyncEngine.queueWrite).toHaveBeenCalledTimes(1); // Throttled
      
      // Advance throttle timer
      vi.advanceTimersByTime(100);
      
      // Now should allow another update
      act(() => {
        result.current.updateCursor(200, 250);
      });
      
      expect(mockSyncEngine.queueWrite).toHaveBeenCalledTimes(2);
    });

    it('should handle remote cursor updates', () => {
      const { result } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, mockStore)
      );
      
      const remoteCursorData = {
        'user-456': {
          x: 150,
          y: 200,
          userId: 'user-456',
          userName: 'Remote User',
          color: '#FF5733',
          lastSeen: Date.now()
        }
      };
      
      act(() => {
        result.current.updateRemoteCursors(remoteCursorData);
      });
      
      expect(result.current.remoteCursors).toEqual(remoteCursorData);
    });

    it('should clean up stale remote cursors', () => {
      const { result } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, mockStore)
      );
      
      // Add remote cursor
      const staleCursorData = {
        'user-old': {
          x: 100,
          y: 100,
          userId: 'user-old',
          userName: 'Stale User',
          color: '#999999',
          lastSeen: Date.now() - 30000 // 30 seconds ago (stale)
        }
      };
      
      act(() => {
        result.current.updateRemoteCursors(staleCursorData);
      });
      
      expect(result.current.remoteCursors['user-old']).toBeDefined();
      
      // Trigger cleanup
      act(() => {
        result.current.cleanupStaleCursors();
      });
      
      expect(result.current.remoteCursors['user-old']).toBeUndefined();
    });

    it('should handle viewport transformations', () => {
      // Mock store with custom viewport
      const customMockStore = {
        getState: vi.fn(() => ({
          viewport: { x: 100, y: 200, zoom: 2 }
        })),
        subscribe: vi.fn()
      };
      
      const { result } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, customMockStore)
      );
      
      act(() => {
        result.current.startTracking();
      });
      
      // Raw mouse position
      const rawX = 300;
      const rawY = 400;
      
      act(() => {
        result.current.updateCursor(rawX, rawY);
      });
      
      // Should transform cursor position based on viewport
      expect(mockSyncEngine.queueWrite).toHaveBeenCalledWith(
        expect.stringContaining('cursor'),
        expect.objectContaining({
          // Cursor position should be transformed:
          // (rawX - viewport.x) / viewport.zoom = (300 - 100) / 2 = 100
          // (rawY - viewport.y) / viewport.zoom = (400 - 200) / 2 = 100
          x: 100,
          y: 100
        })
      );
    });
  });

  describe('Hook Cleanup and Memory Management', () => {
    it('should cleanup useConnectionState resources', () => {
      const { unmount } = renderHook(() => useConnectionState(mockSyncEngine));
      
      unmount();
      
      // Should not cause memory leaks or errors
      expect(() => unmount()).not.toThrow();
    });

    it('should cleanup useCursorSync resources', () => {
      const { result, unmount } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, mockStore)
      );
      
      // Start tracking to create event listeners
      act(() => {
        result.current.startTracking();
      });
      
      unmount();
      
      // Should remove event listeners
      expect(window.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });
  });

  describe('Hook Error Handling', () => {
    it('should handle missing auth user gracefully', () => {
      const mockAuthNoUser = { currentUser: null };
      
      expect(() => {
        renderHook(() => useCursorSync(mockSyncEngine, mockAuthNoUser, mockStore));
      }).not.toThrow();
    });

    it('should handle SyncEngine errors gracefully', () => {
      const brokenSyncEngine = {
        queueWrite: vi.fn(() => { throw new Error('Sync failed'); }),
        isConnected: true
      };
      
      const { result } = renderHook(() => 
        useCursorSync(brokenSyncEngine, mockAuth, mockStore)
      );
      
      act(() => {
        result.current.startTracking();
      });
      
      // Should not crash when sync fails
      expect(() => {
        act(() => {
          result.current.updateCursor(100, 100);
        });
      }).not.toThrow();
    });

    it('should handle malformed store state', () => {
      const brokenStore = {
        getState: vi.fn(() => null), // Malformed state
        subscribe: vi.fn()
      };
      
      expect(() => {
        renderHook(() => useCursorSync(mockSyncEngine, mockAuth, brokenStore));
      }).not.toThrow();
    });
  });

  describe('Integration Between Hooks', () => {
    it('should work together in realistic scenarios', () => {
      // Render both hooks together
      const { result: connectionResult } = renderHook(() => 
        useConnectionState(mockSyncEngine)
      );
      
      const { result: cursorResult } = renderHook(() => 
        useCursorSync(mockSyncEngine, mockAuth, mockStore)
      );
      
      // Both should initialize successfully
      expect(connectionResult.current.isConnected).toBe(true);
      expect(cursorResult.current.localCursor).toEqual({ x: 0, y: 0 });
      
      // Connection state should affect cursor behavior
      if (connectionResult.current.isConnected) {
        act(() => {
          cursorResult.current.startTracking();
        });
        
        expect(cursorResult.current.isTracking).toBe(true);
      }
      
      // Cursor updates should work when connected
      act(() => {
        cursorResult.current.updateCursor(50, 75);
      });
      
      expect(mockSyncEngine.queueWrite).toHaveBeenCalled();
    });
  });
});
