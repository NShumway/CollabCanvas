/**
 * Viewport Persistence Hook
 * 
 * Saves and restores user's viewport (zoom and pan) position to Firestore
 * Each user maintains their own independent viewport
 */

import { useEffect, useRef } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import useCanvasStore from '@/store/canvasStore';

const DEBOUNCE_DELAY = 500; // Save viewport after 500ms of inactivity
const CANVAS_ID = 'default-canvas';

export const useViewportPersistence = () => {
  const lastSavedViewport = useRef({ x: 0, y: 0, zoom: 1 });
  const isInitialized = useRef(false);
  const isLoadingViewport = useRef(false);
  
  const viewport = useCanvasStore(state => state.viewport);
  const currentUser = useCanvasStore(state => state.currentUser);
  const updateViewport = useCanvasStore(state => state.updateViewport);
  const setViewportSaveDebounceTimer = useCanvasStore(state => state.setViewportSaveDebounceTimer);
  
  // Load saved viewport on mount
  useEffect(() => {
    if (!currentUser?.uid || isInitialized.current) return;
    
    const loadViewport = async () => {
      isLoadingViewport.current = true;
      
      try {
        console.log('🔍 Loading viewport for user:', currentUser.uid);
        console.log('📂 Firestore path: canvases/' + CANVAS_ID + '/users/' + currentUser.uid);
        
        // Small delay to ensure Canvas component has finished initial setup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userRef = doc(db, 'canvases', CANVAS_ID, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        console.log('📄 User doc exists:', userDoc.exists());
        console.log('📄 User doc ID:', userDoc.id);
        console.log('📄 User doc ref path:', userDoc.ref.path);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('📊 User data:', data);
          console.log('🗺️ Viewport data:', data['viewport']);
          
          if (data['viewport']) {
            const { x, y, zoom } = data['viewport'];
            
            console.log('🔢 Viewport values:', { x, y, zoom, types: { x: typeof x, y: typeof y, zoom: typeof zoom } });
            
            // Only restore if values are valid and not default
            if (typeof x === 'number' && typeof y === 'number' && typeof zoom === 'number') {
              // Update the last saved viewport BEFORE updating the store
              // This prevents the save effect from triggering immediately
              lastSavedViewport.current = { x, y, zoom };
              
              // Update viewport
              updateViewport({ x, y, zoom });
              console.log('✅ Restored viewport:', { x, y, zoom });
            } else {
              console.log('❌ Invalid viewport types');
            }
          } else {
            console.log('❌ No viewport field in user data');
          }
        } else {
          console.log('❌ User document does not exist');
        }
        
        // Mark as initialized after a brief delay to prevent immediate saves
        setTimeout(() => {
          isInitialized.current = true;
          isLoadingViewport.current = false;
          console.log('✓ Viewport persistence initialized');
        }, 200);
      } catch (error) {
        console.error('❌ Error loading viewport:', error);
        isInitialized.current = true;
        isLoadingViewport.current = false;
      }
    };
    
    loadViewport();
  }, [currentUser?.uid, updateViewport]);
  
  // Save viewport when it changes (debounced)
  useEffect(() => {
    console.log('💭 Save effect triggered. User:', currentUser?.uid, 'Initialized:', isInitialized.current, 'Loading:', isLoadingViewport.current);
    
    if (!currentUser?.uid || !isInitialized.current || isLoadingViewport.current) {
      console.log('⏸️ Save skipped - not ready');
      return;
    }
    
    // Check if viewport actually changed
    const hasChanged = 
      viewport.x !== lastSavedViewport.current.x ||
      viewport.y !== lastSavedViewport.current.y ||
      viewport.zoom !== lastSavedViewport.current.zoom;
    
    console.log('🔄 Viewport changed?', hasChanged, {
      current: viewport,
      lastSaved: lastSavedViewport.current
    });
    
    if (!hasChanged) {
      console.log('⏸️ Save skipped - no change');
      return;
    }
    
    console.log('⏱️ Setting save timer for', DEBOUNCE_DELAY, 'ms');
    
    // Debounce: only save after user stops panning/zooming for DEBOUNCE_DELAY ms
    const timer = setTimeout(async () => {
      try {
        console.log('💾 Saving viewport to Firestore:', viewport);
        console.log('📂 Save path: canvases/' + CANVAS_ID + '/users/' + currentUser.uid);
        
        const userRef = doc(db, 'canvases', CANVAS_ID, 'users', currentUser.uid);
        
        const dataToSave = {
          viewport: {
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
            updatedAt: Date.now(),
          }
        };
        
        console.log('📝 Data being saved:', dataToSave);
        
        await setDoc(userRef, dataToSave, { merge: true }); // Merge to avoid overwriting other user data
        
        // Verify the save
        const verifyDoc = await getDoc(userRef);
        if (verifyDoc.exists()) {
          const verifiedData = verifyDoc.data();
          console.log('✅ Verified saved data:', verifiedData);
          console.log('✅ Verified viewport specifically:', verifiedData['viewport']);
          console.log('✅ Viewport has correct structure?', verifiedData['viewport']?.x, verifiedData['viewport']?.y, verifiedData['viewport']?.zoom);
        }
        
        lastSavedViewport.current = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
        console.log('✅ Viewport saved successfully!');
      } catch (error) {
        console.error('❌ Error saving viewport:', error);
      }
    }, DEBOUNCE_DELAY);
    
    setViewportSaveDebounceTimer(timer);
    
    return () => {
      console.log('🧹 Clearing save timer');
      clearTimeout(timer);
    };
  }, [viewport, currentUser?.uid, setViewportSaveDebounceTimer]);
};

