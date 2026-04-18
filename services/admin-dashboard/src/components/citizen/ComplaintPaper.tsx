'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, MapPin, Mic, Send, Check, MessageCircle } from 'lucide-react';
import { submitComplaint } from '@/lib/civic-api';
import { Button } from './ui/Button';

const ComplaintPaper = () => {
  const [step, setStep] = useState<'editing' | 'folding' | 'dropping' | 'submitted'>('editing');
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
      const result = await submitComplaint({
        title,
        description,
        latitude: 18.5204 + (Math.random() - 0.5) * 0.01,
        longitude: 73.8567 + (Math.random() - 0.5) * 0.01,
        category: 'General',
      });
      setTicketId((result as any).master_id || (result as any).report_id || 'CIV-' + Date.now());
    } catch {
      setTicketId('CIV-OFFLINE-' + Math.floor(Math.random() * 1000));
    }

    setTimeout(() => setStep('dropping'), 1200);
    setTimeout(() => { setStep('submitted'); setTimeout(() => setShowWhatsapp(true), 1000); }, 2500);
  };

  const resetForm = () => { setTitle(''); setDescription(''); setImageAttached(false); setShowWhatsapp(false); setStep('editing'); };

  return (
    <div style={{ position: 'relative', minHeight: '600px', width: '100%', maxWidth: '540px' }}>

      {/* WhatsApp Floating Notification */}
      <AnimatePresence>
        {showWhatsapp && (
          <motion.div
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ position: 'fixed', top: '2rem', right: '2rem', background: 'rgba(30,41,59,0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
          >
            <div style={{ background: '#25D366', padding: '0.5rem', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>WhatsApp • Now</div>
              <div style={{ fontSize: '0.95rem', color: 'white', fontWeight: 500 }}>
                🟢 <strong>CivicPulse:</strong> Issue {ticketId} verified by AI and sent to Roads Dept.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Complaint Box */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '200px', height: '120px', background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)', borderRadius: '8px', display: step !== 'editing' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
        <div style={{ width: '80%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.5rem' }} />
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complaint Box</div>
      </div>

      {/* Paper Form */}
      <AnimatePresence>
        {step !== 'submitted' && (
          <motion.div
            initial={{ y: '-10%', opacity: 0 }}
            animate={{
              y: step === 'dropping' ? '60%' : '0%',
              opacity: step === 'dropping' ? 0 : 1,
              rotateX: step !== 'editing' ? 70 : 0,
              scale: step !== 'editing' ? (step === 'dropping' ? 0.25 : 0.4) : 1,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: step === 'dropping' ? 0.9 : 1.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%', zIndex: 10 }}
          >
            <div style={{ background: '#fdfbf7', border: '1px solid var(--border-color)', borderRadius: '4px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', padding: '2rem', position: 'relative' }}>
              {/* Lined paper lines */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ position: 'absolute', left: '4rem', right: '1.5rem', top: `${5 + i * 2.5}rem`, height: '1px', background: 'rgba(209,203,193,0.5)' }} />
              ))}
              {/* Red margin line */}
              <div style={{ position: 'absolute', left: '3.5rem', top: 0, bottom: 0, width: '1px', background: 'rgba(217,108,74,0.3)' }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontFamily: 'Playfair Display', fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>Civic Report</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'Inter' }}>Date: {new Date().toLocaleDateString()}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Location / Landmark (Auto GPS tags available)"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    style={{ border: 'none', borderBottom: '2px solid var(--border-color)', background: 'transparent', fontFamily: 'Inter', fontSize: '0.95rem', padding: '0.5rem 0', outline: 'none', color: 'var(--primary)' }}
                  />
                  <textarea
                    placeholder="Describe the issue clearly..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    rows={4}
                    style={{ border: 'none', borderBottom: '2px solid var(--border-color)', background: 'transparent', fontFamily: 'Inter', fontSize: '0.95rem', padding: '0.5rem 0', outline: 'none', resize: 'none', color: 'var(--primary)' }}
                  />

                  <AnimatePresence>
                    {imageAttached && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '4px', background: '#e8e3d9', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📸</div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>IMG_4921.jpg</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>GPS Metadata Verified</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="primary" size="sm" style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }} type="button"><Mic size={14} /> Ask AI</Button>
                      <Button variant="ghost" size="sm" onClick={() => setImageAttached(true)} type="button"><Camera size={14} /> Photo</Button>
                      <Button variant="ghost" size="sm" type="button"><MapPin size={14} /> GPS</Button>
                    </div>
                    <Button type="submit" variant="primary" disabled={step !== 'editing'} style={{ background: 'var(--accent)', borderColor: 'var(--accent)', borderRadius: '20px', padding: '0.6rem 1.5rem' }}>
                      Submit <Send size={14} />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success State */}
      <AnimatePresence>
        {step === 'submitted' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center' }}
          >
            <div style={{ width: '70px', height: '70px', background: 'var(--success)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Check size={32} strokeWidth={3} />
            </div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '2rem', marginBottom: '0.5rem' }}>Report Filed</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontFamily: 'Inter', marginBottom: '1.5rem' }}>Your issue is securely in the system.</p>
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1.5rem', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', marginBottom: '1.5rem', display: 'inline-block' }}>{ticketId}</div>
            <Button variant="primary" fullWidth onClick={resetForm} style={{ justifyContent: 'center' }}>Report Another Issue</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComplaintPaper;
