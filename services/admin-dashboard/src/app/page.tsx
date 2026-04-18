"use client";

import React from 'react';
import { ShieldAlert, User, Briefcase, Map, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  const onLogin = (role: string) => {
    if (role === 'admin') {
      router.push('/login');
    } else if (role === 'citizen') {
      router.push('/citizen');
    } else if (role === 'officer') {
      router.push('/officer');
    }
  };

  return (
    <div className="bg-background text-foreground" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
          <ShieldAlert size={28} color="var(--accent)" />
          <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'Playfair Display' }}>CivicPulse</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', fontFamily: 'Inter' }}>AI-Powered Governance Platform</div>
      </div>

      {/* Hero Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="bg-secondary text-secondary-foreground rounded-full" style={{ marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>
          Welcome to the future of civic resolution
        </div>
        <h1 style={{ fontSize: '4rem', fontFamily: 'Playfair Display', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.5rem', maxWidth: '800px', lineHeight: 1.1 }}>
          Fix your city.<br />Faster, with AI.
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', maxWidth: '600px', marginBottom: '4rem', lineHeight: 1.6, fontFamily: 'Inter' }}>
          Automated routing, instant GPS tracking, and real-time SLA management to bridge the gap between citizens and authorities.
        </p>

        {/* Login Portals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-[1100px]">

          {/* Citizen Card */}
          <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => onLogin('citizen')} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ background: 'rgba(217, 108, 74, 0.1)', color: 'var(--accent)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <User size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'Playfair Display' }}>Citizen Portal</h3>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'Inter' }}>Report issues, upvote local problems, and track resolutions in real-time.</p>
            <button className="flex items-center justify-center gap-2 bg-transparent text-primary border border-border px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-secondary w-full">
              Login as Citizen <ArrowRight size={16} />
            </button>
          </div>

          {/* Admin Card */}
          <div className="bg-card text-card-foreground border rounded-lg shadow-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', transition: 'transform 0.2s', cursor: 'pointer', borderColor: 'var(--accent)', borderWidth: '2px' }} onClick={() => onLogin('admin')} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ background: 'var(--secondary)', color: 'var(--primary)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <Briefcase size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'Playfair Display' }}>Authority Dashboard</h3>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'Inter' }}>AI queue management, automated officer routing, and zone analytics.</p>
            <button className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-accent w-full">
              Login as Admin <ArrowRight size={16} />
            </button>
          </div>

          {/* Officer Card */}
          <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => onLogin('officer')} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ background: '#eef7f1', color: '#4a7c59', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <Map size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontFamily: 'Playfair Display' }}>Field Officer App</h3>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'Inter' }}>GPS-optimized routes, task checklist, and AI photo verification.</p>
            <button className="flex items-center justify-center gap-2 bg-transparent text-primary border border-border px-4 py-2 rounded-md font-medium text-sm transition-colors hover:bg-secondary w-full">
              Login as Officer <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
