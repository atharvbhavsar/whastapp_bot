import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/utils/logger.js";

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function getTenantId(req: Request): string | null {
  return (req.headers["x-tenant-id"] as string) || null;
}

// ============================================================
// GET /api/analytics/trigger-slas
// Phase 4: Lazy Evaluation SLA trigger
// ============================================================
router.get("/trigger-slas", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.rpc("escalate_slas");
    if (error) throw error;
    res.json({ escalated_count: data });
  } catch (error) {
    logger.error("Error triggering SLAs", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GET /api/analytics/heatmap
// Returns GPS clusters with complaint density for map heatmap
// ============================================================
router.get("/heatmap", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Missing X-Tenant-ID header." });
      return;
    }

    const { data, error } = await supabase.rpc("get_heatmap_data", {
      p_tenant_id: tenantId,
    });

    if (error) {
      logger.error("Heatmap RPC error:", error);
      res.status(500).json({ error: "Failed to fetch heatmap data.", details: error });
      return;
    }

    res.json({ heatmap: data || [] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GET /api/analytics/recurring
// Returns categories with repeated complaints in last 30 days
// ============================================================
router.get("/recurring", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Missing X-Tenant-ID header." });
      return;
    }

    const { data, error } = await supabase.rpc("get_recurring_issues", {
      p_tenant_id: tenantId,
    });

    if (error) {
      logger.error("Recurring issues RPC error:", error);
      res.status(500).json({ error: "Failed to fetch recurring issue data.", details: error });
      return;
    }

    res.json({ recurring: data || [] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GET /api/analytics/sla
// Returns SLA violations for governance/public dashboard
// ============================================================
router.get("/sla", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Missing X-Tenant-ID header." });
      return;
    }

    const { data, error } = await supabase.rpc("get_sla_violations", {
      p_tenant_id: tenantId,
    });

    if (error) {
      logger.error("SLA violations RPC error:", error);
      res.status(500).json({ error: "Failed to fetch SLA violation data.", details: error });
      return;
    }

    res.json({ violations: data || [] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GET /api/analytics/public-dashboard
// Publicly accessible governance stats — no tenant auth needed
// Shows: total resolved, total filed, SLA breaches, avg resolution time
// ============================================================
router.get("/public-dashboard", async (req: Request, res: Response) => {
  try {
    const { tenant } = req.query;
    if (!tenant) {
      res.status(400).json({ error: "Missing tenant query param." });
      return;
    }

    // Resolve tenant slug → tenant UUID
    const { data: tenantRow, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("slug", tenant as string)
      .single();

    if (tenantErr || !tenantRow) {
      res.status(404).json({ error: "Tenant not found." });
      return;
    }

    const tenantId = tenantRow.id;

    // Summary stats
    const { data: complaintsData } = await supabase
      .from("complaints_master")
      .select("status, sla_due_at, created_at, updated_at, category")
      .eq("tenant_id", tenantId);

    const all = complaintsData || [];
    const resolved = all.filter((c) => c.status === "resolved");
    const open = all.filter((c) => c.status !== "resolved");
    const slaViolations = open.filter((c) => c.sla_due_at && new Date(c.sla_due_at) < new Date());

    // Avg resolution time in hours
    const resolutionTimes = resolved
      .filter((c) => c.updated_at && c.created_at)
      .map((c) => (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 3600000);
    const avgResolutionHours = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : null;

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    all.forEach((c) => {
      categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
    });

    res.json({
      tenant: tenantRow.name,
      stats: {
        total_complaints: all.length,
        total_resolved: resolved.length,
        total_open: open.length,
        sla_violations: slaViolations.length,
        avg_resolution_hours: avgResolutionHours ? Math.round(avgResolutionHours) : null,
      },
      category_breakdown: Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const analyticsRouter = router;
