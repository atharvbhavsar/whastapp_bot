"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Fetch civic knowledge gaps for a given city tenant.
 *
 * Knowledge gaps = questions citizens asked via chatbot/voice
 * that the AI COULD NOT answer from the civic knowledge base.
 *
 * These are logged so city admins know which government PDFs
 * to upload next (e.g., "What is the SLA for pothole repair?" → upload SLA guidelines PDF).
 */
export async function getKnowledgeGaps(tenantId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("knowledge_gaps")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching knowledge gaps:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch only unanswered knowledge gaps (priority queue for admin)
 */
export async function getUnansweredGaps(tenantId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("knowledge_gaps")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("answered_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching unanswered gaps:", error);
    return [];
  }

  return data || [];
}
