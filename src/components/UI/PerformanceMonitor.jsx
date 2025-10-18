import React, { useEffect, useState } from 'react';
import useCanvasStore from '@/store/canvasStore';

const PerformanceMonitor = React.memo(() => {
  // Selective subscriptions to avoid performance monitor causing performance issues
  const shapeCount = useCanvasStore(state => state.shapeCount || Object.keys(state.shapes).length);
  const selectionCount = useCanvasStore(state => state.selectedIds.length);
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let fpsInterval;

    const measureFPS = () => {
      const now = performance.now();
      frameCount++;
      
      if (now - lastTime >= 1000) {
        setFps(Math.round(frameCount));
        frameCount = 0;
        lastTime = now;
      }
      
      fpsInterval = requestAnimationFrame(measureFPS);
    };

    fpsInterval = requestAnimationFrame(measureFPS);

    return () => {
      if (fpsInterval) cancelAnimationFrame(fpsInterval);
    };
  }, []);

  useEffect(() => {
    // Measure render time for large selections
    if (selectionCount > 50) {
      const start = performance.now();
      setTimeout(() => {
        const end = performance.now();
        setRenderTime(end - start);
      }, 0);
    }
  }, [selectionCount]);

  // Shape and selection counts now come from selective subscriptions above

  // Only show when there are performance concerns
  if (shapeCount < 50 && selectionCount < 10) return null;

  return (
    <div className="absolute top-16 left-4 z-20 bg-red-900 bg-opacity-80 text-white px-3 py-2 rounded text-xs">
      <div className="font-bold text-red-200">⚡ Performance Monitor</div>
      <div>FPS: <span className={fps < 30 ? 'text-red-300' : 'text-green-300'}>{fps}</span></div>
      <div>Shapes: <span className={shapeCount > 100 ? 'text-yellow-300' : 'text-white'}>{shapeCount}</span></div>
      <div>Selected: <span className={selectionCount > 50 ? 'text-red-300' : 'text-white'}>{selectionCount}</span></div>
      {renderTime > 0 && (
        <div>Selection Render: <span className={renderTime > 16 ? 'text-red-300' : 'text-green-300'}>{renderTime.toFixed(1)}ms</span></div>
      )}
      {selectionCount > 100 && (
        <div className="text-red-200 text-xs mt-1">⚠️ Large selection detected</div>
      )}
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;
