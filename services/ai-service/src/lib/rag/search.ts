import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { logger } from "../utils/logger.js";

export interface SearchResult {
  id: string; // UUID
  content: string;
  metadata: {
    filename: string;
    college_id: string;
    chunk_index?: number;
    storage_path?: string;
    public_url?: string; // Clickable citation link
    is_summary?: boolean; // True for form/notice summary embeddings
    summary?: string; // AI-generated summary for forms/notices
    use_full_context?: boolean; // Flag to use full document content
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
  matchThreshold = 0.15, // Lowered for better summary matching
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

    // Log similarity scores for debugging
    if (results.length > 0) {
      logger.info(
        `Found ${results.length} matching documents for college ${collegeId}:`,
        results.map((r) => ({
          filename: r.metadata.filename,
          similarity: (r.similarity * 100).toFixed(1) + "%",
          is_summary: r.metadata.is_summary || false,
        }))
      );
    } else {
      logger.info(
        `Found 0 matching documents for college ${collegeId} (threshold: ${matchThreshold})`
      );
    }

    return results;
  } catch (error) {
    logger.error("Document search error:", error);
    throw error;
  }
}

/**
 * Format search results into context string for LLM
 * Includes clickable citation links when available
 * For forms/notices (is_summary=true), provides full document content
 */
export function formatContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No relevant documents found in the college's knowledge base.";
  }

  return results
    .map((result, index) => {
      const filename = result.metadata.filename;
      const publicUrl = result.metadata.public_url;
      const isSummary = result.metadata.is_summary;
      const useFullContext = result.metadata.use_full_context;

      // Create source citation - with link if available
      const source = publicUrl ? `[${filename}](${publicUrl})` : filename;

      // For forms/notices, indicate this is the full document
      let docTypeNote = "";
      let contentToUse = result.content;

      if (isSummary && useFullContext) {
        // This is a form/notice - content contains full extracted text
        docTypeNote = " [FULL DOCUMENT - Form/Notice]";
        // Include summary for quick reference + full content
        const summary = result.metadata.summary;
        if (summary) {
          contentToUse = `**Summary:** ${summary}\n\n**Full Document Content:**\n${result.content}`;
        }
      }

      return `
Document ${index + 1} (Source: ${source}${docTypeNote}):
${contentToUse}
(Relevance: ${(result.similarity * 100).toFixed(1)}%)
---
      `.trim();
    })
    .join("\n\n");
}
