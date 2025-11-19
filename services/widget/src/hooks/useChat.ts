/**
 * Custom hook for chat functionality
 * Integrates with Phase 1 Express API for plain text streaming
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { API_ENDPOINT, DEFAULT_COLLEGE_ID } from "@/lib/constants";
import { getSessionId } from "@/lib/session";
import { saveChatHistory } from "@/lib/storage";
import type { Message } from "@/types";

interface UseChatOptions {
  collegeId?: string;
  apiEndpoint?: string;
  onError?: (error: Error) => void;
  onFinish?: (message: Message) => void;
}

export function useChat({
  collegeId = DEFAULT_COLLEGE_ID,
  apiEndpoint = API_ENDPOINT,
  onError,
  onFinish,
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionId = getSessionId();

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        createdAt: new Date(),
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Prepare request body - convert our messages to CoreMessage format
        const allMessages = [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: allMessages,
            collegeId,
            sessionId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response body exists
        if (!response.body) {
          throw new Error("Response body is null");
        }

        // Read the plain text stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Decode the chunk and append to accumulated content
          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // Update the assistant message with accumulated content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        }

        // Finalize the message
        const finalMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: accumulatedContent,
          createdAt: new Date(),
        };

        if (onFinish) {
          onFinish(finalMessage);
        }
      } catch (err) {
        // Handle abort differently from other errors
        if (err instanceof Error && err.name === "AbortError") {
          console.log("Request aborted");
          return;
        }

        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error("Chat error:", errorObj);
        setError(errorObj);

        if (onError) {
          onError(errorObj);
        }

        // Remove the failed assistant message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, isLoading, collegeId, sessionId, onError, onFinish]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    stop,
  };
}
