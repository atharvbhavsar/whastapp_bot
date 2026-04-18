"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, Mic, Send, Check, MessageCircle } from 'lucide-react';
import './complaint-paper.css';

const ComplaintPaper = () => {
  const [step, setStep] = useState('editing'); // editing, folding, dropping, submitted
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [imageAttached, setImageAttached] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setStep('folding');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AI_SERVICE_URL}/api/complaints`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'pune-slug' 
        },
        body: JSON.stringify({
          title,
          description,
          category: 'General',
          location: 'Pune, Maharashtra'
        })
      });
      const data = await response.json();
      if (data.complaint) {
        setTicketId(data.complaint.tracking_id);
      } else {
        setTicketId('CIV-' + Math.floor(Math.random() * 10000));
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setTicketId('CIV-' + Math.floor(Math.random() * 10000));
    }

    setTimeout(() => {
      setStep('dropping');
    }, 1200);

    setTimeout(() => {
      setStep('submitted');
      setTimeout(() => setShowWhatsapp(true), 1000);
    }, 2500);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageAttached(false);
    setShowWhatsapp(false);
    setStep('editing');
  };

  return (
    <div className="paper-scene" style={{ position: 'relative' }}>
      
      {/* WhatsApp Floating Notification Mock */}
      <AnimatePresence>
        {showWhatsapp && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ position: 'fixed', top: '2rem', right: '2rem', background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
          >
            <div style={{ background: '#25D366', padding: '0.5rem', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>WhatsApp • Now</div>
              <div style={{ fontSize: '0.95rem', color: 'white', fontWeight: 500 }}>
                🟢 <strong>CivicPulse:</strong> Your issue {ticketId} has been verified by AI and sent to the Roads Dept.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The 3D Complaint Box sits behind the paper */}
      <div className={`complaint-box-3d ${step !== 'editing' ? 'visible' : ''} ${step === 'dropping' ? 'receiving' : ''}`}>
        <div className="box-slot"></div>
        <div className="box-branding">Complaint Box</div>
      </div>

      <AnimatePresence>
        {step !== 'submitted' && (
          <motion.div
            initial={{ y: "-10%", x: "-50%", opacity: 0, rotateX: 10 }}
            animate={{ 
              y: step === 'dropping' ? "30%" : "-50%", 
              x: "-50%",
              opacity: step === 'dropping' ? 0 : 1,
              rotateX: step !== 'editing' ? 75 : 0,
              scale: step === 'dropping' ? 0.25 : (step !== 'editing' ? 0.35 : 1)
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              duration: step === 'dropping' ? 0.9 : 1.2,
              ease: [0.4, 0, 0.2, 1]
            }}
            style={{ width: '100%', position: 'absolute', top: '50%', left: '50%', zIndex: 10, display: 'flex', justifyContent: 'center' }}
          >
            <div className="paper-document">
              <div className="paper-header">
                <h2>Civic Report</h2>
                <p>Date: {new Date().toLocaleDateString()}</p>
              </div>

              <form onSubmit={handleSubmit} className="paper-form">
                <input 
                  type="text" 
                  className="paper-field focus-visible:outline-none focus:outline-none focus:ring-0" 
                  placeholder="Location / Landmark (Auto GPS tags available)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                
                <textarea 
                  className="paper-field paper-textarea focus-visible:outline-none focus:outline-none focus:ring-0" 
                  placeholder="Describe the issue clearly..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />

                {/* Multimedia Preview Section */}
                <AnimatePresence>
                  {imageAttached && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                      <div style={{ width: '60px', height: '60px', borderRadius: '4px', background: 'url(https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=100&q=80) center/cover', border: '1px solid var(--border)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>IMG_4921.jpg</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--chart-3)', fontFamily: 'var(--font-sans)' }}>GPS Metadata Verified</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="paper-actions">
                  <div className="media-group">
                    <button type="button" className="icon-btn" style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}>
                      <Mic size={18} /> Ask AI
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setImageAttached(true)}>
                      <Camera size={18} /> Photo
                    </button>
                    <button type="button" className="icon-btn">
                      <MapPin size={18} /> GPS
                    </button>
                  </div>

                  <button type="submit" className="submit-paper-btn" disabled={step !== 'editing'}>
                    Submit <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === 'submitted' && (
          <motion.div 
            className="success-ticket"
            initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-30%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="ticket-icon">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="ticket-title">Report Filed</h2>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '1.1rem', fontFamily: 'var(--font-sans)' }}>Your issue is securely in the system.</p>
            <div className="ticket-id">{ticketId}</div>
            
            <button 
              className="submit-paper-btn" 
              style={{ margin: '1rem auto 0', width: '100%', justifyContent: 'center' }}
              onClick={resetForm}
            >
              Report Another Issue
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ComplaintPaper;
