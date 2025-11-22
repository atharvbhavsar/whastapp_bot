import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import type { ChatMessage } from "@/types";

interface VoiceCallButtonProps {
  apiUrl: string;
  collegeId: string;
  sessionId: string;
  onTranscript?: (transcript: ChatMessage) => void;
  chatHistory?: ChatMessage[]; // Pass existing text chat for context
}

export function VoiceCallButton({
  apiUrl,
  collegeId,
  sessionId,
  onTranscript,
  chatHistory,
}: VoiceCallButtonProps) {
  const {
    isConnecting,
    isConnected,
    error,
    isMuted,
    isAgentSpeaking,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceCall({ apiUrl, collegeId, sessionId, chatHistory }, onTranscript);

  return (
    <div className="flex items-center gap-2">
      {/* Call/Hang Up Button */}
      <Button
        variant={isConnected ? "destructive" : "default"}
        size="icon"
        onClick={isConnected ? disconnect : connect}
        disabled={isConnecting}
        title={isConnected ? "End Call" : "Start Voice Call"}
      >
        {isConnecting ? (
          <span className="animate-spin">⏳</span>
        ) : isConnected ? (
          <PhoneOff className="h-5 w-5" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </Button>

      {/* Mute Button (only visible when connected) */}
      {isConnected && (
        <Button
          variant={isMuted ? "secondary" : "outline"}
          size="icon"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Agent Speaking Indicator */}
      {isAgentSpeaking && (
        <Badge variant="secondary" className="animate-pulse">
          AI Speaking...
        </Badge>
      )}

      {/* Error Display */}
      {error && (
        <span
          className="text-xs text-red-500 max-w-[200px] truncate"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}
