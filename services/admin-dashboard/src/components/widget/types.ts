export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  isVoice?: boolean;
  parts?: MessagePart[];
  orderIndex?: number;
}

export type MessagePartType =
  | 'text'
  | 'tool-searchDocuments'
  | 'tool-webSearch'
  | 'tool-escalateToHuman'
  | 'tool-submitComplaint'
  | 'tool-suggestFollowUpQuestions'
  | 'dynamic-tool';

export interface MessagePart {
  type: MessagePartType | string;
  text?: string;
  toolCallId?: string;
  state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
  toolName?: string;
}

export interface Source {
  title: string;
  url: string;
}
