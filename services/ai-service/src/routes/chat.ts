import { Router, Request, Response } from "express";
import {
  generateId,
  convertToModelMessages,
  UIMessage,
  createUIMessageStreamResponse,
} from "ai";
import { createChatStream } from "../lib/ai/chat.js";
import { ChatRequest } from "../types/index.js";
import { logger } from "../lib/utils/logger.js";
import { getSupabase } from "../lib/rag/supabase.js";
import { encrypt } from "../lib/utils/encryption.js";

export const chatRouter = Router();

/**
 * Save a message to the database with encryption
 */
async function saveMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  isVoice: boolean = false
): Promise<void> {
  try {
    const supabase = getSupabase();
    const encrypted = encrypt(content);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role,
      content_encrypted: encrypted.encrypted,
      content_iv: encrypted.iv,
      content_tag: encrypted.tag,
      is_voice: isVoice,
    });

    logger.debug("Message saved", { conversationId, role });
  } catch (error) {
    logger.error("Failed to save message:", error);
    // Don't throw - message persistence shouldn't break the chat
  }
}

/**
 * Ensure conversation exists for this session
 * Uses sessionId directly as the conversation ID (no separate lookup needed)
 */
async function ensureConversation(
  sessionId: string,
  userId: string,
  collegeId: string
): Promise<void> {
  const supabase = getSupabase();

  // Try to find existing conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", sessionId)
    .single();

  if (existing) {
    // Update the updated_at timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    return;
  }

  // Create new conversation with sessionId as the ID
  const { error: createError } = await supabase.from("conversations").insert({
    id: sessionId, // sessionId IS the conversation ID
    user_id: userId,
    college_id: collegeId,
  });

  if (createError) {
    throw createError;
  }

  logger.info("New conversation created", { sessionId });
}

/**
 * Lookup user by email and college_id
 */
async function findUser(
  email: string,
  collegeId: string
): Promise<string | null> {
  const supabase = getSupabase();

  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .eq("college_id", collegeId)
    .single();

  if (error || !user) {
    return null;
  }

  return user.id;
}

/**
 * Extract text content from UIMessage
 */
function extractMessageContent(message: UIMessage): string {
  // Handle parts array
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("\n");
  }

  return "";
}

/**
 * POST /api/chat
 * Streaming chat endpoint using UI Message Stream (v5)
 */
chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages, collegeId, sessionId, voiceHistory, email } =
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
      email: email ? "provided" : "none",
      voiceHistoryCount: voiceHistory?.length || 0,
    });

    // sessionId is also the conversationId - same thing for text and voice
    // Note: With parallel streaming, response persistence moved to createUIMessageStream's onFinish
    // For now, we just save user messages here

    // If email is provided, set up conversation logging
    if (email && collegeId && sessionId) {
      try {
        logger.info("Looking up user for message persistence", {
          email,
          collegeId,
          sessionId,
        });
        const userId = await findUser(email, collegeId);
        if (userId) {
          // Ensure conversation exists (sessionId = conversationId)
          await ensureConversation(sessionId, userId, collegeId);
          logger.info("Conversation logging enabled", {
            sessionId,
          });

          // Save the latest user message
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === "user") {
            const userContent = extractMessageContent(lastMessage);
            if (userContent) {
              await saveMessage(sessionId, "user", userContent, false);
              logger.info("User message saved", { sessionId });
            }
          }
        } else {
          logger.warn("User not found - messages will not be persisted", {
            email,
            collegeId,
          });
        }
      } catch (error) {
        logger.error("Failed to set up conversation logging:", error);
        // Continue without logging - don't break the chat
      }
    } else {
      logger.debug(
        "Message persistence skipped - missing email/collegeId/sessionId",
        {
          hasEmail: !!email,
          hasCollegeId: !!collegeId,
          hasSessionId: !!sessionId,
        }
      );
    }

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

    // ✅ v5: Create chat stream (returns UIMessageStream)
    const stream = createChatStream({
      messages: modelMessages,
      collegeId,
    });

    logger.debug("Stream started successfully");

    // ✅ v5: Use createUIMessageStreamResponse to convert stream to Response
    const response = createUIMessageStreamResponse({
      stream,
      status: 200,
      headers: {
        "X-Message-Id": generateId(),
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
