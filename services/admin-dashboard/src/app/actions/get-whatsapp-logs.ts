"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface WhatsappLogItem {
  id: string;
  user_phone: string;
  message_received: string;
  ai_reply: string;
  media_url?: string;
  created_at: string;
}

export async function getWhatsappLogs(): Promise<{ success: boolean; data?: WhatsappLogItem[]; error?: string }> {
  try {
    const supabase = await createClient();

    // Query logs, order by most recent
    const { data, error } = await supabaseAdmin
      .from("whatsapp_logs")
      .select("*")
      .order("created_at", { ascending: false });

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
