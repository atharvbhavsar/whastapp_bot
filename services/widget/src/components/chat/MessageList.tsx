import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import type { UIMessage } from "@/types";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or are streaming
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    };

    // Use a small delay to ensure DOM has updated with new content
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  // Also scroll when message content changes (streaming)
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    };

    // Monitor for content changes more frequently during streaming
    const intervalId = setInterval(() => {
      if (
        isLoading ||
        messages.some((msg) =>
          msg.parts?.some((part) => (part as any).state === "input-streaming")
        )
      ) {
        scrollToBottom();
      }
    }, 300);

    return () => clearInterval(intervalId);
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <p>Start a conversation...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-4" ref={scrollAreaRef}>
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        {/* Invisible div at the end to scroll to */}
        <div ref={messagesEndRef} className="h-0" />
      </div>
    </ScrollArea>
  );
}
