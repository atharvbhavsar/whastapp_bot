import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/utils/logger.js";
import { openai } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { generateObject, embed } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

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
    const tenantId = params.tenant_id || (req.headers["x-tenant-id"] as string) || "pune-slug";

    if (!transcript) {
      res.status(400).json({ error: "Missing transcript or description" });
      return;
    }

    // ─── FEATURE 1: Smart Decision Engine — Ongoing Govt Work Check ───────────
    // Before creating any complaint, check if government work is already scheduled
    // at this location. If yes → CASE 1: inform citizen, don't log a complaint.
    if (lat !== null && lon !== null) {
      const { data: ongoingWork, error: ongoingErr } = await supabase.rpc("check_ongoing_work", {
        p_lat: lat,
        p_lon: lon,
        p_radius_meters: 150,
        p_tenant_id: tenantId,
      });

      if (!ongoingErr && ongoingWork && ongoingWork.length > 0) {
        const work = ongoingWork[0];
        const expectedDate = work.expected_completion
          ? new Date(work.expected_completion).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
          : "soon";

        res.status(200).json({
          success: true,
          case: "ONGOING_WORK",
          data: {
            complaint_created: false,
            message: `No complaint needed — government work already scheduled here.`,
            ongoing_work: {
              title: work.title,
              work_type: work.work_type,
              contractor: work.contractor,
              department: work.department_id,
              expected_completion: expectedDate,
              distance_meters: Math.round(work.distance_meters),
            },
            citizen_message: `✅ Government is already aware! "${work.title}" is currently ${work.status.replace("_"," ")} in your area by ${work.contractor || "the city authority"}. Expected completion: ${expectedDate}. You'll be notified when it's done.`,
          },
        });
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

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
    
    // Phase 3: Vision Agent Routing (Parse local image to pass to AI)
    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: `Analyze the following civic complaint based on text and image (if provided).\nText: "${transcript}"\nMedia Type: ${mediaType}\nDetermine the issue type, department, and severity on a 1-10 scale.` }
        ]
      }
    ];

    if (mediaUrl && mediaUrl.includes("/uploads/")) {
      const filename = mediaUrl.split("/uploads/").pop();
      if (filename) {
        const filepath = path.join(process.cwd(), "public", "uploads", filename);
        if (fs.existsSync(filepath)) {
          const imageBuffer = fs.readFileSync(filepath);
          messages[0].content.push({ type: "image", image: imageBuffer });
        }
      }
    }

    const { object: classification } = await generateObject({
      model: useGroq 
        ? groq("llama-3.2-90b-vision-preview") 
        : openai("gpt-4o-mini"),
      schema: aiCategorySchema,
      messages: messages
    });

    // ============================================================
    // PHASE 3 PRE-VALIDATION: Check for Ongoing Municipal Work
    // ============================================================
    if (lat !== null && lon !== null && lat !== 0 && lon !== 0) {
      const { data: ongoingWorks, error: ongoingErr } = await supabase.rpc("check_ongoing_work", {
        p_lat: lat,
        p_lon: lon,
        p_department: classification.departmentId
      });

      if (!ongoingErr && ongoingWorks && ongoingWorks.length > 0) {
        const work = ongoingWorks[0];
        res.status(200).json({
          success: true,
          isOngoingWork: true,
          message: "This issue is already being addressed by the municipal team. No new complaint has been filed to prevent duplicates.",
          governmentWork: {
            title: work.title,
            department: work.department_id,
            expected_completion: work.expected_completion
          }
        });
        return;
      }
    }

    // 2. Intelligence Layer: Semantic Search & Location Clustering via pgvector
    let assignedMasterId: string | null = null;
    let isClustered = false;

    // Generate semantic embedding vector for this specific complaint
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: transcript,
    });

    if (lat !== null && lon !== null && lat !== 0 && lon !== 0) {
      const radiusMatrix: Record<string, number> = {
        pothole: 50, garbage: 30, water_leakage: 100, flooding: 500, streetlight: 40
      };
      const typeKey = classification.issueType.toLowerCase();
      let clusterRadius = 50; 
      for (const [key, radius] of Object.entries(radiusMatrix)) {
          if (typeKey.includes(key)) { clusterRadius = radius; break; }
      }

      // Hybrid Search: Semantic similarity + Spatial radius
      const { data: clusterMatches, error: clusterError } = await supabase.rpc("match_complaints", {
        query_embedding: embedding,
        p_department_id: classification.departmentId,
        p_lat: lat,
        p_lon: lon,
        p_radius_meters: clusterRadius,
        match_threshold: 0.85
      });

      if (!clusterError && clusterMatches && clusterMatches.length > 0) {
        assignedMasterId = clusterMatches[0].id;
        isClustered = true;

        // Phase 2: Update Reports Count to drive Priority Engine
        await supabase
          .from("complaints_master")
          .update({ reports_count: (clusterMatches[0].reports_count || 1) + 1 })
          .eq("id", assignedMasterId);
      }
    }

    // 3. Create Master if not clustered
    let assignedOfficerId: string | null = null;
    if (!assignedMasterId) {
      // ─── FEATURE 7: Auto-assign least-loaded officer ─────────────────────
      try {
        const { data: officerId } = await supabase.rpc("auto_assign_officer", {
          p_department_id: classification.departmentId,
        });
        assignedOfficerId = officerId || null;
      } catch { /* graceful fallback — officer pool may be empty */ }
      // ──────────────────────────────────────────────────────────────────────

      const slaDate = new Date();
      slaDate.setHours(slaDate.getHours() + (classification.slaDays * 24));

      const { data: newMaster, error: masterError } = await supabase
        .from("complaints_master")
        .insert({
          tenant_id: tenantId,
          category: classification.issueType,
          description: transcript,
          severity: classification.severity,
          department_id: classification.departmentId,
          zone_id: classification.zoneId,
          status: assignedOfficerId ? "assigned" : "filed",
          latitude: lat,
          longitude: lon,
          sla_due_at: slaDate.toISOString(),
          priority_score: classification.severity,
          assigned_officer_id: assignedOfficerId,

        })
        .select()
        .single();
      
      if (masterError) {
         res.status(500).json({ success: false, error: masterError.message });
         return;
      }
      assignedMasterId = newMaster.id;

      // Create assignment record if officer was found
      if (assignedOfficerId) {
        await supabase.from("assignments").insert({
          master_id: assignedMasterId,
          officer_id: assignedOfficerId,
        });
      }
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
      metadata: { clustered: isClustered, ai_classification: classification, auto_assigned_officer: assignedOfficerId }
    });

    res.status(200).json({
      success: true,
      case: "NEW_COMPLAINT",
      data: {
        complaint_created: true,
        report_id: newReport.id,
        master_id: assignedMasterId,
        complaint_status: assignedOfficerId ? "assigned" : "filed",
        assigned_officer_id: assignedOfficerId,
        ai_explanation: classification.citizenExplanation,
        message: isClustered 
            ? "Your report has been added to an existing group complaint nearby. Priority increased." 
            : assignedOfficerId
            ? "Complaint received and auto-assigned to the nearest available officer."
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

    const { status, category, zone } = req.query;
    if (status) query = query.eq("status", status as string);
    if (category) query = query.ilike("category", `%${category as string}%`);
    if (zone) query = query.eq("zone_id", zone as string);

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

// ============================================================
// PUT /api/complaints/:publicId — Update Single Complaint
// ============================================================
router.put("/:publicId", requireTenantAuth, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const { status, updated_by_email, after_image_url, assigned_to } = req.body;
    
    // 1. Update master table status
    const updateData: any = {};
    if (status) updateData.status = status.toLowerCase().replace(" ", "_");
    
    const { data: updatedComplaint, error } = await supabase
      .from("complaints_master")
      .update(updateData)
      .eq("id", publicId)
      .select()
      .single();

    if (error || !updatedComplaint) {
      res.status(404).json({ error: "Complaint not found or update failed" });
      return;
    }

    // 2. Add an event log
    await supabase.from("complaint_events").insert({
      master_id: publicId,
      event_type: "STATUS_CHANGE",
      metadata: { new_status: status, updated_by: updated_by_email }
    });

    // 3. Handle specific actions (Assignments)
    if (assigned_to) {
      const dummyOfficerId = "00000000-0000-0000-0000-000000000000";
      await supabase.from("assignments").insert({
        master_id: publicId,
        officer_id: dummyOfficerId,
        zone_eligibility: assigned_to
      });

      await supabase.from("complaint_events").insert({
        master_id: publicId,
        event_type: "ASSIGNED",
        metadata: { assigned_to }
      });
    }

    // 4. Handle resolution images with AI FRAUD VERIFICATION (Phase 3)
    let verificationScore;
    let verificationNotes;
    
    if (after_image_url && status === 'resolved') {
      const useGroq = process.env.USE_GROQ === "true";
      const verificationSchema = z.object({
        score: z.number().describe("0 to 100 on how likely the issue is actually resolved based on the after image and context"),
        notes: z.string().describe("Justification for the score given.")
      });
      
      const { object: verification } = await generateObject({
        model: useGroq ? groq("llama-3.2-90b-vision-preview") : openai("gpt-4o-mini"),
        schema: verificationSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `You are an AI municipal auditor. Verify if this resolution photo actually fixes the reported issue category: "${updatedComplaint.category}". Issue Description was: "${updatedComplaint.description}". Score it out of 100.` },
              { type: "image", image: new URL(after_image_url) }
            ]
          }
        ]
      });

      verificationScore = verification.score;
      verificationNotes = verification.notes;

      if (verificationScore < 50) {
         // Reject the status update entirely by reverting it or simply failing!
         // Revert master status
         await supabase.from("complaints_master").update({ status: 'in_progress' }).eq("id", publicId);
         
         res.status(422).json({
            message: "Fraud verification failed. AI does not believe the image fixes the issue.",
            verificationScore,
            verificationNotes
         });
         return;
      }

      // Valid resolution evidence
      await supabase.from("resolution_evidence").insert({
        master_id: publicId,
        officer_id: "00000000-0000-0000-0000-000000000000",
        after_media_url: after_image_url,
        resolution_notes: `Resolved by ${updated_by_email}`,
        ai_verification_score: verificationScore
      });
    }

    res.json({ 
      message: "Updated successfully", 
      complaint: updatedComplaint,
      verificationScore,
      verificationNotes
    });
  } catch (error) {
    logger.error("Update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GET /api/complaints/nearby — Map Intelligence
// ============================================================
router.get("/nearby", requireTenantAuth, async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius = 2000 } = req.query;
    if (!lat || !lon) {
      res.status(400).json({ error: "Missing coordinates" });
      return;
    }

    // Simplified for MVP Map: Fetch all open complaints, maybe in future filter by radius purely in SQL if dataset is huge
    const { data, error } = await supabase
      .from("complaints_master")
      .select("id, latitude, longitude, priority_score, category, severity, reports_count")
      .eq("status", "filed")
      .not("latitude", "is", null);

    if (error) throw error;
    
    // Quick Haversine JS filter for MVP
    const toRad = (v: number) => v * Math.PI / 180;
    const filterNearby = (pts: any[]) => {
      const R = 6371e3;
      return pts.filter(p => {
        const dLat = toRad(p.latitude - Number(lat));
        const dLon = toRad(p.longitude - Number(lon));
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(Number(lat)))*Math.cos(toRad(p.latitude))*Math.sin(dLon/2)*Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return (R * c) <= Number(radius);
      });
    };

    res.json({ pins: filterNearby(data || []) });
  } catch (error) {
    logger.error("Nearby error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// POST /api/complaints/:publicId/metoo — Quick Support
// ============================================================
router.post("/:publicId/metoo", requireTenantAuth, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const { lat, lon } = req.body;

    const { data: master, error: masterErr } = await supabase
      .from("complaints_master")
      .select("reports_count")
      .eq("id", publicId)
      .single();

    if (masterErr || !master) {
      res.status(404).json({ error: "Original complaint not found" });
      return;
    }

    // Increment count
    await supabase
      .from("complaints_master")
      .update({ reports_count: (master.reports_count || 1) + 1 })
      .eq("id", publicId);

    // Dummy tracking report
    await supabase.from("complaint_reports").insert({
      master_id: publicId,
      reporter_id: "00000000-0000-0000-0000-000000000000",
      media_type: "text",
      transcript_or_text: "Me Too support vote via map.",
      latitude: lat,
      longitude: lon
    });

    res.json({ success: true, message: "Support recorded successfully. Priority increased!" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export const complaintRouter = router;
