import axios from 'axios';

const API_URL = 'https://cashjama-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (mobile) => api.post('/auth/send-otp', { mobile }),
  verifyOTP: (mobile, otp) => api.post('/auth/verify-otp', { mobile, otp }),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  getDeposits: () => api.get('/admin/deposits'),
  getBCAgents: () => api.get('/admin/bc-agents'),
  createBCAgent: (mobile, name) => api.post(`/admin/create-bc-agent?mobile=${mobile}&name=${encodeURIComponent(name)}`),
  disableBCAgent: (userId) => api.put(`/admin/bc-agents/${userId}/disable`),
  enableBCAgent: (userId) => api.put(`/admin/bc-agents/${userId}/enable`),
  removeBCAgent: (userId) => api.delete(`/admin/bc-agents/${userId}`),
};

export default api;
