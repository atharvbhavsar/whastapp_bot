import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface SuggestionProps {
  suggestion: string;
  onClick: (suggestion: string) => void;
  className?: string;
}

export function Suggestion({
  suggestion,
  onClick,
  className,
}: SuggestionProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onClick(suggestion)}
      className={cn(
        "h-auto py-2 px-3 text-xs font-normal text-left whitespace-normal",
        "bg-background hover:bg-accent hover:text-accent-foreground",
        "border-dashed border-muted-foreground/30 hover:border-primary/50",
        "transition-all duration-200 ease-in-out",
        "max-w-full",
        className
      )}
    >
      <span className="line-clamp-2">{suggestion}</span>
    </Button>
  );
}

interface SuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

export function Suggestions({
  suggestions,
  onSuggestionClick,
  className,
}: SuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 animate-fade-in",
        "border-t border-border/50 bg-muted/30",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Suggested follow-ups</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Suggestion
            key={`${suggestion}-${index}`}
            suggestion={suggestion}
            onClick={onSuggestionClick}
          />
        ))}
      </div>
    </div>
  );
}
