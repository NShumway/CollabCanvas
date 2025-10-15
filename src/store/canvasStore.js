import { create } from 'zustand';

const useCanvasStore = create((set, get) => ({
  // Canvas shapes
  shapes: {},
  selectedIds: [],
  
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
  setShapes: (shapes) => set({ shapes }),
  
  addShape: (shape) => set((state) => ({
    shapes: {
      ...state.shapes,
      [shape.id]: shape,
    },
  })),
  
  updateShape: (id, updates) => set((state) => ({
    shapes: {
      ...state.shapes,
      [id]: {
        ...state.shapes[id],
        ...updates,
        // Don't override updatedAt here - let the sync system handle server timestamps
        // clientTimestamp is set by the calling code for local comparison
      },
    },
  })),
  
  removeShape: (id) => set((state) => {
    const newShapes = { ...state.shapes };
    delete newShapes[id];
    return {
      shapes: newShapes,
      selectedIds: state.selectedIds.filter(selectedId => selectedId !== id),
    };
  }),
  
  // Selection actions
  setSelectedIds: (ids) => set({ selectedIds: Array.isArray(ids) ? ids : [ids] }),
  
  addSelectedId: (id) => set((state) => ({
    selectedIds: [...state.selectedIds, id],
  })),
  
  removeSelectedId: (id) => set((state) => ({
    selectedIds: state.selectedIds.filter(selectedId => selectedId !== id),
  })),
  
  clearSelection: () => set({ selectedIds: [] }),
  
  // Viewport actions
  setViewport: (viewport) => set({ viewport }),
  
  updateViewport: (updates) => set((state) => ({
    viewport: { ...state.viewport, ...updates },
  })),
  
  // User actions
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setUsers: (users) => set({ users }),
  
  updateUser: (uid, updates) => set((state) => ({
    users: {
      ...state.users,
      [uid]: {
        ...state.users[uid],
        ...updates,
      },
    },
  })),
  
  removeUser: (uid) => set((state) => {
    const newUsers = { ...state.users };
    delete newUsers[uid];
    return { users: newUsers };
  }),
  
  // Loading actions
  setLoading: (isLoading) => set({ isLoading }),
  
  // Create mode actions
  setCreateMode: (mode) => set({ createMode: mode }),
  
  clearCreateMode: () => set({ createMode: null }),
  
  // Tier 2: Sync tracking actions - manage pending writes to prevent echo loops
  addPendingWrite: (shapeId, timestamp = Date.now()) => set((state) => ({
    pendingWrites: {
      ...state.pendingWrites,
      [shapeId]: timestamp,
    },
  })),
  
  removePendingWrite: (shapeId) => set((state) => {
    const newPendingWrites = { ...state.pendingWrites };
    delete newPendingWrites[shapeId];
    return { pendingWrites: newPendingWrites };
  }),
  
  clearPendingWrites: () => set({ pendingWrites: {} }),
  
  // Check if a shape has a pending write (used for echo prevention)
  hasPendingWrite: (shapeId) => {
    const state = get();
    return shapeId in state.pendingWrites;
  },
  
  // Tier 3: Connection state actions - manage network and sync status
  setConnectionState: (connectionState) => set({ connectionState }),
  
  setLastSyncTimestamp: (timestamp = Date.now()) => set({ lastSyncTimestamp: timestamp }),
}));

export default useCanvasStore;
