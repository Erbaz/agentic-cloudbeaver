import { ConnectionForm } from './ConnectionForm.js';
import { observer } from 'mobx-react-lite';
import { useState, useRef, useCallback } from 'react';
import { useAgentService, isConnectionConfigComplete } from './useAgentService.js';
import { useS } from '@cloudbeaver/core-blocks';
import type { ISqlEditorTabState } from '../ISqlEditorTabState.js';
import style from './ChatPanel.module.css';

interface ChatPanelProps {
  state: ISqlEditorTabState;
}

interface MessageBlock {
  type: 'thought' | 'action' | 'actionInput' | 'answer' | 'default';
  content: string;
}

export const ChatPanel = observer<ChatPanelProps>(function ChatPanel({ state }) {
  const styles = useS(style);
  const {
    messages,
    sendMessage,
    sessionExpired,
    inputValue,
    setInputValue,
    connectionConfig,
    setConnectionConfig,
    isConnected,
    showConnectionForm,
    setShowConnectionForm,
    abortController,
    connect
  } = useAgentService(state);

  const [chatIsClosed, setChatIsClosed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const renderAssistantMessage = useCallback((content: string) => {
    // Regex patterns to match block boundaries (with flexible whitespace)
    const thoughtRegex = /Thought\s*:/gi;
    const actionRegex = /Action\s*:/gi;
    const actionInputRegex = /Action\s+Input\s*:/gi;
    const answerRegex = /Answer\s*:/gi;

    // Find all block starts with their positions
    const blocks: Array<{ type: 'thought' | 'action' | 'actionInput' | 'answer'; index: number }> = [];
    
    let match;
    while ((match = thoughtRegex.exec(content)) !== null) {
      blocks.push({ type: 'thought', index: match.index });
    }
    while ((match = actionRegex.exec(content)) !== null) {
      blocks.push({ type: 'action', index: match.index });
    }
    while ((match = actionInputRegex.exec(content)) !== null) {
      blocks.push({ type: 'actionInput', index: match.index });
    }
    while ((match = answerRegex.exec(content)) !== null) {
      blocks.push({ type: 'answer', index: match.index });
    }

    // Sort blocks by their position in the text
    blocks.sort((a, b) => a.index - b.index);

    // If no blocks found, return the content as default
    if (blocks.length === 0) {
      return <div className={styles['messageBlockDefault']}>{content}</div>;
    }

    // Split content into blocks
    const messageBlocks: MessageBlock[] = [];
    
    // Add content before first block if any
    if (blocks[0] && blocks[0].index > 0) {
      messageBlocks.push({
        type: 'default',
        content: content.substring(0, blocks[0].index).trim()
      });
    }

    // Process each block
    for (let i = 0; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      if (!currentBlock) continue; // Type guard
      
      const nextBlock = blocks[i + 1];
      
      const startIndex = currentBlock.index;
      const endIndex = nextBlock?.index || content.length;
      
      messageBlocks.push({
        type: currentBlock.type,
        content: content.substring(startIndex, endIndex).trim()
      });
    }

    // Render blocks with appropriate styling
    return (
      <div className={styles['messageBlocksContainer']}>
        {messageBlocks.map((block, index) => {
          let blockClassName = styles['messageBlockDefault'];
          
          switch (block.type) {
            case 'thought':
              blockClassName = styles['messageBlockThought'];
              break;
            case 'action':
              blockClassName = styles['messageBlockAction'];
              break;
            case 'actionInput':
              blockClassName = styles['messageBlockActionInput'];
              break;
            case 'answer':
              blockClassName = styles['messageBlockAnswer'];
              break;
          }
          
          return (
            <div key={index} className={blockClassName}>
              {block.content}
            </div>
          );
        })}
      </div>
    );
  }, [styles]);

  return (
    <div className={`${styles['chatPanelContainer']} ${chatIsClosed ? styles['chatPanelContainerClose'] : styles['chatPanelContainerOpen']}`}>
      <div className={styles['chatPanelReconnect']}>
        <button onClick={()=>{setShowConnectionForm(true)}}>Reconnect</button>
      </div>
      <div
        className={`${styles['chatPanelHeader']} ${
          chatIsClosed ? styles['chatPanelHeaderClose'] : styles['chatPanelHeaderOpen']
        }`}
      >
        <button className={styles['chatPanelCloseBtn']} onClick={()=>{setChatIsClosed(!chatIsClosed)}}>{chatIsClosed?"<":">"}</button>
      </div>
      {!isConnected || sessionExpired ? (
        <div className={styles['chatPanelSessionExpired']}>
          Not Connected
        </div>
      ) : !isConnectionConfigComplete(connectionConfig) || showConnectionForm? (
        <ConnectionForm config={connectionConfig} onSave={(config)=>{
          setConnectionConfig(config);
          connect(config);
          setShowConnectionForm(false)
        }} />
      ) : (
        <div className={styles['chatPanelContent']}>
          <div className={styles['chatPanelMessages']}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles['chatPanelMessage']} ${msg.role === 'user' ? styles['chatPanelUserMessage'] : styles['chatPanelAssistantMessage']}`}
              >
                {msg.role === 'assistant' ? renderAssistantMessage(msg.content) : msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className={styles['chatPanelInputContainer']}>
            <input
              className={styles['chatPanelInput']}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
            />
            <button className={styles['chatPanelSendButton']} onClick={sendMessage}>
              Send
            </button>
            <button className={styles['chatPanelSendButton']} onClick={()=>{abortController.current?.abort()}}>
              Cancel
            </button> 
          </div>
        </div>
      )}
    </div>
  );
});
