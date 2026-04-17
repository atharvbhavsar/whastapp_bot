"use client";

import { useEffect, useState } from "react";
import ComplaintDetailModal from "../components/ComplaintDetailModal";

const TENANT_OPTIONS = [
  { label: "Pune Municipal Corporation", id: "pune-tenant-uuid-here" },
  { label: "Mumbai Municipal Corporation", id: "mumbai-tenant-uuid-here" },
  { label: "Nagpur Municipal Corporation", id: "nagpur-tenant-uuid-here" },
];

export default function Home() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"complaints" | "analytics" | "sla">("complaints");

  // Phase 4: Multi-tenant switcher
  const [tenantId, setTenantId] = useState(TENANT_OPTIONS[0].id);

  // Analytics state
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [recurringData, setRecurringData] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const API = "http://localhost:3000";
  const headers = { "Content-Type": "application/json", "X-Tenant-ID": tenantId };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/complaints?`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterCategory) url += `category=${filterCategory}&`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [heatRes, recurRes, slaRes] = await Promise.all([
        fetch(`${API}/api/analytics/heatmap`, { headers }),
        fetch(`${API}/api/analytics/recurring`, { headers }),
        fetch(`${API}/api/analytics/sla`, { headers }),
      ]);
      if (heatRes.ok) setHeatmapData((await heatRes.json()).heatmap || []);
      if (recurRes.ok) setRecurringData((await recurRes.json()).recurring || []);
      if (slaRes.ok) setSlaData((await slaRes.json()).violations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "complaints") fetchComplaints();
    if (activeTab === "analytics" || activeTab === "sla") fetchAnalytics();
  }, [tenantId, filterStatus, filterCategory, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Filed": return "bg-gray-100 text-gray-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Resolved": return "bg-green-100 text-green-800";
      case "Escalated": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header + Multi-Tenant Switcher */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SCIRP+ Civic Command Center</h1>
            <p className="text-sm text-gray-500 mt-1">Smart Civic Intelligence Platform — Phase 4</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Phase 4: Multi-Tenant City Switcher */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">🏙️ City (Tenant)</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm font-medium outline-none shadow-sm"
              >
                {TENANT_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchComplaints} className="bg-white border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50 shadow-sm mt-4">
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          {(["complaints", "analytics", "sla"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? "text-blue-700 border-b-2 border-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab === "complaints" ? "📋 Complaints" : tab === "analytics" ? "📊 Analytics" : "⚠️ SLA Violations"}
            </button>
          ))}
        </div>

        {/* Complaints Tab */}
        {activeTab === "complaints" && (
          <>
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded px-3 py-1.5 text-sm outline-none">
                  <option value="">All Statuses</option>
                  <option value="Filed">Filed</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Escalated">Escalated</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <input type="text" placeholder="Type to filter..." value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded px-3 py-1.5 text-sm outline-none" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID / Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category / Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority / Reports</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status / SLA</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading...</td></tr>
                  ) : complaints.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No complaints found.</td></tr>
                  ) : complaints.map((c: any) => (
                    <tr key={c.id} className={`hover:bg-gray-50 ${c.sla_breached ? "bg-red-50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{c.public_id}</div>
                        <div className="text-sm text-gray-500 truncate max-w-[180px]">{c.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 bg-gray-100 inline-block px-2 py-0.5 rounded">{c.category}</div>
                        <div className={`text-xs mt-1 capitalize font-medium ${c.severity === "critical" ? "text-red-600" : c.severity === "high" ? "text-orange-600" : "text-gray-500"}`}>{c.severity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-bold ${c.priority_score > 60 ? "text-red-600" : c.priority_score > 30 ? "text-orange-600" : "text-gray-700"}`}>{c.priority_score}</div>
                        <div className="text-xs text-gray-500 mt-1">👥 {c.reports_count} reports</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(c.status)}`}>{c.status}</span>
                        {c.sla_breached && <div className="text-xs text-red-600 font-medium mt-1">⚠️ SLA Breached</div>}
                        {c.escalation_level > 0 && <div className="text-xs text-red-700 mt-0.5">Escalation Lvl {c.escalation_level}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedComplaintId(c.public_id)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded text-sm"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {analyticsLoading ? (
              <div className="text-center py-10 text-gray-500">Loading analytics...</div>
            ) : (
              <>
                {/* Heatmap Data Table */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-900">📍 Issue Heatmap (Top Complaint Clusters)</h2></div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latitude</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Longitude</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complaints</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {heatmapData.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No heatmap data available.</td></tr>
                      ) : heatmapData.map((h: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm">{h.lat}</td>
                          <td className="px-6 py-3 text-sm">{h.lon}</td>
                          <td className="px-6 py-3 text-sm font-bold text-red-600">{h.complaint_count}</td>
                          <td className="px-6 py-3 text-sm">{Math.round(h.avg_priority)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Recurring Issues */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-900">🔁 Recurring Issues (Last 30 Days)</h2></div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occurrences</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Days Open</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recurringData.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No recurring patterns detected.</td></tr>
                      ) : recurringData.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-medium">{r.category}</td>
                          <td className="px-6 py-3 text-sm font-bold text-orange-600">{r.occurrence_count}</td>
                          <td className="px-6 py-3 text-sm">{Math.round(r.avg_days_open)} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* SLA Tab */}
        {activeTab === "sla" && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b"><h2 className="font-bold text-gray-900">⚠️ SLA Violations (Public Accountability Dashboard)</h2></div>
            {analyticsLoading ? (
              <div className="p-10 text-center text-gray-500">Loading SLA data...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complaint ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA Deadline</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escalation Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {slaData.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-green-600 font-medium">✅ No SLA violations. All complaints within deadline.</td></tr>
                  ) : slaData.map((v: any, i: number) => (
                    <tr key={i} className="hover:bg-red-50 bg-red-50/50">
                      <td className="px-6 py-3 text-sm font-bold">{v.public_id}</td>
                      <td className="px-6 py-3 text-sm text-gray-700 truncate max-w-[200px]">{v.title}</td>
                      <td className="px-6 py-3 text-sm">{v.category}</td>
                      <td className="px-6 py-3 text-sm">{new Date(v.sla_deadline).toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm font-bold text-red-600">{Math.ceil(v.days_overdue)} days</td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${v.escalation_level >= 2 ? "bg-red-200 text-red-800" : "bg-orange-100 text-orange-800"}`}>
                          Level {v.escalation_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedComplaintId && (
        <ComplaintDetailModal
          publicId={selectedComplaintId}
          tenantId={tenantId}
          onClose={() => setSelectedComplaintId(null)}
          onUpdated={() => { setSelectedComplaintId(null); fetchComplaints(); }}
        />
      )}
    </div>
  );
}
