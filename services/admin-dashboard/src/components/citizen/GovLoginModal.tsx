'use client';

import React, { useState, useActionState, useEffect } from 'react';
import { X, Building2, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { login, signup, type AuthState } from '@/app/login/actions';
import { toast } from 'sonner';
import { cities } from '@/lib/cities';

interface GovLoginModalProps {
  onClose: () => void;
  defaultRole?: 'admin' | 'officer';
}

const GovLoginModal = ({ onClose, defaultRole = 'admin' }: GovLoginModalProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const [loginState, loginAction, isLoginPending] = useActionState<AuthState, FormData>(login, {});
  const [signupState, signupAction, isSignupPending] = useActionState<AuthState, FormData>(signup, {});

  useEffect(() => {
    if (signupState.success) {
      toast.success('Account created!', { description: 'Check your email to verify your account.' });
    }
    if (signupState.error) toast.error('Registration failed', { description: signupState.error });
  }, [signupState]);

  useEffect(() => {
    if (loginState.error) toast.error('Login failed', { description: loginState.error });
  }, [loginState]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(30,28,26,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '900px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden',
        maxHeight: '90vh',
      }}>

        {/* LEFT — Branding Panel */}
        <div style={{
          background: 'var(--primary)',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: 'white',
          position: 'relative',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
              <div style={{ background: 'var(--accent)', borderRadius: '8px', padding: '0.5rem' }}>
                <Building2 size={20} />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Playfair Display' }}>CivicPulse</span>
            </div>
            <h2 style={{ fontSize: '2rem', fontFamily: 'Playfair Display', fontWeight: 700, lineHeight: 1.25, marginBottom: '1rem' }}>
              Government Officer Portal
            </h2>
            <p style={{ opacity: 0.75, lineHeight: 1.7, fontSize: '0.95rem', fontFamily: 'Inter' }}>
              Secure access to the AI-powered civic intelligence network. Manage complaints, route field officers, and monitor SLA performance across your city.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', marginTop: '2rem' }}>
            <ShieldCheck size={18} style={{ marginBottom: '0.5rem', opacity: 0.8 }} />
            <p style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.6 }}>
              &ldquo;We are not building a complaint system. We are building a real-time civic intelligence network.&rdquo;
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.5rem' }}>— SCIRP+ Vision</p>
          </div>
        </div>

        {/* RIGHT — Auth Form */}
        <div style={{ padding: '3rem', overflowY: 'auto', position: 'relative' }}>
          {/* Close + Back */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <button
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Inter' }}
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
            <button
              onClick={onClose}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '0.25rem', marginBottom: '2rem' }}>
            {(['login', 'register'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  background: activeTab === tab ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <form action={loginAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Officer Email</label>
                <input name="email" type="email" placeholder="officer@pmc.gov.in" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input name="password" type="password" placeholder="••••••••" required style={inputStyle} />
              </div>
              <button type="submit" disabled={isLoginPending} style={submitBtnStyle}>
                {isLoginPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Sign In to Command Center
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {activeTab === 'register' && (
            <form action={signupAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input name="name" type="text" placeholder="Officer Name" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Official Email</label>
                <input name="email" type="email" placeholder="officer@mcgm.gov.in" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input name="password" type="password" placeholder="Min. 8 characters" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Municipality / City</label>
                <select name="city" required style={inputStyle}>
                  <option value="">Select your city</option>
                  {cities.map(city => (
                    <option key={city.slug} value={city.slug}>{city.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select name="role" required defaultValue={defaultRole} style={inputStyle}>
                  <option value="officer">Field Officer</option>
                  <option value="admin">Department Admin</option>
                  <option value="commissioner">Commissioner</option>
                </select>
              </div>
              <button type="submit" disabled={isSignupPending} style={submitBtnStyle}>
                {isSignupPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Register as Government Officer
              </button>
            </form>
          )}

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'Inter' }}>
            This portal is for <strong>authorized government officials</strong> only. Citizens can report issues without creating an account.
          </p>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-main)',
  fontFamily: 'Inter',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontFamily: 'Inter',
  background: 'var(--bg-color)',
  color: 'var(--text-main)',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const submitBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '0.95rem',
  fontWeight: 600,
  fontFamily: 'Inter',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  transition: 'opacity 0.2s',
  marginTop: '0.5rem',
};

export default GovLoginModal;
