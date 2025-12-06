export function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex items-center gap-1 px-4 py-3 bg-blue-100 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
      </div>
    </div>
  );
}
