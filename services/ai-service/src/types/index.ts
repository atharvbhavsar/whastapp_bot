import { UIMessage } from "ai";

// ──────────────────────────────────────────────
// SCIRP+ Core Request/Response Types
// ──────────────────────────────────────────────

export interface ChatRequest {
  messages: UIMessage[];
  tenantId?: string;   // City/Municipality identifier (replaces collegeId)
  sessionId?: string;
  email?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ──────────────────────────────────────────────
// Citizen / User Types
// ──────────────────────────────────────────────

export interface CivicUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: "citizen" | "admin" | "officer" | "commissioner";
  created_at: string;
}

export interface IdentifyUserRequest {
  email: string;
  tenantId: string;   // City UUID (replaces collegeId)
  name?: string;
  role?: "citizen" | "admin" | "officer";
}

export interface IdentifyUserResponse {
  userId: string;
  isNew: boolean;
}

// ──────────────────────────────────────────────
// Complaint Types
// ──────────────────────────────────────────────

export interface Complaint {
  id: string;
  tenant_id: string;
  public_id: string;
  title: string;
  description: string;
  image_url?: string;
  latitude: number;
  longitude: number;
  address?: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "Filed" | "Assigned" | "In Progress" | "Resolved" | "Escalated";
  reports_count: number;
  priority_score: number;
  sla_deadline?: string;
  escalation_level: number;
  ai_verification_score?: number;
  ai_verification_notes?: string;
  resolution_image_url?: string;
  citizen_email?: string;
  created_at: string;
  updated_at: string;
  sla_breached?: boolean;   // Computed at API response time
}

export interface StatusLog {
  id: string;
  complaint_id: string;
  status: string;
  notes?: string;
  updated_by_email?: string;
  timestamp: string;
}

// ──────────────────────────────────────────────
// Government Works Types
// ──────────────────────────────────────────────

export interface GovernmentWork {
  id: string;
  tenant_id: string;
  title: string;
  department: string;
  work_type: string;
  status: "IN_PROGRESS" | "COMPLETED" | "PLANNED";
  latitude: number;
  longitude: number;
  radius_meters: number;
  expected_completion: string;
}

// ──────────────────────────────────────────────
// Analytics Types
// ──────────────────────────────────────────────

export interface HeatmapPoint {
  lat: number;
  lon: number;
  complaint_count: number;
  avg_priority: number;
}

export interface RecurringIssue {
  category: string;
  occurrence_count: number;
  avg_days_open: number;
}

export interface SLAViolation {
  complaint_id: string;
  public_id: string;
  title: string;
  category: string;
  sla_deadline: string;
  days_overdue: number;
  escalation_level: number;
}

// ──────────────────────────────────────────────
// Standard API Response Types
// ──────────────────────────────────────────────

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
