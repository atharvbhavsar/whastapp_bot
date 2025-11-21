import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@/types";
import { Bot, User, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

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
                <div
                  key={index}
                  className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      // Custom styling for markdown elements
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2 space-y-1">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-2 space-y-1">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="ml-2">{children}</li>
                      ),
                      code: ({ inline, children, ...props }: any) =>
                        inline ? (
                          <code
                            className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <code
                            className="block bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto"
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                      pre: ({ children }) => (
                        <pre className="mb-2 overflow-x-auto">{children}</pre>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80"
                        >
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-muted-foreground/20 pl-4 italic my-2">
                          {children}
                        </blockquote>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">
                          {children}
                        </h3>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="min-w-full divide-y divide-border">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="px-2 py-1 text-left text-xs font-semibold bg-muted/50">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-2 py-1 text-xs border-t border-border">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {(part as any).text}
                  </ReactMarkdown>
                </div>
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
