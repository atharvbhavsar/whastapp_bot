// Re-export UIMessage from @ai-sdk/react for consistency
export type { UIMessage } from "@ai-sdk/react";

export interface Attachment {
  url: string;
  contentType?: string;
  name?: string;
}

// Extended message type that includes voice metadata
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
  isVoice?: boolean; // Flag to distinguish voice vs text messages
  experimental_attachments?: Attachment[];
}

// Widget configuration — loaded from data-tenant-id on the script tag
export interface WidgetConfig {
  tenantId: string;    // City/Municipality UUID (replaces collegeId)
  apiEndpoint: string;
  primaryColor?: string;
}

// Widget initialization options
export interface WidgetInitOptions {
  tenantId: string;    // Required: city tenant ID
  apiEndpoint?: string;
  primaryColor?: string;
}

// Chat state
export interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  hasUnread: boolean;
}
