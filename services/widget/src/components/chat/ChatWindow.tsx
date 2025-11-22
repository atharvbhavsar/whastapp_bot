import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { UIMessage, ChatMessage } from "@/types";

interface ChatWindowProps {
  messages: UIMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onMinimize: () => void;
  onClose: () => void;
  // Voice call props
  apiUrl?: string;
  collegeId?: string;
  sessionId?: string;
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
  // Store voice transcripts separately
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>([]);

  // Handler for voice transcripts coming from LiveKit
  const handleVoiceTranscript = useCallback((transcript: ChatMessage) => {
    setVoiceMessages((prev) => [...prev, transcript]);
  }, []);

  // Merge text messages (UIMessage) with voice messages (ChatMessage)
  // Sort by timestamp to maintain chronological order
  const allMessages = useMemo(() => {
    // Convert UIMessage to ChatMessage format
    const textMessages: ChatMessage[] = messages.map((msg) => {
      // Extract text content from parts
      const textContent = msg.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as any).text)
        .join("\n");

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: textContent,
        createdAt: new Date(), // UIMessage doesn't have timestamp, use current time
        isVoice: false,
      };
    });

    // Combine with voice messages
    const combined: ChatMessage[] = [...textMessages, ...voiceMessages];

    // Sort by createdAt timestamp
    return combined.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeA - timeB;
    });
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
      <MessageInput onSend={onSendMessage} disabled={isLoading} />
    </Card>
  );
}
