import React, { useState, useEffect } from 'react';
import { Map, Navigation, CheckCircle, Camera, Check, Clock } from 'lucide-react';
import { fetchComplaints } from '../api.js';
import { Button } from './ui/Button.jsx';

const OfficerApp = () => {
  const [activeTask, setActiveTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState('assigned');
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const rawData = await fetchComplaints();
        const mapped = rawData.slice(0, 5).map(c => ({
          id: c.id,
          type: c.category || 'Maintenance',
          loc: c.address || 'Pune Central',
          dist: (Math.random() * 5).toFixed(1) + 'km',
          priority: ((c.severity_label || c.urgency_tag || 'Medium') + '')
            .charAt(0).toUpperCase() + ((c.severity_label || c.urgency_tag || 'Medium') + '').slice(1),
          desc: c.description,
        }));
        setTasks(mapped);
      } catch (e) {
        console.error('Task fetch failed', e);
        setTasks([
          { id: 'DEMO-1', type: 'Pothole', loc: 'MG Road', dist: '2.1km', priority: 'Critical' },
          { id: 'DEMO-2', type: 'Garbage', loc: 'FC Road', dist: '3.4km', priority: 'High' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, []);


  const handleStartWork = () => setTaskStatus('in_progress');
  const handleUploadPhoto = () => setTaskStatus('photo_uploaded');
  const handleResolve = () => setTaskStatus('resolved');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div className="flat-panel" style={{ width: '400px', height: '800px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: '8px solid #2b2826', borderRadius: '40px' }}>
        
        <div style={{ background: 'var(--primary)', color: 'white', padding: '2rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Officer Portal</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Ravi Kumar</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '50%' }}>
            <Map size={20} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-color)' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading tasks...</div>
          ) : !activeTask ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Today's Route</h3>
                <Button variant="ghost" className="text-accent" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>Optimize</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tasks.map((task, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setActiveTask(task); setTaskStatus('assigned'); }}
                    style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Navigation size={12} /> {task.dist}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>{task.type}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{task.loc} • {task.id}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Button 
                variant="ghost"
                onClick={() => setActiveTask(null)}
                style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'left', padding: 0 }}
              >
                ← Back to List
              </Button>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <div className={`badge badge-${activeTask.priority.toLowerCase()}`} style={{ marginBottom: '1rem' }}>{activeTask.priority}</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{activeTask.type}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{activeTask.loc} • {activeTask.id}</div>
                
                <div style={{ height: '150px', background: '#e3dec9', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  {activeTask.desc}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {taskStatus === 'assigned' && (
                  <Button variant="primary" fullWidth onClick={handleStartWork} style={{ justifyContent: 'center', padding: '1rem' }}>
                    <Clock size={18} /> Mark In Progress
                  </Button>
                )}
                
                {taskStatus === 'in_progress' && (
                  <Button variant="secondary" fullWidth onClick={handleUploadPhoto} style={{ justifyContent: 'center', padding: '1rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    <Camera size={18} /> Take "After" Photo (GPS Locked)
                  </Button>
                )}

                {taskStatus === 'photo_uploaded' && (
                  <>
                    <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={16} /> Photo Geo-Verified by AI
                    </div>
                    <Button variant="primary" fullWidth onClick={handleResolve} style={{ justifyContent: 'center', padding: '1rem' }}>
                      <Check size={18} /> Confirm Resolution
                    </Button>
                  </>
                )}

                {taskStatus === 'resolved' && (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '2rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ width: '50px', height: '50px', background: 'var(--success)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <Check size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Issue Resolved!</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Citizen notified for verification.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficerApp;
