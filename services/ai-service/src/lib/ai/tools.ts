import { tool } from "ai";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { createClient } from "@supabase/supabase-js";
import { storeCitizenMemory } from "../rag/memory.js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

/**
 * Create Civic AI Tools for SCIRP+ Chat Interface
 * @param tenantId - City/Municipality tenant identifier
 * @param citizenEmail - Optional email for notification tracking
 * @param sessionId - Optional session identifier
 */
export function createRAGTools(tenantId?: string, citizenEmail?: string, sessionId?: string) {
  const citizenIdentifier = citizenEmail || sessionId;

  return {

    // ── Tool 1: Submit a Civic Complaint ──────────────────────────────────────
    submitComplaint: tool({
      description: `Submit a civic complaint on behalf of the citizen.

Use this tool when the citizen has described a civic issue and provided:
- A title (what the problem is)
- A description (details)
- A location (landmark, street, or area)

IMPORTANT: Always confirm with the citizen before calling this tool.`,
      inputSchema: z.object({
        title: z.string().describe("Short title of the civic issue"),
        description: z.string().describe("Detailed description of the problem"),
        location_address: z.string().describe("Location or landmark provided by the citizen"),
      }),
      execute: async ({ title, description, location_address }) => {
        try {
          if (!tenantId) {
            return { success: false, message: "City context not available. Cannot submit complaint." };
          }

          // Call the internal complaints API
          const apiUrl = process.env.API_BASE_URL || "http://localhost:3000";
          const response = await fetch(`${apiUrl}/api/complaints`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Tenant-ID": tenantId,
            },
            body: JSON.stringify({
              title,
              description: `[CHATBOT REPORTED]: ${description}\nLocation described: ${location_address}`,
              // Coordinates are approximate for chatbot submissions without GPS
              latitude: 0,
              longitude: 0,
              address: location_address,
              citizen_email: citizenEmail || null,
            }),
          });

          const data = await response.json() as any;

          if (!response.ok) {
            return { success: false, message: data.error || "Failed to submit complaint." };
          }

          if (data.isOngoingWork) {
            return {
              success: true,
              isOngoingWork: true,
              message: data.message,
              governmentWork: data.governmentWork,
            };
          }

          if (data.isDuplicate) {
            return {
              success: true,
              isDuplicate: true,
              complaintId: data.complaint.public_id,
              message: `A similar issue was already reported. Your report has been added to existing ticket ${data.complaint.public_id}.`,
            };
          }

          return {
            success: true,
            isDuplicate: false,
            complaintId: data.complaint.public_id,
            message: `Your complaint has been filed successfully. Your Complaint ID is ${data.complaint.public_id}. You can track it anytime using this ID.`,
          };
        } catch (error) {
          logger.error("submitComplaint tool error:", error);
          return { success: false, message: "Error submitting complaint. Please try again." };
        }
      },
    }),

    // ── Tool 2: Track an Existing Complaint ──────────────────────────────────
    trackComplaint: tool({
      description: `Track the current status and history of an existing civic complaint.

Use this when the citizen provides a complaint ID (format: CIV-YYYY-XXXXX).`,
      inputSchema: z.object({
        complaintId: z.string().describe("The complaint public ID, e.g. CIV-2026-12345"),
      }),
      execute: async ({ complaintId }) => {
        try {
          const apiUrl = process.env.API_BASE_URL || "http://localhost:3000";
          const response = await fetch(`${apiUrl}/api/complaints/${complaintId}`, {
            headers: { "X-Tenant-ID": tenantId || "" },
          });

          if (!response.ok) {
            return { success: false, message: `Complaint ${complaintId} not found. Please check the ID and try again.` };
          }

          const data = await response.json() as any;
          const c = data.complaint;

          const logs = (c.status_logs || [])
            .map((l: any) => `• ${l.status} — ${new Date(l.timestamp).toLocaleDateString()} (${l.notes || "No notes"})`)
            .join("\n");

          return {
            success: true,
            complaintId: c.public_id,
            title: c.title,
            status: c.status,
            category: c.category,
            severity: c.severity,
            priority_score: c.priority_score,
            reports_count: c.reports_count,
            sla_breached: c.sla_breached,
            created_at: new Date(c.created_at).toLocaleString(),
            status_history: logs || "No status updates yet.",
            message: `Complaint ${c.public_id} is currently: ${c.status}. ${c.reports_count > 1 ? `${c.reports_count} citizens have reported this same issue.` : ""}`,
          };
        } catch (error) {
          logger.error("trackComplaint tool error:", error);
          return { success: false, message: "Error fetching complaint status." };
        }
      },
    }),

    // ── Tool 3: Search Nearby Complaints (RAG for civic context) ─────────────
    searchComplaints: tool({
      description: `Search for existing open civic complaints by category or keyword.

Use this when the citizen asks about issues in their area, or before submitting a new complaint
to check if the same issue was already reported.`,
      inputSchema: z.object({
        query: z.string().describe("Search term or category to look up, e.g. 'pothole', 'garbage', 'streetlight'"),
      }),
      execute: async ({ query }) => {
        try {
          if (!tenantId) {
            return { success: false, message: "City context not available." };
          }

          const { data, error } = await supabase
            .from("complaints")
            .select("public_id, title, status, category, priority_score, reports_count, created_at")
            .eq("tenant_id", tenantId)
            .neq("status", "Resolved")
            .ilike("category", `%${query}%`)
            .order("priority_score", { ascending: false })
            .limit(5);

          if (error || !data || data.length === 0) {
            // Also try searching by title
            const { data: titleData } = await supabase
              .from("complaints")
              .select("public_id, title, status, category, priority_score, reports_count, created_at")
              .eq("tenant_id", tenantId)
              .neq("status", "Resolved")
              .ilike("title", `%${query}%`)
              .order("priority_score", { ascending: false })
              .limit(5);

            if (!titleData || titleData.length === 0) {
              return { success: true, found: false, message: `No open complaints found matching "${query}".` };
            }

            return {
              success: true,
              found: true,
              complaints: titleData,
              message: `Found ${titleData.length} open complaint(s) related to "${query}".`,
            };
          }

          return {
            success: true,
            found: true,
            complaints: data,
            message: `Found ${data.length} open complaint(s) related to "${query}".`,
          };
        } catch (error) {
          logger.error("searchComplaints tool error:", error);
          return { success: false, message: "Error searching complaints." };
        }
      },
    }),

    // ── Tool 4: Check Government Work in Progress ─────────────────────────────
    checkGovernmentWork: tool({
      description: `Check if there is ongoing government/municipal infrastructure work in a specific area.

Use this when the citizen asks why a road is dug up, or wants to know if their issue
is already being worked on by the government.`,
      inputSchema: z.object({
        area: z.string().describe("Area or landmark to check for government work"),
      }),
      execute: async ({ area }) => {
        try {
          if (!tenantId) {
            return { success: false, message: "City context not available." };
          }

          const { data, error } = await supabase
            .from("government_works")
            .select("title, department, work_type, status, expected_completion")
            .eq("tenant_id", tenantId)
            .eq("status", "IN_PROGRESS")
            .limit(5);

          if (error || !data || data.length === 0) {
            return {
              success: true,
              found: false,
              message: `No active government work found near "${area}". If you see an issue there, please report it.`,
            };
          }

          return {
            success: true,
            found: true,
            works: data,
            message: `Found ${data.length} active government project(s). These may be related to what you're seeing.`,
          };
        } catch (error) {
          logger.error("checkGovernmentWork tool error:", error);
          return { success: false, message: "Error checking government work status." };
        }
      },
    }),

    // Tool 5: Persistent memory (Store user context)
    storeUserMemory: tool({
      description: `Store important context about the citizen's current or previous issue in persistent RAG memory.
Use this tool to remember important facts like "Citizen lives at 123 Main St", "Previous complaint was about water shortage", or "Citizen's area is prone to floods" so you can refer back to it in future sessions or follow-ups.`,
      inputSchema: z.object({
        memoryText: z.string().describe("The specific context or issue details to remember for this citizen"),
      }),
      execute: async ({ memoryText }) => {
        try {
          if (!tenantId || !citizenIdentifier) {
            return { success: false, message: "Cannot store memory: User context (email or session) not available." };
          }

          const success = await storeCitizenMemory(tenantId, citizenIdentifier, memoryText);
          if (success) {
            return { success: true, message: `Successfully stored memory: "${memoryText}"` };
          } else {
            return { success: false, message: "Failed to store memory." };
          }
        } catch (error) {
          logger.error("storeUserMemory tool error:", error);
          return { success: false, message: "Error storing memory." };
        }
      },
    }),
  };
}
