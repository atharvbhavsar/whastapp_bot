export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex items-center gap-1 px-4 py-3 bg-muted rounded-lg">
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    </div>
  );
}
