// Re-export UIMessage from @ai-sdk/react for consistency
export type { UIMessage } from "@ai-sdk/react";

// Widget configuration
export interface WidgetConfig {
  collegeId: string;
  apiEndpoint: string;
  primaryColor?: string;
}

// Widget initialization options
export interface WidgetInitOptions {
  collegeId: string;
  apiEndpoint?: string;
  primaryColor?: string;
}

// Chat state
export interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  hasUnread: boolean;
}
