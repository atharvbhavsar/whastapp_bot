"use server";

import { supabaseAdmin } from "@/lib/supabase";

export interface WhatsappLogItem {
  id: string;
  user_phone: string;
  message_received: string;
  ai_reply: string;
  media_url?: string;
  created_at: string;
  city_slug?: string;
}

export async function getWhatsappLogs(citySlug?: string, limit = 50): Promise<{ success: boolean; data?: WhatsappLogItem[]; error?: string }> {
  try {
    let query = supabaseAdmin
      .from("whatsapp_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (citySlug) {
      query = query.eq("city_slug", citySlug);
    }

    const { data, error } = await query;

    if (error) {
      console.error("WhatsApp logs fetch error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as WhatsappLogItem[]
    };
  } catch (err: any) {
    console.error("Unexpected error in whatsapp logs fetch:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
