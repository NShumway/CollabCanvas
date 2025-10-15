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
  
  // Loading states
  isLoading: false,
  
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
        updatedAt: Date.now(),
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
}));

export default useCanvasStore;
