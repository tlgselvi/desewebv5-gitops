/**
 * Authentication Utilities
 * 
 * Provides authentication functions for login, logout, and token management.
 */

import { decodeJwt, JWTPayload as JoseJWTPayload } from "jose";
import type { LoginResponse, JWTPayload, UserRole } from "@/types/auth";
import { logger } from "./logger";

// =============================================================================
// TYPES
// =============================================================================

// Extend jose JWTPayload with our custom fields
interface DecodedToken extends JoseJWTPayload {
  role?: string;
  email?: string;
  organizationId?: string;
}

// =============================================================================
// LOGIN / LOGOUT
// =============================================================================

/**
 * Login function - uses public API (no token required)
 * 
 * @param username - User's email or username
 * @param password - User's password
 * @returns Decoded JWT payload
 * @throws Error if login fails
 */
export async function login(username: string, password: string): Promise<DecodedToken> {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Giriş başarısız");
  }

  const res: LoginResponse = await response.json();
  
  const token = res.token || res.access_token;
  if (!token) {
    throw new Error("Sunucudan token alınamadı");
  }
  
  localStorage.setItem("token", token);
  // Set cookie for middleware authentication (7 days expiry)
  document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  logger.info("User logged in successfully");
  
  return decodeJwt(token) as DecodedToken;
}

/**
 * Logout - clears all authentication data including cookies
 */
export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    sessionStorage.clear();
    // Clear the token cookie by setting it to expire in the past
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    logger.info("User logged out");
  }
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

/**
 * Get token from localStorage
 * Returns null if token is expired or invalid
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = decodeJwt(token) as DecodedToken;
    const exp = decoded.exp as number;
    
    // Check if token is expired (with 60 second buffer)
    if (exp && Date.now() >= (exp * 1000) - 60000) {
      logger.warn("Token expired, clearing...");
      localStorage.removeItem("token");
      return null;
    }
    
    return token;
  } catch (error) {
    logger.warn("Invalid token format, clearing...");
    localStorage.removeItem("token");
    return null;
  }
}

/**
 * Decode the current token without validation
 */
export function getDecodedToken(): DecodedToken | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    return decodeJwt(token) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Get user role from the current token
 */
export function getUserRole(): UserRole | null {
  const decoded = getDecodedToken();
  return (decoded?.role as UserRole) || null;
}

/**
 * Get user email from the current token
 */
export function getUserEmail(): string | null {
  const decoded = getDecodedToken();
  return decoded?.email || decoded?.sub || null;
}

/**
 * Get organization ID from the current token
 */
export function getOrganizationId(): string | null {
  const decoded = getDecodedToken();
  return decoded?.organizationId || null;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(): Date | null {
  const decoded = getDecodedToken();
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
}

/**
 * Check if the token will expire within the given minutes
 */
export function willTokenExpireSoon(withinMinutes: number = 5): boolean {
  const decoded = getDecodedToken();
  if (!decoded?.exp) return true;
  
  const expirationTime = decoded.exp * 1000;
  const bufferTime = withinMinutes * 60 * 1000;
  
  return Date.now() >= expirationTime - bufferTime;
}

// =============================================================================
// AUTH STATE
// =============================================================================

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: UserRole | UserRole[]): boolean {
  const userRole = getUserRole();
  if (!userRole) return false;
  
  if (Array.isArray(role)) {
    return role.includes(userRole);
  }
  return userRole === role;
}

/**
 * Check if user is an admin (admin or super_admin)
 */
export function isAdmin(): boolean {
  return hasRole(['admin', 'super_admin']);
}

/**
 * Clear all auth data including cookies
 */
export function clearAuth(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    sessionStorage.clear();
    // Clear the token cookie
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }
}

// =============================================================================
// REFRESH TOKEN (Placeholder for future implementation)
// =============================================================================

/**
 * Refresh the authentication token
 * Note: This is a placeholder. Implement based on your backend's refresh token flow.
 */
export async function refreshToken(): Promise<string | null> {
  // TODO: Implement token refresh logic
  // This would typically call /api/v1/auth/refresh with a refresh token
  logger.warn("Token refresh not implemented");
  return null;
}
