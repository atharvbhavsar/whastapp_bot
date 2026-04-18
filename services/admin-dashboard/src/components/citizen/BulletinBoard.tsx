'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchPublicStats } from '@/lib/civic-api';

const newsItems = [
  { id: 1, headline: 'DIVA GHAT BLOCKAGE: 3PM - 5PM', subtext: 'Maintenance work on North access. Use alternate route.', type: 'CRITICAL' },
  { id: 2, headline: 'WATER SUPPLY ALERT: CENTRAL ZONE', subtext: 'Low pressure expected due to main pipe repair until 8PM.', type: 'ALERT' },
  { id: 3, headline: 'CITIZEN WIN: 500th POTHOLE FIXED', subtext: 'System efficiency up by 22% this quarter. Keep reporting!', type: 'UPDATE' },
  { id: 4, headline: 'STREETLIGHT AUDIT: WEST WARD', subtext: 'Teams scanning for flickering units tonight. Safety first.', type: 'INFO' },
];

const BulletinBoard = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [index, setIndex] = useState(0);
  const [liveStats, setLiveStats] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setIndex(prev => (prev + 1) % newsItems.length), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPublicStats().then((data: any) => setLiveStats(data?.stats)).catch(() => {});
  }, []);

  const currentNews = newsItems[index];

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '0.85rem' }}>
      <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {isAdmin ? '📰 Official Gazette' : '📢 Daily News'}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '40px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNews.id}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <div style={{ fontWeight: 600, color: currentNews.type === 'CRITICAL' ? 'var(--danger)' : 'var(--primary)', marginBottom: '0.1rem' }}>
              {currentNews.headline}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{currentNews.subtext}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', whiteSpace: 'nowrap' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Tickets</div>
          <div style={{ fontWeight: 700 }}>{liveStats?.total_open?.toLocaleString() ?? '1,402'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Resolution</div>
          <div style={{ fontWeight: 700 }}>{liveStats?.avg_resolution_hours ? `${(liveStats.avg_resolution_hours / 24).toFixed(1)} Days` : '3.2 Days'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Health</div>
          <div style={{ fontWeight: 700, color: 'var(--success)' }}>98.4%</div>
        </div>
      </div>
    </div>
  );
};

export default BulletinBoard;
