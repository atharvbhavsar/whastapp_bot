import { Router, Request, Response } from "express";
import { createChatStream } from "../lib/ai/chat.js";
import { ChatRequest } from "../types/index.js";
import { logger } from "../lib/utils/logger.js";

export const chatRouter = Router();

/**
 * POST /api/chat
 * Streaming chat endpoint using Server-Sent Events (SSE)
 */
chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages, collegeId, sessionId } = req.body as ChatRequest;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: "Bad Request",
        message: "Messages array is required and must not be empty",
        statusCode: 400,
      });
      return;
    }

    logger.info("Chat request received", {
      messageCount: messages.length,
      collegeId: collegeId || "none",
      sessionId: sessionId || "none",
    });

    // Create streaming response (not async in v5)
    const result = createChatStream({
      messages,
      collegeId,
    });

    // Convert to text stream and pipe to Express response
    result.pipeTextStreamToResponse(res);

    logger.debug("Stream started successfully");
  } catch (error) {
    logger.error("Chat endpoint error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        statusCode: 500,
      });
    }
  }
});
