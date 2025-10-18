import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import useCanvasStore from '@/store/canvasStore';
import type { UseAuthReturn, CurrentUser } from '@/types';

export const useAuth = (): UseAuthReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser, setCurrentUser, setLoading: setStoreLoading } = useCanvasStore();
  
  useEffect(() => {
    setStoreLoading(true);
    
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // User is signed in
        // Extract display name from email prefix (e.g., "john.doe@company.com" -> "john.doe")
        const displayName = user.email ? user.email.split('@')[0]! : 'Unknown User';
        const userData: CurrentUser = {
          uid: user.uid,
          email: user.email ?? '',
          displayName: displayName,
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
