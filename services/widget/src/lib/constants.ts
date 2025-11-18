/**
 * Configuration constants for the widget
 */

// API endpoint - will be overridden by env variable in production
export const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000/api/chat";

// College ID - will be overridden by env variable or widget configuration
export const DEFAULT_COLLEGE_ID =
  import.meta.env.VITE_COLLEGE_ID || "TEST_COLLEGE";

// Widget configuration defaults
export const WIDGET_CONFIG = {
  maxMessageLength: 500,
  autoScrollDelay: 100,
  typingIndicatorDelay: 300,
} as const;

// Session storage keys
export const STORAGE_KEYS = {
  sessionId: "widget_session_id",
  chatHistory: "widget_chat_history",
  isOpen: "widget_is_open",
} as const;
