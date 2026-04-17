import React, { useState } from "react";
import { TrackingTimeline } from "./TrackingTimeline";
import { API_BASE_URL } from "../lib/constants";

type MessageType = "success" | "meToo" | "ongoingWork" | "error" | null;

interface GovernmentWork {
  title: string;
  department: string;
  expected_completion: string;
}

export function CivicForm() {
  const [view, setView] = useState<"submit" | "track">("submit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [messageText, setMessageText] = useState("");
  const [governmentWork, setGovernmentWork] = useState<GovernmentWork | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const getGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      () => alert("Unable to retrieve your location")
    );
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLatitude(null);
    setLongitude(null);
    setImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latitude || !longitude || !title) {
      alert("Please provide title and click 'Detect My Location' before submitting.");
      return;
    }

    setIsSubmitting(true);
    setMessageType(null);
    setGovernmentWork(null);

    const tenantIdInput = document.currentScript?.getAttribute("data-tenant-id") || "demo-city";

    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantIdInput
        },
        body: JSON.stringify({
          title,
          description,
          latitude,
          longitude,
          citizen_email: email,
          image_url: imageUrl || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.isOngoingWork) {
          setMessageType("ongoingWork");
          setMessageText(data.message);
          setGovernmentWork(data.governmentWork);
          resetForm();
        } else if (data.isDuplicate) {
          setMessageType("meToo");
          setMessageText(`A similar issue has already been reported. Your voice has been added to ticket ${data.complaint.public_id} ("Me Too" recorded).`);
          resetForm();
        } else {
          setMessageType("success");
          setMessageText(`Complaint filed successfully! Your Complaint ID is: ${data.complaint.public_id}`);
          resetForm();
        }
      } else {
        setMessageType("error");
        setMessageText(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setMessageType("error");
      setMessageText("Failed to reach server. Check if the backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white shadow-xl rounded-2xl overflow-hidden border">
      <div className="bg-blue-700 text-white p-6">
        <h1 className="text-2xl font-bold">Smart Civic Portal</h1>
        <p className="text-sm opacity-90 mt-1">AI-powered civic issue reporting & tracking</p>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setView("submit")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${view === "submit" ? "text-blue-700 border-b-2 border-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Report Issue
        </button>
        <button
          onClick={() => setView("track")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${view === "track" ? "text-blue-700 border-b-2 border-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Track Issue
        </button>
      </div>

      <div className="p-6">
        {view === "submit" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
              <input
                type="text" required
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
              <textarea
                rows={3} required
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Describe the issue, its impact, and any relevant details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Email (Optional)</label>
              <input
                type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Receive status updates via email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <button
                type="button" onClick={getGPS}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm border transition-colors"
              >
                📍 Detect My Location
              </button>
              {latitude && longitude && (
                <p className="text-xs text-green-600 mt-2 font-medium">
                  ✅ Location confirmed: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo Evidence URL <span className="text-gray-400 text-xs">(optional)</span></label>
              <input
                type="url"
                value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Paste a publicly accessible image URL"
              />
              {imageUrl && (
                <img src={imageUrl} alt="Preview" className="mt-2 w-full h-32 object-cover rounded border" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !latitude}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {isSubmitting ? "Analyzing & Submitting..." : "Submit Complaint"}
              </button>
            </div>

            {messageType === "ongoingWork" && governmentWork && (
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-600 text-xl">🚧</span>
                  <p className="text-sm font-bold text-yellow-800">Work Already In Progress</p>
                </div>
                <p className="text-sm text-yellow-700">{messageText}</p>
                <div className="mt-3 text-xs text-yellow-600 space-y-1">
                  <p><strong>Project:</strong> {governmentWork.title}</p>
                  <p><strong>Department:</strong> {governmentWork.department}</p>
                  <p><strong>Expected Completion:</strong> {new Date(governmentWork.expected_completion).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            {messageType === "meToo" && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                👥 {messageText}
              </div>
            )}

            {messageType === "success" && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm font-medium text-green-700">
                ✅ {messageText}
              </div>
            )}

            {messageType === "error" && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                ❌ {messageText}
              </div>
            )}
          </form>
        ) : (
          <TrackingTimeline />
        )}
      </div>
    </div>
  );
}
