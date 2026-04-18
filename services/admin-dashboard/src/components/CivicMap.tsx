"use client";

import { useEffect, useRef } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  category: string;
  status: string;       // 'filed' | 'assigned' | 'in_progress' | 'resolved' | 'escalated'
  severity: number;
  priority_score: number;
  description?: string;
  sla_breached?: boolean;
  ongoing_work?: boolean; // yellow marker = govt work scheduled
}

interface CivicMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

/** Returns Leaflet circle colour based on status + severity */
function getMarkerColor(marker: MapMarker): string {
  if (marker.ongoing_work) return "#eab308";     // yellow — govt work active
  if (marker.status === "resolved") return "#16a34a"; // green — done
  if (marker.sla_breached || marker.status === "escalated") return "#dc2626"; // red — critical
  if (marker.status === "in_progress") return "#2563eb"; // blue — in progress
  if (marker.status === "assigned") return "#7c3aed";    // purple — assigned
  return "#f97316";                                        // orange — freshly filed
}

/**
 * Feature 4: Civic Map — Leaflet map with colour-coded markers.
 *
 * 🔴 Red     — SLA breached / escalated
 * 🟡 Yellow  — Government work already scheduled (CASE 1)
 * 🟢 Green   — Resolved
 * 🔵 Blue    — In progress
 * 🟣 Purple  — Assigned to officer
 * 🟠 Orange  — Newly filed
 *
 * Dynamically loaded because Leaflet requires window/navigator (browser-only).
 */
export function CivicMap({ markers, center = [18.5204, 73.8567], zoom = 13, height = "500px" }: CivicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      // Fix default icon paths broken by webpack
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapRef.current || leafletMapRef.current) return;

      const map = L.map(mapRef.current).setView(center, zoom);
      leafletMapRef.current = map;

      // Tile layer — OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Render markers
      for (const marker of markers) {
        const color = getMarkerColor(marker);
        const radius = 8 + marker.priority_score * 0.4; // bigger circle = higher priority

        const circle = L.circleMarker([marker.lat, marker.lng], {
          radius: Math.min(radius, 24),
          fillColor: color,
          color: "white",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        });

        const statusLabel = marker.ongoing_work
          ? "🟡 Govt Work Scheduled"
          : marker.status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase());

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 200px; font-size: 13px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: ${color}">
              ${marker.ongoing_work ? "⚠️ " : ""}${marker.category}
            </div>
            <div style="color: #374151; margin-bottom: 4px">
              ${marker.description?.substring(0, 80) ?? "No description"}${(marker.description?.length ?? 0) > 80 ? "…" : ""}
            </div>
            <hr style="margin: 6px 0; border-color: #f1f5f9" />
            <table style="width: 100%; font-size: 11px; color: #64748b">
              <tr><td>Status</td><td style="text-align:right;color:${color};font-weight:600">${statusLabel}</td></tr>
              <tr><td>Severity</td><td style="text-align:right">${marker.severity}/10</td></tr>
              <tr><td>Priority Score</td><td style="text-align:right">${marker.priority_score.toFixed(1)}</td></tr>
              ${marker.sla_breached ? '<tr><td colspan="2" style="color:#dc2626;font-weight:600;text-align:center">⚠️ SLA Breached</td></tr>' : ""}
            </table>
            <div style="margin-top: 6px; font-size: 10px; color: #94a3b8">ID: ${marker.id.substring(0, 8)}</div>
          </div>
        `, { maxWidth: 260 });

        circle.addTo(map);
      }

      cleanup = () => {
        map.remove();
        leafletMapRef.current = null;
      };
    })();

    return () => cleanup?.();
  }, []); // Only run once on mount

  // Load Leaflet CSS
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid #e2e8f0", height }}>
      {/* Map Legend */}
      <div style={{
        position: "absolute", bottom: "16px", left: "16px", zIndex: 1000,
        background: "rgba(255,255,255,0.95)", borderRadius: "10px",
        padding: "0.6rem 0.8rem", fontSize: "11px", lineHeight: "1.8",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "4px", color: "#0f172a", fontSize: "12px" }}>Map Legend</div>
        {[
          { color: "#dc2626", label: "SLA Breached / Escalated" },
          { color: "#eab308", label: "Govt Work Scheduled" },
          { color: "#f97316", label: "Newly Filed" },
          { color: "#7c3aed", label: "Assigned to Officer" },
          { color: "#2563eb", label: "In Progress" },
          { color: "#16a34a", label: "Resolved" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: color, border: "1.5px solid white", boxShadow: `0 0 0 1px ${color}` }} />
            {label}
          </div>
        ))}
      </div>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
