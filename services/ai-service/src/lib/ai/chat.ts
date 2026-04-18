import {
  streamText,
  type ModelMessage,
  stepCountIs,
  createUIMessageStream,
  generateObject,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { SYSTEM_PROMPT } from "./prompts.js";
import { createRAGTools } from "./tools.js";
import { logger } from "../utils/logger.js";
import { recallCitizenMemories } from "../rag/memory.js";

export interface ChatOptions {
  messages: ModelMessage[];
  tenantId?: string;   // City/Municipality identifier
  email?: string;
  sessionId?: string;
}

/**
 * Generate follow-up suggestions in parallel
 * Uses a separate, cheaper model for fast generation
 */
async function generateSuggestions(
  messages: ModelMessage[],
  userLanguage: string = "English"
): Promise<string[]> {
  try {
    // Get the last few messages for context
    const recentMessages = messages.slice(-4);
    const context = recentMessages
      .map(
        (m) =>
          `${m.role}: ${
            typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content)
          }`
      )
      .join("\n");

    const { object } = await generateObject({
      model: openai("gpt-4o"), // Fast, cheap model
      schema: z.object({
        suggestions: z
          .array(z.string())
          .max(3)
          .describe("Follow-up question suggestions the user might ask"),
      }),
      prompt: `You are generating follow-up questions for the SCIRP+ Civic Intelligence chatbot.

Based on this conversation:
${context}

Generate 2-3 follow-up questions a citizen would likely ask next about civic issues.

RULES:
1. Questions from the CITIZEN's perspective
2. Focus on civic topics: complaints, road/water/electricity issues, government work, SLA tracking
3. Do NOT generate questions the AI would ask the user
4. Generate in ${userLanguage} language
5. Keep each question under 60 characters

Generate 2-3 follow-up questions:`,
    });

    return object.suggestions;
  } catch (error) {
    logger.error("Failed to generate suggestions:", error);
    return [];
  }
}

/**
 * Detect user's language from the last message
 */
function detectLanguage(messages: ModelMessage[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUserMessage) return "English";

  const content =
    typeof lastUserMessage.content === "string" ? lastUserMessage.content : "";

  // Simple detection based on script
  if (/[\u0900-\u097F]/.test(content)) return "Hindi";
  if (/[\u0B80-\u0BFF]/.test(content)) return "Tamil";
  if (/[\u0C00-\u0C7F]/.test(content)) return "Telugu";
  if (/[\u0980-\u09FF]/.test(content)) return "Bengali";
  if (/[\u0A80-\u0AFF]/.test(content)) return "Gujarati";
  if (/[\u0C80-\u0CFF]/.test(content)) return "Kannada";
  if (/[\u0D00-\u0D7F]/.test(content)) return "Malayalam";
  if (/[\u0A00-\u0A7F]/.test(content)) return "Punjabi";
  if (/[\u0B00-\u0B7F]/.test(content)) return "Odia";

  return "English";
}

/**
 * Create a streaming chat response using Vercel AI SDK v5
 * Uses parallel streaming: main response + suggestions generated concurrently
 *
 * @param options Chat configuration options
 * @returns UIMessageStream that streams both response and suggestions
 */
export function createChatStream(options: ChatOptions) {
  const { messages, tenantId, email, sessionId } = options;

  const useGemini = process.env.USE_GEMINI === "true";
  const model = useGemini
    ? google("gemini-2.0-flash-exp")
    : openai("gpt-4o-mini");

  logger.info(`Using ${useGemini ? "Google Gemini" : "OpenAI GPT-4o-mini"} model`);
  if (tenantId) logger.info(`Civic RAG tools enabled for tenant: ${tenantId}`);

  // Civic tools scoped to city tenant
  const tools = tenantId ? createRAGTools(tenantId, email, sessionId) : {};

  // Detect user language for suggestions
  const userLanguage = detectLanguage(messages);

  // Create a combined stream with parallel execution
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Start BOTH in parallel
      logger.info("Starting parallel streams: main response + suggestions");

      let dynamicSystemPrompt = SYSTEM_PROMPT;
      const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
      const userText = lastUserMessage && typeof lastUserMessage.content === "string" ? lastUserMessage.content : "";
      
      const citizenIdentifier = email || sessionId;
      if (tenantId && citizenIdentifier && userText) {
        const memories = await recallCitizenMemories(userText, tenantId, citizenIdentifier, 0.3, 3);
        if (memories.length > 0) {
          const memoryText = memories.map(m => m.memory_text).join("\n- ");
          dynamicSystemPrompt += `\n\n# PERSISTENT MEMORY CONTEXT\nHere are some details you noted from previous interactions with this citizen:\n- ${memoryText}\nUse this context if relevant to the current conversation.`;
        }
      }

      // 1. Main AI response stream
      const mainResult = streamText({
        model,
        system: dynamicSystemPrompt,
        messages,
        tools,
        toolChoice: "auto",
        stopWhen: stepCountIs(5),
        onError: (error) => {
          logger.error("Main stream error:", error);
        },
        onFinish: ({ finishReason, usage }) => {
          logger.info("Main stream finished", { finishReason, usage });
        },
      });

      // 2. Start suggestion generation immediately (in parallel)
      const suggestionsPromise = generateSuggestions(messages, userLanguage);
      logger.info("Suggestions generation started in parallel");

      // Merge the main response stream to the client
      writer.merge(mainResult.toUIMessageStream({ sendFinish: false }));

      // Wait for both to complete
      const [_, suggestions] = await Promise.all([
        mainResult.response, // Wait for main stream to complete
        suggestionsPromise, // Wait for suggestions
      ]);

      logger.info("Suggestions ready", { count: suggestions.length });

      // Write suggestions as a custom data part
      if (suggestions.length > 0) {
        writer.write({
          type: "data-suggestions",
          data: { suggestions },
        });
        logger.info("Suggestions written to stream");
      }
    },
    onError: (error) => {
      logger.error("Stream execution error:", error);
      return "An error occurred. Please try again.";
    },
  });

  return stream;
}
