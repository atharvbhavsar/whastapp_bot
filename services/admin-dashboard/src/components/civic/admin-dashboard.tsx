"use client";

import React, { useState, useEffect } from 'react';
import { 
  Activity, MapPin, TrendingUp, AlertTriangle, Filter, Eye, 
  UserCheck, ShieldAlert, List, Map as MapIcon, Mic, BarChart2 
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid 
} from 'recharts';
import BulletinBoard from "./bulletin-board";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const analyticsData = [
  { name: 'Mon', Resolved: 12, Reported: 18 },
  { name: 'Tue', Resolved: 19, Reported: 15 },
  { name: 'Wed', Resolved: 15, Reported: 25 },
  { name: 'Thu', Resolved: 22, Reported: 20 },
  { name: 'Fri', Resolved: 30, Reported: 28 },
  { name: 'Sat', Resolved: 14, Reported: 10 },
  { name: 'Sun', Resolved: 8, Reported: 12 },
];

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [viewMode, setViewMode] = useState('list');
  const [activeDept, setActiveDept] = useState('All Departments');
  const [isLoading, setIsLoading] = useState(true);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    // Initialize Leaflet on client side
    import('leaflet').then(leaflet => {
      setL(leaflet);
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    });

    const fetchComplaints = async () => {
      try {
        const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3000';
        const response = await fetch(`${aiServiceUrl}/api/complaints`, {
          headers: { 'X-Tenant-ID': 'pune-slug' }
        });
        const result = await response.json();
        const rawData = result.complaints || (Array.isArray(result) ? result : []);
        
        // Add minimal mock data if live data is empty for demo purposes
        let finalData = rawData;
        if (finalData.length === 0) {
          finalData = [
            {
              id: 'MOCK-101',
              title: 'Major Water Leak - Baner Main Rd',
              location: 'Baner, Pune',
              priority_score: 92,
              reports_count: 14,
              created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              latitude: 18.559,
              longitude: 73.779,
              description: 'Continuous water leakage from main pipeline near Axis Bank. Flooding on road.',
              status: 'filed',
              sla_breach_risk: 'high',
              category: 'Water & Sanitation'
            },
            {
              id: 'MOCK-102',
              title: 'Streetlight Failure - Sector 4',
              location: 'Hinjewadi, Pune',
              priority_score: 45,
              reports_count: 3,
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              latitude: 18.591,
              longitude: 73.738,
              description: 'Multiple streetlights not working in the internal lane of Sector 4.',
              status: 'assigned',
              sla_breach_risk: 'breached',
              category: 'Electrical'
            }
          ];
        }

        // Map data to high-fidelity UI structure
        const mappedData = finalData.map((c: any) => ({
          id: c.tracking_id || c.id,
          title: c.title,
          location: c.location || 'Pune, MH',
          priority: c.priority_score >= 80 ? 'Critical' : (c.priority_score >= 50 ? 'High' : 'Medium'),
          score: Math.round(c.priority_score || 0),
          reports: c.reports_count || 1,
          daysPending: Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          lat: c.latitude || 18.5204 + (Math.random() - 0.5) * 0.1,
          lng: c.longitude || 73.8567 + (Math.random() - 0.5) * 0.1,
          desc: c.description,
          status: c.status,
          slaRisk: c.sla_breach_risk || 'normal',
          ai: {
            severity: `${Math.round(c.priority_score || 70)}/100 Impact`,
            category: c.category || 'General',
            recommendation: c.ai_verification_notes || "Dispatch inspection team to verify structural integrity and impact on traffic.",
            department: c.category || 'Roads & Infrastructure'
          }
        }));

        setComplaints(mappedData);
        if (mappedData.length > 0) setSelectedComplaint(mappedData[0]);
      } catch (error) {
        console.error("Backend fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const createCustomIcon = (priority: string) => {
    if (!L) return null;
    const color = priority === 'Critical' ? '#c24127' : (priority === 'High' ? '#D96C4A' : '#4A7C59');
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const departments = ['All Departments', 'Roads & Infrastructure', 'Water & Sanitation', 'Electrical'];

  const filteredComplaints = complaints.filter(c => {
    if (activeDept === 'All Departments') return true;
    return c.ai.department === activeDept;
  });

  const stats = {
    critical: complaints.filter(c => c.priority === 'Critical' || c.slaRisk === 'breached').length,
    pending: complaints.filter(c => c.status !== 'resolved').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  };

  if (isLoading) return <div className="p-12 text-center font-serif text-2xl">Loading Authority Command Center...</div>;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Top Gazette Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-primary pb-6 overflow-hidden">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="border-r-2 border-primary pr-6 flex-shrink-0">
            <h1 className="text-4xl font-black font-serif uppercase leading-none tracking-tighter">Official<br />Gazette</h1>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
          <div className="flex-1 max-w-2xl overflow-hidden">
            <BulletinBoard showStats={false} isAdmin={true} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-8 text-right min-w-[300px] flex-shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Active Tickets</div>
            <div className="text-xl font-bold font-serif">{stats.pending + stats.resolved}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Avg. Resolution</div>
            <div className="text-xl font-bold font-serif">3.2 Days</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">System Health</div>
            <div className="text-xl font-bold font-serif text-[#4a7c59]">98.4%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
        
        {/* Main Queue Panel */}
        <div className="bg-card rounded-xl shadow-sm border border-border flex flex-col gap-6 p-8">
          
          {/* Department Tabs */}
          <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto">
            {departments.map(dept => (
              <button 
                key={dept}
                onClick={() => { setActiveDept(dept); setSelectedComplaint(null); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeDept === dept ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* AI Copilot Bar */}
          <div className="bg-secondary/50 border border-accent/30 rounded-full px-6 py-3 flex items-center gap-4 shadow-inner">
            <div className="text-accent animate-pulse"><Mic size={20} /></div>
            <input 
              type="text" 
              placeholder={`Ask AI Copilot: 'Show me critical issues in ${activeDept}'...`}
              className="bg-transparent flex-1 text-sm text-primary outline-none placeholder:text-muted-foreground"
            />
            <div className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold">Enter</div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold font-serif text-primary">{activeDept} Queue</h2>
              <p className="text-sm text-muted-foreground mt-1">Zone B Overview • {filteredComplaints.length} Active Tickets</p>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-secondary p-1 rounded-lg border border-border">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <List size={14} /> List
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'map' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <MapIcon size={14} /> Map
                </button>
                <button 
                  onClick={() => setViewMode('analytics')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'analytics' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <BarChart2 size={14} /> Analytics
                </button>
              </div>
              <button className="flex items-center gap-2 bg-white border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                <Filter size={16} /> Filters
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-[#fdf2f0] border border-[#f5e1dd]">
              <div className="text-[#c24127] font-bold text-xs uppercase tracking-wider">Critical SLAs Risk</div>
              <div className="text-4xl font-bold text-[#c24127] mt-2">{stats.critical}</div>
            </div>
            <div className="p-6 rounded-xl bg-secondary border border-border">
              <div className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Pending Issues</div>
              <div className="text-4xl font-bold text-primary mt-2">{stats.pending}</div>
            </div>
            <div className="p-6 rounded-xl bg-[#f2f7f3] border border-[#e1e9e3]">
              <div className="text-[#4a7c59] font-bold text-xs uppercase tracking-wider">Resolved Today</div>
              <div className="text-4xl font-bold text-[#4a7c59] mt-2">{stats.resolved}</div>
            </div>
          </div>

          {/* Views */}
          <div className="flex-1">
            {viewMode === 'list' && (
              <div className="flex flex-col gap-4">
                {filteredComplaints.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-6 rounded-xl border transition-all cursor-pointer flex items-center gap-6 ${
                      selectedComplaint?.id === c.id 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-accent hover:bg-secondary/30'
                    }`}
                  >
                    <div className="text-center min-w-[60px]">
                      <div className={`text-2xl font-bold font-serif ${c.priority === 'Critical' ? 'text-[#c24127]' : 'text-primary'}`}>
                        {c.score}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Score</div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-bold font-serif text-primary truncate">{c.title}</h4>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><MapPin size={12} /> {c.location}</span>
                        <span className="flex items-center gap-1.5"><TrendingUp size={12} /> {c.reports} Reports</span>
                        <span className={`flex items-center gap-1.5 ${c.daysPending > 3 ? 'text-[#c24127] font-bold' : ''}`}>
                          <AlertTriangle size={12} /> Day {c.daysPending}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                      c.priority === 'Critical' ? 'bg-[#fdf2f0] text-[#c24127]' : 
                      (c.priority === 'High' ? 'bg-secondary text-primary' : 'bg-[#f2f7f3] text-[#4a7c59]')
                    }`}>
                      {c.priority}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'map' && MapContainer && (
              <div className="h-[600px] w-full rounded-xl overflow-hidden border border-border shadow-inner relative z-0">
                <MapContainer center={[18.5204, 73.8567]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  {filteredComplaints.map((c) => (
                    <Marker 
                      key={c.id} 
                      position={[c.lat, c.lng]} 
                      icon={createCustomIcon(c.priority)}
                      eventHandlers={{ click: () => setSelectedComplaint(c) }}
                    >
                      <Popup>
                        <div className="font-bold">{c.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">Score: {c.score} | Reports: {c.reports}</div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}

            {viewMode === 'analytics' && (
              <div className="flex flex-col gap-8">
                <div className="bg-secondary/30 p-8 rounded-xl border border-border">
                  <h3 className="text-xl font-bold font-serif mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-accent" /> Reporting Trends (Last 7 Days)
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2dcd0" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f1eee9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2dcd0' }} />
                        <Bar dataKey="Reported" fill="#D96C4A" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Resolved" fill="#4A7C59" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail Sidebar */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 h-fit sticky top-8">
          {selectedComplaint ? (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                    selectedComplaint.priority === 'Critical' ? 'bg-[#fdf2f0] text-[#c24127]' : 'bg-secondary text-primary'
                  }`}>
                    {selectedComplaint.priority}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{selectedComplaint.id}</div>
                </div>
                <h2 className="text-3xl font-bold font-serif text-primary leading-tight mb-4">{selectedComplaint.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedComplaint.desc}
                </p>
              </div>

              <div className="bg-secondary p-6 rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-2 font-bold text-primary text-sm">
                  <ShieldAlert size={18} /> AI Severity Analysis
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Impact Score</div>
                    <div className="text-sm font-semibold">{selectedComplaint.ai.severity}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Category</div>
                    <div className="text-sm font-semibold">{selectedComplaint.ai.category}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 font-bold text-accent text-sm mb-2">
                    <Activity size={18} /> AI Action Protocol
                  </div>
                  <div className="bg-white p-4 rounded-lg text-xs leading-relaxed border border-border shadow-sm italic">
                    "{selectedComplaint.ai.recommendation}"
                    <div className="mt-3 flex gap-4 text-[10px] font-bold text-muted-foreground not-italic">
                      <span>Est. Cost: ₹{selectedComplaint.score * 120}</span>
                      <span>Resources: Auto-allocated</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-2"><UserCheck size={18} /> AI Auto-Routing</span>
                  <span className="text-[10px] uppercase text-[#4a7c59] bg-[#f2f7f3] px-2 py-1 rounded font-bold">Routed</span>
                </div>
                <div className="bg-secondary/40 p-4 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-bold">{selectedComplaint.ai.department}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Assigned Officer:</span>
                    <span className="bg-primary text-white px-3 py-1 rounded-full font-bold">Ravi Kumar</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button className="bg-primary text-white py-3 rounded-xl font-bold hover:bg-accent shadow-md transition-all">Confirm & Dispatch</button>
                <button className="text-destructive font-bold text-sm py-2">Override Assignment</button>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground italic text-sm text-center px-8">
              Select a complaint from the queue to generate AI analysis and routing protocols.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
