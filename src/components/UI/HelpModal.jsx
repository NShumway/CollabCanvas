import useCanvasStore from '@/store/canvasStore';

const HelpModal = () => {
  // Split selectors to avoid infinite loop (object recreation)
  const showHelpModal = useCanvasStore(state => state.showHelpModal);
  const setShowHelpModal = useCanvasStore(state => state.setShowHelpModal);

  if (!showHelpModal) return null;

  const shortcuts = [
    {
      category: 'Selection & Navigation',
      items: [
        { keys: ['V'], description: 'Select tool (pointer)' },
        { keys: ['Space + Drag'], description: 'Pan around canvas' },
        { keys: ['Mouse Wheel'], description: 'Zoom in/out' },
        { keys: ['Ctrl', 'A'], description: 'Select all shapes' },
        { keys: ['Click + Drag'], description: 'Drag selection rectangle' },
        { keys: ['Shift + Click'], description: 'Add/remove from selection' },
        { keys: ['Esc'], description: 'Clear selection & exit mode' },
      ],
    },
    {
      category: 'Shape Creation',
      items: [
        { keys: ['R'], description: 'Rectangle tool' },
        { keys: ['C'], description: 'Ellipse/Circle tool' },
        { keys: ['T'], description: 'Text tool' },
      ],
    },
    {
      category: 'Editing',
      items: [
        { keys: ['Delete'], description: 'Delete selected shapes' },
        { keys: ['Backspace'], description: 'Delete selected shapes' },
        { keys: ['Ctrl', 'D'], description: 'Duplicate selected shapes' },
        { keys: ['Ctrl', 'C'], description: 'Copy selected shapes' },
        { keys: ['Ctrl', 'V'], description: 'Paste shapes' },
        { keys: ['Arrow Keys'], description: 'Nudge shapes 10px' },
        { keys: ['Shift + Arrow'], description: 'Nudge shapes 50px' },
        { keys: ['Double-click'], description: 'Edit text shape' },
      ],
    },
    {
      category: 'Layer Management',
      items: [
        { keys: ['Ctrl', ']'], description: 'Bring forward one layer' },
        { keys: ['Ctrl', '['], description: 'Send backward one layer' },
        { keys: ['Ctrl', 'Shift', ']'], description: 'Bring to front' },
        { keys: ['Ctrl', 'Shift', '['], description: 'Send to back' },
      ],
    },
    {
      category: 'Transform',
      items: [
        { keys: ['Shift', 'A'], description: 'Toggle aspect ratio lock' },
        { keys: ['Drag Handles'], description: 'Resize shapes' },
        { keys: ['Rotate Handle'], description: 'Rotate shapes' },
      ],
    },
    {
      category: 'Text Formatting',
      items: [
        { keys: ['Ctrl', 'B'], description: 'Bold (text selected)' },
        { keys: ['Ctrl', 'I'], description: 'Italic (text selected)' },
        { keys: ['Ctrl', 'U'], description: 'Underline (text selected)' },
      ],
    },
    {
      category: 'Other',
      items: [
        { keys: ['Ctrl', 'K'], description: 'Open AI chat panel' },
        { keys: ['Ctrl', '?'], description: 'Show this help dialog' },
      ],
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => setShowHelpModal(false)}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
            <p className="text-gray-400 text-sm mt-1">Quick reference for all shortcuts</p>
          </div>
          <button
            onClick={() => setShowHelpModal(false)}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {shortcuts.map((category, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-400 border-b border-gray-700 pb-2">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIdx < item.keys.length - 1 && (
                            <span className="text-gray-500 text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-400 text-sm text-right flex-shrink-0">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded">Esc</kbd> or <kbd className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded">Ctrl+?</kbd> to close
            </p>
            <button
              onClick={() => setShowHelpModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

