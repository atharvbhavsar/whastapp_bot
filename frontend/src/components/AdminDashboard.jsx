import React, { useState, useEffect } from 'react';
import { Activity, MapPin, TrendingUp, AlertTriangle, Filter, Eye, UserCheck, ShieldAlert, List, Map as MapIcon, Mic, BarChart2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BulletinBoard from './BulletinBoard';
import { fetchComplaints } from '../api.js';
import { Button } from './ui/Button.jsx';

// Fix leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getMarkerColor = (priority) => {
  if (priority === 'Critical') return 'var(--danger)'; 
  if (priority === 'High') return 'var(--warning)'; 
  if (priority === 'Medium') return 'var(--success)'; 
  return 'var(--text-muted)';
};

const analyticsData = [
  { name: 'Mon', Resolved: 12, Reported: 18 },
  { name: 'Tue', Resolved: 19, Reported: 15 },
  { name: 'Wed', Resolved: 15, Reported: 25 },
  { name: 'Thu', Resolved: 22, Reported: 20 },
  { name: 'Fri', Resolved: 30, Reported: 28 },
  { name: 'Sat', Resolved: 14, Reported: 10 },
  { name: 'Sun', Resolved: 8, Reported: 12 },
];

const createCustomIcon = (priority) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${getMarkerColor(priority)}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState(mockComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [activeDept, setActiveDept] = useState('All Departments');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const rawData = await fetchComplaints();
        const mappedData = rawData.map(c => ({
          id: c.id,
          title: c.title || c.category || 'Untitled',
          location: c.address || (
            c.latitude != null && c.longitude != null
              ? `${Number(c.latitude).toFixed(3)}, ${Number(c.longitude).toFixed(3)}`
              : 'Location unknown'
          ),
          priority: ((c.severity_label || c.urgency_tag || c.status || 'medium') + '')
            .charAt(0).toUpperCase() + ((c.severity_label || c.urgency_tag || c.status || 'medium') + '').slice(1),
          score: c.priority_score || c.severity || 0,
          reports: c.reports_count || 1,
          daysPending: Math.floor((Date.now() - new Date(c.created_at || Date.now())) / 86400000),
          lat: c.latitude ?? 18.5204,
          lng: c.longitude ?? 73.8567,
          desc: c.description,
          status: c.status,
          ai: {
            severity: `${c.priority_score || 'N/A'}% Confidence`,
            category: c.category,
            recommendation: c.ai_verification_notes || 'Awaiting AI protocol generation...',
            department: c.department_id || c.category,
          }
        }));

        if (mappedData.length > 0) {
          setComplaints(mappedData);
          setSelectedComplaint(mappedData[0]);
        }
      } catch (error) {
        console.error('Backend offline, using mock data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const departments = ['All Departments', 'Roads & Infrastructure', 'Water & Sanitation', 'Electrical'];

  // Filter complaints by department
  const filteredComplaints = complaints.filter(c => {
    if (activeDept === 'All Departments') return true;
    const deptMatch = (c.ai.department || '').toLowerCase();
    if (activeDept === 'Roads & Infrastructure' && (deptMatch.includes('road') || deptMatch.includes('infra'))) return true;
    if (activeDept === 'Water & Sanitation' && (deptMatch.includes('sanitation') || deptMatch.includes('water'))) return true;
    if (activeDept === 'Electrical' && (deptMatch.includes('elect') || deptMatch.includes('light'))) return true;
    return false;
  });

  const stats = {
    critical: (filteredComplaints || []).filter(c => c.priority === 'Critical').length,
    pending: (filteredComplaints || []).filter(c => c.status !== 'Resolved').length,
    resolved: (complaints || []).filter(c => c.status === 'Resolved').length
  };

  return (
    <div className="grid-layout" style={{ gridTemplateColumns: '1fr 400px' }}>
      
      {/* Main Queue Panel */}
      <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem' }}>
        
        {/* Department Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
          {departments.map(dept => (
            <Button 
              key={dept}
              variant="ghost"
              onClick={() => { setActiveDept(dept); setSelectedComplaint(null); }}
              style={{
                background: activeDept === dept ? 'var(--primary)' : 'transparent',
                color: activeDept === dept ? '#fff' : 'var(--text-muted)',
                padding: '0.5rem 1rem',
                borderRadius: '99px',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: activeDept === dept ? '1px solid var(--primary)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              {dept}
            </Button>
          ))}
        </div>

        {/* AI Copilot Bar */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: '99px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.1)' }}>
          <div style={{ color: 'var(--accent)', animation: 'pulse 2s infinite' }}><Mic size={20} /></div>
          <input 
            type="text" 
            placeholder={`Ask AI Copilot: 'Show me critical issues in ${activeDept}'...`}
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '0.9rem', color: 'var(--primary)', outline: 'none' }}
          />
          <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '0.4rem 0.8rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600 }}>Enter</div>
        </div>

        <div className="section-header" style={{ marginTop: '1rem' }}>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Playfair Display' }}>{activeDept} Queue</h2>
            <p className="section-subtitle">Zone B Overview • {filteredComplaints.length} Active Tickets</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* View Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
              <Button 
                variant="ghost"
                onClick={() => setViewMode('list')}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', background: viewMode === 'list' ? 'var(--bg-secondary)' : 'transparent', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}
              >
                <List size={16} /> List
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setViewMode('map')}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', background: viewMode === 'map' ? 'var(--bg-secondary)' : 'transparent', color: viewMode === 'map' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s', boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}
              >
                <MapIcon size={16} /> Map
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setViewMode('analytics')}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', background: viewMode === 'analytics' ? 'var(--bg-secondary)' : 'transparent', color: viewMode === 'analytics' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s', boxShadow: viewMode === 'analytics' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}
              >
                <BarChart2 size={16} /> Analytics
              </Button>
            </div>
            <Button variant="secondary"><Filter size={18} /> Filters</Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid-layout grid-cols-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '1.5rem', borderRadius: '8px', background: 'var(--danger-light)', border: '1px solid rgba(194, 65, 39, 0.2)' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>Critical SLAs Risk</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.5rem' }}>{stats.critical}</div>
          </div>
          <div style={{ padding: '1.5rem', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>Pending Issues</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem' }}>{stats.pending}</div>
          </div>
          <div style={{ padding: '1.5rem', borderRadius: '8px', background: 'var(--success-light)', border: '1px solid rgba(74, 124, 89, 0.2)' }}>
            <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>Resolved Today</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem' }}>{stats.resolved}</div>
          </div>
        </div>

        {/* List OR Map OR Analytics View */}
        {viewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredComplaints.map((c, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedComplaint(c)}
                style={{ 
                  padding: '1.5rem', 
                  borderRadius: '4px', 
                  border: selectedComplaint?.id === c.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  background: selectedComplaint?.id === c.id ? 'var(--bg-color)' : 'transparent',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '1.5rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'none'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontFamily: 'Playfair Display', color: c.priority === 'Critical' ? 'var(--danger)' : 'var(--primary)' }}>{c.score}</div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Score</div>
                </div>
                
                <div>
                  <h4 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', color: 'var(--primary)', fontFamily: 'Playfair Display' }}>{c.title}</h4>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} /> {c.location}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><TrendingUp size={14} /> {c.reports} Citizens Reported</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: c.daysPending > 3 ? 'var(--danger)' : 'inherit' }}>
                      <AlertTriangle size={14} /> Day {c.daysPending}
                    </span>
                  </div>
                </div>
                
                <div className={`badge badge-${c.priority.toLowerCase()}`}>
                  {c.priority}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div style={{ flex: 1, borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', minHeight: '500px' }}>
            <MapContainer center={[18.5204, 73.8567]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {filteredComplaints.map((c, i) => (
                <Marker 
                  key={i} 
                  position={[c.lat, c.lng]} 
                  icon={createCustomIcon(c.priority)}
                  eventHandlers={{
                    click: () => setSelectedComplaint(c),
                  }}
                >
                  <Popup>
                    <div style={{ fontWeight: 600, fontFamily: 'Inter' }}>{c.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Score: {c.score} | Reports: {c.reports}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '4px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Playfair Display' }}>
                <TrendingUp size={20} color="var(--accent)" /> Reporting Trends (Last 7 Days)
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2dcd0" />
                    <XAxis dataKey="name" stroke="#736c64" />
                    <YAxis stroke="#736c64" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1cbc1', borderRadius: '4px' }} />
                    <Bar dataKey="Reported" fill="var(--warning)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Resolved" fill="var(--success)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '4px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Playfair Display' }}>
                <Activity size={20} color="var(--danger)" /> SLA Breach Risk Prediction
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2dcd0" />
                    <XAxis dataKey="name" stroke="#736c64" />
                    <YAxis stroke="#736c64" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1cbc1', borderRadius: '4px' }} />
                    <Line type="monotone" dataKey="Reported" stroke="var(--danger)" strokeWidth={3} dot={{ fill: 'var(--danger)', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Sidebar */}
      <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--bg-color)', position: 'sticky', top: '100px', height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
        
        {selectedComplaint ? (
          <>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div className={`badge badge-${selectedComplaint.priority.toLowerCase()}`}>{selectedComplaint.priority}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{selectedComplaint.id}</div>
              </div>
              <h2 style={{ fontSize: '1.8rem', lineHeight: '1.2', marginBottom: '1rem' }}>{selectedComplaint.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                {selectedComplaint.desc}
              </p>
            </div>

            {/* AI Analysis Block */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1rem' }}>
                <ShieldAlert size={18} /> AI Severity Analysis
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity Level</div>
                  <div style={{ fontWeight: 500 }}>{selectedComplaint.ai.severity}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category Match</div>
                  <div style={{ fontWeight: 500 }}>{selectedComplaint.ai.category}</div>
                </div>
              </div>

              {/* AI Action Plan */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <Activity size={18} /> AI Action Protocol
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5', background: 'var(--bg-color)', padding: '1rem', borderRadius: '6px' }}>
                  <strong>{selectedComplaint.ai.recommendation}</strong>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                    <span>Estimated Cost: <strong>₹{selectedComplaint.score * 120}</strong></span>
                    <span>Materials: <strong>Auto-requisitioned</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Photos attached */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Citizen Evidence ({selectedComplaint.reports})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ height: '100px', background: '#d1cbc1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Eye /></div>
                <div style={{ height: '100px', background: '#d1cbc1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Eye /></div>
              </div>
            </div>

            {/* AI Smart Routing Block */}
            <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                  <UserCheck size={18} /> AI Auto-Routing
                </div>
                <div className="badge badge-medium">Routed</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target Department:</span>
                  <span style={{ fontWeight: 600 }}>{selectedComplaint.ai.department || 'Roads & Infrastructure'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Selected Officer:</span>
                  <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontWeight: 600, color: 'var(--accent)' }}>
                    Ravi Kumar
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Routing Logic:</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lowest workload in Zone (3 active)</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Button variant="primary" fullWidth style={{ justifyContent: 'center' }}>Confirm & Dispatch Officer</Button>
              <Button variant="danger" fullWidth style={{ justifyContent: 'center' }}>Override Assignment</Button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Select a complaint to view details
          </div>
        )}
      </div>
      
    </div>
  );
};

// Pune coordinates for mock data
const mockComplaints = [
  { 
    id: "CIV-2024-08471",
    title: "Massive Pothole causing accidents", 
    location: "MG Road, Ward 14", 
    priority: "Critical", 
    score: 94, 
    reports: 47, 
    daysPending: 6,
    lat: 18.515, lng: 73.876,
    desc: "A massive pothole has developed near the bus stop. It is roughly 60cm wide and very deep. 2 two-wheelers have already skidded here this morning.",
    ai: { severity: "9/10 (High Risk)", category: "Roads > Pothole", recommendation: "Dispatch emergency patch crew immediately. Flagged as recurring issue zone." }
  },
  { 
    id: "CIV-2024-08482",
    title: "Sewer Line Burst & Flooding", 
    location: "Baner Highway", 
    priority: "Critical", 
    score: 88, 
    reports: 12, 
    daysPending: 1,
    lat: 18.559, lng: 73.786,
    desc: "Drainage line has completely burst and sewage water is flooding the main highway blocking traffic.",
    ai: { severity: "8/10 (Severe)", category: "Drainage > Burst", recommendation: "Requires vacuum truck and repair crew. SLA: 12 Hours." }
  },
  { 
    id: "CIV-2024-08499",
    title: "Streetlight Malfunction Block", 
    location: "FC Road, Zone B", 
    priority: "High", 
    score: 74, 
    reports: 23, 
    daysPending: 4,
    lat: 18.526, lng: 73.843,
    desc: "Entire block of streetlights are completely dead making it very unsafe for pedestrians at night.",
    ai: { severity: "6/10 (Moderate)", category: "Electrical > Streetlight", recommendation: "Assign to Zone B Electrical Engineer." }
  },
  { 
    id: "CIV-2024-08503",
    title: "Garbage Overflow at Junction", 
    location: "Kothrud Depot", 
    priority: "Medium", 
    score: 55, 
    reports: 8, 
    daysPending: 3,
    lat: 18.507, lng: 73.805,
    desc: "The public dustbin has not been cleared for 3 days and garbage is spilling onto the road.",
    ai: { severity: "4/10 (Low Risk)", category: "Sanitation > Garbage", recommendation: "Add to daily collection route." }
  }
];

export default AdminDashboard;
