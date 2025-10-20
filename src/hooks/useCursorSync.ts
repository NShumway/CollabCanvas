/**
 * useCursorSync - Multiplayer Cursor Sync + Presence (Merged)
 * 
 * CRITICAL: Completely separate from shape sync logic.
 * This handles BOTH cursor positions AND user presence via cursor activity.
 * 
 * Architecture:
 * - Write cursor position + presence to Firestore users/{userId} document
 * - Listen to users collection for other users' cursors + presence
 * - Non-blocking writes (no await) for performance  
 * - Cursor activity serves as presence indication (no separate heartbeats)
 * - Browser event cleanup to mark users offline
 * - Separate from shape sync to avoid interference
 */

import { useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, type DocumentReference, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getUsersRef } from '@/services/firestore';
import useCanvasStore from '@/store/canvasStore';
import { useAuth } from './useAuth';
import { generateUserColor } from '@/utils/userColor';
import { devLog } from '@/utils/devSettings';
import type { UserCollection } from '@/types';

interface UseCursorSyncReturn {
  writeCursorPosition: (cursorX: number, cursorY: number) => Promise<void>;
}

export const useCursorSync = (): UseCursorSyncReturn => {
  const { currentUser } = useAuth();
  const { setUsers } = useCanvasStore();
  
  /**
   * Write cursor position to Firestore (non-blocking)
   * Called from Canvas component when cursor moves
   */
  const writeCursorPosition = useCallback(async (cursorX: number, cursorY: number): Promise<void> => {
    if (!currentUser?.uid) return;
    
    try {
      const userDocRef: DocumentReference = doc(db, 'canvases', 'default-canvas', 'users', currentUser.uid);
      const userData = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown',
        cursorX,
        cursorY,
        color: generateUserColor(currentUser.uid),
        online: true,
        lastSeen: new Date()
      };
      
      // Non-blocking write - don't await to maintain performance
      // Use setDoc with merge to handle document creation
      setDoc(userDocRef, userData, { merge: true }).catch(error => {
        // Silently log cursor write errors (non-critical)
        devLog.warn('Cursor position write error (non-critical):', error);
      });
      
    } catch (error) {
      // Catch and silently log cursor write errors (non-critical)
      devLog.warn('Cursor sync error (non-critical):', error);
    }
  }, [currentUser]);
  
  /**
   * Listen to other users' cursor positions
   * Updates Zustand users state with remote cursor data
   */
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    devLog.sync('Setting up cursor listener');
    
    const usersRef = getUsersRef();
    
    const unsubscribe: Unsubscribe = onSnapshot(usersRef, 
      (snapshot) => {
        // PERFORMANCE: Process only changed documents, not entire collection
        const updatedUsers: UserCollection = { ...useCanvasStore.getState().users };
        const now = Date.now();
        const ACTIVITY_TIMEOUT = 30 * 1000;
        
        // Only process documents that actually changed
        snapshot.docChanges().forEach(change => {
          const userId = change.doc.id;
          
          // Skip current user
          if (userId === currentUser.uid) {
            return;
          }
          
          if (change.type === 'removed') {
            delete updatedUsers[userId];
            return;
          }
          
          const userData = change.doc.data();
          
          // Filter out offline users
          if (!userData['online']) {
            delete updatedUsers[userId];
            return;
          }
          
          // Filter out stale activity
          const lastSeenTime = userData['lastSeen']?.seconds 
            ? userData['lastSeen'].seconds * 1000
            : userData['lastSeen'] instanceof Date 
              ? userData['lastSeen'].getTime()
              : new Date(userData['lastSeen']).getTime();
          
          if ((now - lastSeenTime) >= ACTIVITY_TIMEOUT) {
            delete updatedUsers[userId];
            return;
          }
          
          // Add/update user
          updatedUsers[userId] = {
            uid: userData['uid'],
            displayName: userData['displayName'],
            cursorX: userData['cursorX'],
            cursorY: userData['cursorY'],
            color: userData['color'],
            online: userData['online'],
            lastSeen: userData['lastSeen']
          };
        });
        
        // Only update state if something changed
        setUsers(updatedUsers);
      },
      (error) => {
        devLog.warn('Cursor listener error (non-critical):', error);
      }
    );
    
    return () => {
      devLog.sync('Cleaning up cursor listener');
      unsubscribe();
    };
  }, [currentUser, setUsers]);
  
  /**
   * Set up presence system: mark online + cleanup on unmount  
   * Cursor activity serves as presence indication - no separate heartbeats needed
   */
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const setupPresence = async (): Promise<void> => {
      try {
        const userDocRef: DocumentReference = doc(db, 'canvases', 'default-canvas', 'users', currentUser.uid);
        
        // Mark user as online now
        await setDoc(userDocRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown',
          color: generateUserColor(currentUser.uid),
          online: true,
          lastSeen: new Date()
        }, { merge: true });
        
        devLog.sync('Presence system setup: user marked online');
      } catch (error) {
        devLog.warn('Error setting up presence (non-critical):', error);
      }
    };
    
    setupPresence();
    
    // Cleanup: manually mark offline on component unmount
    return () => {
      if (currentUser?.uid) {
        const userDocRef: DocumentReference = doc(db, 'canvases', 'default-canvas', 'users', currentUser.uid);
        setDoc(userDocRef, {
          online: false,
          lastSeen: new Date()
        }, { merge: true }).catch(error => {
          devLog.warn('Error marking offline on unmount (non-critical):', error);
        });
      }
    };
  }, [currentUser]);
  
  return {
    writeCursorPosition
  };
};
