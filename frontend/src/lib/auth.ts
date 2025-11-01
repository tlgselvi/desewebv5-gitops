import { decodeJwt, jwtVerify } from "jose";
import { api, apiMethods } from "../api/client";

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TOKEN_EXPIRY_KEY = "token_expiry";

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface UserInfo {
  id: string;
  email: string;
  role: string;
  exp?: number;
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJwt(token) as UserInfo;
    if (!decoded.exp) return true;
    
    // Check if token expires within 5 minutes
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return expiryTime - now < fiveMinutes;
  } catch {
    return true;
  }
}

/**
 * Store tokens in localStorage
 */
function storeTokens(accessToken: string, refreshToken?: string, expiresIn?: number): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  
  if (expiresIn) {
    const expiryTime = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } else {
    // Try to extract expiry from token
    try {
      const decoded = decodeJwt(accessToken) as UserInfo;
      if (decoded.exp) {
        localStorage.setItem(TOKEN_EXPIRY_KEY, (decoded.exp * 1000).toString());
      }
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Clear all tokens from storage
 */
function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return null;
    }

    const response = await apiMethods.post<LoginResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });

    if (response.access_token) {
      storeTokens(response.access_token, response.refresh_token, response.expires_in);
      return response.access_token;
    }

    return null;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    clearTokens();
    return null;
  }
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getValidToken(): Promise<string | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  
  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    // Try to refresh
    const newToken = await refreshAccessToken();
    return newToken;
  }

  return token;
}

/**
 * Login user and store tokens
 */
export async function login(username: string, password: string): Promise<UserInfo> {
  const response = await apiMethods.post<LoginResponse>("/auth/login", {
    username,
    password,
  });

  storeTokens(response.access_token, response.refresh_token, response.expires_in);

  const decoded = decodeJwt(response.access_token) as UserInfo;
  return decoded;
}

/**
 * Logout user and clear tokens
 */
export function logout(): void {
  clearTokens();
  
  // Optionally call logout endpoint
  apiMethods.post("/auth/logout").catch(() => {
    // Ignore errors on logout
  });
}

/**
 * Get current access token (without refresh)
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get current user information from token
 */
export function getUserInfo(): UserInfo | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    const decoded = decodeJwt(token) as UserInfo;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get user role
 */
export function getUserRole(): string | null {
  const userInfo = getUserInfo();
  return userInfo?.role || null;
}

/**
 * Get user ID
 */
export function getUserId(): string | null {
  const userInfo = getUserInfo();
  return userInfo?.id || null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  
  return !isTokenExpired(token);
}

/**
 * Verify token validity (async)
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET || "");
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
