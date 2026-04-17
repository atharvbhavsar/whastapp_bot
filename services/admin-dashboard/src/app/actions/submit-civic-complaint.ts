"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export interface SubmitComplaintParams {
  reporter_id: string;
  media_type: "photo" | "video" | "voice" | "text";
  transcript_or_text: string;
  media_url?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  device_language?: string;
}

export interface SubmitComplaintResponse {
  success: boolean;
  data?: {
    report_id: string;
    master_id: string;
    complaint_status: string;
    ai_explanation?: string;
    message: string;
  };
  error?: string;
}

// Distance calculation using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Define City Geofence Constraints (e.g., bounds of the municipality, defaulting to a 30km radius from city center)
const MUNICIPAL_GEOFENCE = {
  centerLat: 19.0760, // e.g. center of the city limits 
  centerLon: 72.8777,
  radiusMeters: 30000 // 30km allowable reporting radius
};

function isWithinMunicipalBounds(lat: number, lon: number): boolean {
  return calculateDistance(lat, lon, MUNICIPAL_GEOFENCE.centerLat, MUNICIPAL_GEOFENCE.centerLon) <= MUNICIPAL_GEOFENCE.radiusMeters;
}

export async function submitCivicComplaint(
  params: SubmitComplaintParams
): Promise<SubmitComplaintResponse> {
  try {
    // 0. Geofence Check (Prevent out-of-city troll reports)
    if (!isWithinMunicipalBounds(params.location.latitude, params.location.longitude)) {
      return { 
        success: false, 
        error: "Geofence Error: Your location is outside the municipal boundaries. We can only process complaints within the city limits."
      };
    }
    
    const supabase = await createClient();

    // 1. AI Categorization Stage
    const aiCategorySchema = z.object({
      issueType: z.string().describe("The specific type of issue, e.g. Pothole, Flooding, Streetlight"),
      departmentId: z.string().describe("The internal department slug, e.g. roads_dept, drainage_dept, electricity_dept"),
      zoneId: z.string().describe("Approximate geographical zone, defaults to zone_a if unknown"),
      severity: z.number().min(1).max(10).describe("Estimated severity score from 1 (minor) to 10 (critical)"),
      urgencyTag: z.string().describe("Urgency label: Low, Medium, High, Critical"),
      slaDays: z.number().describe("Days to resolve based on standard timelines (4h -> 0.16, 24h -> 1, 5 days -> 5)"),
      citizenExplanation: z.string().describe("A friendly, explainable AI reply directed at the citizen explaining WHY it was categorized this way (e.g. 'I categorized this as a Pothole with High urgency because you showed water pooling. It is routed to the Roads Dept with a 5-day SLA.')"),
    });

    const { object: classification } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: aiCategorySchema,
      prompt: `Analyze the following civic complaint submission.
        
Text: "${params.transcript_or_text}"
Media Type: ${params.media_type}
        
Determine the issue type, mapping department (Roads, Drainage, Electricity, Parks, Waste, etc), and severity on a 1-10 scale.
A pothole is a Roads issue (severity 5-8). Overflowing garbage is a Waste issue (severity 4-7). Exposed wires are Electricity (severity 9-10).`
    });

    // 2. Locality Clustering Check Stage
    // We fetch open complaints of the similar category
    const { data: openMasters, error: fetchError } = await supabaseAdmin
      .from("complaints_master")
      .select("*")
      .eq("status", "filed")
      .eq("department_id", classification.departmentId)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (fetchError) {
       console.error("Master fetch error", fetchError);
    }

    let assignedMasterId: string | null = null;
    let isClustered = false;

    // Radius matrix
    const radiusMatrix: Record<string, number> = {
      pothole: 50,
      garbage: 30,
      water_leakage: 100,
      flooding: 500,
      streetlight: 40
    };

    const typeKey = classification.issueType.toLowerCase();
    let clusterRadius = 50; // default 50 meters
    for (const [key, radius] of Object.entries(radiusMatrix)) {
        if (typeKey.includes(key)) {
            clusterRadius = radius;
            break;
        }
    }

    if (openMasters && openMasters.length > 0) {
      for (const master of openMasters) {
        const dist = calculateDistance(
          params.location.latitude,
          params.location.longitude,
          master.latitude,
          master.longitude
        );

        if (dist <= clusterRadius) {
          assignedMasterId = master.id;
          isClustered = true;
          break;
        }
      }
    }

    // 3. Create Master if not found
    if (!assignedMasterId) {
      const slaDate = new Date();
      slaDate.setHours(slaDate.getHours() + (classification.slaDays * 24));

      const { data: newMaster, error: masterError } = await supabaseAdmin
        .from("complaints_master")
        .insert({
          category: classification.issueType,
          description: params.transcript_or_text,
          severity: classification.severity,
          department_id: classification.departmentId,
          zone_id: classification.zoneId,
          status: "filed",
          latitude: params.location.latitude,
          longitude: params.location.longitude,
          sla_due_at: slaDate.toISOString(),
          priority_score: classification.severity, // initial score
        })
        .select()
        .single();
      
      if (masterError) {
         console.error("Master insert error", masterError);
         return { success: false, error: masterError.message };
      }
      assignedMasterId = newMaster.id;
    }

    // 4. Create the Complaint Report (triggers priority calculation via Supabase SQL)
    const { data: newReport, error: reportError } = await supabaseAdmin
      .from("complaint_reports")
      .insert({
        master_id: assignedMasterId,
        reporter_id: params.reporter_id,
        media_type: params.media_type,
        media_url: params.media_url,
        transcript_or_text: params.transcript_or_text,
        latitude: params.location.latitude,
        longitude: params.location.longitude,
        device_language: params.device_language || "en",
      })
      .select()
      .single();

    if (reportError) {
      console.error("Report insert error", reportError);
      return { success: false, error: reportError.message };
    }

    // 5. Create Event Log
    await supabaseAdmin
      .from("complaint_events")
      .insert({
        master_id: assignedMasterId,
        event_type: "REPORT_SUBMITTED",
        actor_id: params.reporter_id,
        metadata: {
            clustered: isClustered,
            ai_classification: classification
        }
      });

    return {
      success: true,
      data: {
        report_id: newReport.id,
        master_id: assignedMasterId as string,
        complaint_status: "filed",
        ai_explanation: classification.citizenExplanation,
        message: isClustered 
            ? "Your report has been added to an existing group complaint nearby. Priority increased." 
            : "Complaint received and categorized successfully."
      }
    };
  } catch (error: any) {
    console.error("Submission error", error);
    return { success: false, error: error.message };
  }
}
