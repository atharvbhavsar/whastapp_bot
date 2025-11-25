import { useState, useCallback, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { UIMessage, ChatMessage } from "@/types";

interface ChatWindowProps {
  messages: UIMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, voiceHistory?: ChatMessage[]) => void;
  onMinimize: () => void;
  onClose: () => void;
  // Voice call props
  apiUrl?: string;
  collegeId?: string;
  sessionId?: string;
}

// Internal message type with order index for proper sorting
interface OrderedMessage extends ChatMessage {
  orderIndex: number;
}

export function ChatWindow({
  messages,
  isLoading,
  onSendMessage,
  onMinimize,
  onClose,
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
    // Convert UIMessage to ChatMessage format with order index
    const textMessages: OrderedMessage[] = messages.map((msg) => {
      // Extract text content from parts
      const textContent = msg.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as any).text)
        .join("\n");

      // Get or create a stable order index for this message
      let order = textMessageOrders.current.get(msg.id);
      if (order === undefined) {
        // New text message - assign next order index
        order = orderCounter.current++;
        textMessageOrders.current.set(msg.id, order);
      }

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: textContent,
        createdAt: new Date(),
        isVoice: false,
        orderIndex: order,
      };
    });

    // Combine with voice messages
    const combined: OrderedMessage[] = [...textMessages, ...voiceMessages];

    // Sort by order index (simple numeric comparison)
    return combined.sort((a, b) => a.orderIndex - b.orderIndex);
  }, [messages, voiceMessages]);

  return (
    <Card className="fixed bottom-20 right-6 w-[400px] h-[600px] flex flex-col shadow-2xl animate-slide-up z-50">
      <ChatHeader
        onMinimize={onMinimize}
        onClose={onClose}
        apiUrl={apiUrl}
        collegeId={collegeId}
        sessionId={sessionId}
        onVoiceTranscript={handleVoiceTranscript}
        chatHistory={allMessages}
      />
      <MessageList messages={allMessages} isLoading={isLoading} />
      <MessageInput 
        onSend={(msg) => onSendMessage(msg, voiceMessages)} 
        disabled={isLoading} 
      />
    </Card>
  );
}
