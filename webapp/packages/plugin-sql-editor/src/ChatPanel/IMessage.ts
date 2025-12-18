export interface IMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}