import './services/firebase'; // Initialize Firebase
import AuthGuard from './components/Auth/AuthGuard';
import Canvas from './components/Canvas/Canvas';
import Toolbar from './components/UI/Toolbar';

function App() {
  return (
    <AuthGuard>
      {/* Toolbar */}
      <Toolbar />
      
      {/* Main Canvas */}
      <Canvas />
    </AuthGuard>
  )
}

export default App
