import { makeAutoObservable, autorun } from 'mobx'
import type { IConnectionConfig } from './IConnectionConfig.js';
import type { IMessage } from './IMessage.js';

export class ChatPanelStore {
  isConnected: boolean = false;
  agentChatId: string = "";
  connectionConfig: IConnectionConfig = {};
  editorId: string = "";
  chatMessages: IMessage[] = [];
  localStorageKey: string;

  constructor(editorId: string) {
    this.editorId = editorId;
    this.localStorageKey = `chat-panel-store-${this.editorId}`;
    makeAutoObservable(this)
    this.loadFromStorage();
    autorun(() => {
      const data = {
        isConnected: this.isConnected,
        agentChatId: this.agentChatId,
        connectionConfig: this.connectionConfig,
        chatMessages: this.chatMessages,
        // Don't save editorId or localStorageKey
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    })
  }

  private loadFromStorage() {
    try {
      const storedJson = localStorage.getItem(this.localStorageKey);
      if (storedJson) {
        const data = JSON.parse(storedJson);
        // Only assign observable properties, not methods
        this.isConnected = data.isConnected ?? false;
        this.agentChatId = data.agentChatId ?? "";
        this.connectionConfig = (data.connectionConfig ?? {}) as IConnectionConfig;
        this.chatMessages = (data.chatMessages ?? []) as IMessage[];
        // Don't assign editorId from storage - use constructor parameter
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }

  setConnectionConfig(config: Partial<IConnectionConfig>) {
    this.connectionConfig = { ...this.connectionConfig, ...config };
  }

  setAgentChatId(chatId: string) {
    this.agentChatId = chatId;
  }

  setIsConnected(isConnected: boolean) {
    this.isConnected = isConnected;
  }

  setChatMessages(messages: IMessage[]) {
    this.chatMessages = messages;
  }

  addChatMessages(messages: IMessage[]) {
    this.chatMessages = [...this.chatMessages, ...messages];
  }

  setEditorId(editorId: string) {
    this.editorId = editorId;
  }

}