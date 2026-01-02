import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | user | bc_agent

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.role === filter;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>Users ({users.length})</h1>

      <div className="tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`tab ${filter === 'user' ? 'active' : ''}`} onClick={() => setFilter('user')}>Users</button>
        <button className={`tab ${filter === 'bc_agent' ? 'active' : ''}`} onClick={() => setFilter('bc_agent')}>BC Agents</button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Mobile</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.mobile}</td>
                <td>{user.name || '-'}</td>
                <td>
                  <span className={`badge ${user.role === 'bc_agent' ? 'badge-info' : 'badge-gray'}`}>
                    {user.role === 'bc_agent' ? 'BC Agent' : 'User'}
                  </span>
                </td>
                <td>
                  {user.role === 'bc_agent' ? (
                    <span className={`badge ${user.is_online ? 'badge-success' : 'badge-gray'}`}>
                      {user.is_online ? 'Online' : 'Offline'}
                    </span>
                  ) : (
                    <span className="badge badge-gray">-</span>
                  )}
                </td>
                <td>{formatDate(user.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Users;
