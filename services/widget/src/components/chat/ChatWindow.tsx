import { useState, useCallback, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Suggestions } from "./Suggestions";
import type { UIMessage, ChatMessage } from "@/types";

interface ChatWindowProps {
  messages: UIMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, voiceHistory?: ChatMessage[]) => void;
  onMinimize: () => void;
  onClose: () => void;
  // Suggestions from data parts (parallel generation)
  suggestions?: string[];
  // Voice call props
  apiUrl?: string;
  collegeId?: string;
  sessionId?: string;
}

// Internal message type with order index for proper sorting
interface OrderedMessage extends ChatMessage {
  orderIndex: number;
}

/**
 * Extract suggestions from the last assistant message's tool parts
 */
function extractSuggestions(messages: UIMessage[]): string[] {
  // Find the last assistant message
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === "assistant");

  if (!lastAssistantMessage) return [];

  // Check if it has parts
  const msgWithParts = lastAssistantMessage as any;
  if (!msgWithParts.parts || !Array.isArray(msgWithParts.parts)) return [];

  // Find the suggestFollowUpQuestions tool part with output-available state
  const suggestionPart = msgWithParts.parts.find(
    (part: any) =>
      part.type === "tool-suggestFollowUpQuestions" &&
      part.state === "output-available" &&
      part.output?.suggestions
  );

  if (!suggestionPart) return [];

  return suggestionPart.output.suggestions || [];
}

/**
 * Check if any message has an escalateToHuman tool with output-available state
 */
function hasEscalationCompleted(messages: UIMessage[]): boolean {
  return messages.some((msg) => {
    const msgWithParts = msg as any;
    if (!msgWithParts.parts || !Array.isArray(msgWithParts.parts)) return false;

    return msgWithParts.parts.some(
      (part: any) =>
        part.type === "tool-escalateToHuman" &&
        part.state === "output-available"
    );
  });
}

export function ChatWindow({
  messages,
  isLoading,
  onSendMessage,
  onMinimize,
  onClose,
  suggestions: dataSuggestions = [], // From data parts
  apiUrl,
  collegeId,
  sessionId,
}: ChatWindowProps) {
  // Store voice transcripts separately with their order index
  const [voiceMessages, setVoiceMessages] = useState<OrderedMessage[]>([]);

  // Global order counter - increments for each message (text or voice)
  const orderCounter = useRef<number>(0);

  // Track which text message IDs we've already assigned order to
  const textMessageOrders = useRef<Map<string, number>>(new Map());

  // Handler for voice transcripts coming from LiveKit
  const handleVoiceTranscript = useCallback((transcript: ChatMessage) => {
    // Assign the next order index to this voice message
    const order = orderCounter.current++;
    const voiceMsg: OrderedMessage = {
      ...transcript,
      createdAt: transcript.createdAt || new Date(),
      orderIndex: order,
    };
    setVoiceMessages((prev) => [...prev, voiceMsg]);
  }, []);

  // Merge text messages (UIMessage) with voice messages (ChatMessage)
  // Sort by order index to maintain chronological order
  const allMessages = useMemo(() => {
    // Keep UIMessage structure intact (with parts) but add order index
    const textMessages = messages.map((msg) => {
      // Get or create a stable order index for this message
      let order = textMessageOrders.current.get(msg.id);
      if (order === undefined) {
        // New text message - assign next order index
        order = orderCounter.current++;
        textMessageOrders.current.set(msg.id, order);
      }

      // Preserve the original UIMessage with parts, just add orderIndex
      return {
        ...msg,
        orderIndex: order,
        isVoice: false,
      };
    });

    // Combine with voice messages (which don't have parts)
    const combined = [...textMessages, ...voiceMessages];

    // Sort by order index (simple numeric comparison)
    return combined.sort((a, b) => a.orderIndex - b.orderIndex);
  }, [messages, voiceMessages]);

  // Check if conversation has been escalated
  const isEscalated = useMemo(
    () => hasEscalationCompleted(messages),
    [messages]
  );

  // Use data suggestions (from parallel generation) if available,
  // otherwise fall back to tool-based suggestions
  const toolSuggestions = useMemo(() => {
    if (isLoading) return [];
    return extractSuggestions(messages);
  }, [messages, isLoading]);

  // Prefer data suggestions (faster), fall back to tool suggestions
  const suggestions =
    dataSuggestions.length > 0 ? dataSuggestions : toolSuggestions;

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onSendMessage(suggestion, voiceMessages);
    },
    [onSendMessage, voiceMessages]
  );

  return (
    <Card className="fixed bottom-20 right-6 w-[400px] h-[600px] flex flex-col shadow-2xl animate-slide-up z-50 border-0 overflow-hidden rounded-2xl bg-[#2563eb]">
      {/* Dark blue header section */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2563eb]">
        <ChatHeader
          onMinimize={onMinimize}
          onClose={onClose}
          apiUrl={apiUrl}
          collegeId={collegeId}
          sessionId={sessionId}
          onVoiceTranscript={handleVoiceTranscript}
          chatHistory={allMessages}
        />
      </div>
      {/* Light gradient main chat area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white overflow-hidden rounded-t-2xl -mt-1">
        <MessageList messages={allMessages} isLoading={isLoading} />
        {/* Show suggestions when not loading, not escalated, and we have suggestions */}
        {!isLoading && !isEscalated && suggestions.length > 0 && (
          <Suggestions
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
        <MessageInput
          onSend={(msg) => onSendMessage(msg, voiceMessages)}
          disabled={isLoading || isEscalated}
          hasMessages={
            allMessages.length > 1 ||
            (allMessages.length === 1 && allMessages[0]?.id !== "greeting-1")
          }
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
}
