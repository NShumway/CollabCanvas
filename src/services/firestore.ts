import { 
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  type CollectionReference,
  type DocumentReference,
  type Unsubscribe,
  type DocumentData,
  type QuerySnapshot,
  type DocumentChange
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  FirestoreShapeDocument,
  FirestoreDocumentChange,
  ShapeChangeCallback 
} from '@/types';

// Hardcoded canvas ID for MVP - all users connect to same canvas
const CANVAS_ID = 'default-canvas';

/**
 * Firestore Collection Structure:
 * 
 * /canvases/{canvasId}/
 *   - shapes/{shapeId}     - Individual shape documents
 *   - users/{userId}       - User presence and cursor data (for PR #6)
 *   - metadata             - Canvas settings, created date, etc.
 * 
 * Shape Document Structure:
 * {
 *   id: string,
 *   type: 'rectangle' | 'circle' | 'text',
 *   x: number,
 *   y: number, 
 *   width: number,
 *   height: number,
 *   fill: string,
 *   createdAt: timestamp,
 *   updatedAt: timestamp,
 *   createdBy: string (user email),
 *   updatedBy: string (user email)
 * }
 */

/**
 * Get reference to shapes collection for the default canvas
 */
export const getShapesRef = (canvasId: string = CANVAS_ID): CollectionReference<DocumentData> => {
  return collection(db, 'canvases', canvasId, 'shapes');
};

/**
 * Get reference to users collection for multiplayer cursors (PR #6)
 */
export const getUsersRef = (canvasId: string = CANVAS_ID): CollectionReference<DocumentData> => {
  return collection(db, 'canvases', canvasId, 'users');
};

/**
 * Get reference to a specific user document for color palette storage
 */
export const getUserRef = (userId: string): DocumentReference<DocumentData> => {
  return doc(db, 'users', userId);
};

/**
 * Get reference to user's color palette document
 */
export const getUserPaletteRef = (userId: string): DocumentReference<DocumentData> => {
  return doc(db, 'users', userId, 'preferences', 'palette');
};

/**
 * Get reference to a specific shape document
 */
export const getShapeRef = (shapeId: string, canvasId: string = CANVAS_ID): DocumentReference<DocumentData> => {
  return doc(db, 'canvases', canvasId, 'shapes', shapeId);
};

/**
 * Write a shape to Firestore
 * Uses setDoc with merge to handle partial updates
 */
export const writeShape = async (shape: Partial<FirestoreShapeDocument>, userEmail: string): Promise<boolean> => {
  try {
    const shapeRef = getShapeRef(shape.id!);
    const shapeData = {
      ...shape,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
      // Only set createdBy if it's a new shape
      ...(shape.createdAt ? {} : { 
        createdAt: serverTimestamp(),
        createdBy: userEmail 
      })
    };
    
    await setDoc(shapeRef, shapeData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error writing shape to Firestore:', error);
    return false;
  }
};

/**
 * Delete a shape from Firestore
 */
export const deleteShape = async (shapeId: string): Promise<boolean> => {
  try {
    const shapeRef = getShapeRef(shapeId);
    await deleteDoc(shapeRef);
    return true;
  } catch (error) {
    console.error('Error deleting shape from Firestore:', error);
    return false;
  }
};

/**
 * Listen to shape changes in real-time
 * Returns unsubscribe function
 */
export const listenToShapes = (callback: ShapeChangeCallback, canvasId: string = CANVAS_ID): Unsubscribe => {
  const shapesRef = getShapesRef(canvasId);
  
  return onSnapshot(shapesRef, 
    (snapshot: QuerySnapshot<DocumentData>) => {
      const changes: FirestoreDocumentChange[] = snapshot.docChanges().map((change: DocumentChange<DocumentData>) => ({
        type: change.type, // 'added', 'modified', 'removed'
        doc: {
          id: change.doc.id,
          data: () => change.doc.data() as FirestoreShapeDocument,
          metadata: {
            hasPendingWrites: change.doc.metadata.hasPendingWrites,
            fromCache: change.doc.metadata.fromCache,
          },
        },
        data: change.doc.data() as FirestoreShapeDocument,
        id: change.doc.id,
        hasPendingWrites: change.doc.metadata.hasPendingWrites // Filter local echoes
      }));
      
      callback(changes);
    },
    (error) => {
      console.error('Error listening to shapes:', error);
      callback([], error);
    }
  );
};

/**
 * Write user's saved color palette to Firestore
 */
export const writeUserPalette = async (userId: string, colors: string[]): Promise<boolean> => {
  try {
    const paletteRef = getUserPaletteRef(userId);
    await setDoc(paletteRef, {
      colors,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error writing user palette to Firestore:', error);
    return false;
  }
};

/**
 * Read user's saved color palette from Firestore
 */
export const readUserPalette = async (userId: string): Promise<string[]> => {
  try {
    const paletteRef = getUserPaletteRef(userId);
    const snapshot = await getDoc(paletteRef);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      return data?.['colors'] || [];
    }
    return [];
  } catch (error) {
    console.error('Error reading user palette from Firestore:', error);
    return [];
  }
};

/**
 * Listen to user's saved color palette changes in real-time
 */
export const listenToUserPalette = (
  userId: string, 
  callback: (colors: string[]) => void
): Unsubscribe => {
  const paletteRef = getUserPaletteRef(userId);
  
  return onSnapshot(paletteRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data?.['colors'] || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Error listening to user palette:', error);
      callback([]);
    }
  );
};
