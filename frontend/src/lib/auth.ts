import { decodeJwt } from "jose";
import { authenticatedPost } from "./api";

interface LoginResponse {
  success: boolean;
  token?: string;
  access_token?: string;
  user?: any;
}

export async function login(username: string, password: string) {
  // Use authenticatedPost but allow it to work without token for login
  // The backend login endpoint should be public
  const res = await authenticatedPost<LoginResponse>("/auth/login", { username, password });
  
  const token = res.token || res.access_token;
  if (!token) {
    throw new Error("No token received from server");
  }
  localStorage.setItem("token", token);
  return decodeJwt(token);
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUserRole(): string | null {
  const token = getToken();
  if (!token) return null;
  const decoded: any = decodeJwt(token);
  return decoded?.role || null;
}
