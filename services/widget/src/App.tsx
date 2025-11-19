import { useEffect } from "react";
import { ChatWindow } from "./components/chat/ChatWindow";
import { FloatingButton } from "./components/FloatingButton";
import { useChat } from "./hooks/useChat";
import { useWidgetState } from "./hooks/useWidgetState";
import type { WidgetInitOptions } from "./types";

interface AppProps {
  config?: WidgetInitOptions;
}

function App({ config }: AppProps = {}) {
  const { isOpen, hasUnread, toggleOpen, close, markAsUnread } =
    useWidgetState();

  const { messages, sendMessage, isLoading } = useChat({
    collegeId: config?.collegeId,
    apiEndpoint: config?.apiEndpoint,
    onError: (err) => {
      console.error("Chat error:", err);
      alert(
        `Error: ${err.message}. Make sure Phase 1 API is running on ${
          config?.apiEndpoint || "http://localhost:3000"
        }`
      );
    },
    onFinish: (message) => {
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

  const handleSendMessage = (content: string) => {
    sendMessage(content);
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
            <h2 className="text-xl font-semibold mb-2">✅ Phase 2B Complete</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>✅ Beautiful Shadcn UI chat interface</li>
              <li>✅ Real-time SSE streaming from Phase 1 API</li>
              <li>✅ Session management with localStorage</li>
              <li>✅ Custom useChat hook for API integration</li>
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
                Make sure Phase 1 API is running on{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  http://localhost:3000
                </code>
              </li>
              <li>Click the chat button in the bottom-right corner</li>
              <li>Send a message and watch it stream in real-time!</li>
              <li>Try multiple languages - Hindi, Tamil, or English</li>
              <li>Close and reopen - your chat history persists</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Chat widget */}
      {isOpen && (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onMinimize={handleMinimize}
          onClose={handleClose}
        />
      )}

      <FloatingButton onClick={handleToggle} unreadCount={hasUnread ? 1 : 0} />
    </div>
  );
}

export default App;
