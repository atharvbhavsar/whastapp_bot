"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface RealtimeNotification {
  id: string;
  master_id: string;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
  read: boolean;
}

/**
 * Feature 6: Pub/Sub Realtime Notifications
 *
 * Subscribes to Supabase Realtime on the complaint_events table.
 * Any INSERT (status change, escalation, resolution, Me Too) is
 * pushed instantly to every connected client — no polling needed.
 *
 * Usage:
 *   const { notifications, unreadCount, markAllRead } = useRealtimeNotifications();
 */
export function useRealtimeNotifications(tenantId?: string) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to ALL new complaint_events
    const channel = supabase
      .channel("civic-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaint_events",
        },
        (payload) => {
          const newEvent = payload.new as any;

          const notification: RealtimeNotification = {
            id: newEvent.id,
            master_id: newEvent.master_id,
            event_type: newEvent.event_type,
            metadata: newEvent.metadata ?? {},
            created_at: newEvent.created_at,
            read: false,
          };

          setNotifications((prev) => [notification, ...prev].slice(0, 50)); // keep last 50
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return { notifications, unreadCount, markAllRead, markRead };
}
