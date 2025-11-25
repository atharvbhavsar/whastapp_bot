import { Router, Request, Response } from "express";
import { generateId, convertToModelMessages } from "ai";
import { createChatStream } from "../lib/ai/chat.js";
import { ChatRequest } from "../types/index.js";
import { logger } from "../lib/utils/logger.js";

export const chatRouter = Router();

/**
 * POST /api/chat
 * Streaming chat endpoint using UI Message Stream (v5)
 */
chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages, collegeId, sessionId, voiceHistory } =
      req.body as ChatRequest & {
        voiceHistory?: Array<{ role: string; content: string }>;
      };

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
      voiceHistoryCount: voiceHistory?.length || 0,
    });

    // ✅ v5: Convert UIMessage[] from widget to ModelMessage[] for AI SDK
    const modelMessages = convertToModelMessages(messages);

    // If there's voice history, prepend it to give context to the text AI
    // Convert voice history to model messages format
    if (voiceHistory && voiceHistory.length > 0) {
      logger.info(`Including ${voiceHistory.length} voice messages as context`);

      // Create model messages from voice history and prepend them
      const voiceModelMessages = voiceHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Prepend voice history before the current messages
      modelMessages.unshift(...voiceModelMessages);
    }

    // ✅ v5: No await on createChatStream
    const result = createChatStream({
      messages: modelMessages,
      collegeId,
    });

    logger.debug("Stream started successfully");

    // ✅ v5: Return Response object directly for use with fetch-based transports
    const response = result.toUIMessageStreamResponse({
      generateMessageId: () => generateId(),
      onError: (error) => {
        logger.error("Stream response error:", error);
        return "An error occurred while processing your request. Please try again.";
      },
    });

    // Copy response to Express res
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (error) {
          logger.error("Stream pump error:", error);
          if (!res.headersSent) {
            res.status(500).end();
          }
        }
      };
      pump();
    } else {
      res.end();
    }
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
