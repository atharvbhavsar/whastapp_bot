import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { User, Search, Mic, Globe, TicketCheck, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Sources, type Source } from "./Sources";

interface MessageBubbleProps {
  message: ChatMessage;
  isFullscreen?: boolean;
}

export function MessageBubble({
  message,
  isFullscreen = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isVoice = message.isVoice || false;

  // Check if message has parts (UIMessage format) or just content (ChatMessage format)
  const hasParts = "parts" in message && Array.isArray(message.parts);

  // Extract web sources from webSearch tool output for rendering
  const webSources: Source[] = hasParts
    ? (message as any).parts
        .filter(
          (part: any) =>
            part.type === "tool-webSearch" && part.state === "output-available"
        )
        .flatMap(
          (part: any) =>
            part.output?.sources?.map((s: any) => ({
              title: s.title || "Untitled",
              url: s.url,
            })) || []
        )
    : [];

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm border border-gray-100">
        {isUser ? (
          <AvatarFallback className="bg-blue-600">
            <User className="h-4 w-4 text-white" />
          </AvatarFallback>
        ) : (
          <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center rounded-full border border-blue-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
        )}
      </Avatar>

      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 space-y-2 shadow-sm text-[15px] leading-relaxed",
          isFullscreen ? "max-w-[70%]" : "max-w-[85%]",
          isUser ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
        )}
        style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
      >
        {/* Voice indicator badge */}
        {isVoice && (
          <div className="flex items-center gap-1 mb-1 opacity-70">
            <Mic className="h-3 w-3" />
            <span className="text-xs">Voice message</span>
          </div>
        )}

        {/* Render simple content for ChatMessage (voice transcripts) */}
        {!hasParts && message.content && (
          <div className="text-sm leading-relaxed">
            <p className="mb-0 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        )}

        {/* Render parts for UIMessage (text chat from Vercel AI SDK) */}
        {hasParts &&
          (message as any).parts.map((part: any, index: number) => {
            switch (part.type) {
              case "text":
                return (
                  <div
                    key={index}
                    className="text-sm break-words"
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-3 last:mb-0 leading-relaxed text-inherit">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="my-3 ml-5 list-disc space-y-1 marker:text-current">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="my-3 ml-5 list-decimal space-y-1 marker:text-current">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="pl-1 text-inherit">{children}</li>
                        ),
                        code: ({ inline, children, ...props }: any) =>
                          inline ? (
                            <code
                              className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono text-inherit"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <div className="relative my-4 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm">
                              <div className="flex px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 items-center">
                                <div className="flex space-x-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                </div>
                              </div>
                              <pre className="p-4 overflow-x-auto">
                                <code className="text-[0.85em] font-mono text-slate-50" {...props}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline decoration-current/40 underline-offset-2 hover:decoration-current transition-colors break-all"
                          >
                            {children}
                          </a>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-inherit">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-inherit">{children}</em>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="my-3 border-l-4 border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 px-4 py-3 rounded-r-lg italic text-inherit">
                            {children}
                          </blockquote>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-xl font-semibold mb-3 mt-5 first:mt-0 text-inherit tracking-tight">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold mb-3 mt-4 first:mt-0 text-inherit tracking-tight">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-medium mb-2 mt-4 first:mt-0 text-inherit tracking-tight">{children}</h3>
                        ),
                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
                            <table className="w-full text-sm text-left">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-black/5 dark:bg-white/5 uppercase text-xs font-semibold">{children}</thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="divide-y divide-black/5 dark:divide-white/5">{children}</tbody>
                        ),
                        th: ({ children }) => (
                          <th className="px-4 py-3">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-3">{children}</td>
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

              // Handle webSearch tool for web search fallback
              case "tool-webSearch": {
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
                        <Globe className="h-3 w-3" />
                        <span>Preparing web search...</span>
                      </div>
                    );

                  case "input-available":
                    return (
                      <div
                        key={callId}
                        className="flex items-center gap-2 text-xs opacity-70"
                      >
                        <Loader size="sm" />
                        <Globe className="h-3 w-3" />
                        <span>Searching the web...</span>
                      </div>
                    );

                  case "output-available":
                    // Sources are rendered separately at the end via webSources
                    return null;

                  case "output-error":
                    return (
                      <div
                        key={callId}
                        className="text-xs text-destructive opacity-70"
                      >
                        Web search failed: {toolPart.errorText}
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

              // Handle escalateToHuman tool - show ticket raised confirmation
              case "tool-escalateToHuman": {
                const toolPart = part as any;
                const callId = toolPart.toolCallId;

                switch (toolPart.state) {
                  case "input-streaming":
                  case "input-available":
                    return (
                      <div
                        key={callId}
                        className="flex items-center gap-2 text-xs opacity-70"
                      >
                        <Loader size="sm" />
                        <TicketCheck className="h-3 w-3" />
                        <span>Creating support ticket...</span>
                      </div>
                    );

                  case "output-available":
                    // Show the escalation confirmation
                    return (
                      <div
                        key={callId}
                        className="mt-3 pt-3 border-t border-border"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                          <TicketCheck className="h-4 w-4" />
                          <span>Your ticket has been raised.</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          A college administrator will contact you soon.
                        </p>
                      </div>
                    );

                  case "output-error":
                    return (
                      <div
                        key={callId}
                        className="text-xs text-destructive opacity-70"
                      >
                        Failed to create ticket: {toolPart.errorText}
                      </div>
                    );
                }
                break;
              }

              default:
                return null;
            }
          })}

        {/* Render web sources at the end of the message */}
        {webSources.length > 0 && <Sources sources={webSources} />}
      </div>
    </div>
  );
}
