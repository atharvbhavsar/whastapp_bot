import { Minimize2, X, SquareArrowOutUpRight, Minimize } from "lucide-react";

interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export function ChatHeader({
  onMinimize,
  onClose,
  onToggleFullscreen,
  isFullscreen = false,
}: ChatHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between relative px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-600 shadow-md z-10">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center p-2 backdrop-blur-sm shadow-sm ring-1 ring-white/30">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
             >
               <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          <div className="flex flex-col">
            <h2 className="font-bold text-base text-white tracking-wide">
              SCIRP+ Assistant
            </h2>
            <p className="text-xs text-blue-100 font-medium">
              Civic Intelligence Platform
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Expand"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-white" />
              ) : (
                <SquareArrowOutUpRight className="h-4 w-4 text-white" />
              )}
            </button>
          )}
          <button
            onClick={onMinimize}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Minimize chat"
          >
            <Minimize2 className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/80 rounded-full transition-colors"
            aria-label="Close chat"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
