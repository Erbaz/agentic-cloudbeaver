import { fetchEventSource } from '@microsoft/fetch-event-source';


import { SqlEditorModelService } from '../SqlEditorModel/SqlEditorModelService.js';
import { SqlEditorService } from '../SqlEditorService.js';
import { useService } from '@cloudbeaver/core-di';
import type { ISqlEditorTabState } from '../ISqlEditorTabState.js';
import { SessionExpireService } from '@cloudbeaver/core-root';
import { ConnectionsManagerService } from '@cloudbeaver/core-connections';
import { useSqlEditor } from '../SqlEditor/useSqlEditor.js';
import { useEffect, useState, useCallback, useRef } from 'react';
import { reaction } from 'mobx';
import { SqlDataSourceService } from '../SqlDataSource/SqlDataSourceService.js';
import { ConnectionInfoAuthPropertiesResource, ConnectionInfoCustomOptionsResource, ConnectionInfoResource, createConnectionParam } from '@cloudbeaver/core-connections';
import type { IConnectionConfig } from './IConnectionConfig.js';
import type { IMessage } from './IMessage.js';
import { useChatPanelStore } from './ChatPanelContext.js';

export function isConnectionConfigComplete(config: IConnectionConfig): boolean {
  return !!(
    config.db_url &&
    config.db_host &&
    config.db_port &&
    config.db_name &&
    config.db_user &&
    config.db_password &&
    config.db_type &&
    config.model &&
    config.embed_model &&
    config.memgraph_url &&
    config.memgraph_user
  );
}

