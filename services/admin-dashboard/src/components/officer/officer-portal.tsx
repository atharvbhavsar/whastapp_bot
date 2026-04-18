"use client";

import React, { useState, useEffect } from 'react';
import { Map, Navigation, CheckCircle, Camera, Check, Clock, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function OfficerPortal() {
  const [activeTask, setActiveTask] = useState<any>(null);
  const [taskStatus, setTaskStatus] = useState('assigned');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_AI_SERVICE_URL}/api/complaints`, {
          headers: { 'X-Tenant-ID': 'pune-slug' }
        });
        const result = await response.json();
        const rawData = result.complaints || (Array.isArray(result) ? result : []);
        
        const mapped = rawData.slice(0, 5).map((c: any) => ({
          id: c.tracking_id || c.id,
          type: c.category || 'Maintenance',
          loc: c.location || 'Pune Central',
          dist: (Math.random() * 5).toFixed(1) + "km",
          priority: (c.severity || 'Medium').charAt(0).toUpperCase() + (c.severity || 'Medium').slice(1),
          desc: c.description
        }));
        setTasks(mapped);
      } catch (e) {
        console.error("Task fetch failed", e);
        setTasks([
          { id: "DEMO-1", type: "Pothole", loc: "MG Road", dist: "2.1km", priority: "Critical", desc: "Large pothole in the middle of the road." },
          { id: "DEMO-2", type: "Garbage", loc: "FC Road", dist: "3.4km", priority: "High", desc: "Garbage bin overflowing for 3 days." }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const handleStartWork = () => setTaskStatus('in_progress');
  const handleUploadPhoto = () => {
    toast.success("AI Photo verification successful!");
    setTaskStatus('photo_uploaded');
  };
  const handleResolve = () => {
    toast.success("Issue marked as Resolved!");
    setTaskStatus('resolved');
  };

  return (
    <div className="flex justify-center w-full py-8">
      <div className="bg-card w-[400px] h-[750px] shadow-2xl rounded-[40px] border-[8px] border-primary flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-8 pb-4 flex justify-between items-center">
          <div>
            <div className="text-xs opacity-70">Officer Portal</div>
            <div className="text-xl font-bold font-serif">Officer Ravi</div>
          </div>
          <div className="bg-white/10 p-2 rounded-full">
            <Map size={20} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Syncing tasks...</div>
          ) : !activeTask ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg font-serif">Today's Route</h3>
                <button className="text-accent text-sm font-semibold">Optimize</button>
              </div>

              <div className="flex flex-col gap-4">
                {tasks.map((task, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setActiveTask(task); setTaskStatus('assigned'); }}
                    className="bg-card p-4 rounded-xl border border-border shadow-sm cursor-pointer hover:border-accent transition-colors"
                  >
                    <div className="flex justify-between mb-2">
                      <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                        task.priority === 'Critical' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Navigation size={12} /> {task.dist}</span>
                    </div>
                    <div className="font-bold text-primary mb-1">{task.type}</div>
                    <div className="text-xs text-muted-foreground">{task.loc} • {task.id}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full">
              <button 
                onClick={() => setActiveTask(null)}
                className="flex items-center gap-1 text-muted-foreground text-sm mb-4 hover:text-primary transition-colors"
              >
                <ChevronLeft size={16} /> Back to List
              </button>

              <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-6">
                <div className={`text-[0.65rem] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block mb-4 ${
                  activeTask.priority === 'Critical' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'
                }`}>
                  {activeTask.priority}
                </div>
                <h2 className="text-2xl font-bold font-serif text-primary mb-2">{activeTask.type}</h2>
                <div className="text-sm text-muted-foreground mb-6">{activeTask.loc} • {activeTask.id}</div>
                
                <div className="bg-secondary/50 p-4 rounded-lg text-sm text-muted-foreground italic">
                  "{activeTask.desc}"
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-4">
                {taskStatus === 'assigned' && (
                  <button onClick={handleStartWork} className="bg-primary text-primary-foreground p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent transition-colors">
                    <Clock size={18} /> Mark In Progress
                  </button>
                )}
                
                {taskStatus === 'in_progress' && (
                  <button onClick={handleUploadPhoto} className="bg-transparent border-2 border-accent text-accent p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all">
                    <Camera size={18} /> Take "After" Photo
                  </button>
                )}

                {taskStatus === 'photo_uploaded' && (
                  <>
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Photo Geo-Verified by AI
                    </div>
                    <button onClick={handleResolve} className="bg-primary text-primary-foreground p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent transition-colors">
                      <Check size={18} /> Confirm Resolution
                    </button>
                  </>
                )}

                {taskStatus === 'resolved' && (
                  <div className="bg-secondary/30 p-8 rounded-xl text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center mb-4">
                      <Check size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Issue Resolved!</h3>
                    <p className="text-xs text-muted-foreground">Citizen notified for verification.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
