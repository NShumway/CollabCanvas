import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
export const getShapesRef = (canvasId = CANVAS_ID) => {
  return collection(db, 'canvases', canvasId, 'shapes');
};

/**
 * Get reference to users collection for multiplayer cursors (PR #6)
 */
export const getUsersRef = (canvasId = CANVAS_ID) => {
  return collection(db, 'canvases', canvasId, 'users');
};

/**
 * Get reference to a specific shape document
 */
export const getShapeRef = (shapeId, canvasId = CANVAS_ID) => {
  return doc(db, 'canvases', canvasId, 'shapes', shapeId);
};

/**
 * Write a shape to Firestore
 * Uses setDoc with merge to handle partial updates
 */
export const writeShape = async (shape, userEmail) => {
  try {
    const shapeRef = getShapeRef(shape.id);
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
export const deleteShape = async (shapeId) => {
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
export const listenToShapes = (callback, canvasId = CANVAS_ID) => {
  const shapesRef = getShapesRef(canvasId);
  
  return onSnapshot(shapesRef, 
    (snapshot) => {
      const changes = snapshot.docChanges().map(change => ({
        type: change.type, // 'added', 'modified', 'removed'
        doc: change.doc,
        data: change.doc.data(),
        id: change.doc.id,
        hasPendingWrites: change.doc.metadata.hasPendingWrites // Filter local echoes
      }));
      
      callback(changes);
    },
    (error) => {
      console.error('Error listening to shapes:', error);
      callback(null, error);
    }
  );
};
