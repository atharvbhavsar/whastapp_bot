// Message structure
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

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
