// contexts/ChatContext.tsx
import React, { createContext, useContext } from 'react';
import { ChatPanelStore } from './ChatPanelStore.js';

// Create context with a single instance
const ChatPanelContext = createContext<ChatPanelStore | null>(null);

export const ChatPanelProvider: React.FC<{ children: React.ReactNode, editorId: string }> = ({ children, editorId }) => {
  // Store created once and shared across all children
  const chatPanelStore = React.useMemo(() => new ChatPanelStore(editorId), []);

  return (
    <ChatPanelContext.Provider value= { chatPanelStore } >
    { children }
    </ChatPanelContext.Provider>
  );
};

export const useChatPanelStore = () => {
  const store = useContext(ChatPanelContext);
  if (!store) {
    throw new Error('useChatPanelStore must be used within ChatPanelProvider');
  }
  return store; // Always returns the same instance
};