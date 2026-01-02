import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

function BCAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ mobile: '', name: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await adminAPI.getBCAgents();
      setAgents(response.data.bc_agents || []);
    } catch (err) {
      console.error('Failed to load BC agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    
    try {
      await adminAPI.createBCAgent(newAgent.mobile, newAgent.name);
      setShowModal(false);
      setNewAgent({ mobile: '', name: '' });
      loadAgents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create BC agent');
    } finally {
      setCreating(false);
    }
  };

  const handleDisable = async (userId) => {
    if (!confirm('Are you sure you want to disable this BC agent?')) return;
    try {
      await adminAPI.disableBCAgent(userId);
      loadAgents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to disable agent');
    }
  };

  const handleEnable = async (userId) => {
    try {
      await adminAPI.enableBCAgent(userId);
      loadAgents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to enable agent');
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Are you sure you want to remove this BC agent? They will be demoted to a regular user.')) return;
    try {
      await adminAPI.removeBCAgent(userId);
      loadAgents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove agent');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>BC Agents ({agents.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add BC Agent</button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Mobile</th>
              <th>Name</th>
              <th>Status</th>
              <th>Online</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id}>
                <td>{agent.mobile}</td>
                <td>{agent.name || '-'}</td>
                <td>
                  <span className={`badge ${agent.is_active !== false ? 'badge-success' : 'badge-danger'}`}>
                    {agent.is_active !== false ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${agent.is_online ? 'badge-success' : 'badge-gray'}`}>
                    {agent.is_online ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td>{formatDate(agent.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {agent.is_active !== false ? (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDisable(agent.id)}>Disable</button>
                    ) : (
                      <button className="btn btn-success btn-sm" onClick={() => handleEnable(agent.id)}>Enable</button>
                    )}
                    <button className="btn btn-sm" style={{ background: '#374151' }} onClick={() => handleRemove(agent.id)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add New BC Agent</h2>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="Enter 10-digit mobile"
                  value={newAgent.mobile}
                  onChange={(e) => setNewAgent({ ...newAgent, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter agent name"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" style={{ background: '#374151' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || newAgent.mobile.length !== 10}>
                  {creating ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BCAgents;
