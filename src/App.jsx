import './services/firebase'; // Initialize Firebase

function App() {
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            Multiplayer canvas editing with AI-powered design assistance
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-between">
              <span>✅ Project Setup</span>
              <span>Complete</span>
            </div>
            <div className="flex items-center justify-between">
              <span>⏳ Authentication</span>
              <span>Next</span>
            </div>
            <div className="flex items-center justify-between">
              <span>⏳ Canvas & Sync</span>
              <span>Coming</span>
            </div>
            <div className="flex items-center justify-between">
              <span>⏳ AI Agent</span>
              <span>Future</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
