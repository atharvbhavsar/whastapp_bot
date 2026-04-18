import { Router, Request, Response } from "express";
import { searchComplaints, formatComplaintContext } from "../lib/rag/search.js";
import { logger } from "../lib/utils/logger.js";

export const ragRouter = Router();

/**
 * POST /api/rag/search
 *
 * Civic Knowledge Base search endpoint — returns RAG results without AI processing.
 *
 * Two search modes are supported:
 * 1. Complaint similarity search (via tenantId) — finds existing complaints similar to the query
 * 2. Government document search (via tenantId) — searches uploaded policy PDFs and notices
 *
 * Useful for:
 * - External integrations (n8n workflows, WhatsApp bots) that want to use their own LLM
 * - Admin tools to verify what the AI would retrieve for a given query
 * - CPGRAMS / e-Governance integrations
 *
 * Request body:
 * {
 *   "query": "pothole near Shivaji nagar",
 *   "tenantId": "pune-uuid",
 *   "matchThreshold": 0.5,  // optional, default 0.5
 *   "matchCount": 5         // optional, default 5
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "query": "...",
 *   "tenantId": "...",
 *   "resultCount": 3,
 *   "context": "Formatted context string for LLM...",
 *   "complaints": [...]
 * }
 */
ragRouter.post("/search", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string);
    const { query, matchThreshold = 0.5, matchCount = 5 } = req.body;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'query' field. Must be a non-empty string.",
      });
      return;
    }

    if (!tenantId || typeof tenantId !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'tenantId'. Pass in body or X-Tenant-ID header.",
      });
      return;
    }

    logger.info(`Civic RAG search: query="${query}", tenantId=${tenantId}`);

    // Search existing complaints using vector similarity
    const results = await searchComplaints(query, tenantId, matchThreshold);
    const context = formatComplaintContext(results);

    const response = {
      success: true,
      query,
      tenantId,
      resultCount: results.length,
      context,
      complaints: results.map((c) => ({
        id: c.id,
        publicId: c.public_id,
        title: c.title,
        category: c.category,
        status: c.status,
        severity: c.severity,
        reportsCount: c.reports_count,
        similarity: Math.round(c.similarity * 100) / 100,
      })),
    };

    logger.info(`Civic RAG search completed: ${results.length} results for tenantId=${tenantId}`);
    res.json(response);
  } catch (error) {
    logger.error("Civic RAG search error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

/**
 * GET /api/rag/health
 * Health check for the civic RAG endpoint
 */
ragRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    endpoint: "civic-rag",
    timestamp: new Date().toISOString(),
  });
});
