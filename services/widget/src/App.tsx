import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatWindow } from "./components/chat/ChatWindow";
import { FloatingButton } from "./components/FloatingButton";
import { useWidgetState } from "./hooks/useWidgetState";
import { API_ENDPOINT, API_BASE_URL } from "./lib/constants";
import { getSessionId } from "./lib/session";
import type { WidgetInitOptions, ChatMessage } from "./types";

interface AppProps {
  config?: WidgetInitOptions;
}

function App({ config }: AppProps = {}) {
  const { isOpen, hasUnread, toggleOpen, close, markAsUnread } =
    useWidgetState();

  // Store voice history to include in text chat requests
  const voiceHistoryRef = useRef<ChatMessage[]>([]);

  // ✅ v5: Use DefaultChatTransport with proper configuration
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: config?.apiEndpoint || API_ENDPOINT,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        collegeId: config?.collegeId,
      },
      credentials: "include",
      // Include voice history in every request
      prepareSendMessagesRequest: ({ messages, id }) => {
        return {
          body: {
            messages,
            id,
            collegeId: config?.collegeId,
            // Pass voice history so text AI has context from voice conversations
            voiceHistory: voiceHistoryRef.current.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
          },
        };
      },
    }),
    onError: (err) => {
      console.error("Chat error:", err);
      alert(
        `Error: ${err.message}. Make sure AI service is running on ${
          config?.apiEndpoint || API_ENDPOINT
        }`
      );
    },
    onFinish: ({ message }) => {
      // ✅ v5: onFinish receives an object with message property
      // Mark as unread if widget is closed when message arrives
      if (!isOpen && message.role === "assistant") {
        markAsUnread();
      }
    },
  });

  // Add initial greeting message if no messages exist
  useEffect(() => {
    if (messages.length === 0) {
      // Note: In a real implementation, you might want to add a greeting
      // without calling the API, or handle this differently
    }
  }, [messages.length]);

  const handleSendMessage = (content: string, voiceHistory?: ChatMessage[]) => {
    // Update voice history ref before sending message
    if (voiceHistory) {
      voiceHistoryRef.current = voiceHistory;
    }
    // ✅ v5: Use sendMessage with text field
    sendMessage({ text: content });
  };

  const handleToggle = () => toggleOpen();
  const handleMinimize = () => close();
  const handleClose = () => close();

  return (
    <div className="min-h-screen bg-background">
      {/* Demo page content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-4">
          College Chatbot Widget - Phase 2B
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Click the button in the bottom-right to chat with the AI assistant
        </p>

        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-2">
              ✅ Phase 2B + RAG Complete
            </h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>✅ Beautiful Shadcn UI chat interface</li>
              <li>✅ Real-time streaming with AI SDK v5</li>
              <li>✅ RAG with Supabase vector search</li>
              <li>✅ Tool calling for document retrieval</li>
              <li>✅ Error handling and loading states</li>
              <li>✅ Multilingual support (auto-detect)</li>
              <li>✅ Chat history persistence</li>
              <li>✅ Smooth animations and transitions</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-2">🚀 How to Use</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                Make sure AI service is running on{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  http://localhost:3000
                </code>
              </li>
              <li>Click the chat button in the bottom-right corner</li>
              <li>Send a message and watch it stream in real-time!</li>
              <li>Try questions about "demo-college" documents</li>
              <li>Close and reopen - your chat history persists</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Chat widget */}
      {isOpen && (
        <ChatWindow
          messages={messages}
          isLoading={status === "streaming"} // ✅ v5: Use status === "streaming"
          onSendMessage={handleSendMessage}
          onMinimize={handleMinimize}
          onClose={handleClose}
          // Voice call props - use base URL without /api/chat path
          apiUrl={
            config?.apiEndpoint
              ? config.apiEndpoint.replace("/api/chat", "")
              : API_BASE_URL
          }
          collegeId={config?.collegeId}
          sessionId={getSessionId()}
        />
      )}

      <FloatingButton onClick={handleToggle} unreadCount={hasUnread ? 1 : 0} />
    </div>
  );
}

export default App;
