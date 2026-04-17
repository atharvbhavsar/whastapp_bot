"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface DashboardFilters {
  zone?: string;
  department?: string;
  status?: string;
  minPriority?: number;
}

export interface ComplaintDashboardItem {
  id: string;
  category: string;
  description: string;
  severity: number;
  priority_score: number;
  department_id: string;
  zone_id: string;
  status: string;
  sla_due_at: string;
  created_at: string;
  report_count?: number; // Fetched from relational count
  sla_breach_risk: "high" | "medium" | "low" | "breached" | "none";
}

export async function getCivicDashboard(
  filters: DashboardFilters
): Promise<{ success: boolean; data?: ComplaintDashboardItem[]; error?: string }> {
  try {
    const supabase = await createClient();

    // In a real production app we check admin role right here
    // ...

    // Build query using Supabase Admin
    let query = supabaseAdmin
      .from("complaints_master")
      .select("*, complaint_reports(count)")
      .order("priority_score", { ascending: false });

    if (filters.zone) {
      query = query.eq("zone_id", filters.zone);
    }
    if (filters.department) {
      query = query.eq("department_id", filters.department);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.minPriority !== undefined) {
      query = query.gte("priority_score", filters.minPriority);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Dashboard fetch error:", error);
      return { success: false, error: error.message };
    }

    // Process Risk levels for SLA based on the Ideation Document (Stage 10 Auto Escalation)
    const now = new Date().getTime();

    const formattedData: ComplaintDashboardItem[] = data.map((item: any) => {
      const slaTime = new Date(item.sla_due_at).getTime();
      const timeRemainingMs = slaTime - now;
      const hoursRemaining = timeRemainingMs / (1000 * 60 * 60);

      let riskLevel: ComplaintDashboardItem["sla_breach_risk"] = "none";
      
      if (item.status === "resolved" || item.status === "closed") {
          riskLevel = "none";
      } else if (hoursRemaining < 0) {
          riskLevel = "breached";
      } else if (hoursRemaining < 24) {
          riskLevel = "high"; // Yellow alert
      } else if (hoursRemaining < 72) {
          riskLevel = "medium";
      } else {
          riskLevel = "low";
      }

      return {
        id: item.id,
        category: item.category,
        description: item.description,
        severity: item.severity,
        priority_score: item.priority_score,
        department_id: item.department_id,
        zone_id: item.zone_id,
        status: item.status,
        sla_due_at: item.sla_due_at,
        created_at: item.created_at,
        // The count comes back as [{ count: X }] due to Supabase relationship formatting
        report_count: item.complaint_reports?.[0]?.count || 0,
        sla_breach_risk: riskLevel
      };
    });

    return {
      success: true,
      data: formattedData
    };
  } catch (err: any) {
    console.error("Unexpected error in dashboard fetch:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
