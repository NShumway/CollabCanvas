/**
 * UI Component Type Definitions
 * 
 * Types for React components, props, and UI-specific functionality.
 */

import type { ReactNode, MouseEvent, KeyboardEvent } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape, CreateMode } from './shapes';
import type { CurrentUser, MultiplayerUser } from './auth';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Canvas component props and state
export interface CanvasProps extends BaseComponentProps {
  // Canvas can be configured in the future
}

export interface CanvasState {
  dimensions: {
    width: number;
    height: number;
  };
  isSelecting: boolean;
  selectionRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isSpacePressed: boolean;
  isDraggingShapes: boolean;
  dragState: {
    startPos: { x: number; y: number } | null;
    draggedShapes: readonly string[];
    initialPositions: Record<string, { x: number; y: number }>;
  };
}

// Shape component props
export interface ShapeComponentProps {
  shape: Shape;
  isSelected?: boolean;
  onShapeClick?: (shapeId: string, event: KonvaEventObject<MouseEvent>) => void;
  onShapeDrag?: (shapeId: string, position: { x: number; y: number }) => void;
}

// Cursor component props  
export interface CursorComponentProps {
  user: MultiplayerUser;
}

// Toolbar component props
export interface ToolbarProps extends BaseComponentProps {
  createMode: CreateMode;
  onCreateModeChange: (mode: CreateMode) => void;
  onShapeAction?: (action: ToolbarAction) => void;
  selectedShapeCount: number;
}

export type ToolbarAction = 
  | 'duplicate'
  | 'delete'
  | 'bringToFront'
  | 'sendToBack'
  | 'bringForward'
  | 'sendBackward'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignTop'
  | 'alignMiddle'
  | 'alignBottom'
  | 'distributeHorizontal'
  | 'distributeVertical';

// Layer panel component props
export interface LayerPanelProps extends BaseComponentProps {
  shapes: Shape[];
  selectedIds: readonly string[];
  onSelectionChange: (shapeIds: string[]) => void;
  onZIndexChange: (shapeId: string, operation: 'up' | 'down' | 'top' | 'bottom') => void;
}

// Online users component props
export interface OnlineUsersProps extends BaseComponentProps {
  users: Record<string, MultiplayerUser>;
  currentUser: CurrentUser | null;
}

// Connection status component props
export interface ConnectionStatusProps extends BaseComponentProps {
  connectionState: 'connected' | 'disconnected' | 'reconnecting';
  lastSyncTimestamp: number;
  shapeCount: number;
}

// Performance monitor props
export interface PerformanceMonitorProps extends BaseComponentProps {
  enabled?: boolean;
}

// Auth components
export interface LoginButtonProps extends BaseComponentProps {
  onLogin?: () => void;
}

export interface AuthGuardProps extends BaseComponentProps {
  loading?: boolean;
  children: ReactNode;
}

// Event handler types
export type CanvasMouseHandler = (event: KonvaEventObject<MouseEvent>) => void;
export type CanvasKeyHandler = (event: KeyboardEvent) => void;
export type StageEventHandler<T = MouseEvent> = (event: KonvaEventObject<T>) => void;

// Viewport manipulation types
export interface ViewportOperations {
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;
  zoomToFit: (shapes: Shape[]) => void;
  resetView: () => void;
}

// Selection utilities
export interface SelectionOperations {
  selectShape: (shapeId: string, addToSelection?: boolean) => void;
  selectShapes: (shapeIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectInRect: (rect: { x: number; y: number; width: number; height: number }) => string[];
}

// Coordinate conversion utilities
export interface CoordinateUtils {
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
}

// Keyboard shortcut definitions
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = [
  { key: 'v', action: 'select', description: 'Select tool' },
  { key: 'r', action: 'rectangle', description: 'Rectangle tool' },
  { key: 'c', action: 'circle', description: 'Circle tool' },
  { key: 't', action: 'text', description: 'Text tool' },
  { key: 'l', action: 'line', description: 'Line tool' },
  { key: 'Escape', action: 'escape', description: 'Clear selection/mode' },
  { key: 'Delete', action: 'delete', description: 'Delete selected' },
  { key: 'Backspace', action: 'delete', description: 'Delete selected' },
  { key: 'd', ctrlKey: true, action: 'duplicate', description: 'Duplicate selected' },
  { key: 'a', ctrlKey: true, action: 'selectAll', description: 'Select all' },
  { key: 'c', ctrlKey: true, action: 'copy', description: 'Copy selected' },
  { key: 'v', ctrlKey: true, action: 'paste', description: 'Paste' },
  { key: ']', ctrlKey: true, action: 'bringForward', description: 'Bring forward' },
  { key: '[', ctrlKey: true, action: 'sendBackward', description: 'Send backward' },
  { key: ' ', action: 'pan', description: 'Pan mode (hold)' },
] as const;

// Canvas constants
export const CANVAS_CONSTANTS = {
  SIZE: 5000,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 3,
  GRID_SPACING: 25,
  GRID_DOT_SIZE: 1,
  SELECTION_BORDER_COLOR: '#3B82F6',
  SELECTION_FILL_COLOR: 'rgba(59, 130, 246, 0.1)',
  DUPLICATE_OFFSET: 20,
  DRAG_THROTTLE: 50, // ms
  SYNC_THROTTLE: 100, // ms
} as const;

// Style constants
export const COLORS = {
  BACKGROUND: '#2D3748',
  GRID: '#4A5568',
  SELECTION: '#3B82F6',
  DEFAULT_SHAPE: '#E2E8F0',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#CBD5E0',
  ERROR: '#E53E3E',
  SUCCESS: '#38A169',
  WARNING: '#D69E2E',
} as const;

// Animation and transition types
export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  delay?: number;
}

// Future component types for upcoming PRs

// Color picker (PR #9)
export interface ColorPickerProps extends BaseComponentProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  recentColors: string[];
  savedColors: string[];
  onSaveColor: (color: string) => void;
}

// Chat panel (AI PRs)
export interface ChatPanelProps extends BaseComponentProps {
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

// Comments panel (Comments PR)
export interface CommentsPanelProps extends BaseComponentProps {
  comments: Array<{
    id: string;
    text: string;
    author: string;
    x: number;
    y: number;
    resolved: boolean;
  }>;
  onAddComment: (x: number, y: number, text: string) => void;
  onResolveComment: (commentId: string) => void;
}

// Transform handles (Transform PR)
export interface TransformHandlesProps extends BaseComponentProps {
  selectedShapes: Shape[];
  onTransformStart: () => void;
  onTransformEnd: () => void;
  onTransform: (transform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }) => void;
}
