import { Router, Request, Response } from "express";
import {
  generateId,
  convertToModelMessages,
  UIMessage,
  consumeStream,
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
 * Get or create a conversation for the user and session
 */
async function getOrCreateConversation(
  userId: string,
  collegeId: string,
  sessionId: string
): Promise<string> {
  const supabase = getSupabase();

  // Try to find existing conversation for this session
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    // Update the updated_at timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing.id;
  }

  // Create new conversation
  const { data: newConvo, error: createError } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      college_id: collegeId,
      session_id: sessionId,
    })
    .select("id")
    .single();

  if (createError) {
    throw createError;
  }

  logger.info("New conversation created", { conversationId: newConvo.id });
  return newConvo.id;
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

    // Prepare conversation context for message persistence
    let conversationId: string | null = null;
    let userId: string | null = null;

    // If email is provided, set up conversation logging
    if (email && collegeId && sessionId) {
      try {
        logger.info("Looking up user for message persistence", {
          email,
          collegeId,
          sessionId,
        });
        userId = await findUser(email, collegeId);
        if (userId) {
          conversationId = await getOrCreateConversation(
            userId,
            collegeId,
            sessionId
          );
          logger.info("Conversation logging enabled", {
            userId,
            conversationId,
          });

          // Save the latest user message
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === "user") {
            const userContent = extractMessageContent(lastMessage);
            if (userContent) {
              await saveMessage(conversationId, "user", userContent, false);
              logger.info("User message saved", { conversationId });
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

    // ✅ v5: No await on createChatStream
    const result = createChatStream({
      messages: modelMessages,
      collegeId,
    });

    logger.debug("Stream started successfully");

    // Consume the stream to ensure onFinish is called even if client disconnects
    // This is important for message persistence
    result.consumeStream();

    // ✅ v5: Return Response object directly for use with fetch-based transports
    const response = result.toUIMessageStreamResponse({
      generateMessageId: () => generateId(),
      originalMessages: messages,
      onFinish: async ({ responseMessage }) => {
        logger.info("onFinish callback triggered", {
          hasConversationId: !!conversationId,
          hasResponseMessage: !!responseMessage,
        });
        // Save assistant response to database
        if (conversationId && responseMessage) {
          try {
            const assistantContent = extractMessageContent(responseMessage);
            logger.info("Extracted assistant content", {
              contentLength: assistantContent?.length || 0,
            });
            if (assistantContent) {
              await saveMessage(
                conversationId,
                "assistant",
                assistantContent,
                false
              );
              logger.info("Assistant message saved to conversation", {
                conversationId,
              });
            }
          } catch (error) {
            logger.error("Failed to save assistant message:", error);
          }
        } else {
          logger.debug("Skipping assistant message save", {
            conversationId,
            hasResponseMessage: !!responseMessage,
          });
        }
      },
      onError: (error) => {
        logger.error("Stream response error:", error);
        return "An error occurred while processing your request. Please try again.";
      },
      consumeSseStream: consumeStream,
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
