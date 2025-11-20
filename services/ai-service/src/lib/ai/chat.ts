import { streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts.js";
import { logger } from "../utils/logger.js";

export interface ChatOptions {
  messages: ModelMessage[];
  collegeId?: string;
}

/**
 * Create a streaming chat response using Vercel AI SDK v5
 * @param options Chat configuration options
 * @returns StreamText result that can be piped to response
 */
export function createChatStream(options: ChatOptions) {
  const { messages } = options;

  logger.debug("Creating chat stream with", messages.length, "messages");

  // Select model based on environment
  const useGemini = process.env.USE_GEMINI === "true";
  const model = useGemini ? google("gemini-2.0-flash-exp") : openai("gpt-4o");

  logger.info(`Using ${useGemini ? "Google Gemini" : "OpenAI GPT-4o"} model`);

  try {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages, // Pass ModelMessage[] directly - no conversion needed for Express API
      temperature: 0.7,
      onError: (error) => {
        logger.error("Stream error:", error);
      },
    });

    return result;
  } catch (error) {
    logger.error("Failed to create chat stream:", error);
    throw error;
  }
}
