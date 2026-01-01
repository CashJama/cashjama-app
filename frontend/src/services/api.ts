import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get backend URL from multiple sources with fallbacks
const getBackendUrl = (): string => {
  // Try expo-constants first (most reliable in Expo Go)
  const expoConfig = Constants.expoConfig?.extra?.backendUrl;
  if (expoConfig) return expoConfig;
  
  // Try process.env (works in some builds)
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) return envUrl;
  
  // Fallback: Use relative URL (works when frontend/backend on same domain)
  // For Expo Go on real device, this will be empty and we use the proxy
  return '';
};

const BACKEND_URL = getBackendUrl();

// Log the URL for debugging (remove in production)
console.log('[API] Backend URL:', BACKEND_URL || '(using relative /api)');

// Callback for auth expiry - will be set by AuthContext
let onAuthExpiry: (() => void) | null = null;

class ApiService {
  private instance: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    // If BACKEND_URL is empty, use relative path (for same-origin requests)
    const baseURL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';
    
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[API] Axios baseURL:', baseURL);

    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor with better 401 handling
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.log('Auth error - token expired, clearing auth state');
          // Clear stored auth
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('auth_user');
          this.authToken = null;
          // Trigger auth expiry callback if set
          if (onAuthExpiry) {
            onAuthExpiry();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  setOnAuthExpiry(callback: () => void) {
    onAuthExpiry = callback;
  }

  // Auth endpoints
  async sendOTP(mobile: string) {
    const response = await this.instance.post('/auth/send-otp', { mobile });
    return response.data;
  }

  async verifyOTP(mobile: string, otp: string) {
    const response = await this.instance.post('/auth/verify-otp', { mobile, otp });
    return response.data;
  }

  async resendOTP(mobile: string) {
    const response = await this.instance.post('/auth/resend-otp', { mobile });
    return response.data;
  }

  async getProfile() {
    const response = await this.instance.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: { name?: string }) {
    const response = await this.instance.put('/auth/update-profile', data);
    return response.data;
  }

  async logout() {
    const response = await this.instance.post('/auth/logout');
    return response.data;
  }

  // Deposit endpoints
  async calculateFee(amount: number) {
    const response = await this.instance.get(`/deposits/fee-calculator?amount=${amount}`);
    return response.data;
  }

  async createDeposit(data: {
    amount: number;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
  }) {
    const response = await this.instance.post('/deposits/create', data);
    return response.data;
  }

  async getMyDeposits() {
    const response = await this.instance.get('/deposits/my-requests');
    return response.data;
  }

  async getDepositDetails(depositId: string) {
    const response = await this.instance.get(`/deposits/${depositId}`);
    return response.data;
  }

  async cancelDeposit(depositId: string, reason?: string) {
    const response = await this.instance.put(`/deposits/${depositId}/cancel`, null, {
      params: { reason },
    });
    return response.data;
  }

  async getActiveDeposit() {
    const response = await this.instance.get('/deposits/active/current');
    return response.data;
  }

  async confirmDeposit(depositId: string) {
    const response = await this.instance.post(`/deposits/${depositId}/confirm-deposit`);
    return response.data;
  }

  // BC Agent endpoints
  async getAvailableJobs() {
    const response = await this.instance.get('/bc/jobs/available');
    return response.data;
  }

  async getAssignedJobs() {
    const response = await this.instance.get('/bc/jobs/assigned');
    return response.data;
  }

  async getBCJobHistory() {
    const response = await this.instance.get('/bc/jobs/history');
    return response.data;
  }

  async acceptJob(depositId: string) {
    const response = await this.instance.post(`/bc/jobs/${depositId}/accept`);
    return response.data;
  }

  async rejectJob(depositId: string) {
    const response = await this.instance.post(`/bc/jobs/${depositId}/reject`);
    return response.data;
  }

  async verifyJobOTP(depositId: string, otp: string) {
    const response = await this.instance.post(`/bc/jobs/${depositId}/verify-otp`, { otp });
    return response.data;
  }

  async completeJob(depositId: string) {
    const response = await this.instance.post(`/bc/jobs/${depositId}/complete`);
    return response.data;
  }

  async updateJobStatus(depositId: string, status: string) {
    const response = await this.instance.post(`/bc/jobs/${depositId}/update-status?status=${status}`);
    return response.data;
  }

  async setOnlineStatus(isOnline: boolean) {
    const response = await this.instance.put(`/bc/online-status?is_online=${isOnline}`);
    return response.data;
  }

  async getOnlineStatus() {
    const response = await this.instance.get('/bc/online-status');
    return response.data;
  }

  async updateBCLocation(latitude: number, longitude: number, accuracy?: number) {
    const response = await this.instance.put('/bc/location', { latitude, longitude, accuracy });
    return response.data;
  }

  async getBCLocation(bcAgentId: string) {
    const response = await this.instance.get(`/bc/location/${bcAgentId}`);
    return response.data;
  }

  async getBCEarnings() {
    const response = await this.instance.get('/bc/earnings');
    return response.data;
  }

  async getBCJobDetails(depositId: string) {
    const response = await this.instance.get(`/bc/job/${depositId}`);
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.instance.get('/health');
    return response.data;
  }
}

export const api = new ApiService();
