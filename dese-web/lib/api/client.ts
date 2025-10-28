import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  metrics: '/aiops/metrics',
  feedback: '/aiops/feedback',
  anomalies: '/aiops/anomalies',
  anomalyTimeline: '/aiops/anomalies/timeline',
  health: '/health',
} as const;

// Type definitions
export interface AIOpsMetrics {
  anomalyCount: number;
  correlationAccuracy: number;
  remediationSuccess: number;
  avgLatency: number;
  errorRate: number;
  uptime: number;
  timestamp: string;
}

export interface Feedback {
  id: string;
  message: string;
  rating: number;
  timestamp: string;
  userId?: string;
}

export interface Anomaly {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  zScore: number;
  resolved: boolean;
}

export interface AnomalyTimeline {
  timestamp: string;
  anomalies: Anomaly[];
  totalCount: number;
}

// API functions
export const apiClient = {
  // Metrics
  getMetrics: async (): Promise<AIOpsMetrics> => {
    const response = await api.get(endpoints.metrics);
    return response.data;
  },

  // Feedback
  getFeedback: async (): Promise<Feedback[]> => {
    const response = await api.get(endpoints.feedback);
    return response.data;
  },

  createFeedback: async (feedback: Omit<Feedback, 'id' | 'timestamp'>): Promise<Feedback> => {
    const response = await api.post(endpoints.feedback, feedback);
    return response.data;
  },

  // Anomalies
  getAnomalies: async (): Promise<Anomaly[]> => {
    const response = await api.get(endpoints.anomalies);
    return response.data;
  },

  getAnomalyTimeline: async (): Promise<AnomalyTimeline[]> => {
    const response = await api.get(endpoints.anomalyTimeline);
    return response.data;
  },

  // Health check
  getHealth: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get(endpoints.health);
    return response.data;
  },
};
