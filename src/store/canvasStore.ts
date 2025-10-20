import { create } from 'zustand';
import type { CanvasStore, Shape, AICommand, ChatMessage } from '@/types';

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
  createMode: null, // null | 'rectangle' | 'ellipse' | 'text' etc.
  
  // Dynamic selection color (adapts to selected shape colors for visibility)
  selectionColor: '#3B82F6', // Default blue, adapts when conflicts occur
  
  // Text editing state
  editingTextId: null, // ID of the text shape currently being edited (null means no editing)
  textEditPosition: { x: 0, y: 0 }, // Position for the DOM input overlay
  
  // Transform state
  aspectLock: false, // Whether aspect ratio should be maintained during transforms
  
  // Clipboard state
  clipboard: {
    shapes: [],
    timestamp: 0,
  },
  
  // Viewport persistence
  viewportSaveDebounceTimer: null as NodeJS.Timeout | null,
  
  // Help modal state
  showHelpModal: false,
  
  // AI state
  aiCommands: {},
  chatMessages: [],
  isAIProcessing: false,
  
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
    
    // Stop text editing if the removed shape was being edited
    const shouldStopTextEdit = state.editingTextId === id;
    
    return {
      shapes: newShapes,
      shapeCount: Math.max(0, state.shapeCount - 1),
      selectedIds: newSelectedIds,
      selectedIdsSet: newSelectedIdsSet,
      // Clear text editing state if the shape being edited was removed
      editingTextId: shouldStopTextEdit ? null : state.editingTextId,
      textEditPosition: shouldStopTextEdit ? { x: 0, y: 0 } : state.textEditPosition,
    };
  }),
  
  // Helper function to update selection color based on selected shapes
  // Optimized for performance - lightweight calculation only
  updateSelectionColor: () => {
    const state = get();
    
    // Fast path: no shapes selected = default blue
    if (state.selectedIds.length === 0) {
      if (state.selectionColor !== '#3B82F6') {
        set({ selectionColor: '#3B82F6' });
      }
      return;
    }
    
    // Fast path: single shape - quick color check
    if (state.selectedIds.length === 1) {
      const shapeId = state.selectedIds[0];
      if (!shapeId) return; // Safety check
      
      const shape = state.shapes[shapeId];
      const shapeColor = shape?.fill;
      
      // Simple blue vs orange decision without expensive calculation
      const needsOrange = shapeColor && (
        shapeColor.toLowerCase().includes('blue') || 
        shapeColor === '#3B82F6' || 
        shapeColor === '#0000ff'
      );
      
      const targetColor = needsOrange ? '#EA580C' : '#3B82F6';
      if (state.selectionColor !== targetColor) {
        set({ selectionColor: targetColor });
      }
      return;
    }
    
    // Multi-select: just use default blue to keep it fast
    if (state.selectionColor !== '#3B82F6') {
      set({ selectionColor: '#3B82F6' });
    }
  },

  // Selection actions
  setSelectedIds: (ids) => {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    const state = get();
    
    // Calculate selection color immediately to batch with state update
    let selectionColor = state.selectionColor;
    if (idsArray.length === 0) {
      selectionColor = '#3B82F6';
    } else if (idsArray.length === 1 && idsArray[0]) {
      const shape = state.shapes[idsArray[0]];
      const shapeColor = shape?.fill;
      const needsOrange = shapeColor && (
        shapeColor.toLowerCase().includes('blue') || 
        shapeColor === '#3B82F6' || 
        shapeColor === '#0000ff'
      );
      selectionColor = needsOrange ? '#EA580C' : '#3B82F6';
    } else {
      selectionColor = '#3B82F6';
    }
    
    // Single batched update - no cascading re-renders
    set({ 
      selectedIds: idsArray,
      selectedIdsSet: new Set(idsArray),
      selectionColor
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
  
  clearSelection: () => {
    // Single batched update with default color
    set({ 
      selectedIds: [],
      selectedIdsSet: new Set(),
      selectionColor: '#3B82F6'
    });
  },
  
  // Multi-select helper actions
  addToSelection: (id: string) => {
    const state = get();
    
    // O(1) set operation instead of O(n) array recreation
    if (state.selectedIdsSet.has(id)) return; // Already selected
    
    const newIds = [...state.selectedIds, id];
    const newSet = new Set(state.selectedIdsSet);
    newSet.add(id);
    
    // Calculate selection color to batch with state update
    let selectionColor = '#3B82F6'; // Default for multi-select
    if (newIds.length === 1) {
      const shape = state.shapes[id];
      const shapeColor = shape?.fill;
      const needsOrange = shapeColor && (
        shapeColor.toLowerCase().includes('blue') || 
        shapeColor === '#3B82F6' || 
        shapeColor === '#0000ff'
      );
      selectionColor = needsOrange ? '#EA580C' : '#3B82F6';
    }
    
    // Single batched update
    set({ 
      selectedIds: newIds,
      selectedIdsSet: newSet,
      selectionColor
    });
  },
  
  removeFromSelection: (id: string) => {
    const state = get();
    
    // O(1) set operation instead of O(n) array recreation
    if (!state.selectedIdsSet.has(id)) return; // No change needed
    
    const newIds = state.selectedIds.filter(selectedId => selectedId !== id);
    const newSet = new Set(state.selectedIdsSet);
    newSet.delete(id);
    
    // Calculate selection color to batch with state update
    let selectionColor = '#3B82F6';
    if (newIds.length === 1 && newIds[0]) {
      const shape = state.shapes[newIds[0]];
      const shapeColor = shape?.fill;
      const needsOrange = shapeColor && (
        shapeColor.toLowerCase().includes('blue') || 
        shapeColor === '#3B82F6' || 
        shapeColor === '#0000ff'
      );
      selectionColor = needsOrange ? '#EA580C' : '#3B82F6';
    }
    
    // Single batched update
    set({
      selectedIds: newIds,
      selectedIdsSet: newSet,
      selectionColor
    });
  },
  
  selectAll: () => {
    const state = get();
    const allIds = Object.keys(state.shapes);
    
    // For selectAll, just use default blue to keep it fast
    set({
      selectedIds: allIds,
      selectedIdsSet: new Set(allIds),
      selectionColor: '#3B82F6'
    });
  },
  
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
    
    // Helper to find insertion z-index above original (fractional approach)
    const findInsertionZIndex = (originalZIndex: number, allShapes: Record<string, Shape>): number => {
      const allZIndices = Object.values(allShapes).map(s => s.zIndex || 0);
      const targetZIndex = originalZIndex + 1;
      
      // Check if simple +1 works (no collision)
      if (!allZIndices.includes(targetZIndex)) {
        return targetZIndex;
      }
      
      // Find the next z-index above our target
      const sorted = allZIndices.filter(z => z > originalZIndex).sort((a, b) => a - b);
      const nextZIndex = sorted[0];
      
      if (!nextZIndex) {
        // No shapes above us, just use +1
        return targetZIndex;
      }
      
      // Insert fractionally between original and next
      return (originalZIndex + nextZIndex) / 2;
    };
    
    state.selectedIds.forEach(id => {
      const originalShape = state.shapes[id];
      if (originalShape) {
        const newId = crypto.randomUUID();
        const now = Date.now();
        const availableZIndex = findInsertionZIndex(originalShape.zIndex || 0, newShapes);
        
        const duplicatedShape: Shape = {
          ...originalShape,
          id: newId,
          x: originalShape.x + DUPLICATE_OFFSET,
          y: originalShape.y + DUPLICATE_OFFSET,
          zIndex: availableZIndex, // Use collision-free z-index
          // ✅ Reset timestamps for new shape
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
    
    const allZIndices = Object.values(state.shapes).map(s => s.zIndex || 0);
    const currentZIndex = shape.zIndex || 0;
    const targetZIndex = currentZIndex + 1;
    
    // Try simple +1 first (most common case)
    let newZIndex = targetZIndex;
    
    // If collision, use fractional insertion
    if (allZIndices.includes(targetZIndex)) {
      const sorted = allZIndices.filter(z => z > currentZIndex).sort((a, b) => a - b);
      const nextZIndex = sorted[0];
      
      if (nextZIndex) {
        // Insert between current and next
        newZIndex = (currentZIndex + nextZIndex) / 2;
      }
      // If no next shape, simple +1 is fine (collision was false positive)
    }
    
    return {
      shapes: {
        ...state.shapes,
        [shapeId]: {
          ...shape,
          zIndex: newZIndex,
          updatedBy: state.currentUser?.uid || 'unknown',
        },
      },
    };
  }),
  
  sendBackward: (shapeId: string) => set((state) => {
    const shape = state.shapes[shapeId];
    if (!shape) return state;
    
    const allZIndices = Object.values(state.shapes).map(s => s.zIndex || 0);
    const currentZIndex = shape.zIndex || 0;
    const targetZIndex = currentZIndex - 1;
    
    // Try simple -1 first (most common case)
    let newZIndex = targetZIndex;
    
    // If collision, use fractional insertion
    if (allZIndices.includes(targetZIndex)) {
      const sorted = allZIndices.filter(z => z < currentZIndex).sort((a, b) => b - a);
      const prevZIndex = sorted[0];
      
      if (prevZIndex !== undefined) {
        // Insert between previous and current
        newZIndex = (prevZIndex + currentZIndex) / 2;
      }
      // If no previous shape, simple -1 is fine
    }
    
    return {
      shapes: {
        ...state.shapes,
        [shapeId]: {
          ...shape,
          zIndex: newZIndex,
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
  
  // Text editing actions
  startTextEdit: (shapeId: string, position: { x: number; y: number }) => set({
    editingTextId: shapeId,
    textEditPosition: position,
  }),
  
  stopTextEdit: () => set({
    editingTextId: null,
    textEditPosition: { x: 0, y: 0 },
  }),
  
  // Transform actions
  setAspectLock: (aspectLock: boolean) => set({ aspectLock }),

  toggleAspectLock: () => set((state) => ({ aspectLock: !state.aspectLock })),


  // AI actions
  addChatMessage: (message: ChatMessage) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),

  clearChatMessages: () => set({ chatMessages: [] }),

  setAIProcessing: (isProcessing: boolean) => set({ isAIProcessing: isProcessing }),

  addAICommand: (commandId: string, command: AICommand) => set((state) => ({
    aiCommands: {
      ...state.aiCommands,
      [commandId]: command
    }
  })),

  updateAICommand: (commandId: string, updates: Partial<AICommand>) => set((state) => {
    const existingCommand = state.aiCommands[commandId];
    if (!existingCommand) return state; // Don't update if command doesn't exist
    
    return {
      aiCommands: {
        ...state.aiCommands,
        [commandId]: {
          ...existingCommand,
          ...updates
        }
      }
    };
  }),

  removeAICommand: (commandId: string) => set((state) => {
    const newCommands = { ...state.aiCommands };
    delete newCommands[commandId];
    return { aiCommands: newCommands };
  }),

  clearAICommands: () => set({ aiCommands: {} }),
  
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
  
  // Clipboard actions
  copySelectedShapes: () => {
    const state = get();
    const shapesToCopy = state.selectedIds
      .map(id => state.shapes[id])
      .filter(Boolean) as Shape[];
    
    set({
      clipboard: {
        shapes: shapesToCopy,
        timestamp: Date.now(),
      }
    });
  },
  
  pasteShapes: (cursorPosition?: { x: number; y: number }) => {
    const state = get();
    if (state.clipboard.shapes.length === 0) return;
    
    const newShapes = { ...state.shapes };
    const newSelectedIds: string[] = [];
    
    // Helper to find available z-index
    const findInsertionZIndex = (originalZIndex: number, allShapes: Record<string, Shape>): number => {
      const allZIndices = Object.values(allShapes).map(s => s.zIndex || 0);
      const targetZIndex = originalZIndex + 1;
      
      if (!allZIndices.includes(targetZIndex)) {
        return targetZIndex;
      }
      
      const sorted = allZIndices.filter(z => z > originalZIndex).sort((a, b) => a - b);
      const nextZIndex = sorted[0];
      
      if (!nextZIndex) {
        return targetZIndex;
      }
      
      return (originalZIndex + nextZIndex) / 2;
    };
    
    // Calculate the center of the clipboard shapes for cursor-based positioning
    let offsetX = 0;
    let offsetY = 0;
    
    if (cursorPosition) {
      // Find the bounds of the clipboard shapes
      const bounds = state.clipboard.shapes.reduce(
        (acc, shape) => {
          const left = shape.x;
          const top = shape.y;
          const right = shape.x + (shape.width || 0);
          const bottom = shape.y + (shape.height || 0);
          
          return {
            minX: Math.min(acc.minX, left),
            minY: Math.min(acc.minY, top),
            maxX: Math.max(acc.maxX, right),
            maxY: Math.max(acc.maxY, bottom),
          };
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );
      
      // Calculate center of clipboard shapes
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      // Calculate offset to place center at cursor position
      offsetX = cursorPosition.x - centerX;
      offsetY = cursorPosition.y - centerY;
    } else {
      // No cursor position provided, use default offset (shouldn't happen with new behavior)
      offsetX = 20;
      offsetY = 20;
    }
    
    state.clipboard.shapes.forEach(shape => {
      const newId = crypto.randomUUID();
      const now = Date.now();
      const availableZIndex = findInsertionZIndex(shape.zIndex || 0, newShapes);
      
      const pastedShape: Shape = {
        ...shape,
        id: newId,
        x: shape.x + offsetX,
        y: shape.y + offsetY,
        zIndex: availableZIndex,
        updatedAt: now,
        createdBy: state.currentUser?.uid || 'unknown',
        updatedBy: state.currentUser?.uid || 'unknown',
        clientTimestamp: now,
      } as Shape;
      
      newShapes[newId] = pastedShape;
      newSelectedIds.push(newId);
    });
    
    set({
      shapes: newShapes,
      selectedIds: newSelectedIds,
      selectedIdsSet: new Set(newSelectedIds),
      shapeCount: Object.keys(newShapes).length,
    });
  },
  
  // Help modal actions
  setShowHelpModal: (show: boolean) => set({ showHelpModal: show }),
  
  toggleHelpModal: () => set((state) => ({ showHelpModal: !state.showHelpModal })),
  
  // Viewport persistence actions
  setViewportSaveDebounceTimer: (timer: NodeJS.Timeout | null) => {
    const state = get();
    if (state.viewportSaveDebounceTimer) {
      clearTimeout(state.viewportSaveDebounceTimer);
    }
    set({ viewportSaveDebounceTimer: timer });
  },
  
}));

export default useCanvasStore;
