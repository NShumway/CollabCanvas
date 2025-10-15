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
  
  // Show main app with sign out option if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info and sign out */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">CollabCanvas</h1>
            <span className="text-sm text-gray-500">
              Real-time collaborative design
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {currentUser.displayName || currentUser.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      
      {/* Main app content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default AuthGuard;
