import { streamText, stepCountIs, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts.js";
import { createRAGTools } from "./tools.js";
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
  const { messages, collegeId } = options;

  // Select model based on environment
  const useGemini = process.env.USE_GEMINI === "true";
  const model = useGemini ? google("gemini-2.0-flash-exp") : openai("gpt-4o");

  logger.info(`Using ${useGemini ? "Google Gemini" : "OpenAI GPT-4o"} model`);
  if (collegeId) {
    logger.info(`RAG enabled for college: ${collegeId}`);
  }

  try {
    // ✅ v5: No await needed
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages, // ModelMessage[] can be passed directly to streamText
      temperature: 0.7,
      ...(collegeId
        ? {
            tools: createRAGTools(collegeId),
            // v5: stopWhen tells the model to continue after tool calls until condition is met
            // Without this, the model stops immediately after calling tools with finishReason: 'tool-calls'
            stopWhen: stepCountIs(5), // Allow up to 5 steps for tool calling and response generation
          }
        : {}), // Add RAG tools only if collegeId provided
      onError: (error) => {
        logger.error("Stream error:", error);
      },
      onFinish: ({ text, finishReason, usage }) => {
        logger.info("Stream finished", {
          textLength: text?.length || 0,
          finishReason,
          usage,
        });
      },
    });

    return result;
  } catch (error) {
    logger.error("Failed to create chat stream:", error);
    throw error;
  }
}
