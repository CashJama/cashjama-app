import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

class ApiService {
  private instance: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: `${BACKEND_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired - will be handled by AuthContext
          console.log('Auth error - token may be expired');
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
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
