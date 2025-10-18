import { create } from 'zustand';
import type { CanvasStore, Shape } from '@/types';

const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Canvas shapes
  shapes: {},
  shapeCount: 0, // Cached count for performance
  selectedIds: [],
  selectedIdsSet: new Set(), // O(1) lookup performance
  
  // Viewport state
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  
  // Current authenticated user
  currentUser: null,
  
  // Multiplayer users (online users with cursors)
  users: {},
  
  // Tier 2: Sync tracking - prevents echo loops and tracks pending writes
  pendingWrites: {}, // { shapeId: timestamp } - tracks shapes with uncommitted Firestore writes
  
  // Tier 3: Connection state - monitors network and sync status
  connectionState: 'connected', // 'connected' | 'disconnected' | 'reconnecting'
  lastSyncTimestamp: 0, // timestamp of last successful sync
  
  // Loading states
  isLoading: false,
  
  // Create mode state
  createMode: null, // null | 'rectangle' | 'circle' | 'text' etc.
  
  // Shape actions
  setShapes: (shapes) => set({ 
    shapes,
    shapeCount: Object.keys(shapes).length 
  }),
  
  addShape: (shape: Shape) => set((state) => ({
    shapes: {
      ...state.shapes,
      [shape.id]: shape,
    },
    shapeCount: state.shapeCount + 1,
  })),
  
  updateShape: (id: string, updates) => set((state) => ({
    shapes: {
      ...state.shapes,
      [id]: {
        ...state.shapes[id]!,
        ...updates,
        // Don't override updatedAt here - let the sync system handle server timestamps
        // clientTimestamp is set by the calling code for local comparison
      } as Shape,
    },
  })),
  
  removeShape: (id: string) => set((state) => {
    const newShapes = { ...state.shapes };
    delete newShapes[id];
    
    // O(1) set-based removal instead of O(n) filter
    const newSelectedIds: string[] = [];
    const newSelectedIdsSet = new Set<string>();
    
    for (const selectedId of state.selectedIds) {
      if (selectedId !== id) {
        newSelectedIds.push(selectedId);
        newSelectedIdsSet.add(selectedId);
      }
    }
    
    return {
      shapes: newShapes,
      shapeCount: Math.max(0, state.shapeCount - 1),
      selectedIds: newSelectedIds,
      selectedIdsSet: newSelectedIdsSet,
    };
  }),
  
  // Selection actions
  setSelectedIds: (ids) => {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    set({ 
      selectedIds: idsArray,
      selectedIdsSet: new Set(idsArray) 
    });
  },
  
  addSelectedId: (id: string) => set((state) => {
    const newIds = [...state.selectedIds, id];
    return {
      selectedIds: newIds,
      selectedIdsSet: new Set(newIds)
    };
  }),
  
  removeSelectedId: (id: string) => set((state) => {
    const newIds = state.selectedIds.filter(selectedId => selectedId !== id);
    return {
      selectedIds: newIds,
      selectedIdsSet: new Set(newIds)
    };
  }),
  
  clearSelection: () => set({ 
    selectedIds: [],
    selectedIdsSet: new Set()
  }),
  
  // Multi-select helper actions
  addToSelection: (id: string) => set((state) => {
    // O(1) set operation instead of O(n) array recreation
    if (state.selectedIdsSet.has(id)) return state; // Already selected
    
    const newIds = [...state.selectedIds, id];
    const newSet = new Set(state.selectedIdsSet);
    newSet.add(id);
    
    return { 
      selectedIds: newIds,
      selectedIdsSet: newSet
    };
  }),
  
  removeFromSelection: (id: string) => set((state) => {
    // O(1) set operation instead of O(n) array recreation
    if (!state.selectedIdsSet.has(id)) return state; // No change needed
    
    const newIds = state.selectedIds.filter(selectedId => selectedId !== id);
    const newSet = new Set(state.selectedIdsSet);
    newSet.delete(id);
    
    return {
      selectedIds: newIds,
      selectedIdsSet: newSet
    };
  }),
  
  selectAll: () => set((state) => {
    const allIds = Object.keys(state.shapes);
    return {
      selectedIds: allIds,
      selectedIdsSet: new Set(allIds)
    };
  }),
  
  // Batch operations for selected shapes
  deleteSelectedShapes: () => set((state) => {
    const newShapes = { ...state.shapes };
    state.selectedIds.forEach(id => {
      delete newShapes[id];
    });
    return {
      shapes: newShapes,
      selectedIds: [], // Clear selection after delete
      selectedIdsSet: new Set(),
    };
  }),
  
  duplicateSelectedShapes: () => set((state) => {
    const newShapes = { ...state.shapes };
    const newSelectedIds: string[] = [];
    const DUPLICATE_OFFSET = 20; // px offset for duplicated shapes
    
    state.selectedIds.forEach(id => {
      const originalShape = state.shapes[id];
      if (originalShape) {
        const newId = crypto.randomUUID();
        const now = Date.now();
        const duplicatedShape: Shape = {
          ...originalShape,
          id: newId,
          x: originalShape.x + DUPLICATE_OFFSET,
          y: originalShape.y + DUPLICATE_OFFSET,
          zIndex: (originalShape.zIndex || 0) + 1, // Place duplicates on top
          // ✅ Reset timestamps for new shape
          createdAt: now,
          updatedAt: now,
          createdBy: state.currentUser?.uid || 'unknown',
          updatedBy: state.currentUser?.uid || 'unknown',
          clientTimestamp: now,
        } as Shape;
        newShapes[newId] = duplicatedShape;
        newSelectedIds.push(newId);
      }
    });
    
    return {
      shapes: newShapes,
      selectedIds: newSelectedIds, // Select the duplicated shapes
      selectedIdsSet: new Set(newSelectedIds),
    };
  }),
  
  // Z-index management
  bringToFront: (shapeId: string) => set((state) => {
    const shape = state.shapes[shapeId];
    if (!shape) return state;
    
    const maxZIndex = Math.max(0, ...Object.values(state.shapes).map(s => s.zIndex || 0));
    return {
      shapes: {
        ...state.shapes,
        [shapeId]: {
          ...shape,
          zIndex: maxZIndex + 1,
          updatedBy: state.currentUser?.uid || 'unknown',
        },
      },
    };
  }),
  
  sendToBack: (shapeId: string) => set((state) => {
    const shape = state.shapes[shapeId];
    if (!shape) return state;
    
    const minZIndex = Math.min(0, ...Object.values(state.shapes).map(s => s.zIndex || 0));
    return {
      shapes: {
        ...state.shapes,
        [shapeId]: {
          ...shape,
          zIndex: minZIndex - 1,
          updatedBy: state.currentUser?.uid || 'unknown',
        },
      },
    };
  }),
  
  bringForward: (shapeId: string) => set((state) => {
    const shape = state.shapes[shapeId];
    if (!shape) return state;
    
    return {
      shapes: {
        ...state.shapes,
        [shapeId]: {
          ...shape,
          zIndex: (shape.zIndex || 0) + 1,
          updatedBy: state.currentUser?.uid || 'unknown',
        },
      },
    };
  }),
  
  sendBackward: (shapeId: string) => set((state) => {
    const shape = state.shapes[shapeId];
    if (!shape) return state;
    
    return {
      shapes: {
        ...state.shapes,
        [shapeId]: {
          ...shape,
          zIndex: (shape.zIndex || 0) - 1,
          updatedBy: state.currentUser?.uid || 'unknown',
        },
      },
    };
  }),
  
  // Viewport actions
  setViewport: (viewport) => set({ viewport }),
  
  updateViewport: (updates) => set((state) => ({
    viewport: { ...state.viewport, ...updates },
  })),
  
  // User actions
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setUsers: (users) => set({ users }),
  
  updateUser: (uid: string, updates) => set((state) => ({
    users: {
      ...state.users,
      [uid]: {
        ...state.users[uid]!,
        ...updates,
      },
    },
  })),
  
  removeUser: (uid: string) => set((state) => {
    const newUsers = { ...state.users };
    delete newUsers[uid];
    return { users: newUsers };
  }),
  
  // Loading actions
  setLoading: (isLoading: boolean) => set({ isLoading }),
  
  // Create mode actions
  setCreateMode: (mode) => set({ createMode: mode }),
  
  clearCreateMode: () => set({ createMode: null }),
  
  // Tier 2: Sync tracking actions - manage pending writes to prevent echo loops
  addPendingWrite: (shapeId: string, timestamp: number = Date.now()) => set((state) => ({
    pendingWrites: {
      ...state.pendingWrites,
      [shapeId]: timestamp,
    },
  })),
  
  removePendingWrite: (shapeId: string) => set((state) => {
    const newPendingWrites = { ...state.pendingWrites };
    delete newPendingWrites[shapeId];
    return { pendingWrites: newPendingWrites };
  }),
  
  clearPendingWrites: () => set({ pendingWrites: {} }),
  
  // Check if a shape has a pending write (used for echo prevention)
  hasPendingWrite: (shapeId: string): boolean => {
    const state = get();
    return shapeId in state.pendingWrites;
  },
  
  // Tier 3: Connection state actions - manage network and sync status
  setConnectionState: (connectionState) => set({ connectionState }),
  
  setLastSyncTimestamp: (timestamp: number = Date.now()) => set({ lastSyncTimestamp: timestamp }),
}));

export default useCanvasStore;
