'use client';

import React from 'react';
import { ShieldAlert, User, Briefcase, Map, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

const LandingPage = ({ onLogin }: { onLogin: (role: 'citizen' | 'admin' | 'officer') => void }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Top Bar */}
      <div style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
          <ShieldAlert size={28} color="var(--accent)" />
          <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'Playfair Display' }}>CivicPulse</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'Inter' }}>AI-Powered Governance Platform</div>
      </div>

      {/* Hero Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="badge badge-medium" style={{ marginBottom: '2rem', padding: '0.5rem 1rem' }}>
          Welcome to the future of civic resolution
        </div>
        <h1 style={{ fontSize: '4rem', fontFamily: 'Playfair Display', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.5rem', maxWidth: '800px', lineHeight: 1.1 }}>
          Fix your city.<br />Faster, with AI.
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '4rem', lineHeight: 1.6, fontFamily: 'Inter' }}>
          Automated routing, instant GPS tracking, and real-time SLA management to bridge the gap between citizens and authorities.
        </p>

        {/* Login Portals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', width: '100%', maxWidth: '1100px' }}>

          {/* Citizen Card */}
          <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => onLogin('citizen')} onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <User size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'Playfair Display' }}>Citizen Portal</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'Inter' }}>Report issues, upvote local problems, and track resolutions in real-time.</p>
            <Button variant="secondary" fullWidth style={{ justifyContent: 'space-between' }}>
              Login as Citizen <ArrowRight size={16} />
            </Button>
          </div>

          {/* Admin Card */}
          <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', transition: 'transform 0.2s', cursor: 'pointer', border: '2px solid var(--accent)' }} onClick={() => onLogin('admin')} onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div style={{ background: 'var(--bg-tertiary)', color: 'var(--primary)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <Briefcase size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'Playfair Display' }}>Authority Dashboard</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'Inter' }}>AI queue management, automated officer routing, and zone analytics.</p>
            <Button variant="primary" fullWidth style={{ justifyContent: 'space-between' }}>
              Login as Admin <ArrowRight size={16} />
            </Button>
          </div>

          {/* Officer Card */}
          <div className="flat-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => onLogin('officer')} onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <Map size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'Playfair Display' }}>Field Officer App</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'Inter' }}>GPS-optimized routes, task checklist, and AI photo verification.</p>
            <Button variant="secondary" fullWidth style={{ justifyContent: 'space-between' }}>
              Login as Officer <ArrowRight size={16} />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LandingPage;
