import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Feature 2: Auto Escalation Engine
 * 
 * Called by a cron job (e.g. Vercel Cron, GitHub Actions, or a bare setInterval).
 * Access via: GET /api/cron/escalate
 * 
 * Escalation Chain:
 *   Level 1 — Officer notified (SLA < 24h remaining)
 *   Level 2 — Department Head notified (SLA breached for 1+ day)
 *   Level 3 — Commissioner notified (SLA breached for 3+ days)
 *   Level 4 — Public Dashboard flagged (SLA breached for 7+ days)
 *
 * Protect with CRON_SECRET header in production.
 */

interface EscalationLevel {
  level: number;
  role: string;
  breach_days: number; // how many days past SLA
}

const ESCALATION_CHAIN: EscalationLevel[] = [
  { level: 1, role: "field_officer",       breach_days: 0   },  // Warn officer when SLA < 24h
  { level: 2, role: "department_head",     breach_days: 1   },  // 1 day breached
  { level: 3, role: "commissioner",        breach_days: 3   },  // 3 days breached
  { level: 4, role: "public_dashboard",    breach_days: 7   },  // 7 days — public shaming
];

export async function GET(request: NextRequest) {
  // ── Verify cron secret in production ──────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const escalated: any[] = [];

  try {
    // Fetch all open complaints with SLA info
    const { data: openComplaints, error } = await supabaseAdmin
      .from("complaints_master")
      .select(`
        id, status, category, department_id, sla_due_at, severity,
        assigned_officer_id, created_at,
        escalation_log (trigger_level, notified_at)
      `)
      .not("status", "in", '("resolved","closed")')
      .not("sla_due_at", "is", null);

    if (error || !openComplaints) {
      return NextResponse.json({ error: "DB error", details: error }, { status: 500 });
    }

    for (const complaint of openComplaints) {
      const slaDue = new Date(complaint.sla_due_at);
      const msSinceBreach = now.getTime() - slaDue.getTime();
      const daysSinceBreach = msSinceBreach / (1000 * 60 * 60 * 24);
      const hoursToSla = (slaDue.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Determine highest level already escalated
      const existingLevels = (complaint.escalation_log || []).map((e: any) => e.trigger_level);
      const maxExistingLevel = existingLevels.length ? Math.max(...existingLevels) : 0;

      // Determine which escalation level applies
      let targetLevel: EscalationLevel | null = null;

      if (hoursToSla <= 24 && hoursToSla > 0 && maxExistingLevel < 1) {
        targetLevel = ESCALATION_CHAIN[0]; // Warn officer
      } else if (daysSinceBreach >= ESCALATION_CHAIN[3].breach_days && maxExistingLevel < 4) {
        targetLevel = ESCALATION_CHAIN[3]; // Public dashboard
      } else if (daysSinceBreach >= ESCALATION_CHAIN[2].breach_days && maxExistingLevel < 3) {
        targetLevel = ESCALATION_CHAIN[2]; // Commissioner
      } else if (daysSinceBreach >= ESCALATION_CHAIN[1].breach_days && maxExistingLevel < 2) {
        targetLevel = ESCALATION_CHAIN[1]; // Department head
      }

      if (!targetLevel) continue;

      // Write escalation record
      const { error: escErr } = await supabaseAdmin.from("escalation_log").insert({
        master_id: complaint.id,
        trigger_level: targetLevel.level,
        notified_role: targetLevel.role,
      });

      if (escErr) continue;

      // Update complaint status to 'escalated' if level >= 2
      if (targetLevel.level >= 2) {
        await supabaseAdmin
          .from("complaints_master")
          .update({ status: "escalated" })
          .eq("id", complaint.id);
      }

      // Write audit event
      await supabaseAdmin.from("complaint_events").insert({
        master_id: complaint.id,
        event_type: "AUTO_ESCALATED",
        actor_id: null, // system actor
        metadata: {
          level: targetLevel.level,
          role: targetLevel.role,
          days_breached: Math.max(0, Math.round(daysSinceBreach)),
          hours_to_sla: Math.round(hoursToSla),
          auto: true,
        },
      });

      escalated.push({
        id: complaint.id,
        category: complaint.category,
        escalated_to: targetLevel.role,
        level: targetLevel.level,
      });
    }

    return NextResponse.json({
      success: true,
      ran_at: now.toISOString(),
      escalated_count: escalated.length,
      escalated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
