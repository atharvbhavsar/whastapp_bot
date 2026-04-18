"use server";

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Feature 5: "Me Too" — Citizen solidarity vote on an existing complaint.
 *
 * Adds a new complaint_report to the master (triggering priority recalculation
 * via the DB trigger recalculate_master_priority), so the cluster priority
 * automatically increases with each Me Too.
 */
export async function meTooComplaint(params: {
  master_id: string;
  reporter_id?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  try {
    // Fetch master to inherit its location/category
    const { data: master, error: masterErr } = await supabaseAdmin
      .from("complaints_master")
      .select("id, category, latitude, longitude, department_id")
      .eq("id", params.master_id)
      .single();

    if (masterErr || !master) {
      return { success: false, error: "Complaint not found" };
    }

    const reporterId = params.reporter_id || "00000000-0000-0000-0000-000000000000";

    // Insert a new report — the DB trigger auto-recalculates priority_score
    const { error: reportErr } = await supabaseAdmin
      .from("complaint_reports")
      .insert({
        master_id: params.master_id,
        reporter_id: reporterId,
        media_type: "text",
        transcript_or_text: `[Me Too] Citizen confirmed: "${master.category}" issue still present.`,
        latitude: params.latitude ?? master.latitude,
        longitude: params.longitude ?? master.longitude,
        device_language: "en",
      });

    if (reportErr) {
      return { success: false, error: reportErr.message };
    }

    // Write event log
    await supabaseAdmin.from("complaint_events").insert({
      master_id: params.master_id,
      event_type: "ME_TOO_ADDED",
      actor_id: reporterId,
      metadata: { source: "citizen_dashboard" },
    });

    // Fetch updated report count
    const { count } = await supabaseAdmin
      .from("complaint_reports")
      .select("*", { count: "exact", head: true })
      .eq("master_id", params.master_id);

    return {
      success: true,
      message: "Your support has been added. Priority of this complaint has increased.",
      new_report_count: count ?? 1,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
