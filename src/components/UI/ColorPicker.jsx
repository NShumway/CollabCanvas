import React, { useState, useEffect, useRef } from 'react';
import useCanvasStore from '@/store/canvasStore';
import { createSyncEngine } from '@/services/syncEngine';
import { readUserPalette, writeUserPalette, listenToUserPalette } from '@/services/firestore';

const PRESET_COLORS = [
  '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80',
  '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
  '#800000', '#804000', '#808000', '#408000', '#008000', '#008040',
  '#008080', '#004080', '#000080', '#400080', '#800080', '#800040',
  '#000000', '#404040', '#808080', '#C0C0C0', '#FFFFFF', '#E2E8F0'
];

const ColorPicker = ({ isOpen, onClose, position = { x: 0, y: 0 } }) => {
  const [activeTab, setActiveTab] = useState('preset'); // 'preset', 'recent', 'saved'
  const [hexInput, setHexInput] = useState('#E2E8F0');
  const [recentColors, setRecentColors] = useState([]);
  const [savedColors, setSavedColors] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const pickerRef = useRef(null);
  const syncEngineRef = useRef(null);
  
  const currentUser = useCanvasStore(state => state.currentUser);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const updateShape = useCanvasStore(state => state.updateShape);
  const updateSelectionColor = useCanvasStore(state => state.updateSelectionColor);
  
  // Initialize sync engine for color updates
  useEffect(() => {
    if (currentUser && !syncEngineRef.current) {
      syncEngineRef.current = createSyncEngine();
      syncEngineRef.current.initialize(useCanvasStore.getState, currentUser);
    }
  }, [currentUser]);
  
  // Load recent colors from session storage
  useEffect(() => {
    const saved = localStorage.getItem('collabcanvas-recent-colors');
    if (saved) {
      try {
        setRecentColors(JSON.parse(saved));
      } catch (e) {
        setRecentColors([]);
      }
    }
  }, []);
  
  // Load saved colors from user's Firestore palette
  useEffect(() => {
    if (!currentUser || !isOpen) return;
    
    setIsLoadingSaved(true);
    
    // Load initial saved colors
    readUserPalette(currentUser.uid)
      .then((colors) => {
        setSavedColors(colors);
        setIsLoadingSaved(false);
      })
      .catch((error) => {
        console.error('Error loading user palette:', error);
        setSavedColors([]);
        setIsLoadingSaved(false);
      });
    
    // Listen to real-time updates to saved colors
    const unsubscribe = listenToUserPalette(currentUser.uid, (colors) => {
      setSavedColors(colors);
    });
    
    return unsubscribe;
  }, [currentUser, isOpen]);
  
  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);
  
  // Add color to recent colors
  const addToRecentColors = (color) => {
    const newRecent = [color, ...recentColors.filter(c => c !== color)].slice(0, 10);
    setRecentColors(newRecent);
    localStorage.setItem('collabcanvas-recent-colors', JSON.stringify(newRecent));
  };
  
  // Apply color to selected shapes
  const applyColor = (color) => {
    if (selectedIds.length === 0) return;
    
    addToRecentColors(color);
    
    selectedIds.forEach(shapeId => {
      // Get complete shape from store first
      const currentShapes = useCanvasStore.getState().shapes;
      const existingShape = currentShapes[shapeId];
      
      if (!existingShape) return; // Skip if shape doesn't exist
      
      const updateData = { 
        fill: color,
        updatedBy: currentUser?.uid || 'unknown',
        clientTimestamp: Date.now()
      };
      
      // Update local state immediately
      updateShape(shapeId, updateData);
      
      // Sync to Firestore with complete shape
      if (syncEngineRef.current) {
        syncEngineRef.current.applyLocalChange(shapeId, updateData);
        syncEngineRef.current.queueWrite(shapeId, { ...existingShape, ...updateData }, true);
      }
    });
    
    // Update selection color based on new colors to ensure visibility
    // This prevents the highlight from blending with the new shape colors
    updateSelectionColor();
    
    onClose();
  };
  
  // Handle hex input change
  const handleHexChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    setHexInput(value);
  };
  
  // Handle hex input submit
  const handleHexSubmit = (e) => {
    e.preventDefault();
    const color = hexInput.toUpperCase();
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      applyColor(color);
    }
  };
  
  // Save color to user's palette
  const saveColor = async (color) => {
    if (!currentUser || savedColors.includes(color)) return;
    
    const newSaved = [...savedColors, color];
    
    try {
      await writeUserPalette(currentUser.uid, newSaved);
      // The real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error saving color to palette:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={pickerRef}
      className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl"
      style={{ 
        left: position.x, 
        top: position.y,
        minWidth: '280px'
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">
            Color Picker ({selectedIds.length} selected)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        {/* Hex Input */}
        <form onSubmit={handleHexSubmit} className="mt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              placeholder="#E2E8F0"
              className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
              maxLength={7}
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-600">
        {[
          { id: 'preset', label: 'Preset', count: PRESET_COLORS.length },
          { id: 'recent', label: 'Recent', count: recentColors.length },
          { id: 'saved', label: 'Saved', count: savedColors.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      
      {/* Color Grid */}
      <div className="p-4">
        {activeTab === 'preset' && (
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => applyColor(color)}
                className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white transition-colors relative group"
                style={{ backgroundColor: color }}
                title={color}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {color}
                </div>
              </button>
            ))}
          </div>
        )}
        
        {activeTab === 'recent' && (
          <div>
            {recentColors.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">
                No recent colors yet
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {recentColors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => applyColor(color)}
                    className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white transition-colors relative group"
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {color}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'saved' && (
          <div>
            {isLoadingSaved ? (
              <div className="text-gray-400 text-sm text-center py-8">
                Loading saved colors...
              </div>
            ) : savedColors.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">
                No saved colors yet
                <div className="text-xs mt-1">
                  Use the ♡ button to save colors
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {savedColors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => applyColor(color)}
                    className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white transition-colors relative group"
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {color}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      {activeTab === 'preset' && (
        <div className="p-4 border-t border-gray-600">
          <button
            onClick={() => saveColor(hexInput)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            Save current color
          </button>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
