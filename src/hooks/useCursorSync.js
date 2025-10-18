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

import { useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getUsersRef } from '../services/firestore';
import useCanvasStore from '../store/canvasStore';
import { useAuth } from './useAuth';
import { generateUserColor } from '../utils/userColor';
import { devLog } from '../utils/devSettings';

export const useCursorSync = () => {
  const { currentUser } = useAuth();
  const { users, setUsers, updateUser, removeUser } = useCanvasStore();
  const writeTimeoutRef = useRef(null);
  
  /**
   * Write cursor position to Firestore (non-blocking)
   * Called from Canvas component when cursor moves
   */
  const writeCursorPosition = useCallback(async (cursorX, cursorY) => {
    if (!currentUser?.uid) return;
    
    try {
      const userDocRef = doc(db, 'canvases', 'default-canvas', 'users', currentUser.uid);
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
    
    console.log('🎯 Setting up cursor listener (separate from shape sync)');
    
    const usersRef = getUsersRef();
    
    const unsubscribe = onSnapshot(usersRef, 
      (snapshot) => {
        const updatedUsers = {};
        const now = Date.now();
        const ACTIVITY_TIMEOUT = 30 * 1000; // 30 seconds - same as OnlineUsers component
        
        snapshot.docs.forEach(doc => {
          const userData = doc.data();
          const userId = doc.id;
          
          // Filter out current user (don't show own cursor)
          if (userId === currentUser.uid) {
            return;
          }
          
          // Filter out offline users
          if (!userData.online) {
            return;
          }
          
          // Filter out users with stale activity (inactive for >30s)
          // Handle Firestore Timestamp objects (same pattern as shape sync)
          const lastSeenTime = userData.lastSeen?.seconds 
            ? userData.lastSeen.seconds * 1000  // Firestore Timestamp
            : userData.lastSeen instanceof Date 
              ? userData.lastSeen.getTime()     // JavaScript Date
              : new Date(userData.lastSeen).getTime(); // Date string
          
          if ((now - lastSeenTime) >= ACTIVITY_TIMEOUT) {
            return; // User has been inactive too long
          }
          
          // Add user to updated users map (active within last 30s)
          updatedUsers[userId] = {
            uid: userData.uid,
            displayName: userData.displayName,
            cursorX: userData.cursorX,
            cursorY: userData.cursorY,
            color: userData.color,
            online: userData.online,
            lastSeen: userData.lastSeen
          };
        });
        
        // Update Zustand with all active cursor users
        setUsers(updatedUsers);
        
        const userCount = Object.keys(updatedUsers).length;
        if (userCount > 0) {
          console.log('👥 Updated cursors for', userCount, 'users');
        }
      },
      (error) => {
        // Log cursor listener errors but don't crash the app
        console.warn('Cursor listener error (non-critical):', error);
      }
    );
    
    return () => {
      console.log('🧹 Cleaning up cursor listener');
      unsubscribe();
    };
  }, [currentUser, setUsers]);
  
  /**
   * Set up presence system: mark online + cleanup on unmount  
   * Cursor activity serves as presence indication - no separate heartbeats needed
   */
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const setupPresence = async () => {
      try {
        const userDocRef = doc(db, 'canvases', 'default-canvas', 'users', currentUser.uid);
        
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
        const userDocRef = doc(db, 'canvases', 'default-canvas', 'users', currentUser.uid);
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
