'use client';

import React, { useState } from 'react';
import { ShieldAlert, User, Briefcase, Map, LogOut } from 'lucide-react';
import LandingPage from '@/components/citizen/LandingPage';
import CitizenPortal from '@/components/citizen/CitizenPortal';
import OfficerApp from '@/components/citizen/OfficerApp';
import BulletinBoard from '@/components/citizen/BulletinBoard';
import Chatbot from '@/components/citizen/Chatbot';

// This page replicates the Vite App.jsx role-based routing inside Next.js.
export default function CitizenAppPage() {
  const [userRole, setUserRole] = useState<'citizen' | 'admin' | 'officer' | null>(null);

  return (
    <div className="civic-app" style={{ minHeight: '100vh' }}>
      {!userRole ? (
        <LandingPage onLogin={setUserRole} />
      ) : (
        <>
          <nav className="navbar">
            <div
              className="logo-container"
              style={{ cursor: 'pointer' }}
              onClick={() => setUserRole(null)}
            >
              <ShieldAlert className="logo-icon" size={28} />
              <span className="logo-text">CivicPulse</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="badge badge-neutral" style={{ padding: '0.4rem 0.8rem' }}>
                {userRole === 'citizen' && <><User size={14} /> Citizen Mode</>}
                {userRole === 'admin' && <><Briefcase size={14} /> Admin Mode</>}
                {userRole === 'officer' && <><Map size={14} /> Officer Mode</>}
              </div>

              <button
                className="btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                onClick={() => setUserRole(null)}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </nav>

          <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <BulletinBoard isAdmin={userRole === 'admin'} />
            <div style={{ flex: 1 }}>
              {userRole === 'citizen' && <CitizenPortal />}
              {userRole === 'admin' && (
                // Admin section — redirect to the SCIRP+ Command Center
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <h2>Admin Dashboard</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Access the full SCIRP+ Command Center with complaint management and analytics.
                  </p>
                  <a
                    href="/"
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  >
                    <Briefcase size={16} /> Open SCIRP+ Command Center
                  </a>
                </div>
              )}
              {userRole === 'officer' && <OfficerApp />}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
