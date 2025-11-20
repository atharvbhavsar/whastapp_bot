import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@/types";
import { Bot, User, Search } from "lucide-react";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={cn(isUser ? "bg-primary" : "bg-muted")}>
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-muted-foreground" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%] space-y-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {message.parts.map((part, index) => {
          switch (part.type) {
            case "text":
              return (
                <p
                  key={index}
                  className="text-sm whitespace-pre-wrap break-words"
                >
                  {(part as any).text}
                </p>
              );

            // Handle our searchDocuments tool
            case "tool-searchDocuments": {
              const toolPart = part as any;
              const callId = toolPart.toolCallId;

              switch (toolPart.state) {
                case "input-streaming":
                  return (
                    <div
                      key={callId}
                      className="flex items-center gap-2 text-xs opacity-70"
                    >
                      <Loader size="sm" />
                      <span>Preparing search...</span>
                    </div>
                  );

                case "input-available":
                  return (
                    <div
                      key={callId}
                      className="flex items-center gap-2 text-xs opacity-70"
                    >
                      <Loader size="sm" />
                      <Search className="h-3 w-3" />
                      <span>
                        Searching documents for: "{toolPart.input.query}"
                      </span>
                    </div>
                  );

                case "output-available":
                  // Don't show anything - the AI will use this in its response
                  return null;

                case "output-error":
                  return (
                    <div
                      key={callId}
                      className="text-xs text-destructive opacity-70"
                    >
                      Error searching documents: {toolPart.errorText}
                    </div>
                  );
              }
              break;
            }

            // Handle dynamic tools if any
            case "dynamic-tool": {
              const dynamicPart = part as any;
              const callId = dynamicPart.toolCallId;

              switch (dynamicPart.state) {
                case "input-streaming":
                case "input-available":
                  return (
                    <div
                      key={callId}
                      className="flex items-center gap-2 text-xs opacity-70"
                    >
                      <Loader size="sm" />
                      <span>Processing {dynamicPart.toolName}...</span>
                    </div>
                  );

                case "output-available":
                  return null;

                case "output-error":
                  return (
                    <div
                      key={callId}
                      className="text-xs text-destructive opacity-70"
                    >
                      Error: {dynamicPart.errorText}
                    </div>
                  );
              }
              break;
            }

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
