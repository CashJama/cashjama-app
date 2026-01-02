import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total_users || 0}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_bc_agents || 0}</div>
          <div className="stat-label">BC Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#10B981' }}>{stats?.online_bc_agents || 0}</div>
          <div className="stat-label">Online Now</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_deposits || 0}</div>
          <div className="stat-label">Total Deposits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#10B981' }}>{stats?.completed_deposits || 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#F59E0B' }}>{stats?.active_deposits || 0}</div>
          <div className="stat-label">Active Jobs</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/bc-agents" className="btn btn-primary">Manage BC Agents</a>
          <a href="/deposits" className="btn btn-success">View Deposits</a>
          <a href="/users" className="btn" style={{ background: '#374151' }}>View Users</a>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
