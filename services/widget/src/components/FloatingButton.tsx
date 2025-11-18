import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export function FloatingButton({
  onClick,
  unreadCount = 0,
}: FloatingButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl",
          "hover:scale-110 transition-transform duration-200",
          "animate-pulse"
        )}
        onClick={onClick}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
        <span className="sr-only">Open chat</span>
      </Button>
    </div>
  );
}
