import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Zap,
  Trash2,
  Droplets,
  Search,
  Phone,
  MapPin,
  HardHat,
} from "lucide-react";

interface TopicSuggestion {
  text: string;
  icon: React.ReactNode;
}

const TOPIC_SUGGESTIONS: TopicSuggestion[] = [
  {
    text: "Report a pothole or road damage",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    text: "Streetlight not working",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    text: "Garbage not collected",
    icon: <Trash2 className="h-4 w-4" />,
  },
  {
    text: "Water supply issue or leakage",
    icon: <Droplets className="h-4 w-4" />,
  },
  {
    text: "Track my existing complaint",
    icon: <Search className="h-4 w-4" />,
  },
  {
    text: "Find issues reported near me",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    text: "Is government work ongoing nearby?",
    icon: <HardHat className="h-4 w-4" />,
  },
  {
    text: "How does this system work?",
    icon: <Phone className="h-4 w-4" />,
  },
];


interface InitialSuggestionsProps {
  onTopicClick: (topic: string) => void;
  className?: string;
}

export function InitialSuggestions({
  onTopicClick,
  className,
}: InitialSuggestionsProps) {
  return (
    <div className={cn("w-full mt-2 animate-fade-in", className)}>
      <div className="flex flex-wrap gap-2 items-start">
        {TOPIC_SUGGESTIONS.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onTopicClick(suggestion.text)}
            className={cn(
              "h-auto py-1.5 px-3 text-left inline-flex items-center gap-2 flex-shrink-0",
              "bg-white text-gray-700 hover:bg-[#FFF4E1] hover:text-[#004aad]",
              "border border-gray-200 hover:border-[#004aad]/50",
              "transition-all duration-200 ease-in-out rounded-full",
              "shadow-sm w-auto"
            )}
          >
            <div className="flex-shrink-0 text-[#004aad]">
              {suggestion.icon}
            </div>
            <span className="text-xs font-normal">{suggestion.text}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
