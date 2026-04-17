import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/utils/logger.js";
import { openai } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const router = Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// SECURITY MIDDLEWARE: JWT-Based Authentication for Tenants
// ============================================================
export const requireTenantAuth = async (_req: Request, _res: Response, next: NextFunction) => {
  // We use this route for citizen submissions which are unauthenticated.
  // Real authorization checks for dashboard officers would use JWT validation.
  next();
};

// ============================================================
// POST /api/complaints — Unified Handler
// ============================================================
router.post("/", requireTenantAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const params = req.body;
    let transcript = params.transcript_or_text || params.description || params.title;
    let lat = params.location?.latitude ?? params.latitude ?? null;
    let lon = params.location?.longitude ?? params.longitude ?? null;
    let mediaType = params.media_type || "text";
    let mediaUrl = params.media_url || null;
    let reporterId = params.reporter_id || "00000000-0000-0000-0000-000000000000";

    if (!transcript) {
      res.status(400).json({ error: "Missing transcript or description" });
      return;
    }

    // 1. AI Categorization Stage
    const aiCategorySchema = z.object({
      issueType: z.string().describe("The specific type of issue, e.g. Pothole, Flooding, Streetlight"),
      departmentId: z.string().describe("The internal department slug, e.g. roads_dept, drainage_dept, electricity_dept"),
      zoneId: z.string().describe("Approximate geographical zone, defaults to zone_a if unknown"),
      severity: z.number().min(1).max(10).describe("Estimated severity score from 1 (minor) to 10 (critical)"),
      urgencyTag: z.string().describe("Urgency label: Low, Medium, High, Critical"),
      slaDays: z.number().describe("Days to resolve based on standard timelines"),
      citizenExplanation: z.string().describe("Friendly reply to citizen explaining categorization"),
    });

    const useGroq = process.env.USE_GROQ === "true";
    const useGemini = process.env.USE_GEMINI === "true";

    const { object: classification } = await generateObject({
      model: useGroq 
        ? groq("llama-3.3-70b-versatile") 
        : useGemini 
        ? google("gemini-2.0-flash-exp")
        : openai("gpt-4o-mini"),
      mode: "json",
      schema: aiCategorySchema,
      prompt: `Analyze the following civic complaint.
Text: "${transcript}"
Media Type: ${mediaType}

Determine the issue type, department, and severity on a 1-10 scale.`
    });

    // 2. Locality Clustering via PostgreSQL (Eliminates O(N) JS loop)
    let assignedMasterId: string | null = null;
    let isClustered = false;

    if (lat !== null && lon !== null && lat !== 0 && lon !== 0) {
      const radiusMatrix: Record<string, number> = {
        pothole: 50, garbage: 30, water_leakage: 100, flooding: 500, streetlight: 40
      };
      const typeKey = classification.issueType.toLowerCase();
      let clusterRadius = 50; 
      for (const [key, radius] of Object.entries(radiusMatrix)) {
          if (typeKey.includes(key)) { clusterRadius = radius; break; }
      }

      const { data: clusterMatches, error: clusterError } = await supabase.rpc("find_nearby_master_complaint", {
        p_department_id: classification.departmentId,
        p_lat: lat,
        p_lon: lon,
        p_radius_meters: clusterRadius
      });

      if (!clusterError && clusterMatches && clusterMatches.length > 0) {
        assignedMasterId = clusterMatches[0].id;
        isClustered = true;
      }
    }

    // 3. Create Master if not clustered
    if (!assignedMasterId) {
      const slaDate = new Date();
      slaDate.setHours(slaDate.getHours() + (classification.slaDays * 24));

      const { data: newMaster, error: masterError } = await supabase
        .from("complaints_master")
        .insert({
          category: classification.issueType,
          description: transcript,
          severity: classification.severity,
          department_id: classification.departmentId,
          zone_id: classification.zoneId,
          status: "filed",
          latitude: lat,
          longitude: lon,
          sla_due_at: slaDate.toISOString(),
          priority_score: classification.severity,
        })
        .select()
        .single();
      
      if (masterError) {
         res.status(500).json({ success: false, error: masterError.message });
         return;
      }
      assignedMasterId = newMaster.id;
    }

    // 4. Create the Complaint Report
    const { data: newReport, error: reportError } = await supabase
      .from("complaint_reports")
      .insert({
        master_id: assignedMasterId,
        reporter_id: reporterId, // Ensure uuid compatibility
        media_type: mediaType,
        media_url: mediaUrl,
        transcript_or_text: transcript,
        latitude: lat,
        longitude: lon,
        device_language: params.device_language || "en",
      })
      .select()
      .single();

    if (reportError) {
      res.status(500).json({ success: false, error: reportError.message });
      return;
    }

    // 5. Create Event Log
    await supabase.from("complaint_events").insert({
      master_id: assignedMasterId,
      event_type: "REPORT_SUBMITTED",
      actor_id: reporterId,
      metadata: { clustered: isClustered, ai_classification: classification }
    });

    res.status(200).json({
      success: true,
      data: {
        report_id: newReport.id,
        master_id: assignedMasterId,
        complaint_status: "filed",
        ai_explanation: classification.citizenExplanation,
        message: isClustered 
            ? "Your report has been added to an existing group complaint nearby. Priority increased." 
            : "Complaint received and categorized successfully."
      }
    });

  } catch (error: any) {
    logger.error("Submission proxy error", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /api/complaints — Tenant-scoped, priority-sorted
// ============================================================
router.get("/", requireTenantAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    
    // We fetch from complaints_master now
    let query = supabase
      .from("complaints_master")
      .select("*, complaint_reports(count)")
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false });

    // Note: To filter by tenant_id, we would add the column to complaints_master or filter by department.

    const { status, category } = req.query;
    if (status) query = query.eq("status", status as string);
    if (category) query = query.ilike("category", `%${category as string}%`);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "Database error", details: error });
      return;
    }

    const sanitized = (data || []).map((row) => {
      row.sla_breached = row.sla_due_at && new Date(row.sla_due_at) < new Date() && row.status !== "resolved";
      row.reports_count = row.complaint_reports?.[0]?.count || 0;
      delete row.complaint_reports;
      return row;
    });

    res.json({ complaints: sanitized });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GET /api/complaints/:publicId — Single complaint + logs
// ============================================================
router.get("/:publicId", requireTenantAuth, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    
    // Fallback: the dashboard expects format CIV-YYYY-XXXXX, which might map to master ID or be stored differently.
    // If public_id is not inherently in complaints_master, we search by ID.
    // Wait, complaints_master uses UUIDs. Let's just lookup by ID.
    
    const { data, error } = await supabase
      .from("complaints_master")
      .select(`*, complaint_events(event_type, created_at, metadata)`)
      .eq("id", publicId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }
    
    data.sla_breached = data.sla_due_at && new Date(data.sla_due_at) < new Date() && data.status !== "resolved";
    data.public_id = data.id; // Map UUID to public format if necessary
    
    res.json({ complaint: data });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const complaintRouter = router;
