"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface TrackComplaintResponse {
  success: boolean;
  data?: {
    master_id: string;
    category: string;
    description: string;
    current_status: string;
    priority_score: number;
    department_id: string;
    zone_id: string;
    timeline: {
      event_type: string;
      created_at: string;
      metadata: any;
    }[];
  };
  error?: string;
}

export async function trackCivicComplaint(
  idOrMasterId: string
): Promise<TrackComplaintResponse> {
  try {
    const supabase = await createClient();

    // 1. Fetch master info - the ID might be a report ID or a master ID
    // We try to find the master first
    let master: any = null;

    const { data: masterData, error: mError } = await supabaseAdmin
      .from("complaints_master")
      .select("*")
      .eq("id", idOrMasterId)
      .maybeSingle();

    master = masterData;
    
    // If not found, maybe it's a child report ID. Fetch the report to get the master.
    if (!master) {
      const { data: reportData, error: rError } = await supabaseAdmin
        .from("complaint_reports")
        .select("master_id")
        .eq("id", idOrMasterId)
        .maybeSingle();
      
      if (reportData?.master_id) {
         const { data: mData } = await supabaseAdmin
          .from("complaints_master")
          .select("*")
          .eq("id", reportData.master_id)
          .single();
         master = mData;
      }
    }

    if (!master) {
      return { success: false, error: "Complaint not found. Please verify the ID." };
    }

    // 2. Fetch Timeline Events
    const { data: events, error: eventError } = await supabaseAdmin
      .from("complaint_events")
      .select("event_type, created_at, metadata")
      .eq("master_id", master.id)
      .order("created_at", { ascending: true });

    if (eventError) {
      console.error("Event fetch error", eventError);
    }

    // 3. Assemble Response
    return {
      success: true,
      data: {
        master_id: master.id,
        category: master.category,
        description: master.description,
        current_status: master.status,
        priority_score: master.priority_score,
        department_id: master.department_id,
        zone_id: master.zone_id,
        timeline: events || []
      }
    };
  } catch (error: any) {
    console.error("Tracking error", error);
    return { success: false, error: error.message };
  }
}
