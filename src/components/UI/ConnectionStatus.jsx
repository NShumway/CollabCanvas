/**
 * ConnectionStatus - Network & Firestore Connection Indicator
 * 
 * Shows current connection state with visual indicators.
 * Displays last sync timestamp when disconnected.
 */

import useCanvasStore from '../../store/canvasStore';

const ConnectionStatus = () => {
  const { connectionState, lastSyncTimestamp } = useCanvasStore();
  
  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'reconnecting':
        return {
          color: 'bg-yellow-500',
          text: 'Reconnecting...',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'disconnected':
      default:
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          textColor: 'text-red-700', 
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
    }
  };
  
  const config = getStatusConfig();
  
  // Format last sync time
  const getLastSyncText = () => {
    if (!lastSyncTimestamp || connectionState === 'connected') return null;
    
    const now = Date.now();
    const diffMs = now - lastSyncTimestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Last sync: just now';
    if (diffMinutes === 1) return 'Last sync: 1 minute ago';
    return `Last sync: ${diffMinutes} minutes ago`;
  };
  
  const lastSyncText = getLastSyncText();
  
  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      {/* Status dot with pulse animation for reconnecting */}
      <div className={`w-2 h-2 rounded-full ${config.color} ${connectionState === 'reconnecting' ? 'animate-pulse' : ''}`} />
      
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.text}
        </span>
        {lastSyncText && (
          <span className="text-xs text-gray-500">
            {lastSyncText}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
