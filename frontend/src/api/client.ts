import axios from "axios";

// Use relative path in browser environment to leverage Next.js proxy
// In SSR environment, use internal docker service name or localhost default
const baseURL = typeof window !== "undefined" 
  ? "/api/v1" 
  : (process.env.INTERNAL_API_URL || "http://app:3000/api/v1");

export const api = axios.create({
  baseURL,
  timeout: 10000, // Increased timeout for docker networking
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to inject token if available (client-side)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
