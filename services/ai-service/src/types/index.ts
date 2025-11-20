import { UIMessage } from "ai";

export interface ChatRequest {
  messages: UIMessage[]; // Widget sends UIMessage[] with parts array
  collegeId?: string; // Used for RAG filtering
  sessionId?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// RAG-specific types
export interface SearchResult {
  id: number;
  content: string;
  metadata: {
    filename: string;
    college_id: string;
    chunk_index: number;
    storage_path?: string;
  };
  similarity: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  service: string;
}
