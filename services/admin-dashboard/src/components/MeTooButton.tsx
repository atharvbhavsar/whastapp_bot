"use client";

import { useState } from "react";
import { ThumbsUp, Loader2 } from "lucide-react";
import { meTooComplaint } from "@/app/actions/me-too-complaint";

interface MeTooButtonProps {
  masterId: string;
  initialCount?: number;
  reportCount?: number;
}

export function MeTooButton({ masterId, initialCount = 0, reportCount = 1 }: MeTooButtonProps) {
  const [count, setCount] = useState(reportCount);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (voted || loading) return;
    setLoading(true);
    setError(null);

    const result = await meTooComplaint({ master_id: masterId });
    setLoading(false);

    if (result.success) {
      setVoted(true);
      setCount(result.new_report_count ?? count + 1);
    } else {
      setError(result.error ?? "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={handleClick}
        disabled={voted || loading}
        title={voted ? "You already supported this" : "I'm also affected by this issue"}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
          border transition-all duration-200 select-none
          ${voted
            ? "bg-blue-600 text-white border-blue-600 cursor-default"
            : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400 cursor-pointer"
          }
          ${loading ? "opacity-70" : ""}
        `}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ThumbsUp className={`h-3 w-3 ${voted ? "fill-white" : ""}`} />
        )}
        <span>{voted ? "Supported!" : "Me Too"}</span>
        <span className={`font-bold ${voted ? "text-blue-100" : "text-blue-800"}`}>
          {count}
        </span>
      </button>
      {error && <p className="text-red-500 text-[10px] mt-0.5">{error}</p>}
    </div>
  );
}
