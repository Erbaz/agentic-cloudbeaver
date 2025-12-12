import { ConnectionForm } from './ConnectionForm.js';
import { observer } from 'mobx-react-lite';
import { useState, useRef } from 'react';
import { useAgentService, isConnectionConfigComplete } from './useAgentService.js';
import { useS } from '@cloudbeaver/core-blocks';
import type { ISqlEditorTabState } from '../ISqlEditorTabState.js';
import style from './ChatPanel.module.css';

interface ChatPanelProps {
  state: ISqlEditorTabState;
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
    // connect
  } = useAgentService(state);

  const [chatIsClosed, setChatIsClosed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          setShowConnectionForm(false)}} />
      ) : (
        <div className={styles['chatPanelContent']}>
          <div className={styles['chatPanelMessages']}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles['chatPanelMessage']} ${msg.role === 'user' ? styles['chatPanelUserMessage'] : styles['chatPanelAssistantMessage']}`}
              >
                {msg.content}
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