export function useAgentService(sqlEditorTabState: ISqlEditorTabState) {

  const sqlEditorService = useService(SqlEditorService);
  const sqlEditorModelService = useService(SqlEditorModelService);
  const expirationService = useService(SessionExpireService);
  const connectionInfo = useService(ConnectionInfoResource);
  const sqlEditor = useSqlEditor(sqlEditorTabState);
  const sqlDataSourceService = useService(SqlDataSourceService);
  const connectionsManagerService = useService(ConnectionsManagerService);

  const chatPanelStore = useChatPanelStore();

  const [sessionExpired, setSessionExpired] = useState(expirationService.expired);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);

  const [agentChatId, setAgentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([
    { id: '1', role: 'assistant', content: 'Hello! How can I help you with your SQL query today?' }
  ]);
  const [connectionConfig, setConnectionConfig] = useState<IConnectionConfig>({});

  const abortController = useRef<AbortController | null>(null)

  useEffect(() => {
    console.log("session expired: ", expirationService.expired)
    const disposer = reaction(
      () => ({
        expired: expirationService.expired
      }),
      () => {
        setSessionExpired(expirationService.expired)
      },
      { fireImmediately: true }
    );
    return disposer
  }, [expirationService])

  const connectionInfoCustomOptions = useService(ConnectionInfoCustomOptionsResource);
  const connectionInfoAuthProperties = useService(ConnectionInfoAuthPropertiesResource);

  useEffect(() => {
    // Log services to avoid unused variable errors
    console.log('Services:', { sqlEditorService, sqlEditorModelService });

    // Log connections
    const connections = connectionsManagerService.projectConnections;
    console.log('Available Connections:', connections.map(c => ({
      id: c.id,
      name: c.name,
      connected: c.connected
    })));
    const dataSource = sqlDataSourceService.get(sqlEditorTabState.editorId);
    const executionContext = dataSource?.executionContext;
    const connection = executionContext
      ? connectionInfo.get(createConnectionParam(executionContext.projectId, executionContext.connectionId))
      : undefined;
    console.log('connection Id', connection?.id);

    if (connection) {
      setIsConnected(true);
      const connectionKey = createConnectionParam(connection);

      // 1. Load General Config (Host, Port, DB, URL)
      connectionInfoCustomOptions.load(connectionKey).then(() => {
        const customOptions = connectionInfoCustomOptions.get(connectionKey);

        if (customOptions) {
          setConnectionConfig((prev: IConnectionConfig) => ({
            ...prev,
            db_host: customOptions.host,
            db_port: customOptions.port,
            db_url: customOptions.url,
            ...(customOptions.databaseName && { db_name: customOptions.databaseName })
          }));
          chatPanelStore.setConnectionConfig({
            db_host: customOptions.host,
            db_port: customOptions.port,
            db_url: customOptions.url,
            ...(customOptions.databaseName && { db_name: customOptions.databaseName })
          });
        }
      });

      // 2. Load Auth Config (Username)
      connectionInfoAuthProperties.load(connectionKey).then(() => {
        const authProps = connectionInfoAuthProperties.get(connectionKey);

        if (authProps?.authProperties) {
          const userProp = authProps.authProperties.find((p: any) => p.id === 'user' || p.id === 'username');
          console.log('User:', userProp?.value);
          if (userProp?.value) {
            setConnectionConfig((prev: IConnectionConfig) => ({
              ...prev,
              db_user: userProp.value
            }));
            chatPanelStore.setConnectionConfig({
              db_user: userProp.value
            });
          }
        }
      });
    } else {
      setIsConnected(false);
    }

    console.log(`tabId ${handleGetTabId()}`);
  }, [
    // sqlEditorService, 
    // sqlEditorModelService, 
    connectionsManagerService, connectionsManagerService.projectConnections, connectionInfoCustomOptions, connectionInfoAuthProperties]);


  const handleGetScript = async () => {
    const value = sqlEditor.value;
    const segment = await sqlEditor.model.getResolvedSegment();
    const result = {
      fullScript: value,
      segmentQuery: segment?.query,
    };
    console.log('handleGetScript:', result);
    return result;
  };

  const handleGetTabId = useCallback(() => {
    const ids = {
      editorId: sqlEditorTabState.editorId,
      currentTabId: sqlEditorTabState.currentTabId,
    };
    console.log('handleGetTabId:', ids);
    return ids;
  }, [sqlEditorTabState]);



  const connect = useCallback(async (config: IConnectionConfig) => {
    // use connectionConfig to create connection

    let payload = { ...config }
    if (config.db_host == "localhost") {
      payload = { ...payload, db_host: "host.docker.internal" }
    }

    chatPanelStore.setConnectionConfig(config)

    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log('connect:', response);
    const res: { chat_id: string } = await response.json();
    setAgentChatId(res.chat_id);
    chatPanelStore.setAgentChatId(res.chat_id);
  }, [])

  const sendMessage = useCallback(
    async () => {
      const message: IMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: inputValue,
      };

      console.log("User message: ", inputValue)

      // const response = await fetch(`http://localhost:8000/chat/${agentChatId}`,{
      //   method: "POST",
      //    headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     question: inputValue
      //   }) 
      // })

      const assistantResponse: IMessage = {
        id: Date.now().toString() + "assistant",
        role: 'assistant',
        content: "...Thinking..."
      }

      setMessages((prev) => [...prev, message, assistantResponse]);

      abortController.current = new AbortController();
      await fetchEventSource(`http://localhost:8000/chat/${agentChatId}/stream`, {
        method: "POST",
        signal: abortController.current?.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: inputValue
        }),
        onmessage(ev: any) {
          console.log("Assistant message: ", ev.data);
          setMessages((prev: IMessage[]) => {
            if (prev.length === 0) return prev;

            const lastIndex = prev.length - 1;
            const lastMessage = prev[lastIndex] as IMessage;

            return [
              ...prev.slice(0, lastIndex), // All except last
              {                    // Replace last
                ...lastMessage,
                content: lastMessage?.content === "...Thinking..." ? `${ev.data}` : `${lastMessage.content} ${ev.data}` // Proper concatenation
              }
            ];
          });
        }
      });

    },
    [inputValue])

  useEffect(() => {
    // Reaction triggers when any of these observables change
    const dispose = reaction(
      () => ({
        messages: chatPanelStore.chatMessages,
        agentChatId: chatPanelStore.agentChatId,
        connectionConfig: chatPanelStore.connectionConfig,
        isConnected: chatPanelStore.isConnected,
      }),
      (data) => {
        console.log("--- Chat Panel Store Updated (reaction) ---");
        console.log(data);
        console.log({ connectionConfig: data.connectionConfig })
      }
    );

    return () => dispose(); // Cleanup
  }, [chatPanelStore]); // Empty or [chatPanelStore]

  return {
    messages,
    sendMessage,
    connect,
    sessionExpired,
    inputValue,
    setInputValue,
    handleGetScript,
    setConnectionConfig,
    connectionConfig,
    isConnected,
    showConnectionForm,
    setShowConnectionForm,
    abortController
  }

}