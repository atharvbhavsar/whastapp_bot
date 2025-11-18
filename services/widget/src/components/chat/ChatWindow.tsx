import { Card } from "@/components/ui/card";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { Message } from "@/types";

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onMinimize: () => void;
  onClose: () => void;
}

export function ChatWindow({
  messages,
  isLoading,
  onSendMessage,
  onMinimize,
  onClose,
}: ChatWindowProps) {
  return (
    <Card className="fixed bottom-20 right-6 w-[400px] h-[600px] flex flex-col shadow-2xl animate-slide-up z-50">
      <ChatHeader onMinimize={onMinimize} onClose={onClose} />
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSend={onSendMessage} disabled={isLoading} />
    </Card>
  );
}
