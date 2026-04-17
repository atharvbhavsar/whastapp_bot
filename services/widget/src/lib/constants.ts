/**
 * Configuration constants for SCIRP+ Citizen Widget
 */

// Environment flag to switch between production and local API
const USE_PRODUCTION_API = import.meta.env.VITE_USE_PRODUCTION_API !== "false";

// Production API URL
const PRODUCTION_API_URL =
  import.meta.env.VITE_PRODUCTION_API_URL ||
  "https://sih-ai-service-7f9dc48e0055.herokuapp.com";
const LOCAL_API_URL =
  import.meta.env.VITE_LOCAL_API_URL || "http://localhost:3000";

// Base API URL — used for all backend calls including voice token endpoint
export const API_BASE_URL = USE_PRODUCTION_API
  ? PRODUCTION_API_URL
  : LOCAL_API_URL;

// API chat endpoint
export const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT || `${API_BASE_URL}/api/chat`;

// Debug log
console.log("[SCIRP+] API Config:", {
  USE_PRODUCTION_API,
  API_BASE_URL,
  API_ENDPOINT,
});

// Default Tenant ID (City) — overridden by env variable or widget URL param
export const DEFAULT_TENANT_ID =
  import.meta.env.VITE_TENANT_ID || "demo-city";

// Widget configuration defaults
export const WIDGET_CONFIG = {
  maxMessageLength: 500,
  autoScrollDelay: 100,
  typingIndicatorDelay: 300,
} as const;

// Session storage keys
export const STORAGE_KEYS = {
  sessionId: "scirp_session_id",
  chatHistory: "scirp_chat_history",
  isOpen: "scirp_widget_open",
  userEmail: "scirp_user_email",
  recentComplaints: "scirp_recent_complaints",  // Phase 4: Citizen complaint history cache
} as const;
