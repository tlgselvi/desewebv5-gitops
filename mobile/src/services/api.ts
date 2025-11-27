/**
 * API Client
 * 
 * Centralized API client for mobile app
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000', 10);

/**
 * API Client class
 */
class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          await AsyncStorage.removeItem('auth_token');
          // TODO: Navigate to login screen
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Get axios instance
   */
  getInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * Set auth token
   */
  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }

  /**
   * Clear auth token
   */
  async clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
  }
}

// Singleton instance
export const apiClient = new APIClient();

/**
 * API endpoints
 */
export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      apiClient.getInstance().post('/auth/login', { email, password }),
    logout: () => apiClient.getInstance().post('/auth/logout'),
  },

  // AI & Chat
  ai: {
    ragQuery: (query: string, options?: { topK?: number; temperature?: number }) =>
      apiClient.getInstance().post('/ai/rag/query', { query, ...options }),
    chatMessage: (message: string, sessionId?: string) =>
      apiClient.getInstance().post('/ai/chat/message', { message, sessionId }),
    chatHistory: (sessionId: string) =>
      apiClient.getInstance().get(`/ai/chat/history/${sessionId}`),
    search: (query: string, options?: { topK?: number; useRAG?: boolean }) =>
      apiClient.getInstance().post('/ai/search/semantic', { query, ...options }),
    recommendations: (itemType: string, limit?: number) =>
      apiClient.getInstance().post('/ai/recommendations', { itemType, limit }),
  },

  // Dashboard
  dashboard: {
    getOverview: () => apiClient.getInstance().get('/ceo/home'),
  },
};

