import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BulletinBoard.css';
import { fetchPublicStats } from '../api.js';

const newsItems = [
  {
    id: 1,
    headline: "DIVA GHAT BLOCKAGE: 3PM - 5PM",
    subtext: "Maintenance work on North access. Use alternate route.",
    type: "CRITICAL"
  },
  {
    id: 2,
    headline: "WATER SUPPLY ALERT: CENTRAL ZONE",
    subtext: "Low pressure expected due to main pipe repair until 8PM.",
    type: "ALERT"
  },
  {
    id: 3,
    headline: "CITIZEN WIN: 500th POTHOLE FIXED",
    subtext: "System efficiency up by 22% this quarter. Keep reporting!",
    type: "UPDATE"
  },
  {
    id: 4,
    headline: "STREETLIGHT AUDIT: WEST WARD",
    subtext: "Teams scanning for flickering units tonight. Safety first.",
    type: "INFO"
  }
];

const BulletinBoard = ({ isAdmin = false }) => {
  const [index, setIndex] = useState(0);
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % newsItems.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPublicStats()
      .then(data => setLiveStats(data.stats))
      .catch(() => {}); // silently use hardcoded fallback
  }, []);

  const currentNews = newsItems[index];

  return (
    <div className="bulletin-container">
      <div className="bulletin-header">
        <span className="bulletin-title">{isAdmin ? "OFFICIAL GAZETTE" : "DAILY NEWS"}</span>
        <span className="bulletin-date">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
      
      <div className="news-item-wrapper">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNews.id}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="news-content"
          >
            <div className="live-indicator">
              <div className="live-dot"></div>
              {currentNews.type === 'CRITICAL' ? 'Breaking Alert' : 'Live Update'}
            </div>
            <h4 className="news-headline">{currentNews.headline}</h4>
            <p className="news-subtext">{currentNews.subtext}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="stats-panel">
        <div className="stat-row">
          <span className="stat-label">Active Tickets</span>
          <span className="stat-value">{liveStats ? liveStats.total_open.toLocaleString() : '1,402'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Avg. Resolution</span>
          <span className="stat-value">{liveStats?.avg_resolution_hours ? `${(liveStats.avg_resolution_hours / 24).toFixed(1)} Days` : '3.2 Days'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">System Health</span>
          <span className="stat-value">98.4%</span>
        </div>
      </div>
    </div>
  );
};

export default BulletinBoard;
