import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/utils/logger.js";
import { openai } from "@ai-sdk/openai";
import { generateObject, embed, generateText } from "ai";
import { z } from "zod";

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function generateComplaintId(): string {
  const randomStr = Math.floor(10000 + Math.random() * 90000).toString();
  const year = new Date().getFullYear();
  return `CIV-${year}-${randomStr}`;
}

// Phase 4: Extract tenant_id from request header (X-Tenant-ID)
// Enables multi-city isolation — each city sends its own tenant slug
function getTenantId(req: Request): string | null {
  return (req.headers["x-tenant-id"] as string) || null;
}

// ============================================================
// POST /api/complaints — Full Hybrid Agentic Router (All Phases)
// ============================================================
router.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Missing X-Tenant-ID header. All requests must include a city tenant identifier." });
      return;
    }

    const { title, description, image_url, latitude, longitude, address, citizen_email } = req.body;
    if (!latitude || !longitude || !title) {
      res.status(400).json({ error: "Missing required fields: title, latitude, longitude." });
      return;
    }

    // ── STEP 1: SQL Pre-Validation (MCP/ERP) — tenant-scoped ──
    const { data: ongoingWork } = await supabase.rpc("check_ongoing_work", {
      query_lat: latitude,
      query_lon: longitude,
      p_tenant_id: tenantId,
    });

    if (ongoingWork && ongoingWork.length > 0) {
      const work = ongoingWork[0];
      logger.info(`[${tenantId}] Phase 3 YELLOW: ERP hit → ${work.title}`);
      res.status(200).json({
        isOngoingWork: true,
        isDuplicate: false,
        governmentWork: {
          title: work.title,
          department: work.department,
          expected_completion: work.expected_completion,
        },
        message: `This issue is already being addressed by ${work.department}. Expected completion: ${work.expected_completion}.`,
      });
      return;
    }

    // ── STEP 2: AI Perception — NLP Category & Severity (tenant-agnostic) ──
    let category = "Uncategorized";
    let severity = "low";
    try {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({
          category: z.string().describe("Civic issue category based on the report."),
          severity: z.enum(["low", "medium", "high", "critical"]).describe("Severity level."),
        }),
        prompt: `Analyze this civic issue. Title: "${title}". Description: "${description || "N/A"}". Extract category and severity.`,
      });
      category = result.object.category;
      severity = result.object.severity;
    } catch (aiErr) {
      logger.warn(`[${tenantId}] AI categorization failed.`, aiErr);
    }

    // ── STEP 3: Embedding Vector Generation ──
    let embeddingVector: number[] = [];
    try {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: `${title}. ${description || ""}`,
      });
      embeddingVector = embedding;
    } catch (embedErr) {
      logger.warn(`[${tenantId}] Embedding failed.`, embedErr);
    }

    // ── STEP 4: RAG Cluster Check — tenant-scoped ──
    let clusterAttachedId: string | null = null;
    let clusterAttachedPublicId: string | null = null;

    if (embeddingVector.length > 0) {
      const vectorStr = `[${embeddingVector.join(",")}]`;
      const { data: similarComplaints } = await supabase.rpc("find_similar_complaints", {
        query_embedding: vectorStr,
        query_lat: latitude,
        query_lon: longitude,
        p_tenant_id: tenantId,
        match_threshold: 0.85,
        max_distance: 0.0005,
      });

      if (similarComplaints && similarComplaints.length > 0) {
        clusterAttachedId = similarComplaints[0].id;
        clusterAttachedPublicId = similarComplaints[0].public_id;
      }
    }

    // ── CASE: Me Too Cluster ──
    if (clusterAttachedId) {
      const { data: currentDoc } = await supabase
        .from("complaints")
        .select("reports_count")
        .eq("id", clusterAttachedId)
        .single();

      if (currentDoc) {
        await supabase
          .from("complaints")
          .update({ reports_count: currentDoc.reports_count + 1 })
          .eq("id", clusterAttachedId);
      }

      res.status(200).json({
        isOngoingWork: false,
        isDuplicate: true,
        complaint: { public_id: clusterAttachedPublicId },
        message: "Similar issue detected. Your report has been clustered to the existing ticket.",
      });
      return;
    }

    // ── CASE: New Valid Complaint ──
    const public_id = generateComplaintId();
    const insertData: any = {
      tenant_id: tenantId,
      public_id, title, description,
      image_url, latitude, longitude, address,
      category, severity,
      status: "Filed",
      citizen_email,
      reports_count: 1,
    };

    if (embeddingVector.length > 0) {
      insertData.embedding = `[${embeddingVector.join(",")}]`;
    }

    const { data: complaint, error: insertError } = await supabase
      .from("complaints")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      logger.error(`[${tenantId}] DB Insert error:`, insertError);
      res.status(500).json({ error: "Database error", details: insertError });
      return;
    }

    await supabase.from("status_logs").insert([{
      tenant_id: tenantId,
      complaint_id: complaint.id,
      status: "Filed",
      notes: "Complaint submitted by citizen",
    }]);

    res.status(201).json({
      isOngoingWork: false,
      isDuplicate: false,
      message: "Complaint filed successfully.",
      complaint,
    });
  } catch (error) {
    logger.error("Error in POST /complaints:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GET /api/complaints — Tenant-scoped, priority-sorted
// ============================================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Missing X-Tenant-ID header." });
      return;
    }

    const { status, category } = req.query;
    let query = supabase
      .from("complaints")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status as string);
    if (category) query = query.ilike("category", `%${category as string}%`);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "Database error", details: error });
      return;
    }

    // Compute SLA status for each complaint before returning
    const sanitized = (data || []).map((row) => {
      delete row.embedding;
      row.sla_breached = row.sla_deadline && new Date(row.sla_deadline) < new Date() && row.status !== "Resolved";
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
router.get("/:publicId", async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const { data, error } = await supabase
      .from("complaints")
      .select(`*, status_logs(status, timestamp, notes, updated_by_email)`)
      .eq("public_id", publicId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }
    delete data.embedding;
    data.sla_breached = data.sla_deadline && new Date(data.sla_deadline) < new Date() && data.status !== "Resolved";
    res.json({ complaint: data });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// PUT /api/complaints/:id — Update + AI Vision Verification + Escalation
// ============================================================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "Missing X-Tenant-ID header." });
      return;
    }

    const { id } = req.params;
    const { status, assigned_to, notes, updated_by_email, after_image_url } = req.body;

    const updates: any = {};
    if (status) updates.status = status;
    if (assigned_to) updates.assigned_to = assigned_to;

    // ── Phase 3: AI Vision Verification on Resolution ──
    let verificationScore: number | null = null;
    let verificationNotes: string | null = null;

    if (status === "Resolved" && after_image_url) {
      const { data: originalComplaint } = await supabase
        .from("complaints")
        .select("image_url, title")
        .eq("id", id)
        .single();

      if (originalComplaint?.image_url) {
        try {
          const { text } = await generateText({
            model: openai("gpt-4o"),
            messages: [{
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are an AI verification system for a civic complaint platform. Complaint: "${originalComplaint.title}".
Analyze BEFORE and AFTER images. Respond ONLY in this JSON format:
{"score": <0-100>, "resolved": <true|false>, "reason": "<one sentence>"}`,
                },
                { type: "image", image: new URL(originalComplaint.image_url) },
                { type: "image", image: new URL(after_image_url) },
              ],
            }],
          });

          const jsonMatch = text.match(/\{.*\}/s);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            verificationScore = parsed.score ?? null;
            verificationNotes = parsed.reason ?? null;

            if (parsed.resolved === false || (verificationScore !== null && verificationScore < 50)) {
              res.status(422).json({
                error: "AI Verification Failed",
                verificationScore,
                verificationNotes,
                message: "Resolution image does not confirm fix. Re-verify and try again.",
              });
              return;
            }
          }
        } catch (visionErr) {
          logger.warn("Vision check failed, proceeding without verification.", visionErr);
        }
      }

      if (verificationScore !== null) updates.ai_verification_score = verificationScore;
      if (verificationNotes !== null) updates.ai_verification_notes = verificationNotes;
      if (after_image_url) updates.resolution_image_url = after_image_url;
    }

    // ── Phase 4: Auto SLA Escalation ──
    const { data: existingComplaint } = await supabase
      .from("complaints")
      .select("sla_deadline, escalation_level, status")
      .eq("id", id)
      .single();

    if (existingComplaint?.sla_deadline && existingComplaint.status !== "Resolved") {
      const slaBreach = new Date(existingComplaint.sla_deadline) < new Date();
      if (slaBreach && existingComplaint.escalation_level < 3) {
        updates.escalation_level = existingComplaint.escalation_level + 1;
        updates.status = "Escalated";
        logger.info(`[${tenantId}] Auto-escalation triggered for complaint ${id}`);
      }
    }

    const { data: updatedComplaint, error } = await supabase
      .from("complaints")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId) // Tenant-scoped update for security
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Database error", details: error });
      return;
    }

    const logNotes = verificationScore !== null
      ? `${notes || "Status updated"} | AI Score: ${verificationScore}/100`
      : notes || "Status updated";

    await supabase.from("status_logs").insert([{
      tenant_id: tenantId,
      complaint_id: updatedComplaint.id,
      status: status || updatedComplaint.status,
      notes: logNotes,
      updated_by_email,
    }]);

    res.json({
      message: "Complaint updated successfully.",
      complaint: updatedComplaint,
      ...(verificationScore !== null && { verificationScore, verificationNotes }),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const complaintRouter = router;
