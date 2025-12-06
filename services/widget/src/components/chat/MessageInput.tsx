import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAnimatedPlaceholder } from "@/hooks/useAnimatedPlaceholder";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  hasMessages?: boolean;
  isLoading?: boolean;
}

export function MessageInput({
  onSend,
  disabled,
  hasMessages = false,
  isLoading = false,
}: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { placeholder, currentIndex } = useAnimatedPlaceholder();

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white border-t border-gray-100"
    >
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasMessages ? "Type your message..." : placeholder}
          disabled={disabled}
          rows={1}
          className={`flex-1 resize-none rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 max-h-[120px] overflow-y-auto ${
            !hasMessages ? "placeholder:animate-placeholder-fade" : ""
          }`}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !input.trim()}
          className="bg-[#2563eb] text-white hover:bg-[#1e3a5f] rounded-full"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}
