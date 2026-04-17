"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Fetch chatbot & voice agent analytics for a given city tenant.
 * Used by the Knowledge Management Dashboard to show:
 * - Total chatbot sessions (chat + voice)
 * - Sessions that resulted in complaint submissions
 * - Top questions asked by citizens
 * - Channel breakdown (chat vs voice vs widget)
 */
export async function getChatAnalytics(tenantId: string) {
  const supabase = await createClient();

  // Total sessions
  const { count: totalSessions } = await supabase
    .from("chat_sessions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  // Sessions that resulted in a complaint
  const { count: complaintsViaChat } = await supabase
    .from("chat_sessions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("complaint_submitted", true);

  // Channel breakdown
  const { data: channelData } = await supabase
    .from("chat_sessions")
    .select("channel")
    .eq("tenant_id", tenantId);

  const channelBreakdown = (channelData || []).reduce(
    (acc: Record<string, number>, row: { channel: string }) => {
      acc[row.channel] = (acc[row.channel] || 0) + 1;
      return acc;
    },
    {}
  );

  // Recent sessions (last 10)
  const { data: recentSessions } = await supabase
    .from("chat_sessions")
    .select("session_id, channel, citizen_email, complaint_submitted, complaint_public_id, started_at")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(10);

  return {
    totalSessions: totalSessions || 0,
    complaintsViaChat: complaintsViaChat || 0,
    chatConversionRate: totalSessions
      ? Math.round(((complaintsViaChat || 0) / totalSessions) * 100)
      : 0,
    channelBreakdown,
    recentSessions: recentSessions || [],
  };
}
