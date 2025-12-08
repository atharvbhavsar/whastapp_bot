interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
}

export function ChatHeader({ onMinimize, onClose }: ChatHeaderProps) {
  return (
    <>
      <div
        className="flex items-center justify-center px-4 py-4"
        style={{
          background: "#FFF4E1",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Camel icon - bigger */}
          <div className="w-14 h-14 flex-shrink-0">
            <img
              src="https://sih-widget.vercel.app/chatbot-icon.webp"
              alt="CampusSetu"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Title and subtitle */}
          <div className="flex flex-col">
            <h2 className="font-bold text-lg text-[#004aad] leading-tight">
              CampusSetu
            </h2>
            <p className="text-sm text-gray-700 leading-tight">
              Rajasthan Education Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Separator line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#004aad] to-transparent shadow-sm" />
    </>
  );
}
