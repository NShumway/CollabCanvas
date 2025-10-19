/**
 * ChatPanel - AI Chat Interface Component
 * 
 * Right sidebar panel for AI conversations with real-time chat,
 * message history, and status indicators.
 */

import { useState, useRef, useEffect } from 'react';
import useAI from '@/hooks/useAI';

interface ChatPanelProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function ChatPanel({ isVisible, onToggleVisibility }: ChatPanelProps) {
  const {
    chatMessages,
    isProcessing,
    canSendMessage,
    getStatusMessage,
    sendMessage,
    clearChat
  } = useAI();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input when panel becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !canSendMessage) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    
    try {
      await sendMessage(message, isVisible);
    } catch (error) {
      console.warn('Failed to send AI message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
        <button
          onClick={onToggleVisibility}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-l-lg shadow-lg transition-colors"
          title="Open AI Chat (Ctrl+K)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="font-semibold text-white">AI Assistant</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
              title="Clear Chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          
          <button
            onClick={onToggleVisibility}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Close Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-750 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{getStatusMessage()}</span>
          {isProcessing && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>
        
        {/* Viewport Scope Indicator */}
        <div className="flex items-center space-x-2 mt-1">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-amber-400 font-medium">Viewport Only</span>
          </div>
          <span className="text-xs text-gray-500">Pan/zoom to include other shapes</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Ask me to create or modify shapes!</p>
            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <p>Try: "Create a red rectangle"</p>
              <p>Then: "Make it bigger"</p>
              <p>Or: "Select text that says hello"</p>
            </div>
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-amber-300">
                  <p className="font-medium">I only see shapes in your current view</p>
                  <p className="text-amber-400/80 mt-1">Pan or zoom to include other shapes in my scope</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.error
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-xs text-gray-300">
                      Used: {message.toolCalls.map(tc => tc.name).join(', ')}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-300 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-700 p-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={canSendMessage ? "Ask AI about visible shapes..." : "AI unavailable"}
            disabled={!canSendMessage}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!canSendMessage || !inputMessage.trim() || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 space-y-1">
          <p>Press Enter to send • Shift+Enter for new line • Ctrl+K to focus</p>
          <p className="flex items-center space-x-1">
            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" clipRule="evenodd" />
            </svg>
            <span>AI works on shapes visible in your current viewport</span>
          </p>
        </div>
      </form>
    </div>
  );
}
