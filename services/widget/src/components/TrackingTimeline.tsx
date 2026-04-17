import React, { useState } from "react";
import { API_BASE_URL } from "../lib/constants";
import { Search, Loader2, MapPin } from "lucide-react";

export function TrackingTimeline() {
  const [complaintId, setComplaintId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintId) return;

    setIsLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints/${complaintId}`);
      if (!response.ok) {
        throw new Error("Complaint not found with this ID.");
      }
      const json = await response.json();
      setData(json.complaint);
    } catch (err: any) {
      setError(err.message || "Failed to fetch complaint details");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Filed": return "bg-gray-200 text-gray-700";
      case "Assigned": return "bg-blue-100 text-blue-700";
      case "In Progress": return "bg-yellow-100 text-yellow-700";
      case "Resolved": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={complaintId}
            onChange={(e) => setComplaintId(e.target.value)}
            placeholder="Enter Complaint ID (e.g. CIV-2026-12345)"
            className="w-full border rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
          />
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-medium px-6 rounded-lg transition-colors"
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Track"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {data && (
        <div className="bg-white border text-left overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-start border-b">
            <div>
              <h3 className="text-lg leading-6 font-bold text-gray-900">{data.title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">ID: {data.public_id} • Category: {data.category}</p>
            </div>
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(data.status)}`}>
              {data.status}
            </span>
          </div>
          <div className="bg-gray-50 border-b px-4 py-2 flex items-center text-sm font-medium text-gray-500">
             <span className="mr-2">👥</span> {data.reports_count || 1} Citizens reported this (Priority: {data.priority_score || 0})
          </div>
          <div className="px-4 py-5 sm:p-6">
             <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
             <p className="text-sm text-gray-600 mb-6">{data.description}</p>

             <div className="flex items-center text-sm text-gray-500 mb-6">
                <MapPin className="h-4 w-4 mr-1" />
                {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}
             </div>

             <h4 className="text-md font-bold text-gray-900 mb-4">Status Updates</h4>
             <div className="flow-root">
                <ul className="-mb-8">
                  {data.status_logs?.map((log: any, logIdx: number) => (
                    <li key={logIdx}>
                      <div className="relative pb-8">
                        {logIdx !== data.status_logs.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        ) : null}
                        <div className="relative flex space-x-3 items-start">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(log.status)}`}>
                              {logIdx === 0 ? "🏁" : "🔄"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{log.status}</p>
                              <p className="text-sm text-gray-500 mt-1">{log.notes || "System update"}</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleString()}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
