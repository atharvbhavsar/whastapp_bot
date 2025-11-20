import { ModelMessage } from "ai";

export interface ChatRequest {
  messages: ModelMessage[];
  collegeId?: string;
  sessionId?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
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
