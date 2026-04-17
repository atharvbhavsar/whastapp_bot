"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface SupportComplaintParams {
  master_id: string;
  reporter_id: string;
  transcript_or_text?: string;
  latitude: number;
  longitude: number;
}

export interface SupportComplaintResponse {
  success: boolean;
  data?: {
    master_id: string;
    new_priority_score?: number;
    message: string;
  };
  error?: string;
}

export async function supportCivicComplaint(
  params: SupportComplaintParams
): Promise<SupportComplaintResponse> {
  try {
    const supabase = await createClient();

    // 1. Fetch master to ensure it exists and is open
    const { data: master, error: masterError } = await supabaseAdmin
      .from("complaints_master")
      .select("id, status")
      .eq("id", params.master_id)
      .single();

    if (masterError || !master) {
      return { success: false, error: "Primary complaint not found." };
    }

    if (master.status === "resolved" || master.status === "closed") {
      return { success: false, error: "Cannot support a resolved or closed complaint." };
    }

    // 2. Insert new user report. The DB trigger will auto-upgrade the priority score.
    const { error: reportError } = await supabaseAdmin
      .from("complaint_reports")
      .insert({
        master_id: params.master_id,
        reporter_id: params.reporter_id,
        media_type: "text", // "Me Too" is treated as a text/support report
        transcript_or_text: params.transcript_or_text || "Me Too support action.",
        latitude: params.latitude,
        longitude: params.longitude,
      });

    if (reportError) {
      console.error("Support insert error", reportError);
      return { success: false, error: reportError.message };
    }

    // 3. Log Event
    await supabaseAdmin
      .from("complaint_events")
      .insert({
        master_id: params.master_id,
        event_type: "SUPPORT_ADDED",
        actor_id: params.reporter_id,
      });

    // 4. Fetch the newly recalculated priority score to return it
    const { data: updatedMaster } = await supabaseAdmin
      .from("complaints_master")
      .select("priority_score")
      .eq("id", params.master_id)
      .single();

    return {
      success: true,
      data: {
        master_id: params.master_id,
        new_priority_score: updatedMaster?.priority_score,
        message: "Support successfully recorded. Priority elevated."
      }
    };
  } catch (error: any) {
    console.error("Support action error", error);
    return { success: false, error: error.message };
  }
}
