/**
 * Zustand Store Type Definitions
 * 
 * Comprehensive typing for the canvas store state and actions.
 * Ensures type safety across all store operations.
 */

import type {
  Shape,
  ShapeCollection,
  ShapeUpdate,
  Viewport,
  CreateMode,
} from './shapes';

import type {
  CurrentUser,
  UserCollection,
  ConnectionState,
} from './auth';

// Core store state interface
export interface CanvasStoreState {
  // Shape management
  shapes: ShapeCollection;
  shapeCount: number;
  selectedIds: readonly string[];
  selectedIdsSet: ReadonlySet<string>;
  
  // Viewport state
  viewport: Viewport;
  
  // User management
  currentUser: CurrentUser | null;
  users: UserCollection;
  
  // Sync tracking (Tier 2)
  pendingWrites: Record<string, number>;
  
  // Connection state (Tier 3)
  connectionState: ConnectionState;
  lastSyncTimestamp: number;
  
  // UI state
  isLoading: boolean;
  createMode: CreateMode;
  
  // Future AI state (for upcoming PRs)
  // aiCommands: Record<string, AICommand>;
  // chatMessages: ChatMessage[];
  // aiProcessing: boolean;
  
  // Future features (for upcoming PRs)
  // clipboard: ClipboardState;
  // recentColors: string[];
  // savedColors: string[];
  // comments: CommentCollection;
}

// Store actions interface
export interface CanvasStoreActions {
  // Shape actions
  setShapes: (shapes: ShapeCollection) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: ShapeUpdate) => void;
  removeShape: (id: string) => void;
  
  // Selection actions
  setSelectedIds: (ids: string[] | string) => void;
  addSelectedId: (id: string) => void;
  removeSelectedId: (id: string) => void;
  clearSelection: () => void;
  
  // Multi-select helper actions
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  selectAll: () => void;
  
  // Batch operations for selected shapes
  deleteSelectedShapes: () => void;
  duplicateSelectedShapes: () => void;
  
  // Z-index management
  bringToFront: (shapeId: string) => void;
  sendToBack: (shapeId: string) => void;
  bringForward: (shapeId: string) => void;
  sendBackward: (shapeId: string) => void;
  
  // Viewport actions
  setViewport: (viewport: Viewport) => void;
  updateViewport: (updates: Partial<Viewport>) => void;
  
  // User actions
  setCurrentUser: (user: CurrentUser | null) => void;
  setUsers: (users: UserCollection) => void;
  updateUser: (uid: string, updates: Partial<UserCollection[string]>) => void;
  removeUser: (uid: string) => void;
  
  // Loading actions
  setLoading: (isLoading: boolean) => void;
  
  // Create mode actions
  setCreateMode: (mode: CreateMode) => void;
  clearCreateMode: () => void;
  
  // Sync tracking actions (Tier 2)
  addPendingWrite: (shapeId: string, timestamp?: number) => void;
  removePendingWrite: (shapeId: string) => void;
  clearPendingWrites: () => void;
  hasPendingWrite: (shapeId: string) => boolean;
  
  // Connection state actions (Tier 3)
  setConnectionState: (connectionState: ConnectionState) => void;
  setLastSyncTimestamp: (timestamp?: number) => void;
}

// Combined store type (state + actions)
export type CanvasStore = CanvasStoreState & CanvasStoreActions;

// Store creator function type
export type CanvasStoreCreator = (
  set: (partial: CanvasStoreState | Partial<CanvasStoreState> | ((state: CanvasStoreState) => CanvasStoreState | Partial<CanvasStoreState>), replace?: boolean) => void,
  get: () => CanvasStoreState,
) => CanvasStore;

// Selector types for performance optimization
export type StoreSelector<T> = (state: CanvasStoreState) => T;

// Common selector return types
export type ShapeSelector = StoreSelector<ShapeCollection>;
export type ViewportSelector = StoreSelector<Viewport>;
export type SelectionSelector = StoreSelector<{
  selectedIds: readonly string[];
  selectedIdsSet: ReadonlySet<string>;
}>;
export type UserSelector = StoreSelector<UserCollection>;
export type LoadingSelector = StoreSelector<boolean>;
export type CreateModeSelector = StoreSelector<CreateMode>;

// Batch update types
export interface BatchShapeUpdate {
  shapeId: string;
  updates: ShapeUpdate;
}

export type BatchShapeUpdates = readonly BatchShapeUpdate[];

// Store subscription types
export type StoreSubscription<T> = (state: T, previousState: T) => void;

// Store listener types
export type ShapeListener = (shapes: ShapeCollection) => void;
export type SelectionListener = (selectedIds: readonly string[]) => void;
export type ViewportListener = (viewport: Viewport) => void;

// Future types for upcoming features

// Clipboard state (for Copy/Paste PR)
export interface ClipboardState {
  shapes: Shape[];
  timestamp: number;
}

// AI command state (for AI PRs)
export interface AICommand {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId: string;
  message: string;
  timestamp: number;
  result?: unknown;
  error?: string;
}

// Chat message (for AI PRs) 
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Comment system (for Comments PR)
export interface Comment {
  id: string;
  text: string;
  author: string;
  x: number;
  y: number;
  replies: CommentReply[];
  resolved: boolean;
  createdAt: number;
  attachedToShape?: string;
}

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export type CommentCollection = Record<string, Comment>;
