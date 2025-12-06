import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VoiceCallButton } from "@/components/voice/VoiceCallButton";
import type { ChatMessage } from "@/types";

interface ChatHeaderProps {
  // Voice call props
  apiUrl?: string;
  collegeId?: string;
  sessionId?: string;
  onVoiceTranscript?: (transcript: ChatMessage) => void;
  chatHistory?: ChatMessage[]; // Pass for voice context
}

export function ChatHeader({
  apiUrl,
  collegeId,
  sessionId,
  onVoiceTranscript,
  chatHistory,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 text-white">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-lg">College Assistant</h2>
        <Badge
          variant="secondary"
          className="text-xs bg-white/20 text-white border-none"
        >
          Online
        </Badge>
      </div>
      <div className="flex items-center gap-2">
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
          </>
        )}
      </div>
    </div>
  );
}
