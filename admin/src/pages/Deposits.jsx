import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadDeposits();
  }, []);

  const loadDeposits = async () => {
    try {
      const response = await adminAPI.getDeposits();
      setDeposits(response.data.deposits || []);
    } catch (err) {
      console.error('Failed to load deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeposits = deposits.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['completed', 'cancelled'].includes(d.status);
    return d.status === filter;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'requested': { class: 'badge-warning', label: 'Requested' },
      'agent_assigned': { class: 'badge-info', label: 'Assigned' },
      'arrived': { class: 'badge-info', label: 'Arrived' },
      'cash_collected': { class: 'badge-info', label: 'Cash Collected' },
      'deposited': { class: 'badge-info', label: 'Deposited' },
      'awaiting_confirmation': { class: 'badge-warning', label: 'Awaiting Confirm' },
      'completed': { class: 'badge-success', label: 'Completed' },
      'cancelled': { class: 'badge-danger', label: 'Cancelled' },
    };
    const s = statusMap[status] || { class: 'badge-gray', label: status };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>Deposits ({deposits.length})</h1>

      <div className="tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
        <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
        <button className={`tab ${filter === 'cancelled' ? 'active' : ''}`} onClick={() => setFilter('cancelled')}>Cancelled</button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Amount</th>
              <th>Fee</th>
              <th>Status</th>
              <th>BC Agent</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeposits.map(deposit => (
              <tr key={deposit.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{deposit.id.slice(0, 8)}...</td>
                <td>{deposit.user_mobile || '-'}</td>
                <td style={{ fontWeight: '600' }}>₹{deposit.amount?.toLocaleString()}</td>
                <td>₹{deposit.service_fee}</td>
                <td>{getStatusBadge(deposit.status)}</td>
                <td>{deposit.bc_agent_mobile || '-'}</td>
                <td>{formatDate(deposit.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Deposits;
