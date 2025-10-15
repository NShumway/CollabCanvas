import './services/firebase'; // Initialize Firebase
import AuthGuard from './components/Auth/AuthGuard';

function App() {
  return (
    <AuthGuard>
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome to CollabCanvas! 🎨
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            You're now signed in and ready to create
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Development Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span>✅ Project Setup</span>
                  <span className="text-green-600 font-semibold">Complete</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span>✅ Authentication</span>
                  <span className="text-green-600 font-semibold">Complete</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span>⏳ Canvas & Pan/Zoom</span>
                  <span className="text-blue-600 font-semibold">Next</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>⏳ Shape Creation</span>
                  <span className="text-gray-600">Coming</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>⏳ Multiplayer Sync</span>
                  <span className="text-gray-600">Coming</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>⏳ Real-time Cursors</span>
                  <span className="text-gray-600">Coming</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>⏳ AI Agent</span>
                  <span className="text-gray-600">Future</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>⏳ Advanced Features</span>
                  <span className="text-gray-600">Future</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              🎯 Ready for Canvas Development
            </h4>
            <p className="text-blue-700">
              Authentication is working! Next we'll build the canvas with React-Konva
              and add real-time multiplayer synchronization.
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

export default App
