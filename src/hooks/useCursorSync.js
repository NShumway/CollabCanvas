/**
 * useCursorSync - Multiplayer Cursor Sync (Separate Fast Path)
 * 
 * CRITICAL: Completely separate from shape sync logic.
 * This handles ONLY cursor positions and user presence.
 * 
 * Architecture:
 * - Write cursor position to Firestore users/{userId} document
 * - Listen to users collection for other users' cursors
 * - Non-blocking writes (no await) for performance
 * - Separate from shape sync to avoid interference
 */

import { useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getUsersRef } from '../services/firestore';
import useCanvasStore from '../store/canvasStore';
import { useAuth } from './useAuth';

// Generate deterministic color from user ID
const generateUserColor = (uid) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  // Use hash of uid to pick consistent color
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

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
        console.warn('Cursor position write error (non-critical):', error);
      });
      
    } catch (error) {
      // Catch and silently log cursor write errors (non-critical)
      console.warn('Cursor sync error (non-critical):', error);
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
          
          // Add user to updated users map
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
   * Mark user as online when component mounts
   */
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const markOnline = async () => {
      try {
        const userDocRef = doc(db, 'canvases', 'default-canvas', 'users', currentUser.uid);
        await setDoc(userDocRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown',
          color: generateUserColor(currentUser.uid),
          online: true,
          lastSeen: new Date()
        }, { merge: true });
        console.log('✅ Marked user as online for cursor sync');
      } catch (error) {
        console.warn('Error marking user online (non-critical):', error);
      }
    };
    
    markOnline();
  }, [currentUser]);
  
  return {
    writeCursorPosition
  };
};
