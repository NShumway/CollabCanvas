import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import useCanvasStore from '../store/canvasStore';

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const { currentUser, setCurrentUser, setLoading: setStoreLoading } = useCanvasStore();
  
  useEffect(() => {
    setStoreLoading(true);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        const userData = {
          uid: user.uid,
          email: user.email,
        };
        setCurrentUser(userData);
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      
      setLoading(false);
      setStoreLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setCurrentUser, setStoreLoading]);
  
  return {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
  };
};
