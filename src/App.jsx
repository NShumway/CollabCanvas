import './services/firebase'; // Initialize Firebase
import AuthGuard from './components/Auth/AuthGuard';
import Canvas from './components/Canvas/Canvas';
import { devSettings } from './utils/devSettings';
import Toolbar from './components/UI/Toolbar';
import OnlineUsers from './components/UI/OnlineUsers';
import ConnectionStatus from './components/UI/ConnectionStatus';
import LayerPanel from './components/UI/LayerPanel';
import PerformanceMonitor from './components/UI/PerformanceMonitor';
import { useConnectionState } from './hooks/useConnectionState';

function App() {
  // Initialize connection state monitoring
  useConnectionState();
  
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">CollabCanvas</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <ConnectionStatus />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4 space-y-4">
            <Toolbar />
            <LayerPanel />
            <OnlineUsers />
          </aside>
          
          {/* Canvas Area */}
          <main className="flex-1 relative">
            <Canvas />
            
            {/* Dev Performance Monitor */}
            {devSettings.showPerformanceMonitor && (
              <PerformanceMonitor />
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

export default App
