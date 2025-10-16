/**
 * OnlineUsers - Real-time Online Users List
 * 
 * Displays list of currently online users with their colors and names.
 * Updates in real-time based on cursor/presence activity.
 */

import useCanvasStore from '../../store/canvasStore';
import { useAuth } from '../../hooks/useAuth';

const OnlineUsers = () => {
  const { currentUser } = useAuth();
  const users = useCanvasStore(state => state.users);
  
  // Filter for online users with recent activity (last 30 seconds)
  const ACTIVITY_TIMEOUT = 30 * 1000; // 30 seconds in milliseconds
  const now = Date.now();
  
  const onlineUsers = Object.values(users).filter(user => {
    if (!user.online) return false;
    
    // Check if user has been active within timeout period
    // Handle Firestore Timestamp objects (same pattern as shape sync)
    const lastSeenTime = user.lastSeen?.seconds 
      ? user.lastSeen.seconds * 1000  // Firestore Timestamp
      : user.lastSeen instanceof Date 
        ? user.lastSeen.getTime()     // JavaScript Date
        : new Date(user.lastSeen).getTime(); // Date string
      
    return (now - lastSeenTime) < ACTIVITY_TIMEOUT;
  });
  
  const totalOnline = onlineUsers.length + (currentUser ? 1 : 0); // +1 for current user
  
  if (!currentUser) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Online Users</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {totalOnline} online
        </span>
      </div>
      
      <div className="space-y-2">
        {/* Current user (always first) */}
        <div className="flex items-center space-x-3">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#10B981' }} // Green for current user
          />
          <span className="text-sm text-gray-900 font-medium">
            {currentUser.displayName || currentUser.email?.split('@')[0] || 'You'}
            <span className="text-xs text-gray-500 ml-1">(you)</span>
          </span>
        </div>
        
        {/* Other online users */}
        {onlineUsers.map(user => (
          <div key={user.uid} className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: user.color }}
            />
            <span className="text-sm text-gray-700">
              {user.displayName}
            </span>
          </div>
        ))}
        
        {/* No other users online */}
        {onlineUsers.length === 0 && (
          <div className="text-xs text-gray-400 italic py-1">
            No other users online
            <div className="text-xs text-gray-300 mt-1">
              (Users appear offline after 30s of inactivity)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineUsers;
