import React, { useState } from 'react';
import './index.css';
import BulletinBoard from './components/BulletinBoard';
import './App.css';
import LandingPage from './components/LandingPage';
import CitizenPortal from './components/CitizenPortal';
import AdminDashboard from './components/AdminDashboard';
import OfficerApp from './components/OfficerApp';
import Chatbot from './components/Chatbot';
import { ShieldAlert, User, Briefcase, Map, LogOut } from 'lucide-react';

function App() {
  const [userRole, setUserRole] = useState(null); // null = landing, 'citizen', 'admin', 'officer'

  return (
    <div className="app-container">
      {!userRole ? (
        <LandingPage onLogin={setUserRole} />
      ) : (
        <>
          <nav className="navbar">
            <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => setUserRole(null)}>
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
              {userRole === 'admin' && <AdminDashboard />}
              {userRole === 'officer' && <OfficerApp />}
            </div>
          </main>
        </>
      )}
      <Chatbot />
    </div>
  );
}

export default App;
