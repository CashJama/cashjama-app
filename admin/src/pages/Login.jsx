import React, { useState } from 'react';
import { authAPI } from '../api';

const ADMIN_PHONES = ['9520497353', '7409143674'];

function Login({ onLogin }) {
  const [step, setStep] = useState('phone'); // phone | otp
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!ADMIN_PHONES.includes(mobile)) {
      setError('Access denied. This number is not authorized for admin access.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendOTP(mobile);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await authAPI.verifyOTP(mobile, otp);
      const { token, user } = response.data;
      onLogin(token, user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">CashJama Admin</h1>
        <p className="login-subtitle">Sign in to access the admin dashboard</p>

        {error && <div className="error-message">{error}</div>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label className="form-label">Admin Phone Number</label>
              <input
                type="tel"
                className="input"
                placeholder="Enter your phone number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || mobile.length !== 10}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label className="form-label">Enter OTP sent to {mobile}</label>
              <input
                type="text"
                className="input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" className="btn" style={{ width: '100%', marginTop: '12px', background: 'transparent', color: '#9CA3AF' }} onClick={() => { setStep('phone'); setOtp(''); }}>
              Change Number
            </button>
          </form>
        )}

        <p style={{ marginTop: '24px', fontSize: '13px', color: '#6B7280', textAlign: 'center' }}>
          Dev Mode: Use OTP 123456
        </p>
      </div>
    </div>
  );
}

export default Login;
