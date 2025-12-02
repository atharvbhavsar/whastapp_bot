import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { logger } from "../utils/logger.js";
import { getSupabase } from "./supabase.js";

export interface SearchResult {
  id: string; // UUID
  content: string; // Matched chunk content
  metadata: {
    filename: string;
    college_id: string;
    chunk_index?: number;
    source_url?: string | null; // Clickable citation link
    document_type?: "info" | "form" | "text";
  };
  similarity: number;
  parent_content: string; // Full document content for LLM context
  source_url: string | null; // Citation link (fetched from files table)
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
  matchThreshold = 0.3, // Increased threshold - chunks match better than summaries
  matchCount = 3 // Reduced from 5 to avoid token limits
): Promise<SearchResult[]> {
  try {
    // 1. Generate query embedding using OpenAI
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    // 2. Get Supabase client
    const supabase = getSupabase();

    // 3. Convert embedding array to PostgreSQL vector string format
    const vectorString = `[${embedding.join(",")}]`;

    // 4. Call Supabase RPC function for vector similarity search
    // Now returns parent_content and file_id
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

    // 5. Enrich results with source_url from files table
    const enrichedResults = await Promise.all(
      data.map(
        async (result: {
          id: string;
          content: string;
          metadata: Record<string, unknown>;
          similarity: number;
          parent_content: string;
          file_id: string | null;
        }) => {
          let source_url: string | null = null;

          // Fetch source_url from files table if file_id exists
          if (result.file_id) {
            const { data: file } = await supabase
              .from("files")
              .select("source_url")
              .eq("id", result.file_id)
              .single();
            source_url = file?.source_url || null;
          }

          return {
            id: result.id,
            content: result.content,
            metadata: result.metadata as SearchResult["metadata"],
            similarity: result.similarity,
            parent_content: result.parent_content,
            source_url,
          };
        }
      )
    );

    // Log similarity scores for debugging
    if (enrichedResults.length > 0) {
      logger.info(
        `Found ${enrichedResults.length} matching documents for college ${collegeId}:`,
        enrichedResults.map((r) => ({
          filename: r.metadata.filename,
          similarity: (r.similarity * 100).toFixed(1) + "%",
          has_parent: r.parent_content !== r.content,
        }))
      );
    } else {
      logger.info(
        `Found 0 matching documents for college ${collegeId} (threshold: ${matchThreshold})`
      );
    }

    return enrichedResults;
  } catch (error) {
    logger.error("Document search error:", error);
    throw error;
  }
}

/**
 * Format search results into context string for LLM
 * Uses parent_content (full document) instead of chunk content
 * Includes clickable citation links when available
 * Limits total context to avoid token limits
 */
export function formatContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No relevant documents found in the college's knowledge base.";
  }

  // Deduplicate by parent_content to avoid repeating the same document
  const seen = new Set<string>();
  const uniqueResults = results.filter((r) => {
    // Use a hash of parent_content to identify duplicates
    // (comparing full content strings is expensive)
    const key = r.parent_content.substring(0, 500) + r.parent_content.length;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Log deduplication info
  if (uniqueResults.length < results.length) {
    logger.info(
      `Deduplicated ${results.length} results to ${uniqueResults.length} unique documents`
    );
  }

  // Limit each document to ~4000 chars to avoid token limits
  const MAX_DOC_CHARS = 4000;
  // Limit total context to ~12000 chars (~3000 tokens)
  const MAX_TOTAL_CHARS = 12000;
  let totalChars = 0;

  const formattedDocs: string[] = [];

  for (const result of uniqueResults) {
    const filename = result.metadata.filename;
    const sourceUrl = result.source_url;
    const docType = result.metadata.document_type || "info";

    // Create source citation - with link if available
    const source = sourceUrl ? `[${filename}](${sourceUrl})` : filename;

    // Use parent_content for full context, but truncate if too long
    let contentToUse = result.parent_content;
    if (contentToUse.length > MAX_DOC_CHARS) {
      contentToUse =
        contentToUse.substring(0, MAX_DOC_CHARS) + "\n... [content truncated]";
    }

    // Document type label
    const typeLabel =
      docType === "form"
        ? "📄 Form/Notice"
        : docType === "text"
        ? "📝 Text Content"
        : "📚 Information";

    const formattedDoc = `
${typeLabel} - Document (Source: ${source}):
${contentToUse}
(Relevance: ${(result.similarity * 100).toFixed(1)}%)
---
    `.trim();

    // Check if adding this doc would exceed total limit
    if (totalChars + formattedDoc.length > MAX_TOTAL_CHARS) {
      logger.info(
        `Stopping context building at ${formattedDocs.length} docs due to size limit`
      );
      break;
    }

    formattedDocs.push(formattedDoc);
    totalChars += formattedDoc.length;
  }

  return formattedDocs.join("\n\n");
}
