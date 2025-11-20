import { streamText, CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./prompts.js";
import { logger } from "../utils/logger.js";
import { google } from "../utils/create-google.js";

export interface ChatOptions {
  messages: CoreMessage[];
  collegeId?: string;
}

/**
 * Get the AI model based on environment configuration
 */
function getModel() {
  const useGemini = process.env.USE_GEMINI === "true";

  if (useGemini) {
    logger.info("Using Google Gemini model");
    return google("gemini-2.5-flash");
  }

  logger.info("Using OpenAI GPT-4o model");
  return openai("gpt-4o");
}

/**
 * Create a streaming chat response using Vercel AI SDK
 * @param options Chat configuration options
 * @returns StreamText result that can be piped to response
 */
export async function createChatStream(options: ChatOptions) {
  const { messages } = options;

  logger.debug("Creating chat stream with", messages.length, "messages");

  try {
    const result = streamText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
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
