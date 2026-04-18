"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, CheckCheck, AlertTriangle, CheckCircle, TicketCheck, Zap, ThumbsUp } from "lucide-react";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import type { RealtimeNotification } from "@/hooks/useRealtimeNotifications";

const EVENT_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  REPORT_SUBMITTED:  { icon: <TicketCheck size={14} />, color: "#2563eb", label: "New complaint filed" },
  ME_TOO_ADDED:      { icon: <ThumbsUp size={14} />,   color: "#7c3aed", label: "Me Too added"        },
  STATUS_CHANGED:    { icon: <Zap size={14} />,         color: "#d97706", label: "Status updated"      },
  ISSUE_RESOLVED:    { icon: <CheckCircle size={14} />, color: "#16a34a", label: "Issue resolved"      },
  AUTO_ESCALATED:    { icon: <AlertTriangle size={14} />, color: "#dc2626", label: "Auto-escalated"   },
  DISPUTE_RAISED:    { icon: <AlertTriangle size={14} />, color: "#ea580c", label: "Dispute raised"   },
};

function getEventMeta(eventType: string) {
  return EVENT_ICONS[eventType] ?? { icon: <Bell size={14} />, color: "#6b7280", label: eventType.replace(/_/g, " ") };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, markRead } = useRealtimeNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen((o) => !o); if (open) markAllRead(); }}
        title="Live Notifications"
        style={{
          position: "relative", background: "none", border: "1px solid #e2e8f0",
          borderRadius: "10px", padding: "0.45rem 0.6rem", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.35rem",
          color: "#374151", fontSize: "0.8rem", fontWeight: 500,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as any).style.background = "#f1f5f9"; }}
        onMouseLeave={e => { (e.currentTarget as any).style.background = "none"; }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "-6px", right: "-6px",
            background: "#dc2626", color: "white", borderRadius: "50%",
            width: "18px", height: "18px", fontSize: "0.65rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid white",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span style={{ fontSize: "0.75rem" }}>Live</span>
        {/* Pulse dot: always visible if subscribed */}
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#16a34a", display: "inline-block",
          boxShadow: "0 0 0 2px rgba(22,163,74,0.3)",
          animation: "pulse 2s infinite",
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "360px", maxHeight: "480px",
          background: "white", borderRadius: "14px",
          border: "1px solid #e2e8f0", boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 9998,
          animation: "slideDown 0.18s ease",
        }}>
          {/* Header */}
          <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>Live Updates</div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Supabase Realtime · Pub/Sub</div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {notifications.length > 0 && (
                <button onClick={markAllRead} title="Mark all read"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
                  <CheckCheck size={16} />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                <Bell size={28} style={{ margin: "0 auto 0.5rem", opacity: 0.3, display: "block" }} />
                Waiting for live events...
              </div>
            ) : (
              notifications.map((n) => {
                const meta = getEventMeta(n.event_type);
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid #f8fafc",
                      display: "flex", gap: "0.75rem", alignItems: "flex-start",
                      background: n.read ? "white" : "#f0f9ff",
                      cursor: "pointer", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = "#f8fafc"; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = n.read ? "white" : "#f0f9ff"; }}
                  >
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
                      background: `${meta.color}15`, color: meta.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: n.read ? 500 : 700, fontSize: "0.82rem", color: "#1e293b" }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Complaint #{n.master_id?.substring(0, 8)}
                        {n.metadata?.level ? ` · Level ${n.metadata.level} escalation` : ""}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "3px" }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.read && (
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", flexShrink: 0, marginTop: "6px" }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(22,163,74,0.3); }
          50%       { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
        }
      `}</style>
    </div>
  );
}
