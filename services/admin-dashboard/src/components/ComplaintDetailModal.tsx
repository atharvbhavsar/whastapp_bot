"use client";

import { useEffect, useState } from "react";

interface ComplaintDetailModalProps {
  publicId: string;
  tenantId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ComplaintDetailModal({ publicId, tenantId, onClose, onUpdated }: ComplaintDetailModalProps) {
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ score: number; notes: string } | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Phase 3: Officer provides resolution image URL dynamically (no hardcoded URLs)
  const [resolutionImageUrl, setResolutionImageUrl] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/complaints/${publicId}`, {
          headers: { "X-Tenant-ID": tenantId },
        });
        if (res.ok) {
          const data = await res.json();
          setComplaint(data.complaint);
          // Pre-fill if already verified
          if (data.complaint.ai_verification_score) {
            setVerificationResult({
              score: data.complaint.ai_verification_score,
              notes: data.complaint.ai_verification_notes,
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [publicId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!complaint) return;

    // Phase 3: For resolution, require after_image_url to run AI verification
    if (newStatus === "Resolved" && !resolutionImageUrl) {
      alert("Please paste the URL of the resolution photo before resolving. This is required for AI verification.");
      return;
    }

    setUpdating(true);
    setVerificationError(null);
    try {
      const res = await fetch(`http://localhost:3000/api/complaints/${complaint.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({
          status: newStatus,
          updated_by_email: "admin@scirp.gov",
          after_image_url: newStatus === "Resolved" ? resolutionImageUrl : undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 422) {
        // AI rejected the resolution — block it
        setVerificationError(data.message);
        setVerificationResult({ score: data.verificationScore, notes: data.verificationNotes });
        return;
      }

      if (res.ok) {
        if (data.verificationScore !== undefined) {
          setVerificationResult({ score: data.verificationScore, notes: data.verificationNotes });
        }
        onUpdated();
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Filed": return "bg-gray-100 text-gray-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Resolved": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!complaint && !loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded text-center">
          <p>Error loading complaint.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{complaint?.public_id || "Loading..."}</h2>
            {complaint && (
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-gray-500">Reported on {new Date(complaint.created_at).toLocaleString()}</p>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>{complaint.status}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading details...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Issue Details */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{complaint.title}</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded border whitespace-pre-wrap">{complaint.description}</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Category</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{complaint.category} — <span className="capitalize">{complaint.severity}</span> severity</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Priority Score</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{complaint.priority_score} (👥 {complaint.reports_count} reports)</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Location</p>
                    <a
                      href={`https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {complaint.latitude?.toFixed(5)}, {complaint.longitude?.toFixed(5)} → Open in Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Right: Images + Logs */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Citizen Evidence Photo</p>
                <div className="w-full h-36 bg-gray-100 border rounded overflow-hidden flex items-center justify-center">
                  {complaint.image_url ? (
                    <img src={complaint.image_url} alt="Before" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-gray-400 text-xs">No photo submitted</span>
                  )}
                </div>

                {/* Phase 3: Show resolution image if resolved */}
                {complaint.resolution_image_url && (
                  <>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2">Resolution Photo (After)</p>
                    <div className="w-full h-36 bg-gray-100 border rounded overflow-hidden">
                      <img src={complaint.resolution_image_url} alt="After" className="object-cover w-full h-full" />
                    </div>
                  </>
                )}

                {/* Phase 3: AI Verification Result */}
                {verificationResult && (
                  <div className={`mt-4 p-3 rounded border text-sm ${verificationResult.score >= 50 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                    <p className="font-bold mb-1">🧠 AI Verification Score: {verificationResult.score}/100</p>
                    <p>{verificationResult.notes}</p>
                  </div>
                )}

                {verificationError && (
                  <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">
                    <p className="font-bold">⛔ Resolution Rejected by AI</p>
                    <p className="mt-1">{verificationError}</p>
                  </div>
                )}

                <h4 className="mt-6 text-sm font-bold text-gray-900 mb-3 border-b pb-2">Status Log</h4>
                <ul className="space-y-3">
                  {complaint.status_logs?.map((log: any, idx: number) => (
                    <li key={idx} className="text-xs">
                      <div className="font-semibold text-gray-800">{log.status}</div>
                      <div className="text-gray-500 mt-0.5">{new Date(log.timestamp).toLocaleString()} · {log.updated_by_email || "System"}</div>
                      <div className="text-gray-600 italic mt-0.5">{log.notes}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Phase 3: Resolution Image URL input for Officer */}
            {complaint.status !== "Resolved" && (
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Resolution Photo URL (Required for Closure + AI Verification)</p>
                <input
                  type="url"
                  value={resolutionImageUrl}
                  onChange={(e) => setResolutionImageUrl(e.target.value)}
                  placeholder="Paste publicly accessible URL of the after-fix photo"
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
                {resolutionImageUrl && (
                  <img
                    src={resolutionImageUrl} alt="Resolution preview"
                    className="mt-2 w-full h-32 object-cover rounded border"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Action Buttons */}
        {!loading && complaint && (
          <div className="border-t p-5 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-gray-500 font-medium">Update Status:</span>
            <div className="flex gap-3 flex-wrap">
              <button
                disabled={complaint.status === "Assigned" || updating}
                onClick={() => handleUpdateStatus("Assigned")}
                className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 rounded font-medium disabled:opacity-50 text-sm"
              >
                Assign to Officer
              </button>
              <button
                disabled={complaint.status === "In Progress" || updating}
                onClick={() => handleUpdateStatus("In Progress")}
                className="px-4 py-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200 rounded font-medium disabled:opacity-50 text-sm"
              >
                Mark In Progress
              </button>
              <button
                disabled={complaint.status === "Resolved" || updating || !resolutionImageUrl}
                onClick={() => handleUpdateStatus("Resolved")}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded font-bold disabled:opacity-50 text-sm"
                title={!resolutionImageUrl ? "Paste resolution image URL above first" : ""}
              >
                {updating ? "Verifying via AI..." : "Resolve + AI Verify"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
