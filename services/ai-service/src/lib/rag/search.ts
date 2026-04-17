import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { logger } from "../utils/logger.js";
import { getSupabase } from "./supabase.js";

export interface ComplaintSearchResult {
  id: string;
  public_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  priority_score: number;
  reports_count: number;
  latitude: number;
  longitude: number;
  similarity: number;
}

/**
 * Search existing civic complaints using vector similarity (RAG)
 * Used by the AI chat tools and hybrid search engine
 *
 * @param query - Natural language query (user's complaint description)
 * @param tenantId - City/Municipality tenant UUID for data isolation
 * @param matchThreshold - Minimum similarity score (0-1)
 * @param matchCount - Maximum results to return
 */
export async function searchComplaints(
  query: string,
  tenantId: string,
  matchThreshold = 0.5,
  matchCount = 10
): Promise<ComplaintSearchResult[]> {
  try {
    // 1. Generate query embedding using OpenAI
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    const supabase = getSupabase();
    const vectorString = `[${embedding.join(",")}]`;

    // 2. Use the SCIRP+ find_similar_complaints RPC
    // This performs cosine similarity on the complaints table
    const { data, error } = await supabase.rpc("find_similar_complaints", {
      query_embedding: vectorString,
      query_lat: 0,
      query_lon: 0,
      p_tenant_id: tenantId,
      match_threshold: matchThreshold,
      max_distance: 999, // No geo restriction — pure text similarity for chat search
    });

    if (error) {
      logger.error("Supabase RPC error (searchComplaints):", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logger.info(`No similar complaints found for tenant ${tenantId}`);
      return [];
    }

    // 3. Hydrate results with full complaint data
    const ids = data.map((r: any) => r.id);
    const { data: fullComplaints, error: fetchErr } = await supabase
      .from("complaints")
      .select("id, public_id, title, description, category, severity, status, priority_score, reports_count, latitude, longitude")
      .in("id", ids)
      .eq("tenant_id", tenantId);

    if (fetchErr || !fullComplaints) return [];

    // 4. Merge similarity scores into results
    return fullComplaints.map((c: any) => {
      const match = data.find((d: any) => d.id === c.id);
      return { ...c, similarity: match?.similarity || 0 };
    });
  } catch (error) {
    logger.error("Complaint vector search error:", error);
    throw error;
  }
}

/**
 * Format complaint search results into context string for LLM
 */
export function formatComplaintContext(results: ComplaintSearchResult[]): string {
  if (results.length === 0) {
    return "No similar complaints found in the system.";
  }

  return results
    .map(
      (c, i) =>
        `Complaint ${i + 1} (${Math.round(c.similarity * 100)}% match):
- ID: ${c.public_id}
- Title: ${c.title}
- Category: ${c.category} | Severity: ${c.severity}
- Status: ${c.status} | Reports: ${c.reports_count} citizens
- Priority Score: ${c.priority_score}`
    )
    .join("\n\n---\n\n");
}
