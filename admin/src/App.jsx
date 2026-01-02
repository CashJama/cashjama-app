import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Deposits from './pages/Deposits';
import BCAgents from './pages/BCAgents';

const ADMIN_PHONES = ['9520497353', '7409143674'];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('admin_user');
    
    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      if (ADMIN_PHONES.includes(parsedUser.mobile)) {
        setIsAuthenticated(true);
        setUser(parsedUser);
      } else {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    if (!ADMIN_PHONES.includes(userData.mobile)) {
      throw new Error('Access denied. Admin only.');
    }
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="container">
      <nav className="nav">
        <div className="nav-brand">CashJama Admin</div>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Dashboard</Link>
          <Link to="/users" className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}>Users</Link>
          <Link to="/deposits" className={`nav-link ${location.pathname === '/deposits' ? 'active' : ''}`}>Deposits</Link>
          <Link to="/bc-agents" className={`nav-link ${location.pathname === '/bc-agents' ? 'active' : ''}`}>BC Agents</Link>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleLogout}>Logout</button>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/deposits" element={<Deposits />} />
        <Route path="/bc-agents" element={<BCAgents />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
