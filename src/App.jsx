import './services/firebase'; // Initialize Firebase
import AuthGuard from './components/Auth/AuthGuard';
import Canvas from './components/Canvas/Canvas';

function App() {
  return (
    <AuthGuard>
      {/* Toolbar space - will be implemented in PR #4 */}
      <div className="h-16 bg-gray-800 border-b border-gray-600 flex items-center px-4">
        <div className="text-white text-sm">
          🎨 Canvas ready • Pan: drag background • Zoom: mouse wheel • Space reserved for toolbar
        </div>
      </div>
      
      {/* Main Canvas */}
      <Canvas />
    </AuthGuard>
  )
}

export default App
