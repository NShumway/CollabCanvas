/**
 * useAI Hook - AI Processing State Management
 * 
 * Provides a clean interface for components to interact with the AI system.
 * Coordinates between OpenAI service, ToolRunner, and Zustand store.
 */

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import useCanvasStore from '@/store/canvasStore';
import { openaiService } from '@/services/openai';
import { createToolRunner } from '@/services/toolRunner';
import { getSyncEngine } from '@/services/syncEngine';
import type { ChatMessage, CanvasContext } from '@/types';
import { devLog } from '@/utils/devSettings';
import { getVisibleShapes } from '@/utils/viewport';

export interface UseAIReturn {
  // State
  chatMessages: ChatMessage[];
  isProcessing: boolean;
  isConfigured: boolean;
  rateLimitStatus: { remaining: number; resetTime: number };
  
  // Actions
  sendMessage: (message: string, isChatPanelVisible?: boolean) => Promise<void>;
  clearChat: () => void;
  
  // Status helpers
  canSendMessage: boolean;
  getStatusMessage: () => string;
}

export const useAI = (): UseAIReturn => {
  // TEMPORARY: Use local state instead of store to bypass missing actions issue
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  
  // Get minimal store state we actually need
  const { currentUser } = useCanvasStore();
  
  // Create local versions of store actions
  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  }, []);
  
  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
  }, []);
  
  const setAIProcessing = useCallback((processing: boolean) => {
    setIsAIProcessing(processing);
  }, []);

  // Keep a ref to the ToolRunner to avoid recreating it
  const toolRunnerRef = useRef<any>(null);

  // Initialize ToolRunner
  useEffect(() => {
    try {
      const syncEngine = getSyncEngine();
      const getStore = () => useCanvasStore.getState();
      toolRunnerRef.current = createToolRunner(syncEngine, getStore, currentUser);
    } catch (error) {
      console.warn('Failed to initialize ToolRunner:', error);
      toolRunnerRef.current = null;
    }
  }, [currentUser]);

  // Update ToolRunner's current user when it changes
  useEffect(() => {
    if (toolRunnerRef.current && currentUser) {
      toolRunnerRef.current.setCurrentUser(currentUser);
    }
  }, [currentUser]);

  /**
   * Get viewport-aware canvas context for AI (dynamic capture per request)
   */
  const getCanvasContext = useCallback((isChatPanelVisible: boolean = false): CanvasContext => {
    // Get fresh store state at request time (not cached)
    const currentStore = useCanvasStore.getState();
    const currentViewport = currentStore.viewport;
    const currentShapes = currentStore.shapes;
    const currentSelectedIds = currentStore.selectedIds;
    const currentShapeCount = Object.keys(currentShapes).length;
    
    // Calculate canvas dimensions accounting for AI panel state
    const leftSidebarWidth = 256; // w-64 = 256px
    const aiPanelWidth = isChatPanelVisible ? 320 : 0; // w-80 = 320px
    const headerToolbarHeight = 100; // Approximate header + toolbar height
    
    const canvasWidth = window.innerWidth - leftSidebarWidth - aiPanelWidth;
    const canvasHeight = window.innerHeight - headerToolbarHeight;
    
    // Calculate viewport bounds using current viewport state
    const viewportBounds = {
      left: -currentViewport.x / currentViewport.zoom,
      top: -currentViewport.y / currentViewport.zoom,
      right: (-currentViewport.x + canvasWidth) / currentViewport.zoom,
      bottom: (-currentViewport.y + canvasHeight) / currentViewport.zoom
    };
    
    // 🎯 CRITICAL FIX: Filter shapes to only those visible in viewport
    const visibleShapes = getVisibleShapes(currentShapes, viewportBounds);
    const visibleShapeCount = Object.keys(visibleShapes).length;
    
    // Filter selected IDs to only include visible shapes
    const visibleSelectedIds = currentSelectedIds.filter(id => visibleShapes[id]);
    
    devLog.ai('AI Context - Dynamic viewport capture:', {
      canvasSize: { width: canvasWidth, height: canvasHeight },
      viewportBounds,
      totalShapes: currentShapeCount,
      visibleShapes: visibleShapeCount,
      aiPanelVisible: isChatPanelVisible,
      zoom: currentViewport.zoom
    });
    
    return {
      shapes: visibleShapes, // 🎯 Only pass viewport-visible shapes to AI
      selectedIds: visibleSelectedIds,
      shapeCount: visibleShapeCount, // 🎯 Count of visible shapes, not total
      viewport: {
        ...currentViewport,
        width: canvasWidth,
        height: canvasHeight,
        bounds: viewportBounds
      }
    };
  }, []); // No dependencies - always get fresh state

  /**
   * Send a message to the AI and handle the response
   */
  const sendMessage = useCallback(async (message: string, isChatPanelVisible: boolean = true): Promise<void> => {
    if (!message.trim()) return;
    
    if (isAIProcessing) {
      devLog.ai('AI is already processing, ignoring new message');
      return;
    }

    if (!openaiService.isConfigured()) {
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'AI service is not configured. Please check your OpenAI API key.',
        timestamp: Date.now(),
        error: true
      });
      return;
    }

    if (!toolRunnerRef.current) {
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant', 
        content: 'AI tool system is not available. Please refresh the page.',
        timestamp: Date.now(),
        error: true
      });
      return;
    }

    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message.trim(),
        timestamp: Date.now()
      };
      addChatMessage(userMessage);

      // Set processing state
      setAIProcessing(true);
      devLog.ai('Starting AI processing for message:', message);

      // Get FRESH canvas context at request time with AI panel state
      const canvasContext = getCanvasContext(isChatPanelVisible);
      
      // 🎯 CRITICAL FIX: Pass viewport-filtered shapes to ToolRunner before AI processes
      if (toolRunnerRef.current) {
        toolRunnerRef.current.setContextShapes(canvasContext.shapes);
      }
      
      devLog.ai('Fresh AI context captured:', {
        shapeCount: canvasContext.shapeCount,
        canvasSize: { width: canvasContext.viewport.width, height: canvasContext.viewport.height },
        bounds: canvasContext.viewport.bounds,
        aiPanelVisible: isChatPanelVisible,
        contextShapeCount: Object.keys(canvasContext.shapes).length
      });
      
      const aiResponse = await openaiService.sendChatCompletion(
        [...chatMessages, userMessage], 
        canvasContext
      );

      if (!aiResponse.success) {
        // Handle AI error
        addChatMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: aiResponse.error || 'AI request failed',
          timestamp: Date.now(),
          error: true
        });
        return;
      }

      // Execute any tool calls
      const toolResults: string[] = [];
      
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        devLog.ai('Executing AI tool calls:', aiResponse.toolCalls);
        
        for (const toolCall of aiResponse.toolCalls) {
          try {
            const result = await toolRunnerRef.current.execute(toolCall);
            
            if (result.success) {
              toolResults.push(result.message);
              devLog.ai('Tool execution successful:', result);
            } else {
              toolResults.push(`Error: ${result.message}`);
              devLog.ai('Tool execution failed:', result);
            }
          } catch (error: any) {
            const errorMsg = `Failed to execute ${toolCall.name}: ${error.message}`;
            toolResults.push(errorMsg);
            console.warn('Tool execution error:', error);
          }
        }
      }

      // Prepare assistant response
      let assistantContent = '';
      
      if (aiResponse.message) {
        assistantContent += aiResponse.message;
      }
      
      if (toolResults.length > 0) {
        if (assistantContent) assistantContent += '\n\n';
        assistantContent += toolResults.join('\n');
      }

      // If no content, provide default response
      if (!assistantContent.trim()) {
        assistantContent = 'I completed your request.';
      }

      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent.trim(),
        timestamp: Date.now()
      };

      // Add toolCalls only if they exist
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        assistantMessage.toolCalls = aiResponse.toolCalls;
      }

      addChatMessage(assistantMessage);

      devLog.ai('AI processing completed successfully');

    } catch (error: any) {
      console.warn('Error in AI processing:', error);
      
      // Add error message to chat
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'An unexpected error occurred. Please try again.',
        timestamp: Date.now(),
        error: true
      });
    } finally {
      // Always clear processing state
      setAIProcessing(false);
    }
  }, [
    isAIProcessing,
    chatMessages,
    addChatMessage,
    setAIProcessing,
    getCanvasContext
  ]);

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    clearChatMessages();
  }, [clearChatMessages]);

  /**
   * Check if AI service is properly configured
   */
  const isConfigured = openaiService.isConfigured();

  /**
   * Get rate limit status (memoized to prevent constant re-renders)
   */
  const rateLimitStatus = useMemo(() => {
    return openaiService.getRateLimitStatus();
  }, [isAIProcessing]); // Only recalculate when processing state changes

  /**
   * Check if user can send a message
   */
  const canSendMessage = isConfigured && 
                         !isAIProcessing && 
                         rateLimitStatus.remaining > 0 &&
                         !!toolRunnerRef.current;

  /**
   * Get status message for UI
   */
  const getStatusMessage = useCallback((): string => {
    if (!isConfigured) {
      return 'AI not configured - check API key';
    }
    
    if (!toolRunnerRef.current) {
      return 'AI tools not available';
    }
    
    if (isAIProcessing) {
      return 'AI is thinking...';
    }
    
    if (rateLimitStatus.remaining === 0) {
      const resetDate = new Date(rateLimitStatus.resetTime);
      const resetTime = resetDate.toLocaleTimeString();
      return `Rate limit exceeded - resets at ${resetTime}`;
    }
    
    if (rateLimitStatus.remaining <= 5) {
      return `${rateLimitStatus.remaining} AI requests remaining`;
    }
    
    return 'AI ready';
  }, [isConfigured, isAIProcessing, rateLimitStatus]);

  return {
    // State
    chatMessages,
    isProcessing: isAIProcessing,
    isConfigured,
    rateLimitStatus,
    
    // Actions  
    sendMessage,
    clearChat,
    
    // Status helpers
    canSendMessage,
    getStatusMessage
  };
};

export default useAI;
