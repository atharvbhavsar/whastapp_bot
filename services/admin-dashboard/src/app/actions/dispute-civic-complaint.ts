"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ComplaintStatus, StatusEngine, ActorRole } from "@/lib/status-machine";

export interface DisputeComplaintParams {
  master_id: string;
  reporter_id: string;
  reason: string;
}

export interface DisputeComplaintResponse {
  success: boolean;
  data?: {
    master_id: string;
    new_status: string;
    message: string;
  };
  error?: string;
}

export async function disputeCivicComplaint(
  params: DisputeComplaintParams
): Promise<DisputeComplaintResponse> {
  try {
    const supabase = await createClient();

    // 1. Fetch current complaint master
    const { data: master, error: masterError } = await supabaseAdmin
      .from("complaints_master")
      .select("status, department_id")
      .eq("id", params.master_id)
      .single();

    if (masterError || !master) {
      return { success: false, error: masterError?.message || "Complaint not found" };
    }

    // 2. State machine validation (RESOLVED -> ESCALATED or IN_PROGRESS depending on definition)
    // Ideation dictates: if citizen says "NO" to resolved, it goes to "ESCALATED / Disputed - Under Review".
    try {
      StatusEngine.validateTransition(
        master.status as ComplaintStatus, 
        ComplaintStatus.ESCALATED, 
        ActorRole.CITIZEN, 
        [] // No strict file evidence needed initially, though reason is required in our logic below
      );
    } catch (e: any) {
        // If it's closed, maybe it can't be disputed anymore.
        return { success: false, error: `Cannot dispute: ${e.message}` };
    }

    // 3. Insert Dispute Record
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from("disputes")
      .insert({
        master_id: params.master_id,
        reporter_id: params.reporter_id,
        reason: params.reason,
        outcome: "pending",
      })
      .select()
      .single();

    if (disputeError) {
      console.error("Dispute insert error", disputeError);
      return { success: false, error: disputeError.message };
    }

    // 4. Update Master Status to Escalated and increase priority score penalty
    // Ideation: "Escalated immediately to Department Head. Status resets to Disputed - Under Review."
    await supabaseAdmin
      .from("complaints_master")
      .update({ status: "escalated" })
      .eq("id", params.master_id);

    // 5. Fire auto-escalation log (Stage 10 integration)
    await supabaseAdmin
      .from("escalation_log")
      .insert({
        master_id: params.master_id,
        trigger_level: 2, // e.g. Department Head level
        notified_role: "department_head",
        // Note: Actual notification service call would happen here/via DB hooks
      });

    // 6. Write Event Log
    await supabaseAdmin
      .from("complaint_events")
      .insert({
        master_id: params.master_id,
        event_type: "DISPUTED",
        actor_id: params.reporter_id,
        metadata: { reason: params.reason, dispute_id: dispute.id }
      });

    return {
      success: true,
      data: {
        master_id: params.master_id,
        new_status: "escalated",
        message: "Dispute recorded. Issue has been reopened and escalated to supervisory review."
      }
    };
  } catch (error: any) {
    console.error("Dispute error", error);
    return { success: false, error: error.message };
  }
}
