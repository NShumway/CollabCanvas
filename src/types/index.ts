/**
 * CollabCanvas Type Definitions - Index
 * 
 * Central export point for all TypeScript type definitions.
 * Import from here to get access to all types across the application.
 */

// Shape-related types
export type {
  BaseShapeProperties,
  ShapeType,
  RectangleProperties,
  EllipseProperties,
  // Removed: LineProperties (line shapes eliminated)
  TextProperties,
  Shape,
  ShapeCollection,
  ShapeUpdate,
  ShapeCreationData,
  Viewport,
  SelectionState,
  CreateMode,
  DragState,
  SelectionRectangle,
  ZIndexOperation,
  ShapeBounds,
} from './shapes';

export {
  isValidShapeType,
  isShape,
  isRectangle,
  isEllipse,
  // Removed: isLine (line shapes eliminated)
  isText,
  getShapeBounds,
} from './shapes';

// Authentication and user types
export type {
  CurrentUser,
  MultiplayerUser,
  UserCollection,
  AuthState,
  UseAuthReturn,
  UserColor,
  CursorPosition,
  ConnectionState,
  PresenceUpdate,
} from './auth';

export {
  createCurrentUser,
  isValidUser,
  USER_COLORS,
} from './auth';

// Store types
export type {
  CanvasStoreState,
  CanvasStoreActions,
  CanvasStore,
  CanvasStoreCreator,
  StoreSelector,
  ShapeSelector,
  ViewportSelector,
  SelectionSelector,
  UserSelector,
  LoadingSelector,
  CreateModeSelector,
  BatchShapeUpdate,
  BatchShapeUpdates,
  StoreSubscription,
  ShapeListener,
  SelectionListener,
  ViewportListener,
  ClipboardState,
  AICommand,
  ChatMessage,
  Comment,
  CommentReply,
  CommentCollection,
} from './store';

// Firebase and Firestore types
export type {
  FirestoreShapeDocument,
  FirestoreUserDocument,
  FirestoreCanvasMetadata,
  ShapeCollectionRef,
  UserCollectionRef,
  FirestoreDocumentChange,
  SyncWriteOperation,
  BatchWriteContext,
  FirebaseError,
  SyncStatus,
  ShapeChangeCallback,
  UserChangeCallback,
  ConnectionInfo,
  OfflineQueueItem,
  SecurityContext,
} from './firebase';

export {
  convertFirestoreTimestamp,
  convertToFirestoreShape,
  convertFromFirestoreShape,
  isValidFirestoreShape,
} from './firebase';

// UI and component types
export type {
  BaseComponentProps,
  CanvasProps,
  CanvasState,
  ShapeComponentProps,
  CursorComponentProps,
  ToolbarProps,
  ToolbarAction,
  LayerPanelProps,
  OnlineUsersProps,
  ConnectionStatusProps,
  PerformanceMonitorProps,
  LoginButtonProps,
  AuthGuardProps,
  CanvasMouseHandler,
  CanvasKeyHandler,
  StageEventHandler,
  ViewportOperations,
  SelectionOperations,
  CoordinateUtils,
  KeyboardShortcut,
  AnimationConfig,
  ColorPickerProps,
  ChatPanelProps,
  CommentsPanelProps,
  TransformHandlesProps,
} from './ui';

export {
  KEYBOARD_SHORTCUTS,
  CANVAS_CONSTANTS,
  COLORS,
} from './ui';

// AI integration types
export type {
  CanvasContext,
  AIToolCall,
  OpenAIResponse,
  ToolExecutionResult,
  RateLimitStatus
} from './ai';

// Utility types for common patterns
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ReadonlyRecord<K extends keyof any, T> = {
  readonly [P in K]: T;
};

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// Generic callback types
export type Callback = () => void;
export type AsyncCallback = () => Promise<void>;
export type CallbackWithParam<T> = (param: T) => void;
export type AsyncCallbackWithParam<T> = (param: T) => Promise<void>;

// Error handling types
export interface AppError {
  code: string;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export type ErrorHandler = (error: AppError | Error) => void;

// Performance monitoring types
export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  shapeCount: number;
  memoryUsage?: number;
  syncLatency?: number;
}

// Development and debugging types
export interface DevSettings {
  enablePerformanceMonitor: boolean;
  enableSyncLogging: boolean;
  enableVerboseLogging: boolean;
  showFpsCounter: boolean;
  showShapeIds: boolean;
}

// Constants for type validation
export const SHAPE_TYPES = ['rectangle', 'ellipse', 'line', 'text'] as const;
export const CONNECTION_STATES = ['connected', 'disconnected', 'reconnecting'] as const;
export const TOOLBAR_ACTIONS = [
  'duplicate',
  'delete', 
  'bringToFront',
  'sendToBack',
  'bringForward',
  'sendBackward',
  'alignLeft',
  'alignCenter',
  'alignRight',
  'alignTop',
  'alignMiddle',
  'alignBottom',
  'distributeHorizontal',
  'distributeVertical',
] as const;