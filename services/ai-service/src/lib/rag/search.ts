import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { logger } from "../utils/logger.js";

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

/**
 * Search college documents using vector similarity
 * @param query - Natural language query
 * @param collegeId - College identifier to filter results
 * @param matchThreshold - Minimum similarity score (0-1)
 * @param matchCount - Maximum results to return
 */
export async function searchDocuments(
  query: string,
  collegeId: string,
  matchThreshold = 0.3,
  matchCount = 5
): Promise<SearchResult[]> {
  try {
    // 1. Generate query embedding using OpenAI
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    // 2. Initialize Supabase client
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Convert embedding array to PostgreSQL vector string format
    const vectorString = `[${embedding.join(",")}]`;

    // 4. Call Supabase RPC function for vector similarity search
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding_text: vectorString,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter: { college_id: collegeId },
    });

    if (error) {
      logger.error("Supabase RPC error:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }

    if (!data || !Array.isArray(data)) {
      logger.warn("RPC returned no data or invalid format");
      return [];
    }

    const results = data as SearchResult[];

    logger.info(
      `Found ${results.length} matching documents for college ${collegeId}`
    );

    return results;
  } catch (error) {
    logger.error("Document search error:", error);
    throw error;
  }
}

/**
 * Format search results into context string for LLM
 */
export function formatContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No relevant documents found in the college's knowledge base.";
  }

  return results
    .map((result, index) => {
      return `
Document ${index + 1} (Source: ${result.metadata.filename}):
${result.content}
(Relevance: ${(result.similarity * 100).toFixed(1)}%)
---
      `.trim();
    })
    .join("\n\n");
}
