/**
 * Firebase and Firestore Type Definitions
 * 
 * Types for Firebase integration, Firestore documents, and real-time sync.
 * All shape coordinates (x, y) represent the CENTER of the shape.
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
  rotation?: number;
  
  // Rectangle-specific fields
  width?: number;
  height?: number;
  
  // Removed: old shape-specific fields (radius, points, strokeWidth, lineCap)
  
  // Text-specific fields
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  
  // Firestore timestamps (server-generated)
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
    x: shape.x ?? 0, // Fallback to origin if undefined
    y: shape.y ?? 0, // Fallback to origin if undefined  
    fill: shape.fill ?? SHAPE_DEFAULTS.FILL,
    zIndex: shape.zIndex ?? SHAPE_DEFAULTS.Z_INDEX,
    rotation: shape.rotation ?? 0, // Include rotation property
    updatedBy: shape.updatedBy,
    ...(shape.clientTimestamp !== undefined && { clientTimestamp: shape.clientTimestamp }),
  };

  // Add type-specific fields
  switch (shape.type) {
    case 'rectangle':
      return {
        ...baseData,
        width: shape.width ?? SHAPE_DEFAULTS.RECTANGLE_WIDTH,
        height: shape.height ?? SHAPE_DEFAULTS.RECTANGLE_HEIGHT,
      };
    case 'ellipse':
      return {
        ...baseData,
        width: shape.width ?? SHAPE_DEFAULTS.ELLIPSE_WIDTH,
        height: shape.height ?? SHAPE_DEFAULTS.ELLIPSE_HEIGHT,
      };
    // Removed: line case (line shapes eliminated)
    case 'text':
      return {
        ...baseData,
        text: shape.text ?? SHAPE_DEFAULTS.TEXT_CONTENT,
        fontSize: shape.fontSize ?? SHAPE_DEFAULTS.TEXT_FONT_SIZE,
        fontFamily: shape.fontFamily ?? SHAPE_DEFAULTS.TEXT_FONT_FAMILY,
        textAlign: shape.textAlign ?? SHAPE_DEFAULTS.TEXT_ALIGN,
        width: shape.width ?? SHAPE_DEFAULTS.TEXT_WIDTH,
        height: shape.height ?? SHAPE_DEFAULTS.TEXT_HEIGHT,
      };
  }
};

export const convertFromFirestoreShape = (doc: FirestoreShapeDocument): Shape => {
  const baseShape = {
    id: doc.id,
    x: doc.x ?? 0, // Fallback to origin if undefined
    y: doc.y ?? 0, // Fallback to origin if undefined
    fill: doc.fill ?? SHAPE_DEFAULTS.FILL,
    zIndex: doc.zIndex ?? SHAPE_DEFAULTS.Z_INDEX,
    rotation: doc.rotation ?? 0, // Include rotation property
    updatedAt: convertFirestoreTimestamp(doc.updatedAt),
    createdBy: doc.createdBy ?? 'unknown',
    updatedBy: doc.updatedBy ?? 'unknown',
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
    case 'ellipse':
      return {
        ...baseShape,
        type: 'ellipse',
        width: doc.width ?? SHAPE_DEFAULTS.ELLIPSE_WIDTH,
        height: doc.height ?? SHAPE_DEFAULTS.ELLIPSE_HEIGHT,
      } as Shape;
    // Removed: line case (line shapes eliminated)
    case 'text':
      return {
        ...baseShape,
        type: 'text',
        text: doc.text ?? SHAPE_DEFAULTS.TEXT_CONTENT,
        fontSize: doc.fontSize ?? SHAPE_DEFAULTS.TEXT_FONT_SIZE,
        fontFamily: doc.fontFamily ?? SHAPE_DEFAULTS.TEXT_FONT_FAMILY,
        textAlign: doc.textAlign ?? SHAPE_DEFAULTS.TEXT_ALIGN,
        width: doc.width ?? SHAPE_DEFAULTS.TEXT_WIDTH,
        height: doc.height ?? SHAPE_DEFAULTS.TEXT_HEIGHT,
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
    shape['updatedAt'] instanceof Object
  );
};
