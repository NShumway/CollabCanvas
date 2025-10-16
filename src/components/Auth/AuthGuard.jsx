import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import LoginButton from './LoginButton';

const AuthGuard = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // useAuth hook will handle the state update automatically
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show login screen if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CollabCanvas
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Real-time Collaborative Design Tool
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Sign in to get started
            </h2>
            <LoginButton />
            <p className="text-sm text-gray-500 mt-6">
              Sign in to create and collaborate on canvas designs with your team
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show main app content if authenticated
  return (
    <>
      {children}
      {/* Add user info and sign out to header - this will be integrated into the main header */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg">
        <span className="text-sm">
          {currentUser.displayName || currentUser.email}
        </span>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );
};

export default AuthGuard;
