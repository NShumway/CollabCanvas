/**
 * Firebase and Firestore Type Definitions
 * 
 * Types for Firebase integration, Firestore documents, and real-time sync.
 */

import type { Timestamp } from 'firebase/firestore';
import type { Shape } from './shapes';
import type { MultiplayerUser } from './auth';
import { SHAPE_DEFAULTS } from '@/utils/shapeDefaults';

// Firestore document data (how shapes are stored in Firestore)
export interface FirestoreShapeDocument {
  readonly id: string;
  readonly type: Shape['type'];
  x: number;
  y: number;
  fill: string;
  zIndex: number;
  
  // Rectangle-specific fields
  width?: number;
  height?: number;
  
  // Circle-specific fields
  radius?: number;
  
  // Line-specific fields
  points?: readonly number[]; // Flattened array: [x1, y1, x2, y2, ...]
  strokeWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  
  // Text-specific fields
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  
  // Firestore timestamps (server-generated)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  readonly createdBy: string;
  updatedBy: string;
  
  // Client timestamp for conflict resolution
  clientTimestamp?: number;
}

// Firestore user document (for presence and cursor sync)
export interface FirestoreUserDocument {
  readonly uid: string;
  readonly displayName: string;
  cursorX: number;
  cursorY: number;
  color: string;
  online: boolean;
  lastSeen: Timestamp;
}

// Firestore canvas metadata document
export interface FirestoreCanvasMetadata {
  readonly createdAt: Timestamp;
  readonly createdBy: string;
  lastModified: Timestamp;
  lastModifiedBy: string;
  shapeCount: number;
  collaborators: string[]; // Array of user UIDs
}

// Collection references
export type ShapeCollectionRef = ReturnType<typeof import('firebase/firestore').collection>;
export type UserCollectionRef = ReturnType<typeof import('firebase/firestore').collection>;

// Document change types from Firestore
export interface FirestoreDocumentChange {
  type: 'added' | 'modified' | 'removed';
  doc: {
    id: string;
    data: () => FirestoreShapeDocument;
    metadata: {
      hasPendingWrites: boolean;
      fromCache: boolean;
    };
  };
  data: FirestoreShapeDocument;
  id: string;
  hasPendingWrites: boolean;
}

// Sync engine write operations
export interface SyncWriteOperation {
  shapeId: string;
  shape: Shape;
  operation: 'create' | 'update' | 'delete';
  immediate: boolean;
}

// Batch write context
export interface BatchWriteContext {
  shapes: Map<string, Shape>;
  userId: string;
  timestamp: number;
}

// Error types for Firebase operations
export interface FirebaseError {
  code: string;
  message: string;
  name: string;
}

// Sync status types
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

// Firestore listener callback types
export type ShapeChangeCallback = (
  changes: FirestoreDocumentChange[],
  error?: FirebaseError
) => void;

export type UserChangeCallback = (
  users: Record<string, MultiplayerUser>,
  error?: FirebaseError
) => void;

// Connection monitoring types
export interface ConnectionInfo {
  state: 'connected' | 'disconnected' | 'reconnecting';
  lastConnected: number;
  reconnectAttempts: number;
  offlineQueueSize: number;
}

// Offline queue item (for future offline support)
export interface OfflineQueueItem {
  id: string;
  operation: SyncWriteOperation;
  timestamp: number;
  retries: number;
}

// Firestore security rules context (for future security PR)
export interface SecurityContext {
  uid: string;
  canvasId: string;
  timestamp: number;
}

// Type conversion utilities
export const convertFirestoreTimestamp = (timestamp: Timestamp | undefined | null): number => {
  if (!timestamp || typeof timestamp.seconds !== 'number') {
    // Fallback to current time if timestamp is missing or invalid
    console.warn('Missing or invalid Firestore timestamp, using current time as fallback');
    return Date.now();
  }
  return timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000);
};

export const convertToFirestoreShape = (shape: Shape): Partial<FirestoreShapeDocument> => {
  const baseData: Partial<FirestoreShapeDocument> = {
    id: shape.id,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    zIndex: shape.zIndex,
    updatedBy: shape.updatedBy,
    ...(shape.clientTimestamp !== undefined && { clientTimestamp: shape.clientTimestamp }),
  };

  // Add type-specific fields
  switch (shape.type) {
    case 'rectangle':
      return {
        ...baseData,
        width: shape.width,
        height: shape.height,
      };
    case 'circle':
      return {
        ...baseData,
        radius: shape.radius,
      };
    case 'line':
      return {
        ...baseData,
        points: shape.points,
        strokeWidth: shape.strokeWidth,
        lineCap: shape.lineCap,
      };
    case 'text':
      return {
        ...baseData,
        text: shape.text,
        fontSize: shape.fontSize,
        fontFamily: shape.fontFamily,
        textAlign: shape.textAlign,
        ...(shape.width !== undefined && { width: shape.width }),
        ...(shape.height !== undefined && { height: shape.height }),
      };
  }
};

export const convertFromFirestoreShape = (doc: FirestoreShapeDocument): Shape => {
  const baseShape = {
    id: doc.id,
    x: doc.x,
    y: doc.y,
    fill: doc.fill,
    zIndex: doc.zIndex,
    createdAt: convertFirestoreTimestamp(doc.createdAt),
    updatedAt: convertFirestoreTimestamp(doc.updatedAt),
    createdBy: doc.createdBy,
    updatedBy: doc.updatedBy,
    clientTimestamp: doc.clientTimestamp,
  };

  switch (doc.type) {
    case 'rectangle':
      return {
        ...baseShape,
        type: 'rectangle',
        width: doc.width ?? SHAPE_DEFAULTS.RECTANGLE_WIDTH,
        height: doc.height ?? SHAPE_DEFAULTS.RECTANGLE_HEIGHT,
      } as Shape;
    case 'circle':
      return {
        ...baseShape,
        type: 'circle',
        radius: doc.radius ?? SHAPE_DEFAULTS.CIRCLE_RADIUS,
      } as Shape;
    case 'line':
      return {
        ...baseShape,
        type: 'line',
        points: doc.points ?? [0, 0, SHAPE_DEFAULTS.LINE_LENGTH, 0],
        strokeWidth: doc.strokeWidth ?? SHAPE_DEFAULTS.LINE_STROKE_WIDTH,
        lineCap: doc.lineCap ?? SHAPE_DEFAULTS.LINE_CAP,
      } as Shape;
    case 'text':
      return {
        ...baseShape,
        type: 'text',
        text: doc.text ?? SHAPE_DEFAULTS.TEXT_CONTENT,
        fontSize: doc.fontSize ?? SHAPE_DEFAULTS.TEXT_FONT_SIZE, // ✅ Now consistent!
        fontFamily: doc.fontFamily ?? SHAPE_DEFAULTS.TEXT_FONT_FAMILY,
        textAlign: doc.textAlign ?? SHAPE_DEFAULTS.TEXT_ALIGN,
        width: doc.width,
        height: doc.height,
      } as Shape;
  }
};

// Validation helpers
export const isValidFirestoreShape = (doc: unknown): doc is FirestoreShapeDocument => {
  if (!doc || typeof doc !== 'object') return false;
  const shape = doc as Record<string, unknown>;
  
  return (
    typeof shape['id'] === 'string' &&
    typeof shape['type'] === 'string' &&
    typeof shape['x'] === 'number' &&
    typeof shape['y'] === 'number' &&
    typeof shape['fill'] === 'string' &&
    typeof shape['zIndex'] === 'number' &&
    shape['createdAt'] instanceof Object &&
    shape['updatedAt'] instanceof Object
  );
};
