import { SqlEditorModelService } from '../SqlEditorModel/SqlEditorModelService.js';
import { SqlEditorService } from '../SqlEditorService.js';
import { useService } from '@cloudbeaver/core-di';
import type { ISqlEditorTabState } from '../ISqlEditorTabState.js';
import { SessionExpireService } from '@cloudbeaver/core-root';
import { ConnectionsManagerService } from '@cloudbeaver/core-connections';
import { useSqlEditor } from '../SqlEditor/useSqlEditor.js';
import { useEffect, useState, useCallback } from 'react';
import { reaction } from 'mobx';
import { SqlDataSourceService } from '../SqlDataSource/SqlDataSourceService.js';
import { ConnectionInfoAuthPropertiesResource, ConnectionInfoCustomOptionsResource, ConnectionInfoResource, createConnectionParam } from '@cloudbeaver/core-connections';

interface IMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface IConnectionConfig {
    "model"?: string,
    "embed_model"?: string,
    "is_ollama"?: boolean,
    "memgraph_url"?: string,
    "memgraph_user"?: string,
    "memgraph_password"?: string,
    "db_url"?: string,
    "db_user"?: string,
    "db_password"?: string,
    "db_host"?: string,
    "db_type"?: string,
    "db_port"?: string,
    "db_name"?: string
}


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
    const [sessionExpired, setSessionExpired] = useState(expirationService.expired);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<IMessage[]>([  
      { id: '1', role: 'assistant', content: 'Hello! How can I help you with your SQL query today?' }
    ]);
    const [connectionConfig, setConnectionConfig] = useState<IConnectionConfig>({});

      useEffect(()=>{
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
      },[expirationService])

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
          const connectionKey = createConnectionParam(connection);

          // 1. Load General Config (Host, Port, DB, URL)
          connectionInfoCustomOptions.load(connectionKey).then(() => {
            const customOptions = connectionInfoCustomOptions.get(connectionKey);
            
            if (customOptions) {
                setConnectionConfig(prev => ({
                  ...prev,
                  db_host: customOptions.host,
                  db_port: customOptions.port,
                  db_name: customOptions.databaseName,
                  db_url: customOptions.url,
                }));
               console.log('Connection Config:', {
                host: customOptions.host,
                port: customOptions.port,
                database: customOptions.databaseName,
                url: customOptions.url,
                properties: customOptions.mainPropertyValues,
                ...customOptions,
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
                    setConnectionConfig(prev => ({
                        ...prev,
                        db_user: userProp.value
                    }));
                }
              }
          });
        }

        console.log(`tabId ${handleGetTabId()}`);
      }, [sqlEditorService, sqlEditorModelService, connectionsManagerService, connectionsManagerService.projectConnections, connectionInfoCustomOptions, connectionInfoAuthProperties]);


      useEffect(()=>{
        console.log('--- ChatPanel Handlers Initialization ---');
      }, [sqlEditorTabState])
      

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
      


      const connect = useCallback( async () => {
        // use connectionConfig to create connection

      }, [sqlEditor, connectionConfig])

      const sendMessage = useCallback(
        async () => {
            const message: IMessage = {
              id: Date.now().toString(),
              role: 'user',
              content: inputValue,
            };
        
            const assistantResponse: IMessage = {
              id: Date.now().toString()+"assistant",
              role: 'assistant',
              content: "I cannot  help with your query right now. Please try again later."
            }
        
            setMessages((prev) => [...prev, message, assistantResponse]);
        
          },
      [inputValue])

      useEffect(()=>{
        console.log('connectionConfig', connectionConfig);
      },[connectionConfig])


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
      }

}