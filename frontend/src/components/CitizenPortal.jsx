import React, { useState, useEffect } from 'react';
import ComplaintPaper from './ComplaintPaper';
import { MapPin, Search, Clock, FileCheck2, AlertCircle } from 'lucide-react';
import BulletinBoard from './BulletinBoard';
import { fetchComplaints, fetchComplaint } from '../api.js';
import { Button } from './ui/Button.jsx';

const CitizenPortal = () => {
  const [trackingId, setTrackingId] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [nearbyIssues, setNearbyIssues] = useState(mockNearby);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadNearby = async () => {
      try {
        const rawData = await fetchComplaints();
        const mapped = rawData.slice(0, 3).map(c => ({
          category: c.category || 'General',
          title: c.title || c.description?.substring(0, 60) || 'Unknown issue',
          distance: 'Within 500m',
          reports: c.reports_count || 1,
        }));
        if (mapped.length > 0) setNearbyIssues(mapped);
      } catch (e) { console.log('Nearby fetch failed', e); }
    };
    loadNearby();
  }, []);

  const handleTrack = async () => {
    if (!trackingId) return;
    setIsSearching(true);
    try {
      const complaint = await fetchComplaint(trackingId);
      setTrackedComplaint(complaint);
    } catch (e) {
      alert('Complaint not found. Please check the ID and try again.');
      console.log('Tracking failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="grid-layout grid-cols-sidebar">
      {/* Left Sidebar: Tracking and Map */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Track Report Section */}
        <div className="flat-panel">
          <h3 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            <Search size={20} /> Track Your Report
          </h3>
          <div className="input-group">
            <input 
              type="text" 
              className="text-input" 
              placeholder="Enter Tracking ID (e.g., CIV-2024-084)" 
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
            />
          </div>
          <Button 
            variant="secondary" 
            fullWidth
            style={{ justifyContent: 'center' }}
            onClick={handleTrack}
            disabled={isSearching}
          >
            {isSearching ? "Searching..." : "Check Status"}
          </Button>

          {/* Dynamic Timeline */}
          {trackedComplaint && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              {/* Backend returns complaint_events, not status_logs */}
              {(trackedComplaint.complaint_events || []).map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--success)' }}>
                    {log.event_type === 'RESOLVED' ? <FileCheck2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.event_type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleDateString()} • {log.metadata?.notes || log.event_type}
                    </div>
                  </div>
                </div>
              ))}
              {(!trackedComplaint.complaint_events || trackedComplaint.complaint_events.length === 0) && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No status updates yet.</div>
              )}
            </div>
          )}
        </div>

        {/* Nearby Issues Section */}
        <div className="flat-panel">
          <h3 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            <MapPin size={20} /> Nearby Issues
          </h3>
          <p className="section-subtitle" style={{ marginBottom: '1.5rem' }}>
            Issues reported within 500m of you. Tap "Me Too" to upvote priority.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {nearbyIssues.map((issue, i) => (
              <div key={i} style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>{issue.category}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{issue.distance}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{issue.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{issue.reports} citizens reported</span>
                  <Button variant="secondary" size="sm">Me Too</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Side: Complaint Paper */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <ComplaintPaper />
      </div>
    </div>
  );
};

const mockNearby = [
  { category: "Pothole", title: "Large crater on Main St", distance: "120m away", reports: 12 },
  { category: "Garbage", title: "Overflowing bin near park", distance: "340m away", reports: 4 },
  { category: "Streetlight", title: "Light pole #42 completely off", distance: "450m away", reports: 8 }
];

export default CitizenPortal;
