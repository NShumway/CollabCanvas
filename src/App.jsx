import '@/services/firebase'; // Initialize Firebase
import AuthGuard from './components/Auth/AuthGuard';
import Canvas from './components/Canvas/Canvas';
import { devSettings } from '@/utils/devSettings';
import Toolbar from './components/UI/Toolbar';
import OnlineUsers from './components/UI/OnlineUsers';
import ConnectionStatus from './components/UI/ConnectionStatus';
import LayerPanel from './components/UI/LayerPanel';
import PerformanceMonitor from './components/UI/PerformanceMonitor';
import ChatPanel from './components/UI/ChatPanel';
import { useConnectionState } from '@/hooks/useConnectionState';
import { useState, useEffect } from 'react';

function App() {
  // Initialize connection state monitoring
  useConnectionState();
  
  // AI Chat Panel state
  const [isChatVisible, setIsChatVisible] = useState(false);
  
  // Global Ctrl+K keyboard shortcut for AI chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K (or Cmd+K on Mac) to toggle AI chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsChatVisible(true); // Always open on Ctrl+K
      }
      
      // Escape to close chat
      if (e.key === 'Escape' && isChatVisible) {
        setIsChatVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatVisible]);
  
  const toggleChatVisibility = () => {
    setIsChatVisible(prev => !prev);
  };
  
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 h-12 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-white">CollabCanvas</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <ConnectionStatus />
          </div>
        </header>

        {/* Main Toolbar */}
        <Toolbar />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4 space-y-4 flex-shrink-0">
            <LayerPanel />
            <OnlineUsers />
          </aside>
          
          {/* Canvas Area - Takes remaining space automatically */}
          <main className="flex-1 relative bg-gray-900 overflow-hidden">
            <Canvas />
            
            {/* Dev Performance Monitor */}
            {devSettings.showPerformanceMonitor && (
              <PerformanceMonitor />
            )}
          </main>
          
          {/* AI Chat Panel - Always rendered, handles own visibility */}
          <ChatPanel 
            isVisible={isChatVisible} 
            onToggleVisibility={toggleChatVisibility}
          />
        </div>
      </div>
    </AuthGuard>
  )
}

export default App
