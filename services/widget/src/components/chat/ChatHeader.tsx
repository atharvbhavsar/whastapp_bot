import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, X } from "lucide-react";
import { VoiceCallButton } from "@/components/voice/VoiceCallButton";
import type { ChatMessage } from "@/types";

interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
  // Voice call props
  apiUrl?: string;
  collegeId?: string;
  sessionId?: string;
  onVoiceTranscript?: (transcript: ChatMessage) => void;
  chatHistory?: ChatMessage[]; // Pass for voice context
}

export function ChatHeader({
  onMinimize,
  onClose,
  apiUrl,
  collegeId,
  sessionId,
  onVoiceTranscript,
  chatHistory,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-lg">College Assistant</h2>
        <Badge variant="secondary" className="text-xs">
          Online
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        {/* Voice call button - only show if all required props are provided */}
        {apiUrl && collegeId && sessionId && onVoiceTranscript && (
          <>
            <VoiceCallButton
              apiUrl={apiUrl}
              collegeId={collegeId}
              sessionId={sessionId}
              onTranscript={onVoiceTranscript}
              chatHistory={chatHistory}
            />
            <Separator orientation="vertical" className="h-6 mx-1" />
          </>
        )}
        <Button variant="ghost" size="icon" onClick={onMinimize}>
          <Minus className="h-4 w-4" />
          <span className="sr-only">Minimize</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </div>
  );
}
