import { tool } from "ai";
import { z } from "zod";
import { searchDocuments, formatContext } from "../rag/search.js";
import { logger } from "../utils/logger.js";

/**
 * Create RAG tools for the AI chat
 * @param collegeId - College identifier for scoped search
 */
export function createRAGTools(collegeId?: string) {
  return {
    searchDocuments: tool({
      description: `Search through college documents, policies, announcements, and FAQs to find relevant information.

Use this tool when you need specific information about:
- Admission requirements and procedures
- Academic programs and courses  
- Fee structures and payment policies
- Campus facilities and services
- Important dates and deadlines
- Scholarships and financial aid
- Student services and resources
- General college information

IMPORTANT: 
- Always use this tool before answering questions about college-specific information. Do not make up or guess information.
- CRITICAL: The query parameter MUST ALWAYS be in ENGLISH, regardless of the user's language. If the user asks in Hindi/Tamil/Telugu/etc, translate the query to English first before calling this tool.`,
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "The search query in ENGLISH. If the user's question is in another language, translate it to English first. Be specific and descriptive."
          ),
      }),
      execute: async ({ query }: { query: string }) => {
        try {
          if (!collegeId) {
            return {
              success: false,
              message:
                "College ID not provided. Cannot search documents. Please ask the user to specify their college.",
              documents: [],
            };
          }

          const results = await searchDocuments(query, collegeId);

          if (results.length === 0) {
            return {
              success: true,
              message:
                "No relevant documents found for this query in the college's knowledge base. The information might not be available in the uploaded documents.",
              context: "",
              documents: [],
            };
          }

          const context = formatContext(results);

          return {
            success: true,
            message: `Found ${results.length} relevant document(s).`,
            context,
            documents: results.map((r) => ({
              filename: r.metadata.filename,
              similarity: Math.round(r.similarity * 100),
              preview: r.content.substring(0, 100) + "...",
            })),
          };
        } catch (error) {
          logger.error("Tool execution error:", error);
          return {
            success: false,
            message:
              error instanceof Error
                ? `Search failed: ${error.message}`
                : "An unknown error occurred during search",
            documents: [],
          };
        }
      },
    }),
  };
}
