"use server";



export interface SubmitComplaintParams {
  reporter_id: string;
  media_type: "photo" | "video" | "voice" | "text";
  transcript_or_text: string;
  media_url?: string;
  location?: { // Optional — only present when user explicitly shares location
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
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errTexts = await res.text();
      return { success: false, error: `AI Service Error: ${errTexts}` };
    }

    const data = await res.json();
    return { success: true, data: data.data };
  } catch (error: any) {
    console.error("Submission proxy error", error);
    return { success: false, error: error.message };
  }
}
